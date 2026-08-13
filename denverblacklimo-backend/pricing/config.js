/**
 * Rate configuration for the price estimator.
 *
 * The shape mirrors the rate card spreadsheet tab for tab, so transferring the
 * client's completed sheet is mechanical rather than interpretive.
 *
 * PLACEHOLDER VALUES. Every number below is a stand-in so the engine can be
 * built and tested before the real rate card arrives. `configIsProvisional()`
 * reports whether any of them are still in place, and the API refuses to quote
 * while they are, so a placeholder can never reach a customer.
 */

/** Marks a value the client still has to supply. */
const TBD = null;

const VEHICLES = {
  'luxury-sedan': {
    name: 'Luxury Sedan',
    capacity: '3 passengers, 3 bags',
    hourlyWeekday: 100,
    hourlyWeekend: TBD,
    minimumHours: 3,
    // Transfer pricing
    startingFare: TBD,
    perMileBandA: TBD,
    perMileBandB: TBD,
    perMileBandC: TBD,
    minimumFare: TBD,
    // The line no discount may cross. Fuel, driver, insurance, wear.
    costFloor: TBD,
    // Empty miles to and from the garage
    deadheadPerMile: TBD,
    deadheadFreeMiles: TBD,
  },
  'luxury-suv': {
    name: 'Luxury SUV', capacity: '6 passengers, 6 bags',
    hourlyWeekday: 150, hourlyWeekend: TBD, minimumHours: 3,
    startingFare: TBD, perMileBandA: TBD, perMileBandB: TBD, perMileBandC: TBD,
    minimumFare: TBD, costFloor: TBD, deadheadPerMile: TBD, deadheadFreeMiles: TBD,
  },
  'executive-suv': {
    name: 'Executive SUV', capacity: '6 passengers, 6 bags',
    hourlyWeekday: 125, hourlyWeekend: TBD, minimumHours: 3,
    startingFare: TBD, perMileBandA: TBD, perMileBandB: TBD, perMileBandC: TBD,
    minimumFare: TBD, costFloor: TBD, deadheadPerMile: TBD, deadheadFreeMiles: TBD,
  },
  'luxury-van': {
    name: 'Luxury Van', capacity: '14 passengers, 14 bags',
    hourlyWeekday: 250, hourlyWeekend: TBD, minimumHours: 3,
    startingFare: TBD, perMileBandA: TBD, perMileBandB: TBD, perMileBandC: TBD,
    minimumFare: TBD, costFloor: TBD, deadheadPerMile: TBD, deadheadFreeMiles: TBD,
  },
  'mini-coach': {
    name: 'Mini Coach', capacity: '13 passengers, 14 bags',
    hourlyWeekday: 275, hourlyWeekend: TBD, minimumHours: 4,
    startingFare: TBD, perMileBandA: TBD, perMileBandB: TBD, perMileBandC: TBD,
    minimumFare: TBD, costFloor: TBD, deadheadPerMile: TBD, deadheadFreeMiles: TBD,
  },
  'limo-bus': {
    name: 'Limo Bus', capacity: 'Up to 28 passengers',
    hourlyWeekday: 325, hourlyWeekend: TBD, minimumHours: 4,
    startingFare: TBD, perMileBandA: TBD, perMileBandB: TBD, perMileBandC: TBD,
    minimumFare: TBD, costFloor: TBD, deadheadPerMile: TBD, deadheadFreeMiles: TBD,
  },
  'motor-coach': {
    name: 'Motor Coach', capacity: 'Up to 55 passengers',
    hourlyWeekday: 425, hourlyWeekend: TBD, minimumHours: 4,
    startingFare: TBD, perMileBandA: TBD, perMileBandB: TBD, perMileBandC: TBD,
    minimumFare: TBD, costFloor: TBD, deadheadPerMile: TBD, deadheadFreeMiles: TBD,
  },
};

const CONFIG = {
  currency: '$',

  /**
   * Step 9 of the pipeline, and the client's "start cheaper, raise later" lever.
   * 0.90 prices ten percent under the rate card. Clamped in the engine so a
   * mistyped 0.09 cannot sell a motor coach for the price of a coffee.
   */
  marketAdjustment: 1.0,
  marketAdjustmentFloor: 0.75,

  /** Quotes are rounded so they read as prices rather than calculations. */
  roundTo: 5,

  /** Where the mileage bands change. Shared by every vehicle. */
  bands: {
    milesIncluded: 15,
    bandAEndsAt: 40,
    bandBEndsAt: 100,
  },

  vehicles: VEHICLES,

  /** Deadhead is measured from here. Without it, empty miles cannot be priced. */
  garage: {
    address: TBD,
    lat: TBD,
    lng: TBD,
  },

  /**
   * Fixed prices that beat the per-mile calculation when a trip matches.
   * `match` is checked against both directions unless `oneWayOnly` is set.
   */
  zones: {
    airport: [
      // { id, label, match: ['DIA', 'Downtown Denver'], prices: { 'luxury-sedan': 93 } }
    ],
    mountain: [
      // { id, label, match: ['Denver', 'Vail'], prices: { ... } }
    ],
  },

  extras: {
    extraStop: TBD,
    childSeat: TBD,
    extraLuggage: TBD,
    pet: TBD,
    meetAndGreet: TBD,
  },

  surcharges: {
    airportAccessFee: TBD,
    /** Applied when pickup falls inside the window. */
    lateNight: { from: '00:00', to: '05:00', amount: TBD },
  },

  taxes: {
    ratePercent: TBD,
    showSeparately: true,
  },

  /** Gratuity stays the customer's choice, matching the public Pricing page. */
  gratuity: { autoAdd: false, percent: 0 },

  limits: {
    /** Past this, the site offers a quote instead of a price. */
    maxAutoQuoteMiles: 250,
    /** Absolute service boundary. */
    maxServiceMiles: 500,
    minimumNoticeHours: TBD,
  },
};

/** Every config path that must hold a real number before we can quote. */
function missingValues(config = CONFIG) {
  const missing = [];
  const check = (path, value) => {
    if (value === TBD || value === undefined) missing.push(path);
  };

  for (const [id, v] of Object.entries(config.vehicles)) {
    for (const field of [
      'startingFare', 'perMileBandA', 'perMileBandB', 'perMileBandC',
      'minimumFare', 'costFloor', 'deadheadPerMile', 'deadheadFreeMiles',
      'hourlyWeekend',
    ]) {
      check(`vehicles.${id}.${field}`, v[field]);
    }
  }
  check('garage.lat', config.garage.lat);
  check('garage.lng', config.garage.lng);
  if (!config.zones.airport.length) missing.push('zones.airport (no fixed airport prices set)');

  return missing;
}

/** True while any placeholder remains, so the API can refuse to quote. */
function configIsProvisional(config = CONFIG) {
  return missingValues(config).length > 0;
}

module.exports = { CONFIG, TBD, missingValues, configIsProvisional };
