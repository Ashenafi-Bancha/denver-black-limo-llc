/**
 * Engine tests. Plain Node, no framework, so `node pricing/engine.test.js`
 * works without adding a dependency.
 *
 * The fixture uses invented but realistic numbers. The point is the arithmetic
 * and the ordering of the pipeline, not the client's eventual rates.
 */
const { estimate } = require('./engine');

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}\n          expected ${JSON.stringify(expected)}\n          actual   ${JSON.stringify(actual)}`); }
}

const V = (over = {}) => ({
  name: 'Luxury Sedan', capacity: '3',
  hourlyWeekday: 100, hourlyWeekend: 130, minimumHours: 3,
  startingFare: 40, perMileBandA: 3, perMileBandB: 2.5, perMileBandC: 2,
  minimumFare: 75, costFloor: 55,
  deadheadPerMile: 1.5, deadheadFreeMiles: 20,
  ...over,
});

const cfg = (over = {}) => ({
  currency: '$',
  marketAdjustment: 1.0,
  marketAdjustmentFloor: 0.75,
  roundTo: 5,
  bands: { milesIncluded: 15, bandAEndsAt: 40, bandBEndsAt: 100 },
  vehicles: { sedan: V(), suv: V({ name: 'Luxury SUV', startingFare: 60 }) },
  garage: { address: 'x', lat: 39.7, lng: -104.9 },
  zones: {
    airport: [{ id: 'dia-dt', label: 'DIA to Downtown Denver', match: ['DIA', 'Downtown Denver'], prices: { sedan: 95 } }],
    mountain: [],
  },
  extras: { extraStop: 25, childSeat: 15, extraLuggage: 10, pet: 20, meetAndGreet: 30 },
  surcharges: { airportAccessFee: 5, lateNight: { from: '00:00', to: '05:00', amount: 20 } },
  taxes: { ratePercent: 0, showSeparately: true },
  gratuity: { autoAdd: false, percent: 0 },
  limits: { maxAutoQuoteMiles: 250, maxServiceMiles: 500, minimumNoticeHours: 2 },
  ...over,
});

const trip = (over = {}) => ({
  serviceType: 'point-to-point', vehicleId: 'sedan',
  pickup: {}, dropoff: {}, when: '2026-08-12T10:00:00Z',
  ...over,
});
const route = (tripMiles, out = 0, back = 0) =>
  ({ tripMiles, deadheadOutMiles: out, deadheadBackMiles: back });

console.log('\nTIERED MILEAGE');
// 30 miles: 15 included, then 15 in band A at 3.00 = 45, plus 40 base = 85
check('30 miles bills only band A',
  estimate({ trip: trip(), route: route(30), config: cfg() }).total, 85);
// 60 miles: band A 25 x 3 = 75, band B 20 x 2.5 = 50, + 40 = 165
check('60 miles spans bands A and B',
  estimate({ trip: trip(), route: route(60), config: cfg() }).total, 165);
// 160: A 25x3=75, B 60x2.5=150, C 60x2=120, +40 = 385
check('160 miles reaches band C',
  estimate({ trip: trip(), route: route(160), config: cfg() }).total, 385);
check('long trips cost less per mile',
  estimate({ trip: trip(), route: route(160), config: cfg() }).total / 160 <
  estimate({ trip: trip(), route: route(30), config: cfg() }).total / 30, true);

console.log('\nMINIMUM FARE');
// 5 miles is inside the included 15, so base 40 -> lifted to the 75 minimum
check('short trip lifts to the minimum fare',
  estimate({ trip: trip(), route: route(5), config: cfg() }).total, 75);

console.log('\nMARKET ADJUSTMENT AND COST FLOOR');
// 85 * 0.9 = 76.50, then rounded to the nearest 5. Rounding lands below the
// exact discount here, which is the right direction to err in.
const disc = estimate({ trip: trip(), route: route(30), config: cfg({ marketAdjustment: 0.9 }) });
check('10% off applies to the whole fare', disc.total, 75);
check('discount never rounds upward past full price',
  disc.total <= estimate({ trip: trip(), route: route(30), config: cfg() }).total, true);
check('adjustment is recorded', disc.meta.marketAdjustment, 0.9);

// The critical ordering test: the floor must win over the discount.
const floored = estimate({
  trip: trip(), route: route(5),
  config: cfg({ marketAdjustment: 0.75, vehicles: { sedan: V({ minimumFare: 60, costFloor: 55 }) } }),
});
check('cost floor beats the discount', floored.total >= 55, true);
check('floor is flagged in meta', floored.meta.costFloorApplied, true);

// A mistyped adjustment must be clamped, not obeyed.
const silly = estimate({ trip: trip(), route: route(60), config: cfg({ marketAdjustment: 0.09 }) });
check('absurd adjustment is clamped to the floor', silly.meta.marketAdjustment, 0.75);

console.log('\nFIXED ZONE PRICING');
const z = estimate({
  trip: trip({ serviceType: 'airport', pickup: { zone: 'DIA' }, dropoff: { zone: 'Downtown Denver' } }),
  route: route(25, 30, 30), config: cfg(),
});
check('zone price is used instead of per mile', z.meta.method, 'fixed_zone');
check('zone price plus airport fee', z.total, 100);          // 95 + 5 access fee
check('no deadhead charged on a fixed zone price', z.meta.deadheadMiles, 0);

const zRev = estimate({
  trip: trip({ pickup: { zone: 'Downtown Denver' }, dropoff: { zone: 'DIA' } }),
  route: route(25), config: cfg(),
});
check('zone matches in reverse too', zRev.meta.method, 'fixed_zone');

console.log('\nDEADHEAD');
// 30 + 30 empty, 20 free, so 40 chargeable at 1.50 = 60 on top of the 85
check('empty miles beyond the free allowance are charged',
  estimate({ trip: trip(), route: route(30, 30, 30), config: cfg() }).total, 145);
check('empty miles inside the allowance are free',
  estimate({ trip: trip(), route: route(30, 10, 5), config: cfg() }).total, 85);

console.log('\nHOURLY');
const wd = estimate({ trip: trip({ serviceType: 'hourly', hours: 4 }), route: null, config: cfg() });
check('weekday hourly', wd.total, 400);
const we = estimate({
  trip: trip({ serviceType: 'hourly', hours: 4, when: '2026-08-15T10:00:00Z' }),  // Saturday
  route: null, config: cfg(),
});
check('weekend hourly uses the weekend rate', we.total, 520);
check('below the minimum hours bills the minimum',
  estimate({ trip: trip({ serviceType: 'hourly', hours: 1 }), route: null, config: cfg() }).total, 300);
check('hourly is never charged deadhead',
  estimate({ trip: trip({ serviceType: 'hourly', hours: 4 }), route: route(0, 50, 50), config: cfg() }).meta.deadheadMiles, 0);

console.log('\nEXTRAS AND SURCHARGES');
check('extras are added per unit',
  estimate({ trip: trip({ extras: { extraStops: 2, childSeats: 1 } }), route: route(30), config: cfg() }).total,
  85 + 50 + 15);
check('late night surcharge applies inside the window',
  estimate({ trip: trip({ pickupTime: '02:30' }), route: route(30), config: cfg() }).total, 105);
check('late night surcharge does not apply outside it',
  estimate({ trip: trip({ pickupTime: '14:00' }), route: route(30), config: cfg() }).total, 85);

console.log('\nTAX AND ROUNDING');
check('tax is added on the subtotal',
  estimate({ trip: trip(), route: route(30), config: cfg({ taxes: { ratePercent: 10 } }) }).total, 95);
check('total rounds to the nearest 5',
  estimate({ trip: trip(), route: route(37), config: cfg() }).total % 5, 0);

console.log('\nGUARDRAILS');
check('beyond the auto quote limit is refused',
  estimate({ trip: trip(), route: route(300), config: cfg() }).reason, 'too_far_to_quote_automatically');
check('beyond the service area is refused',
  estimate({ trip: trip(), route: route(600), config: cfg() }).reason, 'outside_service_area');
check('same pickup and dropoff is refused',
  estimate({ trip: trip(), route: route(0), config: cfg() }).reason, 'same_pickup_and_dropoff');
check('a missing route is refused',
  estimate({ trip: trip(), route: null, config: cfg() }).reason, 'route_unavailable');
check('an unknown vehicle is refused',
  estimate({ trip: trip({ vehicleId: 'spaceship' }), route: route(30), config: cfg() }).reason, 'unknown_vehicle');
check('a refusal never returns a price',
  estimate({ trip: trip(), route: route(600), config: cfg() }).total, null);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
