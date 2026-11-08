require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
/**
 * The browser origins allowed to call this API.
 *
 * A comma-separated list, because there is more than one browser client now:
 * the public site, the admin, and the driver app's web target during
 * development. Native builds of the driver app send no Origin at all and are
 * unaffected by any of this — CORS is a browser rule, not an access control.
 */
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
// One proxy hop (DigitalOcean's load balancer) sits in front of this app.
// Without trusting it, req.ip is the balancer for everyone — which would lump
// all visitors into one rate-limit bucket and record the wrong address against
// a signature.
app.set('trust proxy', 1);
app.use(
  cors({
    origin(origin, done) {
      // No Origin header: a native app, curl, or a server-to-server call.
      // Those were never subject to CORS, so refusing them here would only
      // break them without making anything safer.
      if (!origin) return done(null, true);
      done(null, allowedOrigins.includes(origin));
    },
  })
);
app.use(express.json());

/**
 * CMS image uploads.
 *
 * Files are held in memory then written to Postgres, because App Platform gives
 * each container an ephemeral disk — anything saved to ./public/uploads is gone
 * on the next deploy. Serving them back under /api/images also matters: only
 * /api is routed to this service, so a /uploads URL would hit the static site
 * and return index.html instead of the picture.
 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Please choose a JPG, PNG, WebP, GIF or AVIF image.'));
    }
    cb(null, true);
  },
});

// Legacy path — kept so any pre-existing /uploads/... value still resolves locally.
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (fs.existsSync(uploadDir)) app.use('/uploads', express.static(uploadDir));

/** Serves an uploaded image. Public: these appear on the website. */
app.get('/api/images/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT mime_type, data FROM site_images WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Image not found' });
    res.set('Content-Type', rows[0].mime_type);
    // The id is unique per upload, so the bytes behind a URL never change.
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(rows[0].data);
  } catch (err) {
    console.error('Image fetch error:', err);
    res.status(500).json({ error: 'Failed to load image' });
  }
});

// Health check (used by DigitalOcean App Platform)
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

/**
 * Whether the schema is actually current.
 *
 * Migration failures are logged, not fatal — a boot that could not apply a
 * file still serves traffic, and every route guards on a token before it
 * touches a table, so a missing table is indistinguishable from "not signed
 * in" to anyone outside. Confirming a deploy therefore meant reading the
 * runtime log in the DigitalOcean console, which needs a browser and an
 * account. This answers it with curl.
 *
 * Deliberately not folded into /api/health: that is the platform's health
 * check, and giving it a database query would restart the container every
 * time Postgres hiccuped.
 *
 * Unauthenticated, but counts only — that the schema is current is not a
 * secret, while the names of the files say what is being built and when. An
 * admin token adds those.
 */
app.get('/api/health/migrations', async (req, res) => {
  try {
    const onDisk = (await fs.promises.readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows } = await pool.query('SELECT name FROM schema_migrations;');
    const applied = new Set(rows.map((r) => r.name));
    // On disk but never recorded: either it has not run yet, or it failed and
    // the boot carried on without it. Both need a human.
    const pending = onDisk.filter((f) => !applied.has(f));

    const body = {
      upToDate: pending.length === 0,
      applied: applied.size,
      onDisk: onDisk.length,
      pending: pending.length,
    };

    if (isAdminRequest(req)) {
      body.appliedFiles = [...applied].sort();
      body.pendingFiles = pending;
    }

    // 503 so a deploy check can rely on the status code alone rather than
    // having to parse the body.
    res.status(pending.length === 0 ? 200 : 503).json(body);
  } catch (err) {
    console.error('Migration health error:', err.message);
    res.status(503).json({ upToDate: false, error: 'Could not read migration state.' });
  }
});

/**
 * True when this request carries a valid admin token.
 *
 * Unlike authenticateToken this never rejects — the caller decides what to do
 * with the answer, because the route above serves both signed-in and
 * anonymous callers.
 */
function isAdminRequest(req) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return false;
  try {
    const claims = jwt.verify(token, JWT_SECRET);
    return Boolean(claims) && (!claims.role || claims.role === 'admin');
  } catch {
    return false;
  }
}

// DB Setup (PostgreSQL) — SSL-aware pool + migration runner live in db.js
const { pool, runMigrations, MIGRATIONS_DIR } = require('./db');
const driverAuth = require('./driverAuth');
const flights = require('./flights');
const crypto = require('crypto');
const { buildTripRecordPdf } = require('./evidence');
const { priceQuote, CHARGE_KINDS, CHARGE_LABELS } = require('./quoting');
const { buildAgreementPdf, signatureBuffer, TERMS_VERSION } = require('./agreement');

// Price estimator: calculation engine, route measurement, and the mapping from
// the rates an admin edits into the shape the engine prices with.
const { estimate } = require('./pricing/engine');
const routing = require('./pricing/routing');
const {
  buildConfig,
  readiness,
  publicSettingsOnly,
  isPrivateKey,
} = require('./pricing/fromSettings');
const { inferZone, zoneChain } = require('./pricing/zones');

// Email templates + delivery live in ./emails.js
const {
  SENDER_EMAIL,
  ADMIN_NOTIFY_EMAIL,
  getResend,
  sendBookingEmails,
  sendUpdatedConfirmation,
  sendSignedAgreementEmails,
  sendDriverDispatchEmail,
  sendAffiliateFarmoutEmail,
  sendQuoteEmail,
  sendQuoteResponseEmails,
  sendInquiryEmails,
  sendAdminReply,
  sendReviewRequest,
} = require('./emails');

// Apply pending schema migrations on boot (safe & idempotent; see db.js + ./migrations).
async function initDB() {
  try {
    await runMigrations(pool);
  } catch (err) {
    console.error('Failed to run database migrations:', err);
  }
}

initDB();

const JWT_SECRET = process.env.JWT_SECRET || 'denver-black-limo-secret-2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
/**
 * More than one person signs in during handover — the owner and whoever is
 * testing. ADMIN_EMAIL takes a comma-separated list; any of them may sign in,
 * all sharing ADMIN_PASSWORD. Compared case-insensitively, since mail clients
 * capitalise addresses inconsistently.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || 'admin@denverblacklimo.com')
  .split(',')
  .map((address) => address.trim().toLowerCase())
  .filter(Boolean);

// Loud startup warnings for insecure defaults left in place.
if (ADMIN_PASSWORD === 'admin') {
  console.warn(
    'SECURITY WARNING: ADMIN_PASSWORD is still the default "admin". ' +
      'Anyone can sign into the admin dashboard. Set a strong ADMIN_PASSWORD environment variable.'
  );
}
if (JWT_SECRET === 'denver-black-limo-secret-2026') {
  console.warn('SECURITY WARNING: JWT_SECRET is using the built-in default. Set a random JWT_SECRET.');
}

// ─────────────────────────────────────────────
// ABUSE PROTECTION
// ─────────────────────────────────────────────

/**
 * Minimal in-memory rate limiter (no extra dependency). Public forms are the
 * obvious target for bots, and unchecked they fill the owner's inbox and the
 * database. Counts are per IP within a sliding window.
 */
const rateBuckets = new Map();

function rateLimit({ windowMs, max, message }) {
  return (req, res, next) => {
    const key = `${req.baseUrl || ''}${req.path}|${req.ip}`;
    const now = Date.now();
    const hits = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);

    if (hits.length >= max) {
      console.warn(`Rate limit hit: ${key} (${hits.length} requests)`);
      return res.status(429).json({ error: message || 'Too many requests. Please try again shortly.' });
    }

    hits.push(now);
    rateBuckets.set(key, hits);
    next();
  };
}

// Keep the map from growing forever.
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [key, hits] of rateBuckets) {
    const fresh = hits.filter((t) => t > cutoff);
    if (fresh.length) rateBuckets.set(key, fresh);
    else rateBuckets.delete(key);
  }
}, 15 * 60 * 1000).unref();

/**
 * Honeypot: the forms include a hidden field real users never see. Anything
 * that fills it is a bot — we return success so it does not retry, but store
 * and send nothing.
 */
function isBot(body) {
  return Boolean(body && typeof body.website === 'string' && body.website.trim());
}

/** Short, human-friendly booking reference derived from the UUID. */
function bookingRef(id) {
  return `DBL-${String(id).replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

/**
 * Checked before an id reaches a query that would otherwise fail outright on a
 * malformed uuid. Where a route can still answer usefully without it, this is
 * what lets it degrade instead of erroring.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    // A valid signature proves only that we issued this token, never what it
    // may do. Driver tokens are signed with the same secret, so without this
    // check a chauffeur's app token would open every admin route in the
    // system. Tokens predating roles carry none and were admin by definition,
    // so they are still honoured.
    if (user && user.role && user.role !== 'admin') return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Endpoints ---

// Get site settings (Public)
/** Every row from site_settings, keyed. Used by both endpoints below. */
async function loadAllSettings() {
  const result = await pool.query('SELECT key, value FROM site_settings');
  const settings = {};
  result.rows.forEach(row => { settings[row.key] = row.value; });
  return settings;
}

/**
 * Public site content. Rate data is deliberately withheld: it includes the
 * cost floor for every vehicle, which is what a job costs to run. Serving that
 * on an open endpoint would publish the business's margins to anyone who
 * asked, competitors included.
 */
app.get('/api/settings', async (req, res) => {
  try {
    res.json(publicSettingsOnly(await loadAllSettings()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/** The rate card, for the admin only. */
app.get('/api/settings/rates', authenticateToken, async (req, res) => {
  try {
    const all = await loadAllSettings();
    const rates = {};
    for (const [key, value] of Object.entries(all)) {
      if (isPrivateKey(key)) rates[key] = value;
    }
    res.json({ ...rates, _readiness: readiness(buildConfig(all)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

// Update site settings (Protected)
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: 'Key and value required' });
    
    await pool.query(
      `INSERT INTO site_settings (key, value) VALUES ($1, $2) 
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(value)]
    );
    res.json({ message: 'Settings updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Image Upload Endpoint (Protected)
app.post('/api/upload', authenticateToken, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({
        error: tooBig
          ? `That image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024}MB. Please choose a smaller one.`
          : err.message || 'Upload failed.',
      });
    }
    if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
    try {
      const { rows } = await pool.query(
        'INSERT INTO site_images (mime_type, byte_size, data) VALUES ($1, $2, $3) RETURNING id;',
        [req.file.mimetype, req.file.size, req.file.buffer]
      );
      console.log(`Image stored (${req.file.mimetype}, ${Math.round(req.file.size / 1024)}KB) as ${rows[0].id}`);
      res.json({ url: `/api/images/${rows[0].id}` });
    } catch (e) {
      console.error('Upload Error:', e);
      res.status(500).json({ error: 'Could not save the image. Please try again.' });
    }
  });
});

// Login — rate limited to blunt password guessing
app.post('/api/admin/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
}), (req, res) => {
  const { email, password } = req.body;
  const candidate = String(email || '').trim().toLowerCase();
  if (ADMIN_EMAILS.includes(candidate) && password === ADMIN_PASSWORD) {
    const accessToken = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token: accessToken });
  } else {
    res.status(401).json({ error: 'Incorrect email or password' });
  }
});

// ─────────────────────────────────────────────
// DRIVER APP — AUTHENTICATION
// ─────────────────────────────────────────────
//
// The chauffeur's half of the API. Everything here is scoped to the signed-in
// driver: no route takes a driver id, because a driver app that can ask for
// someone else's trips by changing a number in a URL is not access control.

const driverLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many sign-in attempts. Please wait a few minutes and try again.' },
});

/** The device label and address recorded against a session. */
function sessionContext(req) {
  return {
    deviceLabel: String(req.body?.device || req.headers['user-agent'] || '').slice(0, 255),
    ip: req.ip,
  };
}

app.post('/api/driver/login', driverLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await driverAuth.authenticate(email, password);

    if (!result.ok) {
      if (result.reason === 'locked') {
        return res.status(429).json({
          error: 'Too many failed attempts. Try again in a few minutes, or call the office.',
        });
      }
      if (result.reason === 'inactive') {
        return res.status(403).json({ error: 'This account is no longer active. Please call the office.' });
      }
      if (result.reason === 'no_password') {
        return res.status(403).json({ error: 'No password has been set for this account yet. Please call the office.' });
      }
      // "Wrong password" and "no such driver" are deliberately the same
      // message: anything else tells a stranger which emails are real.
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    const { driver } = result;
    const { refreshToken, expiresAt } = await driverAuth.createSession(driver.id, sessionContext(req));
    console.log(`Driver signed in: ${driver.name} <${driver.email}>`);

    res.json({
      accessToken: driverAuth.signAccessToken(driver),
      refreshToken,
      refreshExpiresAt: expiresAt,
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        vehicle: driver.vehicle_type,
      },
    });
  } catch (err) {
    console.error('Driver login error:', err.message);
    res.status(500).json({ error: 'Could not sign you in. Please try again.' });
  }
});

/**
 * Exchanges a refresh token for a new pair. The old one stops working the
 * moment this succeeds, so a stolen token surfaces as a sign-out on the real
 * device rather than as a silent passenger.
 */
app.post('/api/driver/refresh', async (req, res) => {
  try {
    const rotated = await driverAuth.rotateSession(req.body?.refreshToken, { ip: req.ip });
    if (!rotated) return res.status(403).json({ error: 'Your session has expired. Please sign in again.' });
    res.json({ accessToken: rotated.accessToken, refreshToken: rotated.refreshToken });
  } catch (err) {
    console.error('Driver refresh error:', err.message);
    res.status(500).json({ error: 'Could not refresh your session.' });
  }
});

app.post('/api/driver/logout', async (req, res) => {
  try {
    await driverAuth.revokeSession(req.body?.refreshToken);
    // Always 200: signing out must succeed even from an already-dead session,
    // or an app can get stuck unable to clear itself.
    res.json({ ok: true });
  } catch (err) {
    console.error('Driver logout error:', err.message);
    res.json({ ok: true });
  }
});

