/**
 * Flight lookup, via AeroDataBox (RapidAPI).
 *
 * The booking form asks for an airline, a flight number and a date. This
 * module turns that into the flight's published schedule so the form can fill
 * in the arrival time and the office sees where the customer is flying from.
 * Schedules were observed available 120+ days ahead, so nearly every booking
 * can be checked at the moment it is made.
 *
 * The free plan allows 600 units a month (a lookup costs 2) and exactly one
 * request per second. Both limits are handled here: every lookup is cached,
 * and calls to the provider are queued so they never overlap.
 */

const HOST = 'aerodatabox.p.rapidapi.com';
const TIMEOUT_MS = 8000;
/** Minimum spacing between provider calls. The plan's limit is 1/s, and
 * 1.1s still tripped it in testing, so leave a wider margin. */
const SPACING_MS = 1600;
const HOME_AIRPORT = 'DEN';

const CACHE_MAX = 2000;
const TTL_FOUND_MS = 6 * 60 * 60 * 1000;
const TTL_MISS_MS = 60 * 60 * 1000;
const cache = new Map();

function remember(key, value, ttl) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  // `at` as well as `expires`: the booking form is happy with a schedule six
  // hours old, but a driver asking whether the flight is late is not, and it
  // asks for a maximum age rather than being handed whatever is still unexpired.
  cache.set(key, { value, expires: Date.now() + ttl, at: Date.now() });
}

function isConfigured() {
  return Boolean(process.env.AERODATABOX_API_KEY);
}

/** "UA 26", "ua26", "UA-0026" all become "UA26". Returns null when it is not a flight number. */
function normalizeFlight(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  // An IATA airline code has at least one letter, so "2672" alone is rejected
  // rather than sent to the provider as airline "26".
  const m = s.match(/^((?:[A-Z][A-Z0-9]|[0-9][A-Z]))0*(\d{1,4}[A-Z]?)$/);
  if (!m) return null;
  return `${m[1]}${m[2]}`;
}

