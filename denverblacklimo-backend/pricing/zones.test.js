/**
 * Zone inference tests: coordinates in, zone names out. These are the pins the
 * geocoder actually produces for the places customers type, so a regression
 * here is a fixed price silently going unused.
 */
const { inferZone, zoneChain, canonicalZoneName, unknownZoneNames } = require('./zones');
const { estimate } = require('./engine');

let passed = 0, failed = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? (passed++, console.log(`  PASS  ${name}`))
     : (failed++, console.log(`  FAIL  ${name}\n          expected ${JSON.stringify(expected)}\n          actual   ${JSON.stringify(actual)}`));
};

console.log('\nREAL GEOCODER PINS RESOLVE TO THE RIGHT ZONE');
// Coordinates below are what Photon returned in live tests earlier.
check('DIA terminal', inferZone({ lat: 39.8606676, lng: -104.6853673, label: 'Denver International Airport, 8500 Peña Blvd' }), 'DIA');
check('Union Station is Downtown', inferZone({ lat: 39.75363, lng: -105.0007481, label: 'Union Station, 1701 Wynkoop Street' }), 'Downtown Denver');
check('Boulder', inferZone({ lat: 40.015, lng: -105.2705, label: 'Boulder, Colorado' }), 'Boulder');
check('Vail', inferZone({ lat: 39.6403, lng: -106.3742, label: 'Vail, Colorado' }), 'Vail');
check('DTC office', inferZone({ lat: 39.6478, lng: -104.8936, label: 'Denver Tech Center' }), 'Denver Tech Center');

console.log('\nSPECIFICITY');
// A pin at the airport is inside both the DIA circle and nothing else — but a
// downtown pin is inside both Downtown (3mi) and Denver (14mi): specific wins.
check('downtown pin prefers Downtown over broad Denver',
  inferZone({ lat: 39.7439, lng: -104.9925 }), 'Downtown Denver');
// Northeast Denver, outside every district circle but inside the metro one.
check('a plain Denver pin falls back to broad Denver',
  inferZone({ lat: 39.80, lng: -104.93 }), 'Denver');
check('label mentioning the airport wins outright',
  inferZone({ lat: 0, lng: 0, label: 'Denver International Airport' }), 'DIA');

console.log('\nOUTSIDE EVERYTHING');
check('Las Vegas is no zone', inferZone({ lat: 36.17, lng: -115.14, label: 'Las Vegas' }), null);
check('missing coordinates is no zone', inferZone({ label: 'somewhere' }), null);
check('null place is no zone', inferZone(null), null);

console.log('\nNAME CANONICALISATION');
check('alias: denver airport', canonicalZoneName('Denver Airport'), 'DIA');
check('alias: DTC', canonicalZoneName('dtc'), 'Denver Tech Center');
check('exact name passes through', canonicalZoneName('Breckenridge'), 'Breckenridge');
check('unknown name is null', canonicalZoneName('Narnia'), null);

console.log('\nUNKNOWN ZONES IN A RATE CARD ARE REPORTED');
const cfgWithBadZone = {
  zones: {
    airport: [{ match: ['DIA', 'Downtown Denver'], prices: { sedan: 89 } }],
    mountain: [{ match: ['Denver', 'Narnia'], prices: { sedan: 500 } }],
  },
};
check('Narnia is flagged, the real ones are not', unknownZoneNames(cfgWithBadZone), ['Narnia']);

console.log('\nZONE-PRICED TRIPS SURVIVE A ROUTING OUTAGE');
const cfg = {
  currency: '$', marketAdjustment: 1, marketAdjustmentFloor: 0.75, roundTo: 5,
  bands: { milesIncluded: 15, bandAEndsAt: 40, bandBEndsAt: 100 },
  vehicles: { sedan: {
    name: 'Luxury Sedan', hourlyWeekday: 100, hourlyWeekend: 120, minimumHours: 3,
    startingFare: 45, perMileBandA: 3.2, perMileBandB: 2.6, perMileBandC: 2.1,
    minimumFare: 80, costFloor: 60, deadheadPerMile: 1.4, deadheadFreeMiles: 25,
  } },
  garage: { address: 'x', lat: 39.74, lng: -104.99 },
  zones: {
    airport: [{ id: 'z', label: 'DIA to Downtown Denver', match: ['DIA', 'Downtown Denver'], prices: { sedan: 89 } }],
    mountain: [],
  },
  extras: {}, surcharges: { airportAccessFee: 6, lateNight: {} },
  taxes: { ratePercent: null }, gratuity: { autoAdd: false, percent: 0 },
  limits: { maxAutoQuoteMiles: 250, maxServiceMiles: 500 },
};
const zoneTrip = {
  serviceType: 'airport', vehicleId: 'sedan',
  pickup: { zone: 'DIA' }, dropoff: { zone: 'Downtown Denver' },
  when: '2026-08-20T10:00:00Z',
};
const noRoute = estimate({ trip: zoneTrip, route: null, config: cfg });
check('quotes with route unavailable', noRoute.quotable, true);
check('used the fixed zone price', noRoute.meta.method, 'fixed_zone');
check('89 + 6 airport fee rounds to 95', noRoute.total, 95);