app.get('/api/driver/me', driverAuth.authenticateDriver, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, vehicle_type, vehicle_plate, default_pay,
              to_char(license_expires, 'YYYY-MM-DD')   AS license_expires,
              to_char(insurance_expires, 'YYYY-MM-DD') AS insurance_expires,
              to_char(medical_expires, 'YYYY-MM-DD')   AS medical_expires
         FROM drivers WHERE id = $1;`,
      [req.driver.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error('Driver profile error:', err.message);
    res.status(500).json({ error: 'Could not load your profile.' });
  }
});

app.post('/api/driver/password', driverAuth.authenticateDriver, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ error: 'Your new password must be at least 8 characters.' });
    }
    const check = await driverAuth.authenticate(req.driver.email, currentPassword);
    if (!check.ok) return res.status(403).json({ error: 'Your current password is not correct.' });

    await driverAuth.setPassword(req.driver.id, String(newPassword));
    // Every device is signed out, this one included: a password changed
    // because a phone went missing must not leave that phone signed in.
    res.json({ ok: true, signedOutEverywhere: true });
  } catch (err) {
    console.error('Driver password error:', err.message);
    res.status(500).json({ error: 'Could not change your password.' });
  }
});

/**
 * The driver's own trips — the endpoint the whole app hangs off.
 *
 * Scoped by the token, never by a parameter. Matching is by email rather than
 * driver_id because dispatch has always written the driver's details onto the
 * booking as a snapshot, and trips assigned before this release have no id on
 * them at all.
 */
app.get('/api/driver/trips', driverAuth.authenticateDriver, async (req, res) => {
  try {
    const scope = String(req.query.scope || 'upcoming');
    const where =
      scope === 'past'
        ? `${TRIP_AT} < now() OR b.status = 'Completed'`
        : scope === 'all'
          ? 'TRUE'
          : `(${TRIP_AT} >= now() - interval '6 hours' OR ${TRIP_AT} IS NULL) AND b.status <> 'Cancelled'`;

    const { rows } = await pool.query(
      `SELECT b.id, b.status, b.service_type, b.trip_type,
              b.pickup_date, b.pickup_time, b.pickup_location, b.dropoff_location,
              b.additional_stops, b.passengers, b.luggage, b.vehicle_preference,
              b.name AS passenger_name, b.phone AS passenger_phone,
              b.airline_name, b.flight_number, b.terminal, b.airport_direction,
              b.details, b.special_requests, b.driver_notes, b.driver_pay,
              b.driver_status, b.driver_status_at, b.driver_arrived_at,
              ${TRIP_AT} AS pickup_at
         FROM bookings b
        WHERE lower(b.driver_email) = lower($1)
          AND (${where})
        ORDER BY ${TRIP_AT} ASC NULLS LAST
        LIMIT 200;`,
      [req.driver.email]
    );

    // The passenger's email and what they are paying are deliberately absent.
    // A chauffeur needs to run the trip, not to see the customer's invoice.
    res.json(rows.map((r) => ({ ...r, reference: bookingRef(r.id) })));
  } catch (err) {
    console.error('Driver trips error:', err.message);
    res.status(500).json({ error: 'Could not load your trips.' });
  }
});

/**
 * The order a trip runs in. Not enforced as a state machine — see below.
 */
const TRIP_STATUSES = ['en_route', 'arrived', 'on_board', 'dropped_off', 'no_show'];

/**
 * The trip, if it is this driver's and still live.
 *
 * Returns a reason rather than throwing, because the three answers differ:
 * a trip that is not theirs must be indistinguishable from one that does not
 * exist, or this becomes a way to enumerate other drivers' bookings.
 */
async function driverTrip(bookingId, driver) {
  if (!UUID_RE.test(bookingId)) return { error: 404 };
  const { rows } = await pool.query(
    `SELECT id, status, driver_email FROM bookings WHERE id = $1;`,
    [bookingId]
  );
  if (!rows.length) return { error: 404 };
  const booking = rows[0];
  if ((booking.driver_email || '').toLowerCase() !== (driver.email || '').toLowerCase()) {
    return { error: 404 };
  }
  if (booking.status === 'Cancelled') return { error: 409 };
  return { booking };
}

/**
 * When the device says it happened, unless that is not credible.
 *
 * A status pressed or a photo taken with no signal is synced later and must
 * keep its own time. A clock that is wrong must not rewrite the record, so
 * anything in the future or absurdly old falls back to now.
 */
function claimedTime(raw) {
  const claimed = Date.parse(raw ?? '');
  const now = Date.now();
  return Number.isFinite(claimed) && claimed <= now + 60_000 && claimed > now - 7 * 86400_000
    ? new Date(claimed)
    : new Date(now);
}

/**
 * Records what the chauffeur pressed.
 *
 * Any status may follow any other. A state machine would be tidier and would
 * also strand a driver who pressed "arrived" one street early, at the kerb,
 * with a passenger waiting — and the office would hear about it by phone. The
 * log keeps every press including the correction, so the sequence is still
 * readable afterwards, which is what a disputed charge actually needs.
 *
 * Scoped to the signed-in driver: the booking must already be assigned to
 * them. A driver cannot move someone else's trip.
 */
app.post('/api/driver/trips/:id/status', driverAuth.authenticateDriver, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Trip not found' });

    const status = String(req.body?.status || '').trim();
    if (!TRIP_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'That is not a status this trip can be set to.' });
    }

    const { error } = await driverTrip(req.params.id, req.driver);
    if (error === 404) return res.status(404).json({ error: 'Trip not found' });
    if (error === 409) {
      return res.status(409).json({ error: 'This trip was cancelled. Please call dispatch.' });
    }

    const occurredAt = claimedTime(req.body?.occurredAt);

    const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

    // One transaction: the log and the cache of it must never disagree. The
    // first version wrote them separately and a failure on the second left an
    // event recorded against a booking that still showed no status at all.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO trip_events (booking_id, driver_id, driver_name, status, occurred_at, lat, lng, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          req.params.id,
          req.driver.id,
          req.driver.name,
          status,
          occurredAt,
          num(req.body?.lat),
          num(req.body?.lng),
          String(req.body?.note || '').trim().slice(0, 2000) || null,
        ]
      );

      // The cache of the latest event.
      //
      // Whether this press sets the arrival time is decided here rather than
      // in SQL. A CASE on $1 made Postgres deduce two types for one parameter
      // — varchar from the assignment, text from the comparison — and refuse
      // the statement. COALESCE says the rule just as plainly: arrival is set
      // once and never moved afterwards, because it is what wait time is
      // billed from, and a second "arrived" must not restart the clock.
      const arrivedAt = status === 'arrived' ? occurredAt : null;
      await client.query(
        `UPDATE bookings
            SET driver_status = $1,
                driver_status_at = $2,
                driver_arrived_at = COALESCE(driver_arrived_at, $3),
                updated_at = now()
          WHERE id = $4;`,
        [status, occurredAt, arrivedAt, req.params.id]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    console.log(`Trip ${bookingRef(req.params.id)} -> ${status} by ${req.driver.name}`);
    res.json({ ok: true, status, at: occurredAt });
  } catch (err) {
    console.error('Trip status error:', err.message);
    res.status(500).json({ error: 'Could not record that. Please try again.' });
  }
});

/** The full sequence for one trip, for the office and for disputes. */
app.get('/api/bookings/:id/events', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Booking not found' });
    const { rows } = await pool.query(
      `SELECT status, driver_name, occurred_at, recorded_at, lat, lng, note
         FROM trip_events WHERE booking_id = $1 ORDER BY occurred_at ASC;`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Trip events error:', err.message);
    res.status(500).json({ error: 'Could not load the trip history.' });
  }
});

// ─────────────────────────────────────────────
// TRIP PHOTOS
// ─────────────────────────────────────────────

/** What a photo is evidence of. Labels on a timeline, not a taxonomy. */
// 'signature' is a photograph in every respect that matters here: an image
// attached to a trip, behind the same token, in the same offline queue, shown
// in the same strip and embedded in the same record. A parallel table would
// have duplicated all of that to store one more PNG. The signer's name goes in
// `note`.
const TRIP_PHOTO_KINDS = ['vehicle_before', 'vehicle_after', 'damage', 'no_show', 'signature', 'other'];

/**
 * Larger than a CMS image: this comes off a phone camera, and a driver cannot
 * be asked to retake a photograph of a damaged seat because it was 200KB too
 * big. The app downscales before sending; this is the ceiling, not the target.
 */
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES },
  fileFilter: (req, file, cb) => {
    // No HEIC, deliberately. iPhones shoot it, but no browser renders it, so
    // accepting it would store evidence the office cannot look at. The app
    // asks the picker for JPEG.
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Photos must be JPG, PNG or WebP.'));
    }
    cb(null, true);
  },
});

/**
 * Either identity, for the one thing both sides read.
 *
 * A driver may see photographs from their own trips and an admin may see all
 * of them. Which one this is decides the query, so the guard only establishes
 * who is asking — the scoping belongs with the lookup.
 */
const authenticateAdminOrDriver = (req, res, next) => {
  const header = req.headers['authorization'];
  const token = header && header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });

  jwt.verify(token, JWT_SECRET, async (err, claims) => {
    if (err || !claims) {
      return res.status(403).json({ error: 'Your session has expired. Please sign in again.' });
    }
    // Tokens predating roles carry none and were admin by definition.
    if (!claims.role || claims.role === 'admin') {
      req.user = claims;
      return next();
    }
    if (claims.role === 'driver' && claims.sub) {
      try {
        const { rows } = await pool.query(
          'SELECT id, name, email, active FROM drivers WHERE id = $1;',
          [claims.sub]
        );
        if (!rows.length || !rows[0].active) {
          return res.status(403).json({ error: 'This account is no longer active.' });
        }
        req.driver = rows[0];
        return next();
      } catch {
        return res.status(500).json({ error: 'Could not verify your account.' });
      }
    }
    return res.status(403).json({ error: 'Not allowed.' });
  });
};

/**
 * A photograph from a trip.
 *
 * `clientId` makes a retry idempotent. An upload over a phone connection can
 * time out after the server has already committed it, and the app will send it
 * again; without this the office would see the same damaged seat twice and
 * wonder which one was real.
 */
app.post('/api/driver/trips/:id/photos', driverAuth.authenticateDriver, (req, res) => {
  photoUpload.single('photo')(req, res, async (err) => {
    try {
      if (err) {
        const tooBig = err.code === 'LIMIT_FILE_SIZE';
        return res.status(400).json({
          error: tooBig
            ? 'That photo is too large. Please try again.'
            : err.message || 'That photo could not be read.',
        });
      }
      if (!req.file) return res.status(400).json({ error: 'No photo was attached.' });

      const { error } = await driverTrip(req.params.id, req.driver);
      if (error === 404) return res.status(404).json({ error: 'Trip not found' });
      if (error === 409) {
        return res.status(409).json({ error: 'This trip was cancelled. Please call dispatch.' });
      }

      const kind = String(req.body?.kind || 'other').trim();
      if (!TRIP_PHOTO_KINDS.includes(kind)) {
        return res.status(400).json({ error: 'That is not a kind of photo this trip accepts.' });
      }

      const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
      const clientId = String(req.body?.clientId || '').trim().slice(0, 64) || null;

      const { rows } = await pool.query(
        `INSERT INTO trip_photos
           (booking_id, driver_id, driver_name, kind, note, taken_at, lat, lng, client_id,
            mime_type, byte_size, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (client_id) DO NOTHING
         RETURNING id, taken_at;`,
        [
          req.params.id,
          req.driver.id,
          req.driver.name,
          kind,
          String(req.body?.note || '').trim().slice(0, 2000) || null,
          claimedTime(req.body?.takenAt),
          num(req.body?.lat),
          num(req.body?.lng),
          clientId,
          req.file.mimetype,
          req.file.size,
          req.file.buffer,
        ]
      );

      // Nothing returned means this clientId is already stored — the retry
      // case. Answer as though it worked, because for the driver it did.
      if (!rows.length) {
        const existing = await pool.query(
          'SELECT id, taken_at FROM trip_photos WHERE client_id = $1;',
          [clientId]
        );
        return res.json({ ok: true, duplicate: true, id: existing.rows[0] && existing.rows[0].id });
      }

      console.log(
        `Trip photo ${bookingRef(req.params.id)} (${kind}, ${Math.round(req.file.size / 1024)}KB) by ${req.driver.name}`
      );
      res.status(201).json({ ok: true, id: rows[0].id, takenAt: rows[0].taken_at });
    } catch (e) {
      console.error('Trip photo upload error:', e.message);
      res.status(500).json({ error: 'Could not save that photo. Please try again.' });
    }
  });
});

/** Metadata only — never the blob. The office lists, then opens one. */
const PHOTO_COLUMNS = `id, kind, note, driver_name, taken_at, recorded_at, lat, lng, mime_type, byte_size`;

/** This trip's photos, for the office. */
app.get('/api/bookings/:id/photos', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Booking not found' });
    const { rows } = await pool.query(
      `SELECT ${PHOTO_COLUMNS} FROM trip_photos WHERE booking_id = $1 ORDER BY taken_at ASC;`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    console.error('Trip photos error:', e.message);
    res.status(500).json({ error: 'Could not load the photos.' });
  }
});

/** The driver's own list, so the app can show what it has already sent. */
app.get('/api/driver/trips/:id/photos', driverAuth.authenticateDriver, async (req, res) => {
  try {
    const { error } = await driverTrip(req.params.id, req.driver);
    if (error) return res.status(error === 409 ? 409 : 404).json({ error: 'Trip not found' });
    const { rows } = await pool.query(
      `SELECT ${PHOTO_COLUMNS} FROM trip_photos WHERE booking_id = $1 ORDER BY taken_at ASC;`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) {
    console.error('Driver trip photos error:', e.message);
    res.status(500).json({ error: 'Could not load the photos.' });
  }
});

/**
 * The picture itself.
 *
 * Behind a token, unlike /api/images. These show a damaged interior, a
 * passenger's luggage, the doorway somebody failed to come out of — none of it
 * belongs to whoever guesses a URL. A driver only ever gets their own trips'.
 */
app.get('/api/trip-photos/:id', authenticateAdminOrDriver, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.sendStatus(404);

    const { rows } = await pool.query(
      `SELECT p.mime_type, p.data, b.driver_email
         FROM trip_photos p JOIN bookings b ON b.id = p.booking_id
        WHERE p.id = $1;`,
      [req.params.id]
    );
    if (!rows.length) return res.sendStatus(404);

    if (req.driver) {
      const owner = (rows[0].driver_email || '').toLowerCase();
      if (owner !== (req.driver.email || '').toLowerCase()) return res.sendStatus(404);
    }

    res.set('Content-Type', rows[0].mime_type);
    // Private, because this is behind a token and must never land in a shared
    // cache. Immutable because a photo is never edited in place.
    res.set('Cache-Control', 'private, max-age=86400, immutable');
    res.send(rows[0].data);
  } catch (e) {
    console.error('Trip photo read error:', e.message);
    res.sendStatus(500);
  }
});

/**
 * Removing one. Admin only, on purpose: the driver who took a photograph is
 * the last person who should be able to make it disappear, and the office may
 * still need to remove one taken by mistake.
 */
app.delete('/api/trip-photos/:id', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.sendStatus(404);
    const { rowCount } = await pool.query('DELETE FROM trip_photos WHERE id = $1;', [req.params.id]);
    if (!rowCount) return res.sendStatus(404);
    console.log(`Trip photo ${req.params.id} deleted`);
    res.json({ ok: true });
  } catch (e) {
    console.error('Trip photo delete error:', e.message);
    res.status(500).json({ error: 'Could not delete that photo.' });
  }
});

/**
 * The trip record, as a PDF the office can send.
 *
 * Everything in it is already visible in the admin. The point is that it
 * leaves: a customer disputing a damage charge or a wait-time line is not
 * given a login, so the evidence has to become a document.
 *
 * Photographs are read with their bytes here, unlike every other photo route,
 * because they are being embedded rather than listed.
 */
app.get('/api/bookings/:id/record.pdf', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Booking not found' });

    const { rows } = await pool.query(
      `SELECT id, name, service_type, pickup_date, pickup_time,
              pickup_location, dropoff_location, vehicle_preference, driver_name
         FROM bookings WHERE id = $1;`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });

    const [events, photos, costs] = await Promise.all([
      pool.query(
        `SELECT status, driver_name, occurred_at, recorded_at, lat, lng, note
           FROM trip_events WHERE booking_id = $1 ORDER BY occurred_at ASC;`,
        [req.params.id]
      ),
      pool.query(
        `SELECT id, kind, note, driver_name, taken_at, recorded_at, lat, lng, mime_type, data
           FROM trip_photos WHERE booking_id = $1 ORDER BY taken_at ASC;`,
        [req.params.id]
      ),
      pool.query(
        `SELECT kind, amount, note, driver_name, incurred_at
           FROM trip_expenses WHERE booking_id = $1 ORDER BY incurred_at ASC;`,
        [req.params.id]
      ),
    ]);

    const pdf = await buildTripRecordPdf({
      // The reference is derived from the id, not stored — see bookingRef.
      booking: { ...rows[0], reference: bookingRef(rows[0].id) },
      events: events.rows,
      photos: photos.rows,
      costs: costs.rows,
    });

    const name = `Trip-Record-${bookingRef(rows[0].id)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${req.query.download ? 'attachment' : 'inline'}; filename="${name}"`
    );
    // Never cached: a record is regenerated whenever it is asked for, so a
    // photograph added this morning is in the copy sent this afternoon.
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdf);
  } catch (err) {
    console.error('Trip record error:', err.message);
    res.status(500).json({ error: 'Could not produce the trip record.' });
  }
});

// ─────────────────────────────────────────────
// QUOTING
// ─────────────────────────────────────────────

/**
 * The percentages a quote is worked out with.
 *
 * Read from the same settings row as the rest of the rate card, so the office
 * changes them in the admin rather than waiting for a deploy. The card fee in
 * particular is still unconfirmed by the client — he said 4%, his mock-up
 * shows 5% — and this is why that does not block the build.
 */
async function quotingConfig() {
  const settings = await loadAllSettings();
  const rates = settings.pricing_rates || {};
  const num = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) && String(v).trim() !== '' ? n : fallback;
  };
  return {
    // 20% is the figure on the client's mock-up; it is a default, not a rule.
    gratuityPercent: num(rates.gratuityPercent, 20),
    cardFeePercent: num(rates.cardFeePercent, 5),
    taxPercent: num(rates.taxPercent, 0),
    minimumHours: num(rates.minimumHours, 0),
  };
}

/**
 * Saves the office's own working, without telling the customer anything.
 *
 * "Save Changes" on the quote page. Deliberately separate from sending a
 * quote: an admin adjusting a deposit figure or jotting an internal note at
 * four in the afternoon must not cause an email to arrive in a customer's
 * inbox. Nothing here is customer-facing except the notes field they already
 * see on their booking.
 */
app.patch('/api/bookings/:id/payment', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Booking not found' });
    const body = req.body || {};

    const money2 = (v) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
    };
    const oneOf = (v, allowed) => (allowed.includes(String(v)) ? String(v) : null);
    const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);

    const { rowCount } = await pool.query(
      `UPDATE bookings
          SET status           = COALESCE($1, status),
              payment_status   = COALESCE($2, payment_status),
              payment_method   = COALESCE($3, payment_method),
              payment_option   = COALESCE($4, payment_option),
              deposit_required = COALESCE($5, deposit_required),
              balance_due_date = COALESCE($6, balance_due_date),
              internal_notes   = COALESCE($7, internal_notes),
              special_requests = COALESCE($8, special_requests),
              updated_at       = now()
        WHERE id = $9;`,
      [
        oneOf(body.status, ['Pending', 'Reviewed', 'Quoted', 'Confirmed', 'Completed', 'Cancelled']),
        oneOf(body.paymentStatus, [
          'Pending Quote', 'Quote Sent', 'Deposit Requested', 'Deposit Paid',
          'Balance Due', 'Balance Payment Requested', 'Fully Paid',
        ]),
        oneOf(body.paymentMethod, ['payment_link', 'venmo', 'zelle', 'cash', 'credit_card']),
        oneOf(body.paymentOption, ['full', 'deposit']),
        money2(body.depositRequired),
        date(body.balanceDueDate),
        body.internalNotes === undefined ? null : String(body.internalNotes).slice(0, 4000),
        body.customerNotes === undefined ? null : String(body.customerNotes).slice(0, 4000),
        req.params.id,
      ]
    );
    if (!rowCount) return res.status(404).json({ error: 'Booking not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Payment save error:', err.message);
    res.status(500).json({ error: 'Could not save those changes.' });
  }
});

/**
 * Sends the customer their confirmation again, with whatever has changed.
 */
app.post('/api/bookings/:id/confirmation', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Booking not found' });
    const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1;', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });

    const booking = { ...rows[0], reference: bookingRef(rows[0].id) };
    const sent = await sendUpdatedConfirmation(booking);
    if (!sent.ok) {
      return res.status(502).json({ error: sent.error || 'The confirmation could not be sent.' });
    }

    console.log(`Updated confirmation sent: ${booking.reference} to ${booking.email}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Confirmation resend error:', err.message);
    res.status(500).json({ error: 'Could not send that confirmation.' });
  }
});

