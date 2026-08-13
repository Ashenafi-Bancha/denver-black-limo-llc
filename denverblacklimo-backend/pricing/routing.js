/**
 * Route measurement, via OpenRouteService.
 *
 * Deliberately the only file that knows which provider we use. The engine
 * receives plain miles, so swapping to Google later means rewriting this file
 * and nothing else.
 *
 * Distances are cached because they do not change. The road between the
 * airport and downtown is the same length today as it was yesterday, and the
 * same handful of routes get quoted over and over.
 */

const ORS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';
const TIMEOUT_MS = 8000;
const METRES_PER_MILE = 1609.344;

/** Cheap in-process cache. Survives until the server restarts, which is plenty. */
const cache = new Map();
const CACHE_MAX = 5000;

/**
 * Coordinates are rounded to four decimals, roughly eleven metres, before
 * being used as a cache key. Two people typing the same address get slightly
 * different pins from the geocoder; without this every one of them would be a
 * fresh paid lookup.
 */
const key = (from, to) =>
  [from.lat, from.lng, to.lat, to.lng].map((n) => Number(n).toFixed(4)).join(',');

function remember(k, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(k, value);
}

function isConfigured() {
  return Boolean(process.env.ORS_API_KEY);
}

/**
 * Driving distance and time between two points.
 * Resolves to `{ miles, minutes, cached }`, or null when it cannot be measured,
 * so the caller can fall back to inviting a manual quote.
 */
async function measureRoute(from, to) {
  if (!isConfigured()) return null;
  if (!from || !to || !Number.isFinite(from.lat) || !Number.isFinite(to.lat)) return null;

  const k = key(from, to);
  if (cache.has(k)) return { ...cache.get(k), cached: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ORS_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: process.env.ORS_API_KEY,
        'Content-Type': 'application/json',
      },
      // OpenRouteService takes [longitude, latitude], which is the reverse of
      // how the rest of this codebase and most humans write coordinates.
      body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]] }),
    });

    if (!res.ok) {
      console.warn(`Route lookup failed: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const summary = data && data.routes && data.routes[0] && data.routes[0].summary;
    if (!summary || !Number.isFinite(summary.distance)) return null;

    const value = {
      miles: Math.round((summary.distance / METRES_PER_MILE) * 10) / 10,
      minutes: Math.round((summary.duration || 0) / 60),
    };
    remember(k, value);
    return { ...value, cached: false };
  } catch (err) {
    console.warn(`Route lookup error: ${err.name === 'AbortError' ? 'timed out' : err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The three legs a transfer needs: the trip itself, plus the empty runs from
 * the garage and back. Requested together so one slow leg does not serialise
 * the others.
 */
async function measureTrip({ pickup, dropoff, garage }) {
  const wantsDeadhead = Boolean(garage && Number.isFinite(garage.lat));
  const [trip, out, back] = await Promise.all([
    measureRoute(pickup, dropoff),
    wantsDeadhead ? measureRoute(garage, pickup) : Promise.resolve(null),
    wantsDeadhead ? measureRoute(dropoff, garage) : Promise.resolve(null),
  ]);

  if (!trip) return null;
  return {
    tripMiles: trip.miles,
    tripMinutes: trip.minutes,
    deadheadOutMiles: out ? out.miles : 0,
    deadheadBackMiles: back ? back.miles : 0,
    allCached: Boolean(trip.cached && (!out || out.cached) && (!back || back.cached)),
  };
}

const cacheStats = () => ({ entries: cache.size, limit: CACHE_MAX });

module.exports = { measureRoute, measureTrip, isConfigured, cacheStats };
