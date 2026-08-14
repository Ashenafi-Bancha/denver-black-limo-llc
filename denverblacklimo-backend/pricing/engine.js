/**
 * The price estimator engine.
 *
 * Implements the fourteen step pipeline in the client proposal. Pure: it takes
 * a trip, a measured route and a rate config, and returns an itemised quote.
 * No network, no database, no clock. Everything that varies is passed in, so
 * the whole thing is testable and a given input always produces the same price.
 *
 * One deliberate change from the document's ordering. The document lists
 * guardrails as step fourteen; here the boundary checks run first as well.
 * There is no point measuring bands and deadhead for a four hundred mile
 * request we are never going to quote, and refusing early keeps a nonsense
 * trip from ever reaching the money arithmetic. The final sanity check still
 * runs at the end.
 */

const KIND = {
  BASE: 'base',
  ADD: 'addition',
  ADJUST: 'adjustment',
  TAX: 'tax',
};

/** Money is rounded at each step so floating point drift never accumulates. */
const money = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Portion of `miles` that falls between `from` and `to`. */
const milesBetween = (miles, from, to) => Math.max(0, Math.min(miles, to) - from);

function notQuotable(reason, detail) {
  return { quotable: false, reason, detail: detail || null, lines: [], total: null };
}

/**
 * Weekend is Saturday or Sunday in Denver, where the trip actually happens.
 * Naive Date#getDay uses the server's own zone, and this server runs in UTC:
 * a Friday 6pm pickup in Denver is already Saturday in UTC, which would have
 * billed Friday-evening customers the weekend rate.
 */
const DENVER_WEEKDAY = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Denver',
  weekday: 'short',
});

function isWeekend(when) {
  const date = new Date(when);
  if (Number.isNaN(date.getTime())) return false;
  const day = DENVER_WEEKDAY.format(date);
  return day === 'Sat' || day === 'Sun';
}