/**
 * Records money actually received.
 *
 * Each payment is its own row — the client was explicit that a deposit and
 * the balance that follows it are two separate events. The booking's payment
 * status is derived from the ledger rather than set by hand, so it cannot
 * disagree with the money.
 */
app.post('/api/bookings/:id/payments', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Booking not found' });
    const body = req.body || {};

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ error: 'Enter the amount received.' });
    }
    const kind = ['deposit', 'balance', 'full', 'refund'].includes(String(body.kind))
      ? String(body.kind)
      : 'deposit';
    // Only a refund may be negative; anything else is a typo heading for a
    // customer's statement.
    if (amount < 0 && kind !== 'refund') {
      return res.status(400).json({ error: 'Only a refund can be a negative amount.' });
    }

    await pool.query(
      `INSERT INTO booking_payments (booking_id, kind, amount, method, reference, received_at, recorded_by, note)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()), $7, $8);`,
      [
        req.params.id,
        kind,
        Math.round(amount * 100) / 100,
        String(body.method || '').slice(0, 32) || null,
        String(body.reference || '').slice(0, 500) || null,
        /^\d{4}-\d{2}-\d{2}/.test(String(body.receivedAt || '')) ? body.receivedAt : null,
        'admin',
        String(body.note || '').slice(0, 1000) || null,
      ]
    );

    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid,
              (SELECT quote_total FROM bookings WHERE id = $1) AS total
         FROM booking_payments WHERE booking_id = $1;`,
      [req.params.id]
    );
    const paid = Number(rows[0].paid);
    const total = Number(rows[0].total) || 0;

    // Derived, never typed: the status and the ledger are the same fact.
    const status = total > 0 && paid >= total ? 'Fully Paid' : paid > 0 ? 'Deposit Paid' : 'Quote Sent';
    await pool.query(
      'UPDATE bookings SET payment_status = $1, updated_at = now() WHERE id = $2;',
      [status, req.params.id]
    );

    console.log(`Payment ${bookingRef(req.params.id)} ${kind} ${money(amount)} (paid ${money(paid)} of ${money(total)})`);
    res.status(201).json({ ok: true, paid, total, balanceDue: Math.max(0, Math.round((total - paid) * 100) / 100), paymentStatus: status });
  } catch (err) {
    console.error('Payment record error:', err.message);
    res.status(500).json({ error: 'Could not record that payment.' });
  }
});

/** What has been paid on a booking, and what is left. */
app.get('/api/bookings/:id/payments', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Booking not found' });
    const { rows } = await pool.query(
      `SELECT id, kind, amount, method, reference, received_at, recorded_by, note
         FROM booking_payments WHERE booking_id = $1 ORDER BY received_at ASC;`,
      [req.params.id]
    );
    const { rows: sum } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS paid,
              (SELECT quote_total FROM bookings WHERE id = $1) AS total
         FROM booking_payments WHERE booking_id = $1;`,
      [req.params.id]
    );
    const paid = Number(sum[0].paid);
    const total = Number(sum[0].total) || 0;
    res.json({ payments: rows, paid, total, balanceDue: Math.max(0, Math.round((total - paid) * 100) / 100) });
  } catch (err) {
    console.error('Payments read error:', err.message);
    res.status(500).json({ error: 'Could not load the payments.' });
  }
});

/**
 * A price as it appears on a quote line.
 *
 * emails.js has its own money() for the templates; this is deliberately a
 * separate two-line helper rather than an import, because the two format for
 * different places and coupling them would mean a change to an email changing
 * what is written into the database.
 */
const money = (n) => `\$${(Number(n) || 0).toFixed(2)}`;

/** The charge catalogue, so the admin does not keep its own copy. */
app.get('/api/quotes/charge-kinds', authenticateToken, async (req, res) => {
  try {
    const config = await quotingConfig();
    const rates = (await loadAllSettings()).pricing_rates || {};
    // Suggested unit rates come from the rate card where it has one, so the
    // office is not retyping $20 for a stop on every quote.
    const suggested = {
      additional_stop: rates.extraStop,
      child_seat: rates.childSeat,
      meet_greet: rates.meetAndGreet,
      airport_fee: rates.airportAccessFee,
      late_night: rates.lateNightAmount,
    };
    res.json({
      kinds: CHARGE_KINDS.map((kind) => ({
        kind,
        label: CHARGE_LABELS[kind],
        suggestedRate: suggested[kind] === undefined || suggested[kind] === '' ? null : Number(suggested[kind]),
      })),
      config,
    });
  } catch (err) {
    console.error('Charge kinds error:', err.message);
    res.status(500).json({ error: 'Could not load the charge list.' });
  }
});

/**
 * Methods that cost the company nothing to collect.
 *
 * The card fee arrives from the client as a flag while the payment method
 * arrives as its own field, so the two can disagree — and a processing fee
 * charged on cash is indefensible on an invoice. The flag is honoured for
 * anything else, including a method the office has not chosen yet, so this
 * can only ever remove a fee, never add one.
 */
const FEE_FREE_METHODS = new Set(['cash', 'zelle', 'venmo']);

function pricingInput(body = {}) {
  const method = String(body.paymentMethod || '').trim().toLowerCase();
  return FEE_FREE_METHODS.has(method) ? { ...body, cardFeeApplies: false } : body;
}

/**
 * What a quote would come to, without saving anything.
 *
 * The quote page calls this on every change rather than doing the arithmetic
 * itself. One calculation, in one place: a second copy in TypeScript would
 * drift from this one, and the first anybody would know is a customer being
 * emailed a total the admin never saw. The client was explicit that the
 * figures must be right.
 */
app.post('/api/quotes/preview', authenticateToken, async (req, res) => {
  try {
    const config = await quotingConfig();
    res.json(priceQuote({ ...pricingInput(req.body || {}), config }));
  } catch (err) {
    console.error('Quote preview error:', err.message);
    res.status(500).json({ error: 'Could not work out that price.' });
  }
});

// ─────────────────────────────────────────────
// TRIP EXPENSES
// ─────────────────────────────────────────────

const TRIP_EXPENSE_KINDS = ['toll', 'parking', 'fuel', 'cleaning', 'other'];

/**
 * A single sum is capped well above any real toll or airport structure, so a
 * fat-fingered 12500 instead of 125.00 is refused rather than invoiced.
 */
const MAX_EXPENSE = 2000;

/**
 * Something the chauffeur paid for on this trip.
 *
 * Scoped to the signed-in driver like every other driver route, and
 * idempotent on clientId for the same reason photographs are: a submission
 * can time out after the server has already committed it.
 */
app.post('/api/driver/trips/:id/expenses', driverAuth.authenticateDriver, async (req, res) => {
  try {
    const { error } = await driverTrip(req.params.id, req.driver);
    if (error === 404) return res.status(404).json({ error: 'Trip not found' });
    if (error === 409) {
      return res.status(409).json({ error: 'This trip was cancelled. Please call dispatch.' });
    }

    const kind = String(req.body?.kind || 'other').trim();
    if (!TRIP_EXPENSE_KINDS.includes(kind)) {
      return res.status(400).json({ error: 'That is not an expense this trip accepts.' });
    }

    // Number(), not parseFloat: "12.50abc" should be refused outright rather
    // than quietly becoming 12.50 on somebody's invoice.
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Enter the amount you paid.' });
    }
    if (amount > MAX_EXPENSE) {
      return res.status(400).json({ error: `That is over the $${MAX_EXPENSE} limit. Call dispatch.` });
    }

    const clientId = String(req.body?.clientId || '').trim().slice(0, 64) || null;
    const photoId = UUID_RE.test(String(req.body?.photoId || '')) ? req.body.photoId : null;

    const { rows } = await pool.query(
      `INSERT INTO trip_expenses
         (booking_id, driver_id, driver_name, kind, amount, note, incurred_at, photo_id, client_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (client_id) DO NOTHING
       RETURNING id, amount, incurred_at;`,
      [
        req.params.id,
        req.driver.id,
        req.driver.name,
        kind,
        amount.toFixed(2),
        String(req.body?.note || '').trim().slice(0, 500) || null,
        claimedTime(req.body?.incurredAt),
        photoId,
        clientId,
      ]
    );

    if (!rows.length) {
      const existing = await pool.query(
        'SELECT id FROM trip_expenses WHERE client_id = $1;',
        [clientId]
      );
      return res.json({ ok: true, duplicate: true, id: existing.rows[0] && existing.rows[0].id });
    }

    console.log(
      `Trip expense ${bookingRef(req.params.id)} ${kind} $${amount.toFixed(2)} by ${req.driver.name}`
    );
    res.status(201).json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error('Trip expense error:', err.message);
    res.status(500).json({ error: 'Could not save that. Please try again.' });
  }
});

const EXPENSE_COLUMNS =
  'id, kind, amount, note, driver_name, incurred_at, recorded_at, photo_id';

/** What this trip cost, for the office. Totalled in SQL so nothing re-adds it. */
app.get('/api/bookings/:id/expenses', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Booking not found' });
    const { rows } = await pool.query(
      `SELECT ${EXPENSE_COLUMNS} FROM trip_expenses WHERE booking_id = $1 ORDER BY incurred_at ASC;`,
      [req.params.id]
    );
    const { rows: sum } = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM trip_expenses WHERE booking_id = $1;',
      [req.params.id]
    );
    // Coerced here rather than left as the string node-pg returns, so the
    // admin is not the place that has to remember.
    res.json({ expenses: rows, total: Number(sum[0].total) });
  } catch (err) {
    console.error('Trip expenses read error:', err.message);
    res.status(500).json({ error: 'Could not load the expenses.' });
  }
});

/** The driver's own, so the app can show what it has already sent. */
app.get('/api/driver/trips/:id/expenses', driverAuth.authenticateDriver, async (req, res) => {
  try {
    const { error } = await driverTrip(req.params.id, req.driver);
    if (error) return res.status(error === 409 ? 409 : 404).json({ error: 'Trip not found' });
    const { rows } = await pool.query(
      `SELECT ${EXPENSE_COLUMNS} FROM trip_expenses WHERE booking_id = $1 ORDER BY incurred_at ASC;`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Driver expenses read error:', err.message);
    res.status(500).json({ error: 'Could not load the expenses.' });
  }
});

/**
 * Removing one. Admin only, like deleting a photograph: this is what a driver
 * is owed, and they should not be able to make it disappear either way.
 */
app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.sendStatus(404);
    const { rowCount } = await pool.query('DELETE FROM trip_expenses WHERE id = $1;', [req.params.id]);
    if (!rowCount) return res.sendStatus(404);
    console.log(`Trip expense ${req.params.id} deleted`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Trip expense delete error:', err.message);
    res.status(500).json({ error: 'Could not delete that.' });
  }
});

// ─────────────────────────────────────────────
// DRIVER ACCOUNTS — ADMIN SIDE
// ─────────────────────────────────────────────

/**
 * Sets or resets a driver's password and returns it once, in the clear, so the
 * office can pass it on. It is never retrievable again — only replaceable.
 */
app.post('/api/drivers/:id/password', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Driver not found' });
    const { rows } = await pool.query('SELECT id, name, email FROM drivers WHERE id = $1;', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Driver not found' });

    const supplied = req.body?.password ? String(req.body.password) : null;
    if (supplied && supplied.length < 8) {
      return res.status(400).json({ error: 'A password must be at least 8 characters.' });
    }
    const password = supplied || driverAuth.generatePassword();
    const endedSessions = await driverAuth.setPassword(req.params.id, password);

    console.log(`Password set for driver ${rows[0].name}; ${endedSessions} session(s) ended`);
    res.json({ ok: true, password, signedOutDevices: endedSessions });
  } catch (err) {
    console.error('Set driver password error:', err.message);
    res.status(500).json({ error: 'Could not set this password.' });
  }
});

