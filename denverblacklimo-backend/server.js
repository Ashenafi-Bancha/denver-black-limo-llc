require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
// One proxy hop (DigitalOcean's load balancer) sits in front of this app.
// Without trusting it, req.ip is the balancer for everyone — which would lump
// all visitors into one rate-limit bucket and record the wrong address against
// a signature.
app.set('trust proxy', 1);
app.use(cors({ origin: allowedOrigin }));
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

// DB Setup (PostgreSQL) — SSL-aware pool + migration runner live in db.js
const { pool, runMigrations } = require('./db');
const flights = require('./flights');
const crypto = require('crypto');
const { buildAgreementPdf, signatureBuffer, TERMS_VERSION } = require('./agreement');

// Email templates + delivery live in ./emails.js
const {
  SENDER_EMAIL,
  ADMIN_NOTIFY_EMAIL,
  getResend,
  sendBookingEmails,
  sendSignedAgreementEmails,
  sendDriverDispatchEmail,
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

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Endpoints ---

// Get site settings (Public)
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM site_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
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
        return_dropoff_location, return_additional_stops, agreement_token
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
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
    ];

    const result = await pool.query(query, values);
    const bookingId = result.rows[0].id;
    const agreementToken = values[values.length - 1];

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
 * The drivers the office actually uses, newest first. Derived from past
 * dispatches rather than a separate address book, so there is nothing to
 * maintain and the list can never go stale.
 */
app.get('/api/drivers', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (lower(driver_email))
              driver_name AS name, driver_email AS email, driver_phone AS phone,
              driver_vehicle AS vehicle,
              COALESCE(driver_dispatched_at, updated_at) AS last_used
         FROM bookings
        WHERE driver_email IS NOT NULL AND driver_email <> ''
        ORDER BY lower(driver_email), COALESCE(driver_dispatched_at, updated_at) DESC
        LIMIT 50;`
    );
    rows.sort((a, b) => new Date(b.last_used) - new Date(a.last_used));
    res.json(rows);
  } catch (err) {
    console.error('Driver list error:', err.message);
    res.status(500).json({ error: 'Could not load drivers.' });
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
         vehicle_preference, special_requests, details, agreement_token
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
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

// Get all bookings (Protected)
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const query = `SELECT * FROM bookings ORDER BY created_at DESC LIMIT 100;`;
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
