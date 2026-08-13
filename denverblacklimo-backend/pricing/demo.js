/**
 * Worked examples, using invented rates in roughly the right shape for Denver.
 * Run with `node pricing/demo.js` to see what the engine produces end to end.
 *
 * These are NOT the client's prices. They exist so the pipeline can be
 * demonstrated and sanity checked before the real rate card arrives.
 */
const { estimate } = require('./engine');

const config = {
  currency: '$',
  marketAdjustment: 0.9,          // entering the market ten percent under
  marketAdjustmentFloor: 0.75,
  roundTo: 5,
  bands: { milesIncluded: 15, bandAEndsAt: 40, bandBEndsAt: 100 },
  vehicles: {
    'luxury-sedan': {
      name: 'Luxury Sedan', hourlyWeekday: 100, hourlyWeekend: 120, minimumHours: 3,
      startingFare: 45, perMileBandA: 3.2, perMileBandB: 2.6, perMileBandC: 2.1,
      minimumFare: 80, costFloor: 60, deadheadPerMile: 1.4, deadheadFreeMiles: 25,
    },
    'executive-suv': {
      name: 'Executive SUV', hourlyWeekday: 125, hourlyWeekend: 150, minimumHours: 3,
      startingFare: 60, perMileBandA: 3.8, perMileBandB: 3.1, perMileBandC: 2.5,
      minimumFare: 100, costFloor: 75, deadheadPerMile: 1.7, deadheadFreeMiles: 25,
    },
  },
  garage: { address: 'Denver, CO', lat: 39.74, lng: -104.99 },
  zones: {
    airport: [{
      id: 'dia-downtown', label: 'Denver Airport to Downtown Denver',
      match: ['DIA', 'Downtown Denver'],
      prices: { 'luxury-sedan': 89, 'executive-suv': 109 },
    }],
    mountain: [{
      id: 'denver-vail', label: 'Denver to Vail',
      match: ['Denver', 'Vail'],
      prices: { 'luxury-sedan': 495, 'executive-suv': 595 },
    }],
  },
  extras: { extraStop: 25, childSeat: 15, extraLuggage: 10, pet: 20, meetAndGreet: 35 },
  surcharges: { airportAccessFee: 6, lateNight: { from: '00:00', to: '05:00', amount: 25 } },
  taxes: { ratePercent: 0, showSeparately: true },
  gratuity: { autoAdd: false, percent: 0 },
  limits: { maxAutoQuoteMiles: 250, maxServiceMiles: 500, minimumNoticeHours: 2 },
};

const show = (title, result) => {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
  if (!result.quotable) {
    console.log(`  No automatic price: ${result.reason}${result.detail ? ` (${result.detail})` : ''}`);
    console.log('  The site shows a Request a Quote button instead.');
    return;
  }
  for (const l of result.lines) {
    const amt = `${l.amount < 0 ? '-' : ''}$${Math.abs(l.amount).toFixed(2)}`;
    console.log(`  ${l.label.padEnd(52)} ${amt.padStart(10)}`);
  }
  console.log(`  ${''.padEnd(52)} ${'-'.repeat(10)}`);
  console.log(`  ${'TOTAL'.padEnd(52)} ${`$${result.total}`.padStart(10)}`);
  console.log(`  method: ${result.meta.method}, ${result.meta.tripMiles} miles` +
              (result.meta.deadheadMiles ? `, ${result.meta.deadheadMiles} empty miles charged` : '') +
              (result.meta.costFloorApplied ? ', COST FLOOR APPLIED' : ''));
};

show('Airport transfer, DIA to Downtown, sedan', estimate({
  trip: { serviceType: 'airport', vehicleId: 'luxury-sedan',
          pickup: { zone: 'DIA' }, dropoff: { zone: 'Downtown Denver' }, when: '2026-08-20T10:00:00Z' },
  route: { tripMiles: 25.4, deadheadOutMiles: 24, deadheadBackMiles: 3 },
  config,
}));

show('Point to point, 38 miles, no fixed price for it', estimate({
  trip: { serviceType: 'point-to-point', vehicleId: 'luxury-sedan',
          pickup: {}, dropoff: {}, when: '2026-08-20T10:00:00Z' },
  route: { tripMiles: 38, deadheadOutMiles: 12, deadheadBackMiles: 30 },
  config,
}));

show('Short hop, 4 miles, minimum fare territory', estimate({
  trip: { serviceType: 'point-to-point', vehicleId: 'luxury-sedan',
          pickup: {}, dropoff: {}, when: '2026-08-20T10:00:00Z' },
  route: { tripMiles: 4, deadheadOutMiles: 5, deadheadBackMiles: 5 },
  config,
}));

show('Denver to Vail, executive SUV, two child seats', estimate({
  trip: { serviceType: 'mountain', vehicleId: 'executive-suv',
          pickup: { zone: 'Denver' }, dropoff: { zone: 'Vail' },
          when: '2026-12-20T07:00:00Z', extras: { childSeats: 2 } },
  route: { tripMiles: 97, deadheadOutMiles: 8, deadheadBackMiles: 97 },
  config,
}));

show('Hourly, 5 hours on a Saturday', estimate({
  trip: { serviceType: 'hourly', vehicleId: 'executive-suv', hours: 5, when: '2026-08-22T18:00:00Z' },
  route: null,
  config,
}));

show('Late night airport run, 2:30am', estimate({
  trip: { serviceType: 'airport', vehicleId: 'luxury-sedan',
          pickup: { zone: 'DIA' }, dropoff: { zone: 'Downtown Denver' },
          when: '2026-08-20T02:30:00Z', pickupTime: '02:30' },
  route: { tripMiles: 25.4, deadheadOutMiles: 24, deadheadBackMiles: 3 },
  config,
}));

show('Someone asks for Denver to Las Vegas', estimate({
  trip: { serviceType: 'point-to-point', vehicleId: 'luxury-sedan',
          pickup: {}, dropoff: {}, when: '2026-08-20T10:00:00Z' },
  route: { tripMiles: 748, deadheadOutMiles: 10, deadheadBackMiles: 748 },
  config,
}));

console.log('');