/** The devices a driver is signed in on, so the office can see and end them. */
app.get('/api/drivers/:id/sessions', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Driver not found' });
    const { rows } = await pool.query(
      `SELECT id, device_label, last_ip, created_at, last_used_at, expires_at, revoked_at
         FROM driver_sessions
        WHERE driver_id = $1
        ORDER BY last_used_at DESC
        LIMIT 50;`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Driver sessions error:', err.message);
    res.status(500).json({ error: 'Could not load the sessions.' });
  }
});

/** Remote sign-out — the promise made in the driver app's scope. */
app.delete('/api/drivers/:id/sessions', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Driver not found' });
    const ended = await driverAuth.revokeAllSessions(req.params.id);
    res.json({ ok: true, signedOutDevices: ended });
  } catch (err) {
    console.error('Revoke driver sessions error:', err.message);
    res.status(500).json({ error: 'Could not sign this driver out.' });
  }
});

/**
 * Price estimate for a trip.
 *
 * Deliberately strict about refusing. A quote the business cannot honour is
 * worse than no quote, so anything uncertain returns `quotable: false` and the
 * site invites the customer to request one instead.
 *
 * Rate limited harder than the booking form: this endpoint costs money per
 * call through the routing provider, and nobody legitimately needs sixty
 * quotes in a quarter of an hour.
 */
app.post('/api/estimate', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many price checks from this device. Please call us at (720) 499-6744.',
}), async (req, res) => {
  try {
    // Rates come from the admin, read fresh so a change takes effect at once.
    // Refuse outright while any of them are missing: better a missing feature
    // than a wrong price the business is then expected to honour.
    const PRICING = buildConfig(await loadAllSettings());
    const state = readiness(PRICING);
    if (!state.ready) {
      console.warn(`Estimate refused, rate card incomplete: ${state.missing[0]}`);
      return res.json({
        quotable: false,
        reason: 'not_configured',
        message: 'Online pricing is not available yet. Please request a quote.',
      });
    }
    const { serviceType, vehicleId, pickup, dropoff, pickupDate, pickupTime, hours, extras } = req.body || {};
    if (!vehicleId || !serviceType) {
      return res.status(400).json({ error: 'Vehicle and service type are required.' });
    }

    // The customer states a Denver calendar date and clock time; weekend and
    // late-night pricing hang off them. The instant is pinned with a fixed
    // Denver-region offset rather than the visitor's browser zone, so someone
    // planning from New York prices the same trip as someone in Denver.
    // (-07:00 is exact in winter and one hour early in summer, which can never
    // move the calendar date backwards — the weekday stays right either way.)
    const when =
      typeof pickupDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pickupDate)
        ? `${pickupDate}T${/^\d{2}:\d{2}$/.test(pickupTime || '') ? pickupTime : '12:00'}:00-07:00`
        : (req.body || {}).when;

    // The customer picks addresses; the rate card prices routes by zone name.
    // Zones are inferred here, server side — nobody booking a car should have
    // to know our zone map, and the browser is not trusted to assert one.
    const trip = {
      serviceType,
      vehicleId,
      when,
      pickupTime,
      hours,
      extras,
      pickup: pickup ? { ...pickup, zones: zoneChain(pickup), zone: inferZone(pickup) } : null,
      dropoff: dropoff ? { ...dropoff, zones: zoneChain(dropoff), zone: inferZone(dropoff) } : null,
    };

    // Route measurement feeds the per-mile path, deadhead and the distance
    // guardrails. A zone-priced trip needs none of those, so a measurement
    // failure — provider down, key missing, odd address — only refuses trips
    // that would have needed the distance. The engine decides which is which.
    const hourly = serviceType === 'hourly';
    let route = null;
    if (!hourly && routing.isConfigured()) {
      route = await routing.measureTrip({ pickup, dropoff, garage: PRICING.garage });
    }

    const quote = estimate({ trip, route, config: PRICING });

    // Every quote shown is recorded, so when a customer rings quoting a price
    // there is a record of exactly what the site told them.
    console.log(
      `Estimate ${quote.quotable ? `${quote.currency}${quote.total}` : `refused (${quote.reason})`} ` +
      `| ${vehicleId} | ${serviceType} | ${route ? `${route.tripMiles}mi` : hourly ? `${hours}h` : 'zone'}`
    );

    res.json(quote);
  } catch (err) {
    console.error('Estimate failed:', err.message);
    res.status(500).json({
      quotable: false,
      reason: 'error',
      message: 'Something went wrong working out that price. Please request a quote.',
    });
  }
});

// Submit a new booking
/**
 * Flight schedule lookup for the booking form: fills in the arrival time and
 * shows where the customer is flying from. Public, so it is rate limited per
 * IP to protect the provider's monthly quota; flights.js caches on top.
 */
app.get('/api/flights/lookup', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: 'Too many flight lookups. Please try again in a few minutes.',
}), async (req, res) => {
  if (!flights.isConfigured()) return res.json({ found: false, reason: 'unavailable' });
  const { flight, date, direction } = req.query;
  try {
    const result = await flights.lookupFlight({
      flight: String(flight || ''),
      date: String(date || ''),
      direction: String(direction || '').toLowerCase(),
    });
    res.json(result);
  } catch (err) {
    console.error('Flight lookup error:', err.message);
    res.json({ found: false, reason: 'unavailable' });
  }
});

/**
 * How the flight is actually running, for the chauffeur meeting it.
 *
 * The flight time on a booking is the schedule as it was published when the
 * booking was taken, which can be months before the trip. On the day the plane
 * is early, late or diverted, and the driver has been finding that out by
 * standing in the terminal.
 *
 * The flight number and date come off the booking, never from the client: this
 * is a metered provider, and a parameter would let a signed-in driver spend the
 * month's quota on any flight they liked.
 */

/**
 * The quota is the constraint, not the traffic. The free plan allows 600 units
 * a month and a lookup costs 2, so roughly 300 a month across the whole site,
 * shared with the public booking form. Three things keep this route inside it:
 * an answer at most ten minutes old is reused, so one flight costs at most six
 * lookups an hour however many drivers are watching it; only a trip that is
 * nearly due is looked up at all; and the app asks once per card rather than
 * polling.
 */
const FLIGHT_MAX_AGE_MS = 10 * 60 * 1000;

// Interpolated into an interval literal, so they are numbers written here and
// never anything that arrived in a request.
const FLIGHT_WINDOW_BEFORE_HOURS = 6;
const FLIGHT_WINDOW_AFTER_HOURS = 3;

app.get(
  '/api/driver/trips/:id/flight',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Checking that flight too often. Please try again shortly.',
  }),
  driverAuth.authenticateDriver,
  async (req, res) => {
    try {
      const { error } = await driverTrip(req.params.id, req.driver);
      if (error === 404) return res.status(404).json({ error: 'Trip not found' });
      if (error === 409) {
        return res.status(409).json({ error: 'This trip was cancelled. Please call dispatch.' });
      }

      // The window is tested in SQL, not here. `pickup_date` is text and
      // TRIP_AT casts it to a zoneless timestamp, so comparing it to now() in
      // JavaScript would be out by the server's UTC offset — six or seven
      // hours in Denver, which is most of the window. In SQL it is the same
      // comparison the trips list already makes.
      const { rows } = await pool.query(
        `SELECT flight_number, airport_direction, pickup_date,
                ${TRIP_AT} IS NOT NULL AS has_time,
                (${TRIP_AT} BETWEEN now() - interval '${FLIGHT_WINDOW_AFTER_HOURS} hours'
                                AND now() + interval '${FLIGHT_WINDOW_BEFORE_HOURS} hours')
                  AS in_window
           FROM bookings WHERE id = $1;`,
        [req.params.id]
      );
      const booking = rows[0] || {};
      if (!String(booking.flight_number || '').trim()) {
        return res.json({ found: false, reason: 'no_flight' });
      }

      // Outside it the published time on the card is all anyone needs, and a
      // lookup would be quota spent on a flight that has not been scheduled
      // into an aircraft yet. A booking with no usable time is looked up
      // anyway — there is nothing to place it by, and it is one call.
      if (booking.has_time && !booking.in_window) {
        return res.json({ found: false, reason: 'too_early' });
      }

      const result = await flights.lookupFlight({
        flight: booking.flight_number,
        // The pick-up date, which is what the booking form has always sent.
        // It is the arrival date for a red-eye that took off the day before,
        // and the provider is forgiving about that; a flight it cannot place
        // comes back not_found rather than wrong.
        date: String(booking.pickup_date || ''),
        direction: /depart/i.test(String(booking.airport_direction || '')) ? 'departure' : 'arrival',
        maxAgeMs: FLIGHT_MAX_AGE_MS,
      });
      res.json(result);
    } catch (err) {
      console.error('Driver flight lookup error:', err.message);
      res.json({ found: false, reason: 'unavailable' });
    }
  }
);

app.post('/api/bookings', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many booking requests from this device. Please call us at (720) 499-6744.',
}), async (req, res) => {
  try {
    const data = req.body;

    // Hidden-field trap: pretend it worked, but store and send nothing.
    if (isBot(data)) {
      console.warn('Blocked bot booking submission (honeypot).');
      return res.status(201).json({ id: 'ignored', message: 'Booking received' });
    }

    // Basic validation
    if (!data.name || !data.email || !data.phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required fields.' });
    }

    const query = `
      INSERT INTO bookings (
        name, phone, email, company, service_type, trip_type, airport_direction,
        airline_code, airline_name, terminal, flight_number, pickup_date,
        pickup_time, pickup_location, dropoff_location, additional_stops,
        return_pickup_location, return_date, return_time, passengers,
        luggage, vehicle_preference, special_requests, details,
        return_flight_number, return_airline_name, return_airline_code,
        return_dropoff_location, return_additional_stops, agreement_token, estimate_shown
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
      ) RETURNING id;
    `;
    const values = [
      data.name, data.phone, data.email, data.company, data.serviceType, data.tripType,
      data.airportDirection, data.airlineCode, data.airline, data.terminal,
      data.flightNumber, data.pickupDate, data.pickupTime, data.pickupLocation,
      data.dropoffLocation, data.additionalStops, data.returnPickupLocation,
      data.returnDate, data.returnTime, data.passengers, data.luggage,
      data.vehiclePreference, data.specialRequests,
      data.details ? JSON.stringify(data.details) : null,
      data.returnFlightNumber, data.returnAirline, data.returnAirlineCode,
      data.returnDropoffLocation, data.returnAdditionalStops,
      // The signing link is only as private as this token, so it comes from a
      // cryptographic source rather than anything derived from the booking.
      crypto.randomBytes(32).toString('hex'),
      // What the website showed this customer. Recorded rather than trusted:
      // it is only ever read back to the office, never used to price anything.
      Number.isFinite(Number(data.estimateShown)) && Number(data.estimateShown) > 0
        ? Number(data.estimateShown)
        : null,
    ];

    const result = await pool.query(query, values);
    const bookingId = result.rows[0].id;
    const agreementToken = values[values.length - 2];

    // Send emails in background (non-blocking)
    sendBookingEmails({
      name: data.name,
      phone: data.phone,
      email: data.email,
      company: data.company,
      service_type: data.serviceType,
      trip_type: data.tripType,
      airport_direction: data.airportDirection,
      airline_code: data.airlineCode,
      airline_name: data.airline,
      terminal: data.terminal,
      flight_number: data.flightNumber,
      pickup_date: data.pickupDate,
      pickup_time: data.pickupTime,
      pickup_location: data.pickupLocation,
      dropoff_location: data.dropoffLocation,
      additional_stops: data.additionalStops,
      return_pickup_location: data.returnPickupLocation,
      return_date: data.returnDate,
      return_time: data.returnTime,
      return_flight_number: data.returnFlightNumber,
      return_airline_name: data.returnAirline,
      return_dropoff_location: data.returnDropoffLocation,
      return_additional_stops: data.returnAdditionalStops,
      passengers: data.passengers,
      luggage: data.luggage,
      vehicle_preference: data.vehiclePreference,
      special_requests: data.specialRequests,
      details: data.details,
      reference: bookingRef(bookingId),
      agreement_token: agreementToken,
    }, bookingId);

    res.status(201).json({ id: bookingId, reference: bookingRef(bookingId), message: 'Booking received' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// ─────────────────────────────────────────────
// RESERVATION AGREEMENT — READ AND SIGN
// ─────────────────────────────────────────────
//
// The customer's confirmation email carries a private link to these routes.
// The token is the only credential: it is 64 hex characters from a
// cryptographic source, and it is the reason these routes can be public.
//
// A signature is written once. Signing again is refused rather than allowed to
// overwrite the record, because the record is the evidence.

/** Looks up a booking by signing token, with its signature if it has one. */
async function loadAgreement(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{32,64}$/i.test(token)) return null;
  const { rows } = await pool.query(
    `SELECT b.*, s.signer_name, s.signature_png, s.signed_at AS signature_at,
            s.signer_ip, s.signer_user_agent, s.terms_version
       FROM bookings b
       LEFT JOIN agreement_signatures s ON s.booking_id = b.id
      WHERE b.agreement_token = $1
      LIMIT 1;`,
    [token]
  );
  if (!rows.length) return null;
  const b = rows[0];
  const signature = b.signature_at
    ? {
        signer_name: b.signer_name,
        signature_png: b.signature_png,
        signed_at: b.signature_at,
        signer_ip: b.signer_ip,
        signer_user_agent: b.signer_user_agent,
        terms_version: b.terms_version,
      }
    : null;
  return { booking: { ...b, reference: bookingRef(b.id) }, signature };
}

/**
 * What the signing page needs to render: enough of the trip for the customer
 * to recognise it, and nothing that would matter if the link were forwarded.
 */
app.get('/api/agreement/:token', async (req, res) => {
  try {
    const found = await loadAgreement(req.params.token);
    if (!found) return res.status(404).json({ error: 'This signing link is not valid.' });
    const { booking: b, signature } = found;
    res.json({
      reference: b.reference,
      name: b.name,
      email: b.email,
      serviceType: b.service_type,
      pickupDate: b.pickup_date,
      pickupTime: b.pickup_time,
      pickupLocation: b.pickup_location,
      dropoffLocation: b.dropoff_location,
      vehicle: b.vehicle_preference,
      passengers: b.passengers,
      termsVersion: TERMS_VERSION,
      signed: Boolean(signature),
      signedAt: signature ? signature.signed_at : null,
      signerName: signature ? signature.signer_name : null,
    });
  } catch (err) {
    console.error('Agreement lookup error:', err.message);
    res.status(500).json({ error: 'Could not load this agreement.' });
  }
});

/** The agreement PDF — the signed copy once it exists, otherwise the blank one. */
app.get('/api/agreement/:token/pdf', async (req, res) => {
  try {
    const found = await loadAgreement(req.params.token);
    if (!found) return res.status(404).json({ error: 'This signing link is not valid.' });
    const pdf = await buildAgreementPdf(found);
    const name = `Reservation-Agreement-${found.booking.reference}${found.signature ? '-signed' : ''}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${name}"`);
    res.send(pdf);
  } catch (err) {
    console.error('Agreement PDF error:', err.message);
    res.status(500).json({ error: 'Could not produce the agreement.' });
  }
});

/**
 * Records the signature, then sends the countersigned copy to the customer and
 * the office. Rate limited because it is public and it writes.
 */
app.post('/api/agreement/:token/sign', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  message: 'Too many attempts. Please wait a few minutes, or call us at (720) 499-6744.',
}), async (req, res) => {
  try {
    const found = await loadAgreement(req.params.token);
    if (!found) return res.status(404).json({ error: 'This signing link is not valid.' });
    if (found.signature) {
      return res.status(409).json({
        error: 'This agreement has already been signed.',
        signedAt: found.signature.signed_at,
        signerName: found.signature.signer_name,
      });
    }

    const { signerName, signaturePng, agreed } = req.body || {};
    const name = String(signerName || '').trim();
    if (agreed !== true) {
      return res.status(400).json({ error: 'Please tick the box to confirm you agree to the terms.' });
    }
    if (name.length < 2 || name.length > 120) {
      return res.status(400).json({ error: 'Please type your full name as your signature.' });
    }
    if (!signatureBuffer(signaturePng)) {
      return res.status(400).json({ error: 'Please sign in the box before submitting.' });
    }

    const ip = String(req.ip || '').slice(0, 64);
    const agent = String(req.get('user-agent') || '').slice(0, 400);

    // ON CONFLICT guards the double tap: two submissions land, the first wins,
    // and the second is reported back as already signed rather than duplicating.
    const inserted = await pool.query(
      `INSERT INTO agreement_signatures
         (booking_id, signer_name, signature_png, signer_ip, signer_user_agent, terms_version)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (booking_id) DO NOTHING
       RETURNING signed_at;`,
      [found.booking.id, name, signaturePng, ip, agent, TERMS_VERSION]
    );
    if (!inserted.rows.length) {
      return res.status(409).json({ error: 'This agreement has already been signed.' });
    }
    const signedAt = inserted.rows[0].signed_at;
    await pool.query('UPDATE bookings SET agreement_signed_at = $1, updated_at = now() WHERE id = $2;', [
      signedAt,
      found.booking.id,
    ]);
    console.log(`Agreement signed: ${found.booking.reference} by ${name} (${ip})`);

    // The customer is not kept waiting on the PDF and two emails.
    res.json({ ok: true, signedAt, reference: found.booking.reference });

    const signature = {
      signer_name: name,
      signature_png: signaturePng,
      signed_at: signedAt,
      signer_ip: ip,
      signer_user_agent: agent,
      terms_version: TERMS_VERSION,
    };
    buildAgreementPdf({ booking: found.booking, signature })
      .then((pdf) => sendSignedAgreementEmails(found.booking, signature, pdf))
      .catch((err) => console.error('Signed agreement delivery failed:', err.message));
  } catch (err) {
    console.error('Agreement signing error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Could not record your signature. Please call us.' });
  }
});

