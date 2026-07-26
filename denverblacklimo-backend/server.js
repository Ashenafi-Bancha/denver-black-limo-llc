require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Setup Multer for Image Uploads
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// DB Setup (PostgreSQL) — SSL-aware pool + migration runner live in db.js
const { pool, runMigrations } = require('./db');

// Lazy Resend client — only created when an API key is actually configured
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || 'admin@denverblacklimo.com';

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@denverblacklimo.com';

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

// ─────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────

// Human-friendly labels for the dynamic service-specific detail keys.
const DETAIL_LABELS = {
  fboName: 'FBO / Terminal',
  aircraftType: 'Aircraft Type',
  tailNumber: 'Tail Number',
  durationHours: 'Duration',
  serviceArea: 'Service Area',
  pickupType: 'Pickup Type',
  resort: 'Resort',
  estimatedTravelTime: 'Est. Travel Time',
  eventVenue: 'Event / Venue',
  eventDate: 'Event Date',
  eventTime: 'Event Time',
  returnPickupTime: 'Return Pickup Time',
  itinerary: 'Itinerary',
};

/** Build an array of {label, value} rows from the dynamic details + return/stops fields. */
function buildDetailRows(data) {
  const rows = [];
  const d = data.details || {};
  for (const [key, label] of Object.entries(DETAIL_LABELS)) {
    if (d[key]) rows.push({ label, value: String(d[key]) });
  }
  if (data.additional_stops) rows.push({ label: 'Additional Stops', value: String(data.additional_stops) });
  if (data.return_pickup_location || data.return_date || data.return_time) {
    const parts = [data.return_pickup_location, data.return_date, data.return_time].filter(Boolean).join(' · ');
    if (parts) rows.push({ label: 'Return Trip', value: parts });
  }
  return rows;
}

function detailRowsHtml(rows, dark) {
  if (!rows.length) return '';
  const labelColor = dark ? '#ffffff' : '#6b7280';
  const valueColor = dark ? '#d1d5db' : '#111';
  return rows
    .map(
      (r) => `<tr>
        <td style="padding:4px 0; color:${labelColor}; font-size:13px; width:130px; vertical-align:top;">${r.label}</td>
        <td style="padding:4px 0; font-size:13px; color:${valueColor};">${r.value}</td>
      </tr>`
    )
    .join('');
}

