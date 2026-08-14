/**
 * Local estimator harness: the real pricing pipeline with the database and
 * the routing provider swapped for files and stubs.
 *
 *   node pricing/dev-server.js            serves /api/estimate on :3001
 *
 * Everything that matters is the production code: buildConfig, readiness,
 * inferZone and estimate are the same modules server.js uses. Only two
 * boundaries are faked:
 *
 *   - settings come from pricing/dev-rates.json instead of Postgres
 *   - route measurement uses straight-line distance x a road factor when no
 *     ORS_API_KEY is set, so per-mile quotes are approximate but present
 *
 * This exists because the production endpoint needs a database and a routing
 * key, and neither is available on a development machine. Without it, the only
 * way to see a quote end to end was to deploy first.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const { buildConfig, readiness } = require('./fromSettings');
const { estimate } = require('./engine');
const { inferZone, zoneChain, haversineMiles } = require('./zones');
const routing = require('./routing');

const RATES_FILE = path.join(__dirname, 'dev-rates.json');
const PORT = Number(process.env.PORT) || 3001;

/** Winding-road factor: straight-line miles fall short of driven miles. */
const ROAD_FACTOR = 1.3;

function loadSettings() {
  // Read on every request so editing dev-rates.json behaves like editing the
  // admin: the next quote uses the new numbers, no restart.
  return JSON.parse(fs.readFileSync(RATES_FILE, 'utf8'));
}

function approxRoute(pickup, dropoff, garage) {
  const ok = (p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng));
  if (!ok(pickup) || !ok(dropoff)) return null;
  const leg = (a, b) => Math.round(haversineMiles(a, b) * ROAD_FACTOR * 10) / 10;
  return {
    tripMiles: leg(pickup, dropoff),
    tripMinutes: 0,
    deadheadOutMiles: ok(garage) ? leg(garage, pickup) : 0,
    deadheadBackMiles: ok(garage) ? leg(dropoff, garage) : 0,
    approximate: true,
  };
}

const json = (res, code, body) => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return json(res, 204, {});
    const url = req.url.split('?')[0];

    if (url === '/api/health') return json(res, 200, { status: 'ok', harness: true });

    if (url === '/api/settings') {
      // Mirror production: rate keys never leave the public endpoint.
      const { publicSettingsOnly } = require('./fromSettings');
      return json(res, 200, publicSettingsOnly(loadSettings()));
    }

    if (url === '/api/estimate' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          const { serviceType, vehicleId, pickup, dropoff, pickupDate, pickupTime, hours, extras } =
            JSON.parse(body || '{}');

          const config = buildConfig(loadSettings());
          const state = readiness(config);
          if (!state.ready) {
            console.log('  refused: rate card incomplete ->', state.missing[0]);
            return json(res, 200, {
              quotable: false, reason: 'not_configured',
              message: 'Online pricing is not available yet. Please request a quote.',
            });
          }

          const when =
            typeof pickupDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pickupDate)
              ? `${pickupDate}T${/^\d{2}:\d{2}$/.test(pickupTime || '') ? pickupTime : '12:00'}:00-07:00`
              : new Date().toISOString();

          const trip = {
            serviceType, vehicleId, when, pickupTime, hours, extras,
            pickup: pickup ? { ...pickup, zones: zoneChain(pickup), zone: inferZone(pickup) } : null,
            dropoff: dropoff ? { ...dropoff, zones: zoneChain(dropoff), zone: inferZone(dropoff) } : null,
          };

          const hourly = serviceType === 'hourly';
          let route = null;
          if (!hourly) {
            route = routing.isConfigured()
              ? await routing.measureTrip({ pickup, dropoff, garage: config.garage })
              : approxRoute(pickup, dropoff, config.garage);
          }

          const quote = estimate({ trip, route, config });
          console.log(
            `  ${quote.quotable ? `${quote.currency}${quote.total}` : `refused (${quote.reason})`}` +
            ` | ${vehicleId} | ${serviceType}` +
            ` | zones ${trip.pickup?.zone || '-'} -> ${trip.dropoff?.zone || '-'}` +
            (route ? ` | ${route.tripMiles}mi${route.approximate ? ' (approx)' : ''}` : '')
          );
          json(res, 200, quote);
        } catch (err) {
          console.error('  error:', err.message);
          json(res, 500, { quotable: false, reason: 'error', message: 'Estimator error.' });
        }
      });
      return;
    }

    json(res, 404, {});
  })
  .listen(PORT, () => {
    const state = readiness(buildConfig(loadSettings()));
    console.log(`Estimator dev harness on :${PORT}`);
    console.log(`Rates file: ${RATES_FILE}`);
    console.log(`Routing: ${routing.isConfigured() ? 'OpenRouteService' : `straight-line x ${ROAD_FACTOR} (no ORS key)`}`);
    console.log(`Rate card: ${state.ready ? 'complete' : `INCOMPLETE - ${state.missing.length} gaps, first: ${state.missing[0]}`}`);
  });