// ─────────────────────────────────────────────
// DISPATCH, PHONE BOOKINGS AND ORDER ANALYTICS
// ─────────────────────────────────────────────

/**
 * Assigns a chauffeur and emails them the trip sheet. Outside drivers have no
 * dashboard access, so the email is the whole handover — see the trip sheet in
 * emails.js for what it carries and, deliberately, what it does not.
 */
app.post('/api/bookings/:id/dispatch', authenticateToken, async (req, res) => {
  try {
    const { driverName, driverEmail, driverPhone, vehicle, pay, notes } = req.body || {};
    const name = String(driverName || '').trim();
    const email = String(driverEmail || '').trim();
    if (!name) return res.status(400).json({ error: "The driver's name is required." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "A valid driver email address is required." });
    }

    const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1;', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = { ...rows[0], reference: bookingRef(rows[0].id) };

    const driver = {
      name,
      email,
      phone: String(driverPhone || '').trim(),
      vehicle: String(vehicle || '').trim(),
      pay: String(pay || '').trim(),
      notes: String(notes || '').trim(),
    };

    const sent = await sendDriverDispatchEmail(booking, driver);

    // The assignment is always kept, so a failed send never costs the office
    // what it typed. Only the dispatched timestamp waits for the email to
    // land: a trip marked dispatched that no driver received is worse than
    // one plainly marked unsent.
    const saved = await pool.query(
      `UPDATE bookings
          SET driver_name = $1, driver_email = $2, driver_phone = $3, driver_vehicle = $4,
              driver_pay = $5, driver_notes = $6, updated_at = now(),
              driver_dispatched_at = CASE WHEN $7 THEN now() ELSE driver_dispatched_at END
        WHERE id = $8
        RETURNING driver_dispatched_at;`,
      [driver.name, driver.email, driver.phone, driver.vehicle, driver.pay, driver.notes, sent.ok, req.params.id]
    );

    if (!sent.ok) {
      console.error(`Trip sheet NOT sent for ${booking.reference}: ${sent.error}`);
      return res.status(502).json({
        error: `Driver saved, but the trip sheet could not be emailed: ${sent.error}`,
        saved: true,
      });
    }
    console.log(`Dispatched ${booking.reference} to ${driver.name} <${driver.email}>`);
    res.json({ ok: true, dispatchedAt: saved.rows[0].driver_dispatched_at, driver });
  } catch (err) {
    console.error('Dispatch error:', err.message);
    res.status(500).json({ error: 'Could not dispatch this booking.' });
  }
});

/**
 * A trip's real moment, rebuilt from two VARCHAR columns.
 *
 * pickup_date and pickup_time are text, so every comparison casts through a
 * guard: one malformed row must not take the whole roster down with it. The
 * character class is [0-9] rather than \d because a backslash does not
 * survive the trip through a JavaScript string.
 */
const TRIP_AT = `(CASE
          WHEN pickup_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND pickup_time ~ '^[0-9]{2}:[0-9]{2}$'
            THEN (pickup_date || ' ' || pickup_time)::timestamp
          WHEN pickup_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            THEN pickup_date::timestamp
        END)`;

/**
 * Two trips this close together are treated as a clash. Bookings carry no end
 * time — an airport transfer runs an hour and a charter runs all day — so the
 * window is a deliberate guess, wide enough to catch the double-booking that
 * actually happens and narrow enough not to cry wolf over a morning and an
 * evening run.
 */
const CLASH_HOURS = 3;

/**
 * The roster.
 *
 * Reads the drivers table, and adds the two things the office cannot see by
 * looking at a person: whether their paperwork is still valid, and how much
 * work they have actually done.
 *
 * With ?forBooking=<id> each driver also carries whether they are free at that
 * hour and where their day leaves them. There is no driver app yet, so
 * "location" is not a GPS fix: it is the drop-off of the trip they run before
 * this one. A dispatcher choosing who takes a 2:30 pick-up at DEN wants to
 * know who finishes at DEN at 1:15, and that is knowable today without a
 * single satellite. When the driver app reports positions, last_lat/last_lng
 * fill in and replace that line.
 */
app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const forBooking = String(req.query.forBooking || '').trim();
    const includeInactive = req.query.all === '1';
    const measured = UUID_RE.test(forBooking);

    // Dates are formatted in SQL, never sent as timestamps. An expiry is a
    // calendar day with no zone attached; serialized as a Date it gets re-read
    // in the viewer's zone and can land a day out.
    const { rows } = await pool.query(
      `WITH trips AS (
         SELECT id, lower(driver_email) AS demail, pickup_location, dropoff_location, status,
                ${TRIP_AT} AS at
           FROM bookings
          WHERE driver_email IS NOT NULL AND driver_email <> ''
       ),
       target AS (
         -- A scalar subquery, so this always yields exactly one row: the trip
         -- being assigned, or NULL when the roster was asked for on its own.
         -- Selecting FROM bookings here would yield no rows at all in that
         -- case, and the CROSS JOIN below would empty the entire roster.
         SELECT (SELECT ${TRIP_AT} FROM bookings WHERE id = $1) AS at
       )
       SELECT d.id, d.name, d.email, d.phone, d.vehicle_type, d.vehicle_plate,
              d.license_number, d.insurance_policy, d.default_pay, d.notes, d.active,
              to_char(d.license_expires,   'YYYY-MM-DD') AS license_expires,
              to_char(d.insurance_expires, 'YYYY-MM-DD') AS insurance_expires,
              to_char(d.medical_expires,   'YYYY-MM-DD') AS medical_expires,
              d.last_lat, d.last_lng, d.last_location_at,
              -- Never the hash itself, only whether one exists.
              (d.password_hash IS NOT NULL) AS has_password,
              d.last_login_at,
              COALESCE(sess.devices, 0) AS devices,
              COALESCE(t.trips, 0)     AS trips,
              COALESCE(t.completed, 0) AS completed,
              to_char(t.last_trip, 'YYYY-MM-DD') AS last_trip,
              prev.dropoff_location AS finishes_place, to_char(prev.at,  'FMHH12:MI AM') AS finishes_at,
              nxt.pickup_location   AS starts_place,   to_char(nxt.at,   'FMHH12:MI AM') AS starts_at,
              clash.id AS clash_id,                    to_char(clash.at, 'FMHH12:MI AM') AS clash_at
         FROM drivers d
         LEFT JOIN LATERAL (
           SELECT count(*)::int AS devices
             FROM driver_sessions ds
            WHERE ds.driver_id = d.id AND ds.revoked_at IS NULL AND ds.expires_at > now()
         ) sess ON true
         LEFT JOIN LATERAL (
           SELECT count(*) AS trips,
                  count(*) FILTER (WHERE tr.status = 'Completed') AS completed,
                  max(tr.at) AS last_trip
             FROM trips tr WHERE tr.demail = lower(d.email)
         ) t ON true
         CROSS JOIN target g
         LEFT JOIN LATERAL (
           SELECT tr.dropoff_location, tr.at FROM trips tr
            WHERE tr.demail = lower(d.email) AND tr.id <> $1 AND tr.status <> 'Cancelled'
              AND tr.at IS NOT NULL AND g.at IS NOT NULL
              AND tr.at < g.at AND tr.at::date = g.at::date
            ORDER BY tr.at DESC LIMIT 1
         ) prev ON true
         LEFT JOIN LATERAL (
           SELECT tr.pickup_location, tr.at FROM trips tr
            WHERE tr.demail = lower(d.email) AND tr.id <> $1 AND tr.status <> 'Cancelled'
              AND tr.at IS NOT NULL AND g.at IS NOT NULL
              AND tr.at > g.at AND tr.at::date = g.at::date
            ORDER BY tr.at ASC LIMIT 1
         ) nxt ON true
         LEFT JOIN LATERAL (
           SELECT tr.id, tr.at FROM trips tr
            WHERE tr.demail = lower(d.email) AND tr.id <> $1 AND tr.status <> 'Cancelled'
              AND tr.at IS NOT NULL AND g.at IS NOT NULL
              AND abs(extract(epoch FROM (tr.at - g.at))) < ${CLASH_HOURS} * 3600
            ORDER BY abs(extract(epoch FROM (tr.at - g.at))) ASC LIMIT 1
         ) clash ON true
        ${includeInactive ? '' : 'WHERE d.active'}
        ORDER BY d.active DESC, t.last_trip DESC NULLS LAST, d.name;`,
      measured ? [forBooking] : [null]
    );

    res.json(rows.map((r) => shapeDriver(r, measured)));
  } catch (err) {
    console.error('Driver list error:', err.message);
    res.status(500).json({ error: 'Could not load drivers.' });
  }
});

/** Today as a calendar day — the only thing an expiry date can be compared to. */
function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * How long a document has left, and whether that is a problem.
 *
 * Thirty days is the warning window because that is roughly how long renewing
 * a commercial policy or a medical card takes without a scramble. Anything
 * already past is not a warning: an expired licence means that driver cannot
 * legally take the trip, and the office has to see it before assigning one.
 */
function docStatus(date) {
  if (!date) return { status: 'missing', days: null };
  const days = Math.round((new Date(`${date}T00:00:00`) - today()) / 86400000);
  return { status: days < 0 ? 'expired' : days <= 30 ? 'expiring' : 'ok', days };
}

function shapeDriver(r, measured) {
  const docs = {
    license: { ...docStatus(r.license_expires), expires: r.license_expires, number: r.license_number },
    insurance: { ...docStatus(r.insurance_expires), expires: r.insurance_expires, policy: r.insurance_policy },
    medical: { ...docStatus(r.medical_expires), expires: r.medical_expires },
  };
  // The worst of the three is what the roster shows. A driver with a valid
  // licence and lapsed insurance is not "mostly fine".
  const compliance = ['expired', 'expiring', 'missing', 'ok'].find((s) =>
    Object.values(docs).some((doc) => doc.status === s)
  );

  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    vehicle: r.vehicle_type,
    vehiclePlate: r.vehicle_plate,
    defaultPay: r.default_pay,
    notes: r.notes,
    active: r.active,
    trips: Number(r.trips || 0),
    completed: Number(r.completed || 0),
    lastTrip: r.last_trip,
    // App access, so the office can see at a glance who can actually sign in.
    hasPassword: Boolean(r.has_password),
    lastLoginAt: r.last_login_at,
    devices: Number(r.devices || 0),
    docs,
    compliance,
    // Written by the driver app when there is one. Until then this stays null
    // and the dashboard says so rather than guessing.
    position:
      r.last_lat != null && r.last_lng != null
        ? { lat: Number(r.last_lat), lng: Number(r.last_lng), at: r.last_location_at }
        : null,
    ...(measured
      ? {
          status: r.clash_id ? 'clash' : r.finishes_at || r.starts_at ? 'working' : 'free',
          finishesPlace: r.finishes_place || null,
          finishesAt: r.finishes_at || null,
          startsPlace: r.starts_place || null,
          startsAt: r.starts_at || null,
          clashRef: r.clash_id ? bookingRef(r.clash_id) : null,
          clashAt: r.clash_at || null,
        }
      : {}),
  };
}

/** The fields the office may set on a driver, and what they have to look like. */
function readDriverBody(body) {
  const str = (v, max) => String(v ?? '').trim().slice(0, max) || null;
  const date = (v) => {
    const t = String(v ?? '').trim();
    return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t) ? t : null;
  };
  return {
    name: str(body.name, 255),
    email: str(body.email, 255),
    phone: str(body.phone, 50),
    vehicle_type: str(body.vehicle, 255),
    vehicle_plate: str(body.vehiclePlate, 50),
    license_number: str(body.licenseNumber, 100),
    license_expires: date(body.licenseExpires),
    insurance_policy: str(body.insurancePolicy, 100),
    insurance_expires: date(body.insuranceExpires),
    medical_expires: date(body.medicalExpires),
    default_pay: str(body.defaultPay, 100),
    notes: str(body.notes, 4000),
    active: body.active === undefined ? true : Boolean(body.active),
  };
}

const DRIVER_COLS = [
  'name', 'email', 'phone', 'vehicle_type', 'vehicle_plate', 'license_number',
  'license_expires', 'insurance_policy', 'insurance_expires', 'medical_expires',
  'default_pay', 'notes', 'active',
];