function buildCustomerConfirmationEmail(data) {
  const firstName = data.name ? data.name.split(' ')[0] : 'Valued Client';
  const specificsRows = buildDetailRows(data);
  const specificsSection = specificsRows.length
    ? `<tr><td colspan="2" style="padding:12px 0 4px;"><p style="margin:0; font-size:11px; font-weight:700; color:#c9a227; text-transform:uppercase; letter-spacing:2px;">Trip Specifics</p></td></tr>${detailRowsHtml(specificsRows, false)}`
    : '';
  
  const airportSection = data.airline_name ? `
    <tr>
      <td colspan="2" style="padding: 12px 0 4px;">
        <p style="margin:0; font-size:11px; font-weight:700; color:#c9a227; text-transform:uppercase; letter-spacing:2px;">Airport Info</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 4px 0; color:#6b7280; font-size:13px; width:130px;">Direction</td>
      <td style="padding: 4px 0; font-size:13px; color:#111;">${data.airport_direction || '—'}</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; color:#6b7280; font-size:13px;">Airline</td>
      <td style="padding: 4px 0; font-size:13px; color:#111;">${data.airline_name} (${data.airline_code || ''})</td>
    </tr>
    <tr>
      <td style="padding: 4px 0; color:#6b7280; font-size:13px;">Flight #</td>
      <td style="padding: 4px 0; font-size:13px; color:#111;">${data.flight_number || '—'}</td>
    </tr>
    ${data.terminal ? `<tr><td style="padding: 4px 0; color:#6b7280; font-size:13px;">Meet & Greet</td><td style="padding: 4px 0; font-size:13px; color:#111;">${data.terminal} Terminal – Level 5, Island 2</td></tr>` : ''}
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Booking Confirmation – Denver Black Limo</title></head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a; padding: 32px 40px; text-align:center;">
            <p style="margin:0; font-size:11px; letter-spacing:4px; color:#c9a227; text-transform:uppercase; font-weight:600;">Denver Black Limo LLC</p>
            <h1 style="margin:8px 0 0; font-size:26px; color:#fff; font-weight:300; letter-spacing:1px;">Booking Request Received</h1>
          </td>
        </tr>
        
        <!-- Gold Bar -->
        <tr><td style="background: linear-gradient(135deg, #e8c547, #c9a227, #b8860b); height: 3px;"></td></tr>
        
        <!-- Body -->
        <tr>
          <td style="padding: 40px 40px 20px;">
            <p style="margin:0 0 8px; font-size:18px; color:#111; font-weight:600;">Hello, ${firstName}!</p>
            <p style="margin:0 0 28px; font-size:14px; color:#6b7280; line-height:1.7;">
              Thank you for choosing <strong>Denver Black Limo</strong>. We've received your booking request and our team will review it shortly. You will receive a personalized quote by <strong>phone, text, or email</strong> — typically within a few minutes.
            </p>
            
            <!-- Booking Summary Box -->
            <div style="background:#f8f8f8; border-left: 3px solid #c9a227; padding: 24px 28px; border-radius: 0 6px 6px 0; margin-bottom:28px;">
              <p style="margin:0 0 16px; font-size:11px; font-weight:700; color:#c9a227; text-transform:uppercase; letter-spacing:2px;">Your Booking Summary</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td colspan="2" style="padding: 0 0 4px;">
                    <p style="margin:0; font-size:11px; font-weight:700; color:#c9a227; text-transform:uppercase; letter-spacing:2px;">Trip Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color:#6b7280; font-size:13px; width:130px;">Service</td>
                  <td style="padding: 4px 0; font-size:13px; color:#111;">${data.service_type || '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color:#6b7280; font-size:13px;">Trip Type</td>
                  <td style="padding: 4px 0; font-size:13px; color:#111;">${data.trip_type || '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color:#6b7280; font-size:13px;">Date & Time</td>
                  <td style="padding: 4px 0; font-size:13px; color:#111;">${data.pickup_date || '—'} at ${data.pickup_time || '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color:#6b7280; font-size:13px;">Pickup</td>
                  <td style="padding: 4px 0; font-size:13px; color:#111;">${data.pickup_location || 'Denver International Airport'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color:#6b7280; font-size:13px;">Drop-off</td>
                  <td style="padding: 4px 0; font-size:13px; color:#111;">${data.dropoff_location || '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color:#6b7280; font-size:13px;">Passengers</td>
                  <td style="padding: 4px 0; font-size:13px; color:#111;">${data.passengers || '—'} (Luggage: ${data.luggage || '0'})</td>
                </tr>
                ${data.vehicle_preference ? `<tr><td style="padding: 4px 0; color:#6b7280; font-size:13px;">Vehicle</td><td style="padding: 4px 0; font-size:13px; color:#111;">${data.vehicle_preference}</td></tr>` : ''}
                ${airportSection}
                ${specificsSection}
              </table>
            </div>

            <!-- What's Next -->
            <div style="background:#fef9c3; border:1px solid #fef08a; border-radius:6px; padding:16px 20px; margin-bottom:28px;">
              <p style="margin:0 0 4px; font-size:11px; font-weight:700; color:#854d0e; text-transform:uppercase; letter-spacing:1px;">What Happens Next?</p>
              <p style="margin:0; font-size:13px; color:#713f12; line-height:1.6;">Our team will review your request and send you a customized quote. No payment is required at this stage — this is a <strong>booking request only</strong>.</p>
            </div>

            <p style="margin:0; font-size:13px; color:#6b7280; line-height:1.7;">If you have questions, please don't hesitate to reach out:</p>
            <p style="margin:8px 0 0; font-size:14px; color:#111;"><strong>📞 (720) 499-6744</strong> &nbsp;|&nbsp; <strong>✉️ info@denverblacklimo.com</strong></p>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="background:#0a0a0a; padding: 24px 40px; text-align:center;">
            <p style="margin:0 0 4px; font-size:11px; letter-spacing:3px; color:#c9a227; text-transform:uppercase;">Denver Black Limo LLC</p>
            <p style="margin:0; font-size:11px; color:#4b4b4b;">Denver, Colorado &nbsp;|&nbsp; (720) 499-6744</p>
            <p style="margin:8px 0 0; font-size:10px; color:#333;">Your information is secure and will only be used for your booking.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildAdminAlertEmail(data, bookingId) {
  const firstName = data.name ? data.name.split(' ')[0] : 'Customer';
  const specificsRows = buildDetailRows(data);
  if (data.company) specificsRows.unshift({ label: 'Company', value: data.company });
  const specificsBlock = specificsRows.length
    ? `<div style="margin-top:20px; padding:14px 18px; background:#111; border-left:3px solid #c9a227; border-radius:0 4px 4px 0;">
        <p style="margin:0 0 8px; font-size:10px; color:#c9a227; text-transform:uppercase; letter-spacing:1px;">Trip Specifics</p>
        <table width="100%" cellpadding="0" cellspacing="0">${detailRowsHtml(specificsRows, true)}</table>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Booking Alert</title></head>
<body style="margin:0; padding:0; background:#f4f4f5; font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5; padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#0a0a0a; border-radius:8px; overflow:hidden;">
        
        <!-- Header -->
        <tr>
          <td style="padding:28px 36px; background:#111;">
            <p style="margin:0 0 4px; font-size:11px; letter-spacing:3px; color:#c9a227; text-transform:uppercase;">Denver Black Limo – Admin Alert</p>
            <h1 style="margin:0; font-size:22px; color:#fff; font-weight:400;">🚨 New Booking Request</h1>
          </td>
        </tr>
        <tr><td style="background: linear-gradient(135deg,#e8c547,#c9a227,#b8860b); height:3px;"></td></tr>
        
        <!-- Alert Banner -->
        <tr>
          <td style="padding:20px 36px; background:#1a1a1a;">
            <p style="margin:0; font-size:14px; color:#fff;">A new booking request was submitted by <strong style="color:#c9a227;">${data.name || '—'}</strong>. Please review and respond promptly.</p>
          </td>
        </tr>

        <!-- 3-Column Summary -->
        <tr>
          <td style="padding:0 36px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
              <tr valign="top">
                
                <!-- Col 1: Contact -->
                <td width="32%" style="padding-right:12px;">
                  <p style="margin:0 0 8px; font-size:10px; font-weight:700; color:#c9a227; text-transform:uppercase; letter-spacing:2px;">Contact</p>
                  <p style="margin:0 0 6px; font-size:12px; color:#d1d5db;"><strong style="color:#fff;">Name</strong><br>${data.name || '—'}</p>
                  <p style="margin:0 0 6px; font-size:12px; color:#d1d5db;"><strong style="color:#fff;">Phone</strong><br>${data.phone || '—'}</p>
                  <p style="margin:0; font-size:12px; color:#d1d5db;"><strong style="color:#fff;">Email</strong><br>${data.email || '—'}</p>
                </td>
                
                <!-- Divider -->
                <td width="2%" style="border-left:1px solid #333;"></td>
                
                <!-- Col 2: Trip -->
                <td width="32%" style="padding:0 12px;">
                  <p style="margin:0 0 8px; font-size:10px; font-weight:700; color:#c9a227; text-transform:uppercase; letter-spacing:2px;">Trip</p>
                  <p style="margin:0 0 6px; font-size:12px; color:#d1d5db;"><strong style="color:#fff;">Service</strong><br>${data.service_type || '—'}</p>
                  <p style="margin:0 0 6px; font-size:12px; color:#d1d5db;"><strong style="color:#fff;">Type</strong><br>${data.trip_type || '—'}</p>
                  <p style="margin:0 0 6px; font-size:12px; color:#d1d5db;"><strong style="color:#fff;">Date</strong><br>${data.pickup_date || '—'} @ ${data.pickup_time || '—'}</p>
                  ${data.airline_name ? `<p style="margin:0; font-size:12px; color:#d1d5db;"><strong style="color:#fff;">Flight</strong><br>${data.airline_name} ${data.flight_number || ''}</p>` : ''}
                </td>

                <!-- Divider -->
                <td width="2%" style="border-left:1px solid #333;"></td>
                
                <!-- Col 3: Route -->
                <td width="32%" style="padding-left:12px;">
                  <p style="margin:0 0 8px; font-size:10px; font-weight:700; color:#c9a227; text-transform:uppercase; letter-spacing:2px;">Route</p>
                  <p style="margin:0 0 6px; font-size:12px; color:#d1d5db;"><strong style="color:#fff;">Pickup</strong><br>${data.pickup_location || (data.airport_direction === 'Arrival' ? 'DEN Airport' : '—')}</p>
                  <p style="margin:0 0 6px; font-size:12px; color:#d1d5db;"><strong style="color:#fff;">Drop-off</strong><br>${data.dropoff_location || '—'}</p>
                  <p style="margin:0; font-size:12px; color:#d1d5db;"><strong style="color:#fff;">Passengers</strong><br>${data.passengers || '—'} pax / ${data.luggage || '0'} bags</p>
                </td>
              </tr>
            </table>

            ${specificsBlock}

            ${data.special_requests ? `
            <div style="margin-top:20px; padding:14px 18px; background:#111; border-left:3px solid #c9a227; border-radius:0 4px 4px 0;">
              <p style="margin:0 0 4px; font-size:10px; color:#c9a227; text-transform:uppercase; letter-spacing:1px;">Special Requests</p>
              <p style="margin:0; font-size:12px; color:#d1d5db;">${data.special_requests}</p>
            </div>` : ''}

            <!-- Booking ID -->
            <p style="margin:20px 0 0; font-size:11px; color:#4b4b4b; font-family:monospace;">Booking ID: ${bookingId}</p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 36px 32px; text-align:center;">
            <a href="http://localhost:5173/admin" style="display:inline-block; background: linear-gradient(135deg,#e8c547,#c9a227); color:#0a0a0a; font-weight:700; font-size:12px; letter-spacing:2px; text-transform:uppercase; text-decoration:none; padding:14px 32px; border-radius:4px;">
              View in Admin Dashboard →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #222; padding:16px 36px; text-align:center;">
            <p style="margin:0; font-size:10px; color:#4b4b4b; letter-spacing:1px;">Denver Black Limo LLC · Admin Notification System</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildAdminReplyEmail(customerName, messageBody) {
  const firstName = customerName ? customerName.split(' ')[0] : 'Valued Client';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Message from Denver Black Limo</title></head>
<body style="margin:0; padding:0; background:#f4f4f5; font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5; padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:#0a0a0a; padding:32px 40px; text-align:center;">
            <p style="margin:0; font-size:11px; letter-spacing:4px; color:#c9a227; text-transform:uppercase; font-weight:600;">Denver Black Limo LLC</p>
            <h1 style="margin:8px 0 0; font-size:22px; color:#fff; font-weight:300; letter-spacing:1px;">Message from Your Transportation Team</h1>
          </td>
        </tr>
        <tr><td style="background:linear-gradient(135deg,#e8c547,#c9a227,#b8860b); height:3px;"></td></tr>
        
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 28px;">
            <p style="margin:0 0 20px; font-size:16px; color:#111;">Hello, ${firstName}!</p>
            <div style="background:#f8f8f8; border-left:3px solid #c9a227; padding:20px 24px; border-radius:0 6px 6px 0; margin-bottom:28px; font-size:14px; color:#374151; line-height:1.8; white-space:pre-wrap;">${messageBody}</div>
            <p style="margin:0; font-size:13px; color:#6b7280;">If you have questions, please reach out:</p>
            <p style="margin:8px 0 0; font-size:14px; color:#111;"><strong>📞 (720) 499-6744</strong> &nbsp;|&nbsp; <strong>✉️ info@denverblacklimo.com</strong></p>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="background:#0a0a0a; padding:24px 40px; text-align:center;">
            <p style="margin:0 0 4px; font-size:11px; letter-spacing:3px; color:#c9a227; text-transform:uppercase;">Denver Black Limo LLC</p>
            <p style="margin:0; font-size:11px; color:#4b4b4b;">Denver, Colorado &nbsp;|&nbsp; (720) 499-6744</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildInquiryAdminEmail(data, id) {
  const isQuote = data.type === 'Quote';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>New ${isQuote ? 'Quote Request' : 'Contact Message'}</title></head>
<body style="margin:0; padding:0; background:#f4f4f5; font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5; padding:40px 20px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#0a0a0a; border-radius:8px; overflow:hidden;">
      <tr><td style="padding:28px 36px; background:#111;">
        <p style="margin:0 0 4px; font-size:11px; letter-spacing:3px; color:#c9a227; text-transform:uppercase;">Denver Black Limo – Admin Alert</p>
        <h1 style="margin:0; font-size:22px; color:#fff; font-weight:400;">${isQuote ? '💬 New Quote Request' : '✉️ New Contact Message'}</h1>
      </td></tr>
      <tr><td style="background: linear-gradient(135deg,#e8c547,#c9a227,#b8860b); height:3px;"></td></tr>
      <tr><td style="padding:24px 36px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0; color:#fff; font-size:13px; width:120px;">Name</td><td style="padding:4px 0; font-size:13px; color:#d1d5db;">${data.name || '—'}</td></tr>
          <tr><td style="padding:4px 0; color:#fff; font-size:13px;">Email</td><td style="padding:4px 0; font-size:13px; color:#d1d5db;">${data.email || '—'}</td></tr>
          <tr><td style="padding:4px 0; color:#fff; font-size:13px;">Phone</td><td style="padding:4px 0; font-size:13px; color:#d1d5db;">${data.phone || '—'}</td></tr>
          ${data.service ? `<tr><td style="padding:4px 0; color:#fff; font-size:13px;">Service</td><td style="padding:4px 0; font-size:13px; color:#d1d5db;">${data.service}</td></tr>` : ''}
          ${data.event_date ? `<tr><td style="padding:4px 0; color:#fff; font-size:13px;">Event Date</td><td style="padding:4px 0; font-size:13px; color:#d1d5db;">${data.event_date}</td></tr>` : ''}
        </table>
        <div style="margin-top:16px; padding:14px 18px; background:#111; border-left:3px solid #c9a227; border-radius:0 4px 4px 0;">
          <p style="margin:0 0 4px; font-size:10px; color:#c9a227; text-transform:uppercase; letter-spacing:1px;">Message</p>
          <p style="margin:0; font-size:13px; color:#d1d5db; white-space:pre-wrap;">${data.message || '—'}</p>
        </div>
        <p style="margin:16px 0 0; font-size:11px; color:#4b4b4b; font-family:monospace;">Inquiry ID: ${id}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function buildInquiryConfirmationEmail(data) {
  const firstName = data.name ? data.name.split(' ')[0] : 'Valued Client';
  const isQuote = data.type === 'Quote';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>We received your ${isQuote ? 'quote request' : 'message'}</title></head>
<body style="margin:0; padding:0; background:#f4f4f5; font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5; padding:40px 20px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <tr><td style="background:#0a0a0a; padding:32px 40px; text-align:center;">
        <p style="margin:0; font-size:11px; letter-spacing:4px; color:#c9a227; text-transform:uppercase; font-weight:600;">Denver Black Limo LLC</p>
        <h1 style="margin:8px 0 0; font-size:24px; color:#fff; font-weight:300; letter-spacing:1px;">${isQuote ? 'Quote Request Received' : 'Message Received'}</h1>
      </td></tr>
      <tr><td style="background:linear-gradient(135deg,#e8c547,#c9a227,#b8860b); height:3px;"></td></tr>
      <tr><td style="padding:40px 40px 28px;">
        <p style="margin:0 0 8px; font-size:18px; color:#111; font-weight:600;">Hello, ${firstName}!</p>
        <p style="margin:0 0 24px; font-size:14px; color:#6b7280; line-height:1.7;">
          Thank you for reaching out to <strong>Denver Black Limo</strong>. We've received your ${isQuote ? 'quote request' : 'message'} and a member of our team will get back to you shortly — typically within a few minutes.
        </p>
        <p style="margin:0; font-size:13px; color:#6b7280;">Need us sooner? Call or text:</p>
        <p style="margin:8px 0 0; font-size:14px; color:#111;"><strong>📞 (720) 499-6744</strong></p>
      </td></tr>
      <tr><td style="background:#0a0a0a; padding:24px 40px; text-align:center;">
        <p style="margin:0 0 4px; font-size:11px; letter-spacing:3px; color:#c9a227; text-transform:uppercase;">Denver Black Limo LLC</p>
        <p style="margin:0; font-size:11px; color:#4b4b4b;">Denver, Colorado &nbsp;|&nbsp; (720) 499-6744</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

async function sendInquiryEmails(data, id) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping inquiry email notifications.');
    return;
  }
  const resend = getResend();
  try {
    if (data.email) {
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: data.email,
        subject: data.type === 'Quote' ? 'Quote Request Received – Denver Black Limo' : 'Message Received – Denver Black Limo',
        html: buildInquiryConfirmationEmail(data),
      });
    }
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: ADMIN_NOTIFY_EMAIL,
      subject: `${data.type === 'Quote' ? '💬 New Quote Request' : '✉️ New Contact Message'} from ${data.name || 'a visitor'}`,
      html: buildInquiryAdminEmail(data, id),
    });
  } catch (err) {
    console.error('Inquiry email sending failed:', err.message);
  }
}

