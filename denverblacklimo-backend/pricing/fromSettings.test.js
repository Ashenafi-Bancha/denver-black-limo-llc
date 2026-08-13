/**
 * Tests for the admin-rates to engine-config mapping, and for the rule that
 * rate data never leaves through the public settings endpoint.
 */
const { buildConfig, readiness, publicSettingsOnly, isPrivateKey } = require('./fromSettings');
const { estimate } = require('./engine');

let passed = 0, failed = 0;
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  ok ? (passed++, console.log(`  PASS  ${name}`))
     : (failed++, console.log(`  FAIL  ${name}\n          expected ${JSON.stringify(expected)}\n          actual   ${JSON.stringify(actual)}`));
};

const filled = {
  // public content, must survive
  business: { phone: '(720) 499-6744' },
  home_hero: { subheadline: 'Luxury Chauffeured Transportation' },
  // private rate data, must not
  pricing_rates: {
    marketAdjustment: 0.9, milesIncluded: 15, bandAEndsAt: 40, bandBEndsAt: 100,
    garageAddress: 'Denver, CO', garageLat: 39.74, garageLng: -104.99,
    extraStop: 25, childSeat: 15, airportAccessFee: 6,
    lateNightFrom: '00:00', lateNightTo: '05:00', lateNightAmount: 20,
    taxPercent: '', maxAutoQuoteMiles: 250, maxServiceMiles: 500, roundTo: 5,
  },
  pricing_vehicles: [
    { id: 'luxury-sedan', name: 'Luxury Sedan', hourlyWeekday: 100, hourlyWeekend: 120,
      minimumHours: 3, startingFare: 45, perMileBandA: 3.2, perMileBandB: 2.6,
      perMileBandC: 2.1, minimumFare: 80, costFloor: 60,
      deadheadPerMile: 1.4, deadheadFreeMiles: 25 },
  ],
  pricing_zones: [
    { group: 'airport', label: 'DIA to Downtown', fromZone: 'DIA', toZone: 'Downtown Denver',
      priceLuxurySedan: 89, priceLuxurySUV: 'QUOTE', priceExecutiveSUV: '', priceLuxuryVan: 139 },
    { group: 'mountain', label: 'Denver to Vail', fromZone: 'Denver', toZone: 'Vail',
      priceLuxurySedan: 495, priceLuxurySUV: '', priceExecutiveSUV: '', priceLuxuryVan: '' },
    // every price marked QUOTE: should be dropped entirely
    { group: 'airport', label: 'DIA to Aspen', fromZone: 'DIA', toZone: 'Aspen',
      priceLuxurySedan: 'QUOTE', priceLuxurySUV: 'QUOTE', priceExecutiveSUV: 'NO', priceLuxuryVan: '' },
  ],
};

console.log('\nPRIVATE DATA NEVER LEAVES THE PUBLIC ENDPOINT');
const pub = publicSettingsOnly(filled);
check('rate keys are stripped', Object.keys(pub).sort(), ['business', 'home_hero']);
check('cost floors are not in the public payload', JSON.stringify(pub).includes('costFloor'), false);
check('market adjustment is not public', JSON.stringify(pub).includes('marketAdjustment'), false);
check('site content still passes through', pub.business.phone, '(720) 499-6744');
check('pricing_ prefix is recognised', [isPrivateKey('pricing_rates'), isPrivateKey('business')], [true, false]);

console.log('\nMAPPING ADMIN ROWS TO ENGINE CONFIG');
const cfg = buildConfig(filled);
check('vehicle is keyed by id', Object.keys(cfg.vehicles), ['luxury-sedan']);
check('numbers are parsed, not left as text', cfg.vehicles['luxury-sedan'].perMileBandA, 3.2);
check('bands carry over', cfg.bands, { milesIncluded: 15, bandAEndsAt: 40, bandBEndsAt: 100 });
check('garage coordinates carry over', [cfg.garage.lat, cfg.garage.lng], [39.74, -104.99]);
check('blank tax becomes null, not zero-percent tax', cfg.taxes.ratePercent, null);
check('market adjustment carries over', cfg.marketAdjustment, 0.9);

console.log('\nZONES');
check('airport and mountain are separated', [cfg.zones.airport.length, cfg.zones.mountain.length], [1, 1]);
check('QUOTE and blank prices are omitted',
  Object.keys(cfg.zones.airport[0].prices).sort(), ['luxury-sedan', 'luxury-van']);
check('a row with no prices at all is dropped',
  cfg.zones.airport.some(z => /aspen/i.test(z.label)), false);
check('match pair is built from the two zone names', cfg.zones.airport[0].match, ['DIA', 'Downtown Denver']);

console.log('\nREADINESS');
const r = buildConfig(filled);
check('a filled card reports ready', readiness(r).ready, true);
check('missing garage is reported',
  readiness(buildConfig({ ...filled, pricing_rates: { ...filled.pricing_rates, garageLat: '', garageLng: '' } }))
    .missing.some(m => /garage/i.test(m)), true);
check('a vehicle missing its cost floor is named',
  readiness(buildConfig({ ...filled,
    pricing_vehicles: [{ ...filled.pricing_vehicles[0], costFloor: '' }] }))
    .missing.some(m => /Luxury Sedan.*cost floor/i.test(m)), true);
check('no rates at all is not ready', readiness(buildConfig({})).ready, false);

console.log('\nTHE MAPPED CONFIG ACTUALLY PRICES');
const quote = estimate({
  trip: { serviceType: 'airport', vehicleId: 'luxury-sedan',
          pickup: { zone: 'DIA' }, dropoff: { zone: 'Downtown Denver' }, when: '2026-08-20T10:00:00Z' },
  route: { tripMiles: 25.4, deadheadOutMiles: 24, deadheadBackMiles: 3 },
  config: cfg,
});
check('a quote comes out the far end', quote.quotable, true);
check('it used the fixed zone price', quote.meta.method, 'fixed_zone');
check('89 + 6 fee, less 10 percent, rounded', quote.total, 85);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