app.post('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const d = readDriverBody(req.body || {});
    if (!d.name || d.name.length < 2) return res.status(400).json({ error: "The driver's name is required." });
    if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
      return res.status(400).json({ error: 'A valid email address is required — the trip sheet is sent to it.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO drivers (${DRIVER_COLS.join(', ')})
       VALUES (${DRIVER_COLS.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING id;`,
      DRIVER_COLS.map((c) => d[c])
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    // The unique index on lower(email) is the check. Doing it with a SELECT
    // first would still race two people adding the same driver at once.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A driver with that email address already exists.' });
    }
    console.error('Create driver error:', err.message);
    res.status(500).json({ error: 'Could not add this driver.' });
  }
});

app.patch('/api/drivers/:id', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Driver not found' });
    const d = readDriverBody(req.body || {});
    if (!d.name || !d.email) return res.status(400).json({ error: 'Name and email are both required.' });
    const { rowCount } = await pool.query(
      `UPDATE drivers
          SET ${DRIVER_COLS.map((c, i) => `${c} = $${i + 1}`).join(', ')}, updated_at = now()
        WHERE id = $${DRIVER_COLS.length + 1};`,
      [...DRIVER_COLS.map((c) => d[c]), req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Driver not found' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Another driver already uses that email address.' });
    }
    console.error('Update driver error:', err.message);
    res.status(500).json({ error: 'Could not save this driver.' });
  }
});

/**
 * Retiring a driver rather than deleting one. They still appear on every trip
 * they ran, and removing them would rewrite what happened. A driver who never
 * ran a trip is deleted outright — there is no history there to protect.
 */
app.delete('/api/drivers/:id', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Driver not found' });
    const { rows } = await pool.query(
      `SELECT count(b.id)::int AS trips
         FROM drivers d LEFT JOIN bookings b ON lower(b.driver_email) = lower(d.email)
        WHERE d.id = $1
        GROUP BY d.id;`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Driver not found' });

    if (rows[0].trips > 0) {
      await pool.query('UPDATE drivers SET active = false, updated_at = now() WHERE id = $1;', [req.params.id]);
      return res.json({ ok: true, retired: true, trips: rows[0].trips });
    }
    await pool.query('DELETE FROM drivers WHERE id = $1;', [req.params.id]);
    res.json({ ok: true, deleted: true });
  } catch (err) {
    console.error('Delete driver error:', err.message);
    res.status(500).json({ error: 'Could not remove this driver.' });
  }
});

// ─────────────────────────────────────────────
// AFFILIATES
// ─────────────────────────────────────────────
//
// A partner company that runs a trip on our behalf. Kept firmly apart from the
// drivers resource above: a driver is a person we dispatch and whose paperwork
// we hold, an affiliate is a company we hand the whole job to and who supplies
// their own chauffeur and vehicle.

/** The fields the office may set on an affiliate, and what they have to look like. */
function readAffiliateBody(body) {
  const str = (v, max) => String(v ?? '').trim().slice(0, max) || null;
  return {
    company_name: str(body.companyName, 255),
    email: str(body.email, 255),
    phone: str(body.phone, 50),
    contact_name: str(body.contactName, 255),
    notes: str(body.notes, 4000),
    active: body.active === undefined ? true : Boolean(body.active),
  };
}

const AFFILIATE_COLS = ['company_name', 'email', 'phone', 'contact_name', 'notes', 'active'];

function shapeAffiliate(r) {
  return {
    id: r.id,
    companyName: r.company_name,
    email: r.email,
    phone: r.phone,
    contactName: r.contact_name,
    notes: r.notes,
    active: r.active,
    trips: Number(r.trips || 0),
    completed: Number(r.completed || 0),
    upcoming: Number(r.upcoming || 0),
    lastTrip: r.last_trip,
    createdAt: r.created_at,
  };
}

/**
 * The affiliate list, with how much work each company has actually been given.
 *
 * Inactive affiliates are returned only with ?all=1. Everywhere a trip is being
 * assigned asks without it, which is what stops a company we have stopped
 * working with being picked by accident.
 */
app.get('/api/affiliates', authenticateToken, async (req, res) => {
  try {
    const includeInactive = req.query.all === '1';
    const { rows } = await pool.query(
      `SELECT a.id, a.company_name, a.email, a.phone, a.contact_name, a.notes, a.active, a.created_at,
              COALESCE(t.trips, 0)     AS trips,
              COALESCE(t.completed, 0) AS completed,
              COALESCE(t.upcoming, 0)  AS upcoming,
              to_char(t.last_trip, 'YYYY-MM-DD') AS last_trip
         FROM affiliates a
         LEFT JOIN LATERAL (
           SELECT count(*) AS trips,
                  count(*) FILTER (WHERE b.status = 'Completed') AS completed,
                  count(*) FILTER (WHERE ${TRIP_AT} > now() AND b.status <> 'Cancelled') AS upcoming,
                  max(${TRIP_AT}) AS last_trip
             FROM bookings b WHERE b.affiliate_id = a.id
         ) t ON true
        ${includeInactive ? '' : 'WHERE a.active'}
        ORDER BY a.active DESC, t.trips DESC NULLS LAST, a.company_name;`
    );
    res.json(rows.map(shapeAffiliate));
  } catch (err) {
    console.error('Affiliate list error:', err.message);
    res.status(500).json({ error: 'Could not load the affiliates.' });
  }
});

app.post('/api/affiliates', authenticateToken, async (req, res) => {
  try {
    const a = readAffiliateBody(req.body || {});
    if (!a.company_name || a.company_name.length < 2) {
      return res.status(400).json({ error: 'The company name is required.' });
    }
    if (!a.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) {
      return res.status(400).json({ error: 'A valid company email address is required — the farmout sheet is sent to it.' });
    }
    const { rows } = await pool.query(
      `INSERT INTO affiliates (${AFFILIATE_COLS.join(', ')})
       VALUES (${AFFILIATE_COLS.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING id;`,
      AFFILIATE_COLS.map((c) => a[c])
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    // The unique index on lower(email) is the check — a SELECT first would
    // still race two people adding the same company at once.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An affiliate with that email address already exists.' });
    }
    console.error('Create affiliate error:', err.message);
    res.status(500).json({ error: 'Could not add this affiliate.' });
  }
});

app.patch('/api/affiliates/:id', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Affiliate not found' });
    const a = readAffiliateBody(req.body || {});
    if (!a.company_name || !a.email) {
      return res.status(400).json({ error: 'The company name and email are both required.' });
    }
    const { rowCount } = await pool.query(
      `UPDATE affiliates
          SET ${AFFILIATE_COLS.map((c, i) => `${c} = $${i + 1}`).join(', ')}, updated_at = now()
        WHERE id = $${AFFILIATE_COLS.length + 1};`,
      [...AFFILIATE_COLS.map((c) => a[c]), req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Affiliate not found' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Another affiliate already uses that email address.' });
    }
    console.error('Update affiliate error:', err.message);
    res.status(500).json({ error: 'Could not save this affiliate.' });
  }
});

/**
 * Retiring an affiliate rather than deleting one. The trips they ran are still
 * theirs, and the foreign key refuses the delete outright, so a company with
 * any history is deactivated instead. One that never took a trip is removed.
 */
app.delete('/api/affiliates/:id', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Affiliate not found' });
    const { rows } = await pool.query(
      `SELECT count(b.id)::int AS trips
         FROM affiliates a LEFT JOIN bookings b ON b.affiliate_id = a.id
        WHERE a.id = $1 GROUP BY a.id;`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Affiliate not found' });

    if (rows[0].trips > 0) {
      await pool.query('UPDATE affiliates SET active = false, updated_at = now() WHERE id = $1;', [req.params.id]);
      return res.json({ ok: true, retired: true, trips: rows[0].trips });
    }
    await pool.query('DELETE FROM affiliates WHERE id = $1;', [req.params.id]);
    res.json({ ok: true, deleted: true });
  } catch (err) {
    console.error('Delete affiliate error:', err.message);
    res.status(500).json({ error: 'Could not remove this affiliate.' });
  }
});

/**
 * Assigning a reservation to an affiliate, changing it, or clearing it.
 *
 * Sending affiliateId: null removes the assignment. An inactive affiliate is
 * refused: the company can keep every trip it has already run, but must not be
 * given a new one.
 *
 * The farmout email is opt-in, the same way a phone booking's confirmation is.
 * The assignment is saved either way — losing what the office chose because a
 * mail server was slow would help nobody — and affiliate_notified_at is only
 * stamped when the send actually succeeds.
 */
app.put('/api/bookings/:id/affiliate', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Booking not found' });
    const { affiliateId, notify } = req.body || {};

    if (affiliateId === null || affiliateId === '' || affiliateId === undefined) {
      const { rowCount } = await pool.query(
        `UPDATE bookings
            SET affiliate_id = NULL, affiliate_assigned_at = NULL, affiliate_notified_at = NULL,
                updated_at = now()
          WHERE id = $1;`,
        [req.params.id]
      );
      if (!rowCount) return res.status(404).json({ error: 'Booking not found' });
      return res.json({ ok: true, affiliate: null });
    }

    if (!UUID_RE.test(String(affiliateId))) {
      return res.status(400).json({ error: 'That is not a valid affiliate.' });
    }

    const { rows: affRows } = await pool.query('SELECT * FROM affiliates WHERE id = $1;', [affiliateId]);
    if (!affRows.length) return res.status(404).json({ error: 'Affiliate not found' });
    const affiliate = affRows[0];
    if (!affiliate.active) {
      return res.status(409).json({
        error: `${affiliate.company_name} is inactive and cannot be given new trips. Reactivate them first.`,
      });
    }

    const { rows: bookingRows } = await pool.query('SELECT * FROM bookings WHERE id = $1;', [req.params.id]);
    if (!bookingRows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = { ...bookingRows[0], reference: bookingRef(bookingRows[0].id) };

    let sent = null;
    if (notify) sent = await sendAffiliateFarmoutEmail(booking, affiliate);

    await pool.query(
      `UPDATE bookings
          SET affiliate_id = $1, affiliate_assigned_at = now(), updated_at = now(),
              affiliate_notified_at = CASE WHEN $2 THEN now() ELSE affiliate_notified_at END
        WHERE id = $3;`,
      [affiliateId, Boolean(sent && sent.ok), req.params.id]
    );

    if (notify && sent && !sent.ok) {
      console.error(`Farmout sheet NOT sent for ${booking.reference}: ${sent.error}`);
      return res.status(502).json({
        error: `Affiliate assigned, but the farmout sheet could not be emailed: ${sent.error}`,
        saved: true,
      });
    }
    if (notify) console.log(`Farmed out ${booking.reference} to ${affiliate.company_name} <${affiliate.email}>`);
    res.json({ ok: true, notified: Boolean(sent && sent.ok) });
  } catch (err) {
    console.error('Assign affiliate error:', err.message);
    res.status(500).json({ error: 'Could not assign this affiliate.' });
  }
});

/**
 * The customer list, grouped out of the bookings themselves.
 *
 * There is no customers table and there does not need to be one: a customer is
 * the set of trips booked from one email address, and deriving it means the
 * list can never disagree with the bookings it came from. Email is the key
 * because it is what confirmations are sent to; a caller with no email is
 * counted on their booking but cannot be grouped, so they are left out rather
 * than merged into a bogus "unknown" customer.
 *
 * What is deliberately missing is money. Nothing here has been paid through
 * the site yet, so lifetime value and payment history have no source. The
 * shape leaves room for them rather than inventing a number.
 */
app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT (array_agg(name    ORDER BY created_at DESC))[1] AS name,
              (array_agg(email   ORDER BY created_at DESC))[1] AS email,
              (array_agg(phone   ORDER BY created_at DESC))[1] AS phone,
              (array_agg(company ORDER BY created_at DESC))[1] AS company,
              count(*)::int                                             AS trips,
              count(*) FILTER (WHERE status = 'Completed')::int          AS completed,
              count(*) FILTER (WHERE status = 'Cancelled')::int          AS cancelled,
              count(*) FILTER (WHERE status IN ('Pending','Confirmed'))::int AS open,
              count(*) FILTER (WHERE source = 'Phone')::int              AS by_phone,
              to_char(min(created_at), 'YYYY-MM-DD') AS first_seen,
              to_char(max(created_at), 'YYYY-MM-DD') AS last_seen,
              mode() WITHIN GROUP (ORDER BY service_type)       AS top_service,
              mode() WITHIN GROUP (ORDER BY vehicle_preference) AS top_vehicle,
              to_char(max(${TRIP_AT}) FILTER (WHERE status <> 'Cancelled'), 'YYYY-MM-DD') AS last_trip,
              to_char(min(${TRIP_AT}) FILTER (WHERE ${TRIP_AT} > now() AND status <> 'Cancelled'),
                      'YYYY-MM-DD') AS next_trip
         FROM bookings
        WHERE email IS NOT NULL AND TRIM(email) <> ''
        GROUP BY lower(TRIM(email))
        ORDER BY count(*) DESC, max(created_at) DESC
        LIMIT 500;`
    );

    res.json(
      rows.map((r) => ({
        name: r.name,
        email: r.email,
        phone: r.phone,
        company: r.company,
        trips: r.trips,
        completed: r.completed,
        cancelled: r.cancelled,
        open: r.open,
        byPhone: r.by_phone,
        firstSeen: r.first_seen,
        lastSeen: r.last_seen,
        lastTrip: r.last_trip,
        nextTrip: r.next_trip,
        topService: r.top_service,
        topVehicle: r.top_vehicle,
        // Two trips is the line between someone who tried us and someone who
        // came back, which is the only distinction worth drawing here.
        repeat: r.trips > 1,
        // A customer who cancels most of what they book is worth knowing about
        // before the office holds a car for them again.
        cancelRate: r.trips ? Math.round((r.cancelled / r.trips) * 100) : 0,
        // No payment provider is connected, so there is nothing to total.
        // Left null on purpose: a zero here would read as "spent nothing".
        totalPaid: null,
        payments: null,
      }))
    );
  } catch (err) {
    console.error('Customer list error:', err.message);
    res.status(500).json({ error: 'Could not load customers.' });
  }
});

/**
 * A booking taken over the phone. Same table and the same downstream handling
 * as a website booking — it is only marked with its source, which is what
 * makes the order counts worth reading.
 *
 * The customer email is optional: plenty of phone callers never give one, and
 * the office may not want to send anything at all for a trip already agreed.
 */
app.post('/api/bookings/manual', authenticateToken, async (req, res) => {
  try {
    const d = req.body || {};
    const name = String(d.name || '').trim();
    const phone = String(d.phone || '').trim();
    if (!name) return res.status(400).json({ error: 'Customer name is required.' });
    if (!phone) return res.status(400).json({ error: 'A phone number is required.' });
    if (!String(d.pickupDate || '').match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ error: 'A valid pick-up date is required.' });
    }
    const email = String(d.email || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'That email address does not look right.' });
    }

    const agreementToken = crypto.randomBytes(32).toString('hex');
    const status = ['Pending', 'Reviewed', 'Quoted', 'Confirmed', 'Completed', 'Cancelled'].includes(d.status)
      ? d.status
      : 'Confirmed';

    const { rows } = await pool.query(
      `INSERT INTO bookings (
         status, source, name, phone, email, company, service_type, trip_type,
         airport_direction, airline_name, flight_number, pickup_date, pickup_time,
         pickup_location, dropoff_location, additional_stops, passengers, luggage,
         vehicle_preference, special_requests, details, agreement_token,
         return_date, return_time, return_pickup_location, return_dropoff_location,
         return_additional_stops, return_airline_name, return_flight_number
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
         $23, $24, $25, $26, $27, $28, $29
       ) RETURNING id, created_at;`,
      [
        status,
        String(d.source || 'Phone'),
        name, phone, email || null, String(d.company || '').trim() || null,
        String(d.serviceType || '').trim() || null,
        String(d.tripType || '').trim() || null,
        String(d.airportDirection || '').trim() || null,
        String(d.airline || '').trim() || null,
        String(d.flightNumber || '').trim() || null,
        d.pickupDate,
        String(d.pickupTime || '').trim() || null,
        String(d.pickupLocation || '').trim() || null,
        String(d.dropoffLocation || '').trim() || null,
        String(d.additionalStops || '').trim() || null,
        d.passengers || null,
        d.luggage || null,
        String(d.vehiclePreference || '').trim() || null,
        String(d.specialRequests || '').trim() || null,
        d.details ? JSON.stringify(d.details) : null,
        agreementToken,
        // A calendar day, so an empty string must become null rather than be
        // handed to Postgres as a date it cannot parse.
        /^\d{4}-\d{2}-\d{2}$/.test(String(d.returnDate || '')) ? d.returnDate : null,
        String(d.returnTime || '').trim() || null,
        String(d.returnPickupLocation || '').trim() || null,
        String(d.returnDropoffLocation || '').trim() || null,
        String(d.returnAdditionalStops || '').trim() || null,
        String(d.returnAirline || '').trim() || null,
        String(d.returnFlightNumber || '').trim() || null,
      ]
    );

    const bookingId = rows[0].id;
    const reference = bookingRef(bookingId);
    console.log(`Manual booking ${reference} added by admin (${String(d.source || 'Phone')})`);

    // Only when asked, and only when there is somewhere to send it.
    if (d.sendConfirmation && email) {
      sendBookingEmails(
        {
          name, phone, email,
          company: String(d.company || '').trim(),
          service_type: d.serviceType,
          trip_type: d.tripType,
          airport_direction: d.airportDirection,
          airline_name: d.airline,
          flight_number: d.flightNumber,
          pickup_date: d.pickupDate,
          pickup_time: d.pickupTime,
          pickup_location: d.pickupLocation,
          dropoff_location: d.dropoffLocation,
          additional_stops: d.additionalStops,
          passengers: d.passengers,
          luggage: d.luggage,
          vehicle_preference: d.vehiclePreference,
          special_requests: d.specialRequests,
          details: d.details,
          reference,
          agreement_token: agreementToken,
        },
        bookingId
      ).catch((err) => console.error('Manual booking email failed:', err.message));
    }

    res.status(201).json({ id: bookingId, reference, status, emailed: Boolean(d.sendConfirmation && email) });
  } catch (err) {
    console.error('Manual booking error:', err.message);
    res.status(500).json({ error: 'Could not save this booking.' });
  }
});