/** "HH:MM" comparison that copes with a window crossing midnight. */
function withinWindow(timeHHMM, from, to) {
  const toMin = (s) => {
    const [h, m] = String(s).split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const t = toMin(timeHHMM);
  const a = toMin(from);
  const b = toMin(to);
  return a <= b ? t >= a && t < b : t >= a || t < b;
}

/**
 * A fixed price for this journey, if one is configured.
 *
 * Each end of the trip carries a zone chain, most specific first — a downtown
 * hotel is ['Downtown Denver', 'Denver']. A row matches if its two names each
 * appear anywhere in the right chain, so "Denver to Vail" covers a pickup at
 * any metro address. When several rows fit, the most specific pair wins:
 * chain positions sum lower for exact zones than for inherited ones, which is
 * how DIA-to-Downtown beats a broader Denver-level row for an airport run.
 */
function findZonePrice(trip, config) {
  const groups = [...(config.zones.airport || []), ...(config.zones.mountain || [])];
  const norm = (s) => String(s || '').trim().toLowerCase();

  const chainOf = (end) => {
    if (!end) return [];
    if (Array.isArray(end.zones) && end.zones.length) return end.zones.map(norm);
    return end.zone ? [norm(end.zone)] : [];
  };
  const fromChain = chainOf(trip.pickup);
  const toChain = chainOf(trip.dropoff);
  if (!fromChain.length || !toChain.length) return null;

  let best = null;
  for (const z of groups) {
    const [a, b] = z.match.map(norm);
    const price = z.prices && z.prices[trip.vehicleId];
    // An explicit QUOTE/NO in the rate card is a decision, not an absence:
    // this vehicle on this route must go through a human, not the formula.
    const refused = Array.isArray(z.refuse) && z.refuse.includes(trip.vehicleId);
    if (typeof price !== 'number' && !refused) continue;   // truly unpriced: per mile may try

    const tryPair = (fromName, toName) => {
      const fi = fromChain.indexOf(fromName);
      const ti = toChain.indexOf(toName);
      if (fi === -1 || ti === -1) return;
      const score = fi + ti;                    // lower = more specific
      if (!best || score < best.score) best = { zone: z, price, refused, score };
    };
    tryPair(a, b);
    if (!z.oneWayOnly) tryPair(b, a);
  }
  if (!best) return null;
  return best.refused
    ? { zone: best.zone, refused: true }
    : { zone: best.zone, price: best.price };
}

/**
 * @param {object}  trip    what the customer asked for
 * @param {object}  route   measured distances, in miles
 * @param {object}  config  the rate card
 */
function estimate({ trip, route, config }) {
  const vehicle = config.vehicles[trip.vehicleId];
  if (!vehicle) return notQuotable('unknown_vehicle', trip.vehicleId);

  const hourly = trip.serviceType === 'hourly';
  const miles = Number(route && route.tripMiles) || 0;

  // A fixed price for this exact pair of zones is a deliberate decision that
  // does not depend on a measured distance, so it is resolved before the
  // route guardrails: a routing outage should not stop us quoting DIA to
  // Downtown when that price is sitting in the rate card.
  const zoneMatch = hourly ? null : findZonePrice(trip, config);

  // The rate card says this vehicle on this route goes through a human.
  if (zoneMatch && zoneMatch.refused) {
    return notQuotable('route_requires_quote', zoneMatch.zone.label);
  }

  // ---- Guardrails, up front -------------------------------------------
  if (!hourly && !zoneMatch) {
    if (!route || !Number.isFinite(route.tripMiles)) {
      return notQuotable('route_unavailable');
    }
    if (miles <= 0) return notQuotable('same_pickup_and_dropoff');
    if (miles > config.limits.maxServiceMiles) {
      return notQuotable('outside_service_area', `${Math.round(miles)} miles`);
    }
    if (miles > config.limits.maxAutoQuoteMiles) {
      return notQuotable('too_far_to_quote_automatically', `${Math.round(miles)} miles`);
    }
  }

  const lines = [];
  const add = (label, amount, kind = KIND.ADD, detail) => {
    if (!amount) return;
    lines.push({ label, amount: money(amount), kind, detail: detail || null });
  };

  // ---- Step 3 and 4: pricing method, then the base fare ----------------
  let method;
  let base = 0;

  if (hourly) {
    method = 'hourly';
    const rate = isWeekend(trip.when) && vehicle.hourlyWeekend
      ? vehicle.hourlyWeekend
      : vehicle.hourlyWeekday;
    const hours = Math.max(Number(trip.hours) || 0, vehicle.minimumHours || 0);
    if (!rate || !hours) return notQuotable('hourly_rate_not_set', trip.vehicleId);
    base = rate * hours;
    add(`${vehicle.name}, ${hours} hours at ${config.currency}${rate}/hr`, base, KIND.BASE);
  } else if (zoneMatch) {
    method = 'fixed_zone';
    base = zoneMatch.price;
    add(zoneMatch.zone.label, base, KIND.BASE);
  } else {
    method = 'per_mile';
    const { milesIncluded, bandAEndsAt, bandBEndsAt } = config.bands;
    const a = milesBetween(miles, milesIncluded, bandAEndsAt);
    const b = milesBetween(miles, bandAEndsAt, bandBEndsAt);
    const c = Math.max(0, miles - bandBEndsAt);

    base = vehicle.startingFare
      + a * vehicle.perMileBandA
      + b * vehicle.perMileBandB
      + c * vehicle.perMileBandC;

    add(`${vehicle.name}, base fare`, vehicle.startingFare, KIND.BASE,
        `includes first ${milesIncluded} miles`);
    add(`${a.toFixed(1)} miles at ${config.currency}${vehicle.perMileBandA}/mile`, a * vehicle.perMileBandA);
    add(`${b.toFixed(1)} miles at ${config.currency}${vehicle.perMileBandB}/mile`, b * vehicle.perMileBandB);
    add(`${c.toFixed(1)} miles at ${config.currency}${vehicle.perMileBandC}/mile`, c * vehicle.perMileBandC);
  }

  let running = base;

  // ---- Step 5: deadhead, the empty miles ------------------------------
  // Transfers only. Hourly bookings absorb travel time instead, and a fixed
  // zone price is quoted all in, so neither is charged for empty miles.
  let deadheadMiles = 0;
  if (!hourly && method !== 'fixed_zone' && vehicle.deadheadPerMile) {
    const empty = (Number(route.deadheadOutMiles) || 0) + (Number(route.deadheadBackMiles) || 0);
    deadheadMiles = Math.max(0, empty - (vehicle.deadheadFreeMiles || 0));
    const cost = deadheadMiles * vehicle.deadheadPerMile;
    running += cost;
    add(`Empty miles to and from garage, ${deadheadMiles.toFixed(1)} chargeable`, cost);
  }

  // ---- Step 6: extras --------------------------------------------------
  const ex = trip.extras || {};
  const priced = [
    ['Additional stops', ex.extraStops, config.extras.extraStop],
    ['Child seats', ex.childSeats, config.extras.childSeat],
    ['Extra luggage', ex.extraLuggage, config.extras.extraLuggage],
    ['Pet', ex.pet ? 1 : 0, config.extras.pet],
    ['Meet and greet', ex.meetAndGreet ? 1 : 0, config.extras.meetAndGreet],
  ];
  for (const [label, qty, unit] of priced) {
    const n = Number(qty) || 0;
    if (!n || !unit) continue;
    running += n * unit;
    add(n > 1 ? `${label} x${n}` : label, n * unit);
  }

  // ---- Step 7: surcharges ---------------------------------------------
  if (trip.serviceType === 'airport' && config.surcharges.airportAccessFee) {
    running += config.surcharges.airportAccessFee;
    add('Airport access fee', config.surcharges.airportAccessFee);
  }
  const late = config.surcharges.lateNight;
  if (late && late.amount && trip.pickupTime && withinWindow(trip.pickupTime, late.from, late.to)) {
    running += late.amount;
    add(`Late night pickup, ${late.from} to ${late.to}`, late.amount);
  }

  // ---- Step 8: the minimum fare ---------------------------------------
  // A fixed zone price is already a deliberate price, so it is left alone.
  if (!hourly && method !== 'fixed_zone' && vehicle.minimumFare && running < vehicle.minimumFare) {
    add('Minimum fare applied', vehicle.minimumFare - running, KIND.ADJUST);
    running = vehicle.minimumFare;
  }

  // ---- Step 9: the market adjustment ----------------------------------
  const rawAdjust = Number(config.marketAdjustment);
  const adjust = Number.isFinite(rawAdjust)
    ? Math.max(config.marketAdjustmentFloor, Math.min(1.5, rawAdjust))
    : 1;
  if (adjust !== 1) {
    const delta = running * adjust - running;
    add(
      adjust < 1
        ? `Introductory pricing, ${Math.round((1 - adjust) * 100)}% off`
        : `Rate adjustment, +${Math.round((adjust - 1) * 100)}%`,
      delta,
      KIND.ADJUST
    );
    running = running * adjust;
  }

  // ---- Step 10: the cost floor ----------------------------------------
  // After the discount, never before. This is what stops competing on price
  // from turning into running jobs at a loss.
  let floorApplied = false;
  if (vehicle.costFloor && running < vehicle.costFloor) {
    add('Adjusted to minimum viable price', vehicle.costFloor - running, KIND.ADJUST);
    running = vehicle.costFloor;
    floorApplied = true;
  }

  // ---- Step 11: gratuity ----------------------------------------------
  if (config.gratuity.autoAdd && config.gratuity.percent) {
    const tip = running * (config.gratuity.percent / 100);
    running += tip;
    add(`Gratuity ${config.gratuity.percent}%`, tip);
  }

  // ---- Step 12: taxes --------------------------------------------------
  const subtotal = money(running);
  if (config.taxes.ratePercent) {
    const tax = subtotal * (config.taxes.ratePercent / 100);
    running += tax;
    add(`Tax ${config.taxes.ratePercent}%`, tax, KIND.TAX);
  }

  // ---- Step 13: round --------------------------------------------------
  const step = config.roundTo || 1;
  const total = Math.round(running / step) * step;

  // ---- Step 14: final sanity check -------------------------------------
  if (!Number.isFinite(total) || total <= 0) {
    return notQuotable('calculation_incomplete', 'a rate needed for this trip is not set');
  }

  return {
    quotable: true,
    currency: config.currency,
    total,
    subtotal,
    lines,
    meta: {
      method,
      tripMiles: money(miles),
      deadheadMiles: money(deadheadMiles),
      marketAdjustment: adjust,
      costFloorApplied: floorApplied,
      vehicle: vehicle.name,
    },
  };
}

module.exports = { estimate, KIND, withinWindow, milesBetween };