function normalizeDate(raw) {
  const s = String(raw || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T12:00:00Z`);
  if (Number.isNaN(t)) return null;
  const days = (t - Date.now()) / 864e5;
  // Yesterday through a year out: anything else is a typo, not a trip.
  if (days < -1 || days > 366) return null;
  return s;
}

// ── One-at-a-time queue toward the provider ─────────────────────────────
let chain = Promise.resolve();
let lastCallAt = 0;

function scheduled(fn) {
  const run = chain.then(async () => {
    const wait = lastCallAt + SPACING_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    return fn();
  });
  // Keep the chain alive even when a call fails.
  chain = run.catch(() => {});
  return run;
}

function pickLeg(legs, direction) {
  const touches = (l, side) => l && l[side] && l[side].airport && l[side].airport.iata === HOME_AIRPORT;
  const arriving = legs.find((l) => touches(l, 'arrival'));
  const departing = legs.find((l) => touches(l, 'departure'));
  if (direction === 'arrival' && arriving) return { leg: arriving, servesDenver: true, kind: 'arrival' };
  if (direction === 'departure' && departing) return { leg: departing, servesDenver: true, kind: 'departure' };
  if (arriving) return { leg: arriving, servesDenver: true, kind: 'arrival' };
  if (departing) return { leg: departing, servesDenver: true, kind: 'departure' };
  return { leg: legs[0], servesDenver: false, kind: 'none' };
}

/** "2026-08-25 14:05-06:00" → { date: '2026-08-25', time: '14:05' } in the airport's own local time. */
function splitLocal(scheduled) {
  const s = scheduled && scheduled.local;
  const m = s && String(s).match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/);
  return m ? { date: m[1], time: m[2] } : { date: '', time: '' };
}

/** The same, but null rather than blanks when the provider has no such time yet. */
function localOrNull(t) {
  const when = splitLocal(t);
  return when.time ? when : null;
}

/**
 * "2026-08-25 20:05Z" → epoch ms, or null.
 *
 * A delay is computed from these rather than from the local strings: the two
 * times being compared can straddle midnight or a DST change, and minutes of
 * difference is the whole point of the number.
 */
function utcMs(t) {
  const s = t && t.utc;
  const m = s && String(s).match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/);
  return m ? Date.parse(`${m[1]}T${m[2]}:00Z`) : null;
}

function side(x) {
  const a = (x && x.airport) || {};
  const when = splitLocal(x && x.scheduledTime);

  // What the airline now says, against what it published. `revisedTime` is the
  // estimate and then the actual; `runwayTime` is wheels on or off the tarmac.
  //
  // They are not interchangeable and the caller is told which one this is. On
  // an arrival, touchdown is several minutes before the door opens, so a wait
  // billed from `runway` as though it were gate arrival would overcharge a
  // customer — which is the same reason the trip record refuses to compute the
  // airport wait at all.
  const scheduledAt = utcMs(x && x.scheduledTime);
  const revisedAt = utcMs(x && x.revisedTime);
  const runwayAt = utcMs(x && x.runwayTime);
  const liveAt = revisedAt ?? runwayAt;
  const liveFrom = revisedAt != null ? 'revised' : runwayAt != null ? 'runway' : null;

  return {
    iata: a.iata || '',
    city: a.municipalityName || a.shortName || '',
    name: a.name || '',
    date: when.date,
    time: when.time,
    terminal: (x && x.terminal) || '',
    gate: (x && x.gate) || '',
    baggageBelt: (x && x.baggageBelt) || '',
    revised: localOrNull(x && x.revisedTime),
    runway: localOrNull(x && x.runwayTime),
    /** Minutes against the published schedule: positive is late, negative early. */
    delayMinutes:
      scheduledAt != null && liveAt != null ? Math.round((liveAt - scheduledAt) / 60000) : null,
    /** Which time the delay was measured from, so nothing reads it as gate arrival. */
    delayFrom: scheduledAt != null && liveAt != null ? liveFrom : null,
  };
}

/**
 * Resolves to one of:
 *   { found: true, number, airline, status, departure, arrival, servesDenver,
 *     kind, fetchedAt, cached?, stale? }
 *   { found: false, reason: 'invalid' | 'not_found' | 'unavailable' }
 *
 * `maxAgeMs` is how old an answer the caller will accept from the cache. The
 * booking form omits it and takes anything unexpired, because a published
 * schedule does not move. A driver asking whether the flight is late must pass
 * one — otherwise the six-hour entry that made the quota survivable would hand
 * back this morning's answer as today's news.
 */
async function lookupFlight({ flight, date, direction, maxAgeMs }) {
  if (!isConfigured()) return { found: false, reason: 'unavailable' };
  const number = normalizeFlight(flight);
  const day = normalizeDate(date);
  if (!number || !day) return { found: false, reason: 'invalid' };
  const dir = direction === 'departure' ? 'departure' : 'arrival';

  const key = `${number}|${day}`;
  const hit = cache.get(key);
  const unexpired = Boolean(hit && hit.expires > Date.now());
  if (unexpired && (maxAgeMs == null || Date.now() - hit.at <= maxAgeMs)) {
    return { ...finish(hit.value, dir), cached: true, fetchedAt: new Date(hit.at).toISOString() };
  }

  let legs = await scheduled(() => fetchLegs(number, day));
  // A burst from several visitors can still hit the per-second limit; one
  // retry after the spacing interval clears it.
  if (legs === 'rate_limited') legs = await scheduled(() => fetchLegs(number, day));
  if (legs === null || legs === 'rate_limited') {
    // An answer from twenty minutes ago, labelled as such, beats no answer at
    // all for someone driving to the airport now — the same judgement the
    // app's trip cache makes about a lost signal.
    if (unexpired) {
      return {
        ...finish(hit.value, dir),
        cached: true,
        stale: true,
        fetchedAt: new Date(hit.at).toISOString(),
      };
    }
    return { found: false, reason: 'unavailable' };
  }
  remember(key, legs, legs.length ? TTL_FOUND_MS : TTL_MISS_MS);
  return { ...finish(legs, dir), fetchedAt: new Date().toISOString() };
}

function finish(legs, dir) {
  if (!legs.length) return { found: false, reason: 'not_found' };
  const { leg, servesDenver, kind } = pickLeg(legs, dir);
  return {
    found: true,
    number: leg.number || '',
    airline: { name: (leg.airline && leg.airline.name) || '', iata: (leg.airline && leg.airline.iata) || '' },
    status: leg.status || '',
    departure: side(leg.departure),
    arrival: side(leg.arrival),
    servesDenver,
    kind,
  };
}

/** Raw provider call. Resolves to the legs array, [] when unknown, 'rate_limited' on 429, or null when the provider could not answer. */
async function fetchLegs(number, day) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://${HOST}/flights/number/${encodeURIComponent(number)}/${day}?withAircraftImage=false&withLocation=false`,
      {
        signal: controller.signal,
        headers: { 'x-rapidapi-host': HOST, 'x-rapidapi-key': process.env.AERODATABOX_API_KEY },
      }
    );
    // 204 is the provider's "no such flight on that date".
    if (res.status === 204) return [];
    if (res.status === 429) return 'rate_limited';
    if (!res.ok) {
      console.warn(`Flight lookup failed: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`Flight lookup error: ${err.name === 'AbortError' ? 'timed out' : err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const cacheStats = () => ({ entries: cache.size, limit: CACHE_MAX });

module.exports = { lookupFlight, normalizeFlight, normalizeDate, isConfigured, cacheStats };