/**
 * Order counts for market analysis.
 *
 * Everything is aggregated in the database over the whole table: the bookings
 * the dashboard lists are only the most recent hundred, so counting those in
 * the browser would quietly understate every total the moment the business
 * passes a hundred trips.
 *
 * Months and weekdays are grouped in Denver local time — an order taken at
 * 7pm on the 31st belongs to that month for the people who took it, whatever
 * UTC thinks.
 */
app.get('/api/analytics/orders', authenticateToken, async (req, res) => {
  const TZ = "AT TIME ZONE 'America/Denver'";
  // pickup_date is stored as text, and hand-entered rows will not all be valid
  // dates. Casting only what matches yields NULL for the rest rather than
  // failing the whole query on one bad row. [0-9] rather than \d: the class
  // needs no backslash, so nothing can be lost between here and the server.
  const PICKUP = "(CASE WHEN pickup_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN pickup_date::date END)";
  try {
    const [totals, monthly, byService, bySource, byStatus, byVehicle, byWeekday, repeats, lead] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                                                                   AS all_time,
          COUNT(*) FILTER (WHERE (created_at ${TZ})::date = (now() ${TZ})::date)                     AS today,
          COUNT(*) FILTER (WHERE (created_at ${TZ}) >= date_trunc('week',  now() ${TZ}))             AS this_week,
          COUNT(*) FILTER (WHERE (created_at ${TZ}) >= date_trunc('month', now() ${TZ}))             AS this_month,
          COUNT(*) FILTER (WHERE (created_at ${TZ}) >= date_trunc('month', now() ${TZ}) - interval '1 month'
                             AND (created_at ${TZ}) <  date_trunc('month', now() ${TZ}))             AS last_month,
          COUNT(*) FILTER (WHERE (created_at ${TZ}) >= date_trunc('year',  now() ${TZ}))             AS this_year,
          COUNT(*) FILTER (WHERE ${PICKUP} >= (now() ${TZ})::date)                                   AS upcoming
        FROM bookings;`),
      pool.query(`
        WITH months AS (
          SELECT generate_series(
                   date_trunc('month', now() ${TZ}) - interval '11 months',
                   date_trunc('month', now() ${TZ}),
                   interval '1 month'
                 ) AS m
        )
        SELECT to_char(months.m, 'YYYY-MM') AS month,
               to_char(months.m, 'Mon')     AS label,
               COUNT(b.id)                  AS count,
               COUNT(b.id) FILTER (WHERE b.source <> 'Website') AS offline
          FROM months
          LEFT JOIN bookings b
            ON date_trunc('month', b.created_at ${TZ}) = months.m
         GROUP BY months.m
         ORDER BY months.m;`),
      pool.query(`SELECT COALESCE(NULLIF(service_type, ''), 'Not specified') AS name, COUNT(*) AS count
                    FROM bookings GROUP BY 1 ORDER BY count DESC;`),
      pool.query(`SELECT COALESCE(NULLIF(source, ''), 'Website') AS name, COUNT(*) AS count
                    FROM bookings GROUP BY 1 ORDER BY count DESC;`),
      pool.query(`SELECT status AS name, COUNT(*) AS count FROM bookings GROUP BY 1 ORDER BY count DESC;`),
      pool.query(`SELECT COALESCE(NULLIF(vehicle_preference, ''), 'Not specified') AS name, COUNT(*) AS count
                    FROM bookings GROUP BY 1 ORDER BY count DESC LIMIT 8;`),
      pool.query(`SELECT to_char(${PICKUP}, 'Dy')       AS name,
                         EXTRACT(DOW FROM ${PICKUP})   AS dow,
                         COUNT(*)                      AS count
                    FROM bookings WHERE ${PICKUP} IS NOT NULL
                   GROUP BY 1, 2 ORDER BY dow;`),
      pool.query(`SELECT COUNT(*) AS repeat_customers, COALESCE(SUM(n), 0) AS repeat_orders
                    FROM (SELECT COUNT(*) AS n FROM bookings
                           WHERE email IS NOT NULL AND email <> ''
                           GROUP BY lower(email) HAVING COUNT(*) > 1) t;`),
      pool.query(`SELECT ROUND(AVG(${PICKUP} - (created_at ${TZ})::date)::numeric, 1) AS avg_lead_days
                    FROM bookings WHERE ${PICKUP} IS NOT NULL;`),
    ]);

    const t = totals.rows[0];
    const num = (v) => Number(v || 0);
    const thisMonth = num(t.this_month);
    const lastMonth = num(t.last_month);

    res.json({
      totals: {
        allTime: num(t.all_time),
        today: num(t.today),
        thisWeek: num(t.this_week),
        thisMonth,
        lastMonth,
        thisYear: num(t.this_year),
        upcoming: num(t.upcoming),
        // Null rather than a fake 100% when there is nothing to compare with.
        monthChangePct: lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null,
      },
      monthly: monthly.rows.map((r) => ({
        month: r.month,
        label: r.label,
        count: num(r.count),
        offline: num(r.offline),
      })),
      byService: byService.rows.map((r) => ({ name: r.name, count: num(r.count) })),
      bySource: bySource.rows.map((r) => ({ name: r.name, count: num(r.count) })),
      byStatus: byStatus.rows.map((r) => ({ name: r.name, count: num(r.count) })),
      byVehicle: byVehicle.rows.map((r) => ({ name: r.name, count: num(r.count) })),
      byWeekday: byWeekday.rows.map((r) => ({ name: r.name.trim(), count: num(r.count) })),
      repeat: {
        customers: num(repeats.rows[0].repeat_customers),
        orders: num(repeats.rows[0].repeat_orders),
      },
      avgLeadDays: lead.rows[0].avg_lead_days === null ? null : Number(lead.rows[0].avg_lead_days),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Order analytics error:', err.message);
    res.status(500).json({ error: 'Could not load order analytics.' });
  }
});

// ─────────────────────────────────────────────
// PRICE QUOTES
// ─────────────────────────────────────────────
//
// The office sends a price and the customer answers it with one tap. The
// office always sets the number: the estimator only suggests, because a rate
// card cannot see a wedding running late or a regular customer worth keeping.
//
// A quote is never recalculated after it is sent. The customer was given
// specific numbers, and those are what they accept.

/** Money as stored: two decimals, never negative-zero, never NaN. */
function toAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/**
 * A NUMERIC column as a number, keeping null as null. node-pg hands these
 * back as strings ("95.00"), and a reader that forgets concatenates.
 */
function numOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Loads a booking with its most recent quote, by public quote token. */
async function loadQuote(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{32,64}$/i.test(token)) return null;
  const { rows } = await pool.query(
    `SELECT q.*, to_char(q.valid_until, 'YYYY-MM-DD') AS valid_until_text,
            b.name, b.email, b.phone, b.service_type, b.pickup_date, b.pickup_time,
            b.pickup_location, b.dropoff_location, b.additional_stops, b.passengers,
            b.vehicle_preference, b.agreement_token, b.agreement_signed_at, b.status AS booking_status,
            b.trip_type, b.return_date, b.return_time, b.return_pickup_location,
            b.airline_name, b.flight_number, b.airport_direction, b.special_requests,
            b.deposit_required, b.payment_option, b.payment_method, b.payment_status,
            b.id AS booking_id
       FROM quotes q
       JOIN bookings b ON b.id = q.booking_id
      WHERE q.token = $1
      LIMIT 1;`,
    [token]
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    quote: {
      id: r.id,
      token: r.token,
      currency: r.currency,
      line_items: r.line_items,
      total: Number(r.total),
      note: r.note,
      valid_until: r.valid_until_text,
      suggested_total: r.suggested_total === null ? null : Number(r.suggested_total),
      status: r.status,
      sent_at: r.sent_at,
      responded_at: r.responded_at,
      decline_reason: r.decline_reason,

      // Where the customer pays. Absent from this object until now, so the
      // pay button on the accept page would have pointed at "undefined".
      payment_link: r.payment_link || null,

      // The charge sheet as it was sent. Null on the quotes 012 deliberately
      // left alone — those have line_items and nothing else, and both shapes
      // have to render.
      rate_type: r.rate_type,
      base_fare: numOrNull(r.base_fare),
      billed_hours: numOrNull(r.billed_hours),
      hourly_rate: numOrNull(r.hourly_rate),
      charges: Array.isArray(r.charges) ? r.charges : [],
      charges_total: numOrNull(r.charges_total),
      gratuity_percent: numOrNull(r.gratuity_percent),
      gratuity: numOrNull(r.gratuity),
      card_fee_percent: numOrNull(r.card_fee_percent),
      card_fee: numOrNull(r.card_fee),
      discount: numOrNull(r.discount),
      subtotal: numOrNull(r.subtotal),
      tax_percent: numOrNull(r.tax_percent),
      tax: numOrNull(r.tax),
    },
    booking: { ...r, id: r.booking_id, reference: bookingRef(r.booking_id) },
  };
}

/**
 * Writes a quote and emails it. The quote is only recorded when the email
 * leaves: a quote the customer never received, sitting in the dashboard
 * marked Sent, is worse than none at all — the office would stop chasing it.
 */
app.post('/api/bookings/:id/quote', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1;', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = { ...rows[0], reference: bookingRef(rows[0].id) };
    if (!booking.email) {
      return res.status(400).json({ error: 'This booking has no email address, so a quote cannot be sent.' });
    }

    const body = req.body || {};

    // Priced here, never from the client. The page shows a preview from the
    // same function, but a total that arrives in a request body is a number a
    // browser could have edited, and this one goes on an invoice.
    const config = await quotingConfig();
    const priced = priceQuote({ ...pricingInput(body), config });

    if (priced.total <= 0) {
      return res.status(400).json({ error: 'Enter a fare before sending the quote.' });
    }

    // The breakdown, rendered as the line items the quote email and the
    // customer's accept page already know how to display. Deriving them keeps
    // one description of the price: the structured columns are the record,
    // these are how it reads.
    const cleaned = [
      {
        label:
          priced.rateType === 'hourly'
            ? `Chauffeured service — ${priced.billedHours} hours at ${money(priced.hourlyRate)}`
            : 'Chauffeured transportation',
        amount: priced.baseFare,
      },
      ...priced.charges
        .filter((c) => c.amount > 0)
        .map((c) => ({
          label: c.quantity === 1 ? c.label : `${c.label} — ${c.quantity} × ${money(c.unitRate)}`,
          amount: c.amount,
        })),
      ...(priced.gratuity > 0
        ? [{ label: `Gratuity (${priced.gratuityPercent}%)`, amount: priced.gratuity }]
        : []),
      ...(priced.cardFee > 0
        ? [{ label: `Card processing (${priced.cardFeePercent}%)`, amount: priced.cardFee }]
        : []),
      ...(priced.discount > 0 ? [{ label: 'Discount', amount: -priced.discount }] : []),
      ...(priced.tax > 0 ? [{ label: `Tax (${priced.taxPercent}%)`, amount: priced.tax }] : []),
    ];

    const total = priced.total;
    const validUntil = /^\d{4}-\d{2}-\d{2}$/.test(String(body.validUntil || '')) ? body.validUntil : null;
    const paymentLink = /^https?:\/\//i.test(String(body.paymentLink || '').trim())
      ? String(body.paymentLink).trim().slice(0, 500)
      : null;

    const quote = {
      token: crypto.randomBytes(32).toString('hex'),
      currency: String(body.currency || 'USD').slice(0, 8),
      line_items: cleaned,
      total,
      note: String(body.note || '').trim().slice(0, 2000) || null,
      valid_until: validUntil,
      suggested_total: toAmount(body.suggestedTotal),
      payment_link: paymentLink,
      // What the customer is being asked for now, which is not always the
      // total: a deposit booking asks for part of it.
      due_now: priced.paymentOption === 'deposit' ? priced.depositRequired : priced.total,
      deposit: priced.paymentOption === 'deposit',
      breakdown: priced,
    };

    const sent = await sendQuoteEmail(booking, quote);
    if (!sent.ok) {
      return res.status(502).json({ error: sent.error || 'The quote could not be emailed.' });
    }

    const saved = await pool.query(
      `INSERT INTO quotes (
         booking_id, token, currency, line_items, total, note, valid_until, suggested_total,
         rate_type, base_fare, billed_hours, hourly_rate, charges, charges_total,
         gratuity_percent, gratuity, card_fee_percent, card_fee,
         discount, subtotal, tax_percent, tax, payment_link
       )
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8,
               $9, $10, $11, $12, $13::jsonb, $14,
               $15, $16, $17, $18,
               $19, $20, $21, $22, $23)
       RETURNING id, sent_at;`,
      [
        booking.id, quote.token, quote.currency, JSON.stringify(quote.line_items),
        quote.total, quote.note, quote.valid_until, quote.suggested_total,
        priced.rateType, priced.baseFare, priced.billedHours, priced.hourlyRate,
        JSON.stringify(priced.charges), priced.chargesTotal,
        priced.gratuityPercent, priced.gratuity, priced.cardFeePercent, priced.cardFee,
        priced.discount, priced.subtotal, priced.taxPercent, priced.tax, quote.payment_link,
      ]
    );

    // Mirrored onto the booking so the dashboard can show quote state without
    // joining, and the status moves on so nobody re-quotes the same trip.
    await pool.query(
      `UPDATE bookings
          SET quote_status = 'Sent', quote_total = $1, quote_sent_at = now(),
              status = CASE WHEN status IN ('Pending', 'Reviewed') THEN 'Quoted' ELSE status END,
              payment_status = CASE
                -- Only moved forward. A quote re-sent to a customer who has
                -- already paid a deposit must not drag them back to "Quote
                -- Sent" and have the office chase money it already has.
                WHEN payment_status IN ('Deposit Paid', 'Balance Due',
                                        'Balance Payment Requested', 'Fully Paid')
                  THEN payment_status
                WHEN $2::boolean THEN 'Deposit Requested'
                ELSE 'Quote Sent'
              END,
              payment_option = $3,
              payment_method = COALESCE($4, payment_method),
              deposit_required = $5,
              balance_due_date = $6,
              internal_notes = COALESCE($7, internal_notes),
              special_requests = COALESCE($8, special_requests),
              updated_at = now()
        WHERE id = $9;`,
      [
        quote.total,
        quote.deposit,
        priced.paymentOption,
        String(body.paymentMethod || '').trim() || null,
        quote.deposit ? priced.depositRequired : null,
        /^\d{4}-\d{2}-\d{2}$/.test(String(body.balanceDueDate || '')) ? body.balanceDueDate : null,
        body.internalNotes === undefined ? null : String(body.internalNotes).slice(0, 4000),
        body.customerNotes === undefined ? null : String(body.customerNotes).slice(0, 4000),
        booking.id,
      ]
    );

    console.log(`Quote sent: ${booking.reference} ${quote.currency} ${quote.total} to ${booking.email}`);
    res.status(201).json({ ok: true, id: saved.rows[0].id, total: quote.total, sentAt: saved.rows[0].sent_at });
  } catch (err) {
    console.error('Quote send error:', err.message);
    res.status(500).json({ error: 'Could not send this quote.' });
  }
});

/** Every quote sent for a booking, newest first — the negotiation history. */
app.get('/api/bookings/:id/quotes', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, token, currency, line_items, total, note, suggested_total, payment_link,
              to_char(valid_until, 'YYYY-MM-DD') AS valid_until,
              status, sent_at, responded_at, decline_reason
         FROM quotes WHERE booking_id = $1 ORDER BY sent_at DESC;`,
      [req.params.id]
    );
    res.json(rows.map((r) => ({ ...r, total: Number(r.total) })));
  } catch (err) {
    console.error('Quote history error:', err.message);
    res.status(500).json({ error: 'Could not load quotes.' });
  }
});