// ─────────────────────────────────────────────
// EMAIL SENDING HELPER
// ─────────────────────────────────────────────
async function sendBookingEmails(bookingData, bookingId) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email notifications.');
    return;
  }

  const resend = getResend();

  try {
    // 1. Send confirmation to customer
    if (bookingData.email) {
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: bookingData.email,
        subject: `Booking Request Received – Denver Black Limo`,
        html: buildCustomerConfirmationEmail(bookingData),
      });
      console.log(`Customer confirmation email sent to: ${bookingData.email}`);
    }

    // 2. Send alert to admin
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: ADMIN_NOTIFY_EMAIL,
      subject: `🚨 New Booking Request from ${bookingData.name || 'a customer'}`,
      html: buildAdminAlertEmail(bookingData, bookingId),
    });
    console.log(`Admin alert email sent to: ${ADMIN_NOTIFY_EMAIL}`);

  } catch (err) {
    // Log but don't crash the server — booking is already saved
    console.error('Email sending failed:', err.message);
  }
}

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
app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded.' });
    }
    // Return the public URL
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Login
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const accessToken = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token: accessToken });
  } else {
    res.status(401).json({ error: 'Incorrect email or password' });
  }
});

// Submit a new booking
app.post('/api/bookings', async (req, res) => {
  try {
    const data = req.body;
    
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
        luggage, vehicle_preference, special_requests, details
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
      ) RETURNING id;
    `;
    const values = [
      data.name, data.phone, data.email, data.company, data.serviceType, data.tripType,
      data.airportDirection, data.airlineCode, data.airline, data.terminal,
      data.flightNumber, data.pickupDate, data.pickupTime, data.pickupLocation,
      data.dropoffLocation, data.additionalStops, data.returnPickupLocation,
      data.returnDate, data.returnTime, data.passengers, data.luggage,
      data.vehiclePreference, data.specialRequests,
      data.details ? JSON.stringify(data.details) : null
    ];

    const result = await pool.query(query, values);
    const bookingId = result.rows[0].id;

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
      passengers: data.passengers,
      luggage: data.luggage,
      vehicle_preference: data.vehiclePreference,
      special_requests: data.specialRequests,
      details: data.details,
    }, bookingId);

    res.status(201).json({ id: bookingId, message: 'Booking received' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking' });
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
    const resend = getResend();

    await resend.emails.send({
      from: SENDER_EMAIL,
      to: customerEmail,
      subject: subject,
      html: buildAdminReplyEmail(customerName, message),
    });

    console.log(`Admin reply sent to ${customerEmail} for booking ${id}`);
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
app.post('/api/inquiries', async (req, res) => {
  try {
    const data = req.body;
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
    const resend = getResend();
    await resend.emails.send({
      from: SENDER_EMAIL,
      to: customerEmail,
      subject,
      html: buildAdminReplyEmail(customerName, message),
    });
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