const noZoneNoRoute = estimate({
  trip: { ...zoneTrip, pickup: {}, dropoff: {} }, route: null, config: cfg,
});
check('no zone and no route still refuses', noZoneNoRoute.reason, 'route_unavailable');

console.log('\nZONE CHAINS: A DISTRICT ROLLS UP TO DENVER');
check('downtown hotel chain', zoneChain({ lat: 39.75363, lng: -105.0007481 }), ['Downtown Denver', 'Denver']);
check('airport chain', zoneChain({ lat: 39.8606676, lng: -104.6853673 }), ['DIA', 'Denver']);
check('Vail has no parent', zoneChain({ lat: 39.6403, lng: -106.3742 }), ['Vail']);
check('Snowmass rolls up to Aspen', zoneChain({ lat: 39.213, lng: -106.9378 }), ['Snowmass', 'Aspen']);

const chainCfg = {
  ...cfgTemplate(),
  zones: {
    airport: [{ id: 'a', label: 'DIA to Downtown Denver', match: ['DIA', 'Downtown Denver'], prices: { sedan: 89 } }],
    mountain: [{ id: 'm', label: 'Denver to Vail', match: ['Denver', 'Vail'], prices: { sedan: 475 } }],
  },
};
function cfgTemplate() {
  return {
    currency: '$', marketAdjustment: 1, marketAdjustmentFloor: 0.75, roundTo: 5,
    bands: { milesIncluded: 15, bandAEndsAt: 40, bandBEndsAt: 100 },
    vehicles: { sedan: {
      name: 'Luxury Sedan', hourlyWeekday: 100, hourlyWeekend: 120, minimumHours: 3,
      startingFare: 45, perMileBandA: 3.2, perMileBandB: 2.6, perMileBandC: 2.1,
      minimumFare: 80, costFloor: 60, deadheadPerMile: 1.4, deadheadFreeMiles: 25,
    } },
    garage: { address: 'x', lat: 39.74, lng: -104.99 },
    zones: { airport: [], mountain: [] },
    extras: {}, surcharges: { lateNight: {} },
    taxes: { ratePercent: null }, gratuity: { autoAdd: false, percent: 0 },
    limits: { maxAutoQuoteMiles: 250, maxServiceMiles: 500 },
  };
}
const downtownToVail = estimate({
  trip: {
    serviceType: 'mountain', vehicleId: 'sedan', when: '2026-08-20T10:00:00Z',
    pickup: { zones: ['Downtown Denver', 'Denver'], zone: 'Downtown Denver' },
    dropoff: { zones: ['Vail'], zone: 'Vail' },
  },
  route: { tripMiles: 100, deadheadOutMiles: 2, deadheadBackMiles: 100 },
  config: chainCfg,
});
check('a downtown hotel matches the Denver-to-Vail row', downtownToVail.meta.method, 'fixed_zone');
check('at the Vail fixed price', downtownToVail.total, 475);

const airportRun = estimate({
  trip: {
    serviceType: 'airport', vehicleId: 'sedan', when: '2026-08-20T10:00:00Z',
    pickup: { zones: ['DIA', 'Denver'], zone: 'DIA' },
    dropoff: { zones: ['Downtown Denver', 'Denver'], zone: 'Downtown Denver' },
  },
  route: null,
  config: chainCfg,
});
check('DIA to Downtown picks the exact row, not a broader one', airportRun.total, 90); // 89 -> round 5

console.log('\nWEEKEND IS DENVER TIME, NOT SERVER TIME');
// Friday 23:30 in Denver is Saturday 05:30 UTC. A UTC-based check calls this
// a weekend; the Denver-based one must not.
const fridayNightDenver = '2026-08-15T05:30:00Z'; // Fri Aug 14, 11:30pm in Denver
const fri = estimate({
  trip: { serviceType: 'hourly', vehicleId: 'sedan', hours: 3, when: fridayNightDenver },
  route: null, config: cfg,
});
check('Friday night in Denver bills the weekday rate', fri.total, 300);
// Saturday noon Denver = Saturday 18:00 UTC: unambiguous weekend.
const sat = estimate({
  trip: { serviceType: 'hourly', vehicleId: 'sedan', hours: 3, when: '2026-08-15T18:00:00Z' },
  route: null, config: cfg,
});
check('Saturday in Denver bills the weekend rate', sat.total, 360);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