/** What the acceptance page shows. Public: the token is the credential. */
app.get('/api/quote/:token', async (req, res) => {
  try {
    const found = await loadQuote(req.params.token);
    if (!found) return res.status(404).json({ error: 'This quote link is not valid.' });
    const { quote, booking } = found;
    const expired =
      quote.status === 'Sent' &&
      quote.valid_until &&
      new Date(quote.valid_until).getTime() < new Date(new Date().toISOString().slice(0, 10)).getTime();

    res.json({
      reference: booking.reference,
      name: booking.name,
      serviceType: booking.service_type,
      pickupDate: booking.pickup_date,
      pickupTime: booking.pickup_time,
      pickupLocation: booking.pickup_location,
      dropoffLocation: booking.dropoff_location,
      vehicle: booking.vehicle_preference,
      passengers: booking.passengers,
      // The return leg, so a round trip reads as one reservation rather
      // than half of one.
      tripType: booking.trip_type,
      returnDate: booking.return_date,
      returnTime: booking.return_time,
      returnPickupLocation: booking.return_pickup_location,
      airlineName: booking.airline_name,
      flightNumber: booking.flight_number,
      airportDirection: booking.airport_direction,

      currency: quote.currency,
      // Both shapes travel. `charges` is the structured sheet 019 added and
      // is what the page renders when it is there; `lineItems` is how quotes
      // sent before it were written, and those must still show the figures
      // the customer was actually given.
      lineItems: quote.line_items,
      charges: {
        rateType: quote.rate_type,
        baseFare: quote.base_fare,
        billedHours: quote.billed_hours,
        hourlyRate: quote.hourly_rate,
        items: quote.charges,
        extras: quote.charges_total,
        discount: quote.discount,
        // Gratuity and the service charge are sent after the extras and the
        // discount, in the order they are worked out, so the page can print
        // them immediately above the total the way the office's sheet does.
        gratuityPercent: quote.gratuity_percent,
        gratuity: quote.gratuity,
        cardFeePercent: quote.card_fee_percent,
        cardFee: quote.card_fee,
        subtotal: quote.subtotal,
        taxPercent: quote.tax_percent,
        tax: quote.tax,
      },
      total: quote.total,
      note: quote.note,
      specialRequests: booking.special_requests || null,
      validUntil: quote.valid_until,
      status: quote.status,
      expired,
      respondedAt: quote.responded_at,

      // Where the customer pays, and how much is being asked for now. The
      // link is one the office pasted in from Square — nothing here creates
      // it, and nothing here learns when it has been paid.
      paymentLink: quote.payment_link || null,
      depositRequired:
        booking.deposit_required == null ? null : Number(booking.deposit_required),
      paymentOption: booking.payment_option || 'full',
      // Offered so an accepted quote can lead straight into signing.
      agreementToken: quote.status === 'Accepted' && !booking.agreement_signed_at ? booking.agreement_token : null,
      agreementSigned: Boolean(booking.agreement_signed_at),
    });
  } catch (err) {
    console.error('Quote lookup error:', err.message);
    res.status(500).json({ error: 'Could not load this quote.' });
  }
});

/**
 * The customer's answer. Accepting confirms the booking; declining leaves it
 * alone so the office can follow up rather than lose the trip to a status.
 */
app.post('/api/quote/:token/respond', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many attempts. Please call us at (720) 499-6744.',
}), async (req, res) => {
  try {
    const found = await loadQuote(req.params.token);
    if (!found) return res.status(404).json({ error: 'This quote link is not valid.' });
    const { quote, booking } = found;

    if (quote.status !== 'Sent') {
      return res.status(409).json({
        error: `This quote was already ${quote.status.toLowerCase()}.`,
        status: quote.status,
        respondedAt: quote.responded_at,
      });
    }
    if (quote.valid_until && new Date(quote.valid_until) < new Date(new Date().toISOString().slice(0, 10))) {
      return res.status(410).json({ error: 'This quote has expired. Please call us and we will send a fresh price.' });
    }

    const accepted = req.body && req.body.accept === true;
    // The customer may choose to pay a deposit rather than the lot, when the
    // office offered one. Only honoured on acceptance: a declined quote has
    // no payment to make.
    const chosenOption =
      accepted && req.body && req.body.paymentOption === 'deposit' ? 'deposit' : null;
    const reason = String((req.body && req.body.reason) || '').trim().slice(0, 500) || null;
    const ip = String(req.ip || '').slice(0, 64);
    const agent = String(req.get('user-agent') || '').slice(0, 400);

    // Guarded on status so two taps cannot both win.
    const updated = await pool.query(
      `UPDATE quotes
          SET status = $1, responded_at = now(), responder_ip = $2, responder_agent = $3, decline_reason = $4
        WHERE id = $5 AND status = 'Sent'
        RETURNING responded_at;`,
      [accepted ? 'Accepted' : 'Declined', ip, agent, accepted ? null : reason, quote.id]
    );
    if (!updated.rows.length) {
      return res.status(409).json({ error: 'This quote was already answered.' });
    }
    const respondedAt = updated.rows[0].responded_at;

    await pool.query(
      `UPDATE bookings
          SET quote_status = $1,
              status = CASE WHEN $2 THEN 'Confirmed' ELSE status END,
              payment_option = COALESCE($4, payment_option),
              -- Accepting is not paying. The office still has to see the
              -- money arrive in Square and record it, so the furthest this
              -- can move the booking is "we have asked for it".
              payment_status = CASE
                WHEN NOT $2 THEN payment_status
                WHEN payment_status IN ('Deposit Paid', 'Fully Paid') THEN payment_status
                WHEN COALESCE($4, payment_option) = 'deposit' THEN 'Deposit Requested'
                ELSE 'Quote Sent'
              END,
              updated_at = now()
        WHERE id = $3;`,
      [accepted ? 'Accepted' : 'Declined', accepted, booking.id, chosenOption]
    );

    console.log(`Quote ${accepted ? 'ACCEPTED' : 'declined'}: ${booking.reference} by ${booking.name} (${ip})`);
    // What the customer owes now, so the page can send them to the right
    // amount. A deposit they chose, otherwise the lot.
    const option = chosenOption || booking.payment_option || 'full';
    const dueNow =
      option === 'deposit' && booking.deposit_required != null
        ? Number(booking.deposit_required)
        : Number(quote.total);

    res.json({
      ok: true,
      status: accepted ? 'Accepted' : 'Declined',
      respondedAt,
      agreementToken: accepted && !booking.agreement_signed_at ? booking.agreement_token : null,
      // Where to send them next. Null when the office has not pasted a
      // Square link in, in which case the page says the office will be in
      // touch rather than dead-ending on a button that goes nowhere.
      paymentLink: accepted ? quote.payment_link || null : null,
      paymentOption: option,
      dueNow: accepted ? dueNow : null,
    });

    // The customer is not kept waiting on two emails.
    sendQuoteResponseEmails(booking, { ...quote, responded_at: respondedAt, decline_reason: accepted ? null : reason }, accepted)
      .catch((err) => console.error('Quote response email failed:', err.message));
  } catch (err) {
    console.error('Quote response error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: 'Could not record your answer. Please call us.' });
  }
});

// Get all bookings (Protected)
/**
 * One booking, for a screen that works on a single trip.
 *
 * The list route returns every booking the office has; the quote page needs
 * one of them and nothing else. Declared after all the /:id/<thing> routes
 * above so it cannot shadow them — Express matches in the order routes are
 * registered, and a bare /:id defined first would swallow /:id/photos.
 */
app.get('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Booking not found' });
    const { rows } = await pool.query(
      `SELECT id, status, name, email, phone, company, service_type, trip_type,
              pickup_date, pickup_time, pickup_location, dropoff_location,
              additional_stops, passengers, luggage, vehicle_preference,
              airline_name, flight_number, terminal, airport_direction,
              special_requests, internal_notes, details,
              payment_status, payment_method, payment_option,
              deposit_required,
              -- A calendar day, formatted here rather than serialized as a
              -- Date: node-pg reads a DATE at the server's local midnight,
              -- which lands a day out for any server that is not on UTC.
              to_char(balance_due_date, 'YYYY-MM-DD') AS balance_due_date,
              driver_name, created_at
         FROM bookings WHERE id = $1;`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
    res.json({
      ...rows[0],
      // NUMERIC arrives as the string "150.00"; the quote page does
      // arithmetic with it.
      deposit_required: numOrNull(rows[0].deposit_required),
      reference: bookingRef(rows[0].id),
    });
  } catch (err) {
    console.error('Booking read error:', err.message);
    res.status(500).json({ error: 'Could not load that booking.' });
  }
});

app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    // The affiliate is joined rather than copied onto the booking, so a company
    // that corrects its phone number corrects it on every trip at once.
    const query = `
      SELECT b.*,
             a.company_name AS affiliate_company, a.email AS affiliate_email,
             a.phone AS affiliate_phone, a.contact_name AS affiliate_contact,
             a.active AS affiliate_active
        FROM bookings b
        LEFT JOIN affiliates a ON a.id = b.affiliate_id
       ORDER BY b.created_at DESC
       LIMIT 100;`;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Update booking status (Protected)
app.put('/api/bookings/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const query = `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING id;`;
    const result = await pool.query(query, [status, id]);
    
    if (result.rowCount > 0) {
      res.json({ message: 'Status updated' });
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Delete a booking permanently (Protected). Used to clear test records and
// cancelled requests the office no longer needs.
app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM bookings WHERE id = $1 RETURNING id;', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Booking not found' });
    console.log(`Booking ${id} deleted by admin.`);
    res.json({ message: 'Booking deleted', id });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

/**
 * Asks a customer for a Google review (Protected).
 *
 * Intended for trips that are finished — the admin presses this once the ride is
 * complete. The send timestamp is stored so the dashboard can show it was already
 * requested rather than mailing the same person repeatedly.
 */
app.post('/api/bookings/:id/review-request', authenticateToken, async (req, res) => {
  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Email service is not configured.' });
  }
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT name, email, service_type, pickup_date, review_request_sent_at FROM bookings WHERE id = $1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Booking not found.' });

    const booking = rows[0];
    if (!booking.email) return res.status(400).json({ error: 'This booking has no email address.' });

    const sent = await sendReviewRequest(booking);
    if (!sent.ok) return res.status(502).json({ error: `Could not send: ${sent.error}` });

    await pool.query('UPDATE bookings SET review_request_sent_at = NOW() WHERE id = $1', [id]);
    console.log(`Review request sent for booking ${id} to ${booking.email}`);
    res.json({ message: `Review request sent to ${booking.email}`, sentAt: new Date().toISOString() });
  } catch (err) {
    console.error('Review request error:', err);
    res.status(500).json({ error: 'Failed to send the review request.' });
  }
});

// Admin sends a custom email to a customer (Protected)
app.post('/api/bookings/:id/email', authenticateToken, async (req, res) => {
  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Email service not configured. Please set RESEND_API_KEY in your .env file.' });
  }
  try {
    const { id } = req.params;
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required.' });
    }

    // Fetch booking to get customer email & name
    const result = await pool.query('SELECT email, name FROM bookings WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const { email: customerEmail, name: customerName } = result.rows[0];

    const sent = await sendAdminReply(customerEmail, subject, customerName, message);
    if (!sent.ok) {
      return res.status(502).json({ error: `Failed to send email: ${sent.error}` });
    }

    res.json({ message: `Email sent to ${customerEmail}` });
  } catch (err) {
    console.error('Admin email send error:', err);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

// ─────────────────────────────────────────────
// INQUIRIES (Contact messages + Quote requests)
// ─────────────────────────────────────────────

// Submit a contact message or quote request (Public)
app.post('/api/inquiries', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many messages from this device. Please call us at (720) 499-6744.',
}), async (req, res) => {
  try {
    const data = req.body;

    if (isBot(data)) {
      console.warn('Blocked bot inquiry submission (honeypot).');
      return res.status(201).json({ id: 'ignored', message: 'Inquiry received' });
    }

    if (!data.name || !data.email || !data.message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }
    const type = data.type === 'Quote' ? 'Quote' : 'Contact';

    const result = await pool.query(
      `INSERT INTO inquiries (type, name, email, phone, service, event_date, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;`,
      [type, data.name, data.email, data.phone, data.service, data.eventDate, data.message]
    );
    const id = result.rows[0].id;

    sendInquiryEmails(
      { type, name: data.name, email: data.email, phone: data.phone, service: data.service, event_date: data.eventDate, message: data.message },
      id
    );

    res.status(201).json({ id, message: 'Inquiry received' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit inquiry' });
  }
});

// Get all inquiries (Protected)
app.get('/api/inquiries', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 200;');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inquiries' });
  }
});

// Update inquiry status (Protected)
app.put('/api/inquiries/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query('UPDATE inquiries SET status = $1 WHERE id = $2 RETURNING id;', [status, id]);
    if (result.rowCount > 0) res.json({ message: 'Status updated' });
    else res.status(404).json({ error: 'Inquiry not found' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Delete an inquiry permanently (Protected).
app.delete('/api/inquiries/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM inquiries WHERE id = $1 RETURNING id;', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Message not found' });
    console.log(`Inquiry ${id} deleted by admin.`);
    res.json({ message: 'Message deleted', id });
  } catch (err) {
    console.error('Delete inquiry error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Admin replies to an inquiry (Protected)
app.post('/api/inquiries/:id/email', authenticateToken, async (req, res) => {
  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Email service not configured. Please set RESEND_API_KEY in your .env file.' });
  }
  try {
    const { id } = req.params;
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required.' });

    const result = await pool.query('SELECT email, name FROM inquiries WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Inquiry not found.' });

    const { email: customerEmail, name: customerName } = result.rows[0];

    const sent = await sendAdminReply(customerEmail, subject, customerName, message);
    if (!sent.ok) {
      return res.status(502).json({ error: `Failed to send email: ${sent.error}` });
    }

    res.json({ message: `Email sent to ${customerEmail}` });
  } catch (err) {
    console.error('Inquiry reply error:', err);
    res.status(500).json({ error: 'Failed to send email.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
