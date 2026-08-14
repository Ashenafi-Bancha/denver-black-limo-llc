/**
 * Worked examples against the REAL rate card (pricing/dev-rates.json).
 * Run with Airport transfer, DIA to Downtown, sedan
----------------------------------------
  Denver Airport to Downtown Denver                        $89.00
  Airport access fee                                        $6.00
  Introductory pricing, 10% off                            -$9.50
                                                       ----------
  TOTAL                                                       $85
  method: fixed_zone, 25.4 miles

Point to point, 38 miles, no fixed price for it
-----------------------------------------------
  Luxury Sedan, base fare                                  $45.00
  23.0 miles at $3.2/mile                                  $73.60
  Empty miles to and from garage, 17.0 chargeable          $23.80
  Introductory pricing, 10% off                           -$14.24
                                                       ----------
  TOTAL                                                      $130
  method: per_mile, 38 miles, 17 empty miles charged

Short hop, 4 miles, minimum fare territory
------------------------------------------
  Luxury Sedan, base fare                                  $45.00
  Minimum fare applied                                     $35.00
  Introductory pricing, 10% off                            -$8.00
                                                       ----------
  TOTAL                                                       $70
  method: per_mile, 4 miles

Denver to Vail, executive SUV, two child seats
----------------------------------------------
  Denver to Vail                                          $595.00
  Child seats x2                                           $30.00
  Introductory pricing, 10% off                           -$62.50
                                                       ----------
  TOTAL                                                      $565
  method: fixed_zone, 97 miles

Hourly, 5 hours on a Saturday
-----------------------------
  Executive SUV, 5 hours at $150/hr                       $750.00
  Introductory pricing, 10% off                           -$75.00
                                                       ----------
  TOTAL                                                      $675
  method: hourly, 0 miles

Late night airport run, 2:30am
------------------------------
  Denver Airport to Downtown Denver                        $89.00
  Airport access fee                                        $6.00
  Late night pickup, 00:00 to 05:00                        $25.00
  Introductory pricing, 10% off                           -$12.00
                                                       ----------
  TOTAL                                                      $110
  method: fixed_zone, 25.4 miles

Someone asks for Denver to Las Vegas
------------------------------------
  No automatic price: outside_service_area (748 miles)
  The site shows a Request a Quote button instead. to see what the engine produces end to end.
 */
const { estimate } = require('./engine');
const { buildConfig } = require('./fromSettings');
const { zoneChain, inferZone } = require('./zones');

const config = buildConfig(require('./dev-rates.json'));
const at = (lat, lng, label) => ({ lat, lng, label, zones: zoneChain({ lat, lng, label }), zone: inferZone({ lat, lng, label }) });

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
          pickup: at(39.8607, -104.6854, 'Denver International Airport'),
          dropoff: at(39.7536, -105.0007, 'Union Station'), when: '2026-08-19T10:00:00Z' },
  route: { tripMiles: 25.4, deadheadOutMiles: 24, deadheadBackMiles: 3 },
  config,
}));

show('Downtown hotel to Vail, executive SUV, two child seats', estimate({
  trip: { serviceType: 'mountain', vehicleId: 'executive-suv',
          pickup: at(39.7439, -104.9925, 'Downtown hotel'),
          dropoff: at(39.6403, -106.3742, 'Vail'),
          when: '2026-12-19T07:00:00Z', extras: { childSeats: 2 } },
  route: { tripMiles: 100, deadheadOutMiles: 1, deadheadBackMiles: 100 },
  config,
}));

show('Steamboat by sedan, which the card marks QUOTE', estimate({
  trip: { serviceType: 'mountain', vehicleId: 'luxury-sedan',
          pickup: at(39.7439, -104.9925, 'Denver'),
          dropoff: at(40.485, -106.8317, 'Steamboat Springs'), when: '2026-08-19T10:00:00Z' },
  route: { tripMiles: 157, deadheadOutMiles: 2, deadheadBackMiles: 157 },
  config,
}));

show('Per-mile fallback, 30 miles suburb to suburb, sedan', estimate({
  trip: { serviceType: 'point-to-point', vehicleId: 'luxury-sedan',
          pickup: at(39.9, -104.8, 'Brighton'), dropoff: at(39.55, -105.1, 'Ken Caryl'),
          when: '2026-08-19T10:00:00Z' },
  route: { tripMiles: 30, deadheadOutMiles: 18, deadheadBackMiles: 22 },
  config,
}));

show('Hourly, 5 hours, Saturday (same rate: no weekend surge)', estimate({
  trip: { serviceType: 'hourly', vehicleId: 'executive-suv', hours: 5, when: '2026-08-22T18:00:00Z' },
  route: null,
  config,
}));

show('Late night airport run, 2:30am pickup', estimate({
  trip: { serviceType: 'airport', vehicleId: 'luxury-sedan',
          pickup: at(39.8607, -104.6854, 'DIA'), dropoff: at(39.7536, -105.0007, 'Downtown'),
          when: '2026-08-19T02:30:00Z', pickupTime: '02:30' },
  route: null,
  config,
}));

show('Someone asks for Denver to Las Vegas', estimate({
  trip: { serviceType: 'point-to-point', vehicleId: 'luxury-sedan',
          pickup: at(39.74, -104.99, 'Denver'), dropoff: at(36.17, -115.14, 'Las Vegas'),
          when: '2026-08-19T10:00:00Z' },
  route: { tripMiles: 748, deadheadOutMiles: 10, deadheadBackMiles: 748 },
  config,
}));

console.log('');
