/**
 * Turns the rate values the admin edits into the shape the engine expects.
 *
 * The admin CMS stores flat, human-friendly rows because that is what a person
 * can fill in without making mistakes. The engine wants a nested config keyed
 * by vehicle. This file is the translation, and the only place that knows both
 * shapes.
 *
 * Rates are stored under keys beginning `pricing_`, which the public settings
 * endpoint refuses to serve. Cost floors are what each job costs to run, and
 * publishing them would hand a competitor the business's margins.
 */
const { CONFIG } = require('./config');
const { unknownZoneNames } = require('./zones');

/** Keys the public settings endpoint must never return. */
const PRIVATE_PREFIX = 'pricing_';

const isPrivateKey = (key) => String(key).startsWith(PRIVATE_PREFIX);

/** Strips rate data out of a settings map before it goes to the public site. */
function publicSettingsOnly(settings) {
  const out = {};
  for (const [key, value] of Object.entries(settings)) {
    if (!isPrivateKey(key)) out[key] = value;
  }
  return out;
}

/** A number, or null when the admin has left the box empty. */
function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Blank, "QUOTE" or "NO" all mean "do not price this automatically". */
function priceOrNull(value) {
  if (typeof value === 'string' && /^(quote|no|n\/a)$/i.test(value.trim())) return null;
  return num(value);
}

const VEHICLE_PRICE_FIELDS = [
  ['luxury-sedan', 'priceLuxurySedan'],
  ['luxury-suv', 'priceLuxurySUV'],
  ['executive-suv', 'priceExecutiveSUV'],
  ['luxury-van', 'priceLuxuryVan'],
];

/**
 * @param {object} settings  every row from site_settings, keyed
 * @returns {object} a config the engine can price with
 */
function buildConfig(settings = {}) {
  const g = settings[`${PRIVATE_PREFIX}rates`] || {};
  const vehicleRows = Array.isArray(settings[`${PRIVATE_PREFIX}vehicles`])
    ? settings[`${PRIVATE_PREFIX}vehicles`]
    : [];
  const zoneRows = Array.isArray(settings[`${PRIVATE_PREFIX}zones`])
    ? settings[`${PRIVATE_PREFIX}zones`]
    : [];

  const vehicles = {};
  for (const row of vehicleRows) {
    const id = String(row.id || '').trim();
    if (!id) continue;
    vehicles[id] = {
      name: row.name || id,
      capacity: row.capacity || '',
      hourlyWeekday: num(row.hourlyWeekday),
      hourlyWeekend: num(row.hourlyWeekend),
      minimumHours: num(row.minimumHours),
      startingFare: num(row.startingFare),
      perMileBandA: num(row.perMileBandA),
      perMileBandB: num(row.perMileBandB),
      perMileBandC: num(row.perMileBandC),
      minimumFare: num(row.minimumFare),
      costFloor: num(row.costFloor),
      deadheadPerMile: num(row.deadheadPerMile),
      deadheadFreeMiles: num(row.deadheadFreeMiles),
    };
  }

  const zones = { airport: [], mountain: [] };
  for (const row of zoneRows) {
    const from = String(row.fromZone || '').trim();
    const to = String(row.toZone || '').trim();
    if (!from || !to) continue;

    const prices = {};
    const refuse = [];
    for (const [vehicleId, field] of VEHICLE_PRICE_FIELDS) {
      const raw = row[field];
      // QUOTE and NO are explicit decisions: never price this vehicle on this
      // route automatically, not even by formula. The Excel promises exactly
      // that. A blank stays permissive — the per-mile path may try, bounded
      // by the vehicle's minimum fare.
      if (typeof raw === 'string' && /^(quote|no|n\/a)$/i.test(raw.trim())) {
        refuse.push(vehicleId);
        continue;
      }
      const p = priceOrNull(raw);
      if (p !== null) prices[vehicleId] = p;
    }
    // A row carrying no prices and no explicit refusals says nothing: skip it.
    if (!Object.keys(prices).length && !refuse.length) continue;

    const entry = {
      id: `${from}-${to}`.toLowerCase().replace(/\s+/g, '-'),
      label: row.label || `${from} to ${to}`,
      match: [from, to],
      oneWayOnly: /^(yes|true|1)$/i.test(String(row.oneWayOnly || '')),
      prices,
      refuse,
    };
    (String(row.group || '').toLowerCase() === 'mountain' ? zones.mountain : zones.airport).push(entry);
  }

  const fallback = CONFIG;
  return {
    currency: g.currency || fallback.currency,
    marketAdjustment: num(g.marketAdjustment) ?? 1,
    marketAdjustmentFloor: num(g.marketAdjustmentFloor) ?? 0.75,
    roundTo: num(g.roundTo) ?? 5,
    bands: {
      milesIncluded: num(g.milesIncluded) ?? 15,
      bandAEndsAt: num(g.bandAEndsAt) ?? 40,
      bandBEndsAt: num(g.bandBEndsAt) ?? 100,
    },
    vehicles,
    garage: {
      address: g.garageAddress || null,
      lat: num(g.garageLat),
      lng: num(g.garageLng),
    },
    zones,
    extras: {
      extraStop: num(g.extraStop),
      childSeat: num(g.childSeat),
      extraLuggage: num(g.extraLuggage),
      pet: num(g.pet),
      meetAndGreet: num(g.meetAndGreet),
    },
    surcharges: {
      airportAccessFee: num(g.airportAccessFee),
      lateNight: {
        from: g.lateNightFrom || '00:00',
        to: g.lateNightTo || '05:00',
        amount: num(g.lateNightAmount),
      },
    },
    taxes: { ratePercent: num(g.taxPercent), showSeparately: true },
    gratuity: { autoAdd: false, percent: 0 },
    limits: {
      maxAutoQuoteMiles: num(g.maxAutoQuoteMiles) ?? 250,
      maxServiceMiles: num(g.maxServiceMiles) ?? 500,
      minimumNoticeHours: num(g.minimumNoticeHours),
    },
  };
}

/**
 * What is still missing before this config can quote. Returned to the admin so
 * the gaps are visible, and checked by the endpoint so a half-filled rate card
 * cannot put a wrong price in front of a customer.
 */
function readiness(config) {
  const missing = [];
  const vehicleIds = Object.keys(config.vehicles);

  if (!vehicleIds.length) missing.push('No vehicles have rates yet');
  if (config.garage.lat === null || config.garage.lng === null) {
    missing.push('Garage location is not set, so empty miles cannot be priced');
  }

  for (const id of vehicleIds) {
    const v = config.vehicles[id];
    const needed = [
      ['starting fare', v.startingFare],
      ['per mile rates', v.perMileBandA],
      ['minimum fare', v.minimumFare],
      ['cost floor', v.costFloor],
    ];
    const gaps = needed.filter(([, value]) => value === null).map(([label]) => label);
    if (gaps.length) missing.push(`${v.name}: ${gaps.join(', ')} not set`);
  }

  if (!config.zones.airport.length) {
    missing.push('No fixed airport prices set');
  }

  return { ready: missing.length === 0, missing };
}

module.exports = { buildConfig, readiness, publicSettingsOnly, isPrivateKey, PRIVATE_PREFIX };
