/**
 * Email templates + sending for Denver Black Limo.
 *
 * All messages share one responsive shell: a compact logo + business name
 * header, a white content body, and a branded footer with working social links.
 * Every send checks Resend's `error` field — the API returns errors in the
 * response rather than throwing, so unchecked calls fail silently.
 */
const { Resend } = require('resend');

const SITE = (process.env.SITE_URL || 'https://denverblacklimo.llc').replace(/\/$/, '');
const ADMIN_URL = (process.env.ALLOWED_ORIGIN || SITE).replace(/\/$/, '');

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const ADMIN_NOTIFY_EMAIL =
  process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || 'info@denverblacklimo.llc';

const BRAND = {
  name: 'Denver Black Limo LLC',
  tagline: 'Luxury Chauffeured Transportation',
  phone: '(720) 499-6744',
  phoneHref: 'tel:+17204996744',
  email: 'info@denverblacklimo.llc',
  black: '#0a0a0a',
  gold: '#c9a227',
  goldLight: '#d4af37',
  text: '#1f2328',
  muted: '#6b7280',
  line: '#e8e8e8',
  facebook: 'https://www.facebook.com/profile.php?id=61592643747921',
  instagram: 'https://www.instagram.com/denverblacklimo.llc',
  whatsapp: 'https://wa.me/17204996744',
};

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

/** Escapes user-supplied values before they go into HTML. */
function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────
// SHARED BUILDING BLOCKS
// ─────────────────────────────────────────────

/** Responsive shell: logo + name header, white body, branded footer. */
function shell({ title, preheader = '', contentHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(title)}</title>
<style>
  body { margin:0; padding:0; width:100% !important; background:#f2f2f3; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  table { border-collapse:collapse !important; }
  a { color:${BRAND.gold}; }
  @media only screen and (max-width:600px) {
    .wrap { padding:16px 12px !important; }
    .pad { padding-left:22px !important; padding-right:22px !important; }
    .h1 { font-size:21px !important; }
    .stackLabel { display:block !important; width:100% !important; padding-bottom:2px !important; }
    .stackValue { display:block !important; width:100% !important; padding-bottom:10px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:#f2f2f3; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f3;">
    <tr>
      <td align="center" class="wrap" style="padding:28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid ${BRAND.line};">

          <!-- Header: solid black, gold rule underneath -->
          <tr>
            <td style="background:${BRAND.black}; padding:20px 32px; border-bottom:3px solid ${BRAND.gold};">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px; vertical-align:middle;">
                    <img src="${SITE}/images/logo.png" width="44" height="44" alt=""
                         style="display:block; width:44px; height:44px; border-radius:50%;">
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:16px; font-weight:700; letter-spacing:2px; color:#ffffff; line-height:1.2;">DENVER</div>
                    <div style="font-size:13px; font-weight:600; letter-spacing:1.5px; color:${BRAND.goldLight}; line-height:1.3;">BLACK LIMO, LLC</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body: pure white -->
          <tr><td style="background:#ffffff;">${contentHtml}</td></tr>

          <!-- Footer: lighter charcoal + gold rule so it reads apart from the header -->
          <tr>
            <td style="background:#161616; padding:28px 32px; text-align:center; border-top:3px solid ${BRAND.gold};">

              <!-- Social icons + website, evenly spaced as one block -->
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
                <tr>
                  <td align="center" style="padding:0 7px;">
                    <a href="${BRAND.facebook}" target="_blank">
                      <img src="${SITE}/images/email/facebook.png" width="32" height="32" alt="Facebook" style="display:block; width:32px; height:32px; border-radius:50%;">
                    </a>
                  </td>
                  <td align="center" style="padding:0 7px;">
                    <a href="${BRAND.instagram}" target="_blank">
                      <img src="${SITE}/images/email/instagram.png" width="32" height="32" alt="Instagram" style="display:block; width:32px; height:32px; border-radius:50%;">
                    </a>
                  </td>
                  <td align="center" style="padding:0 7px;">
                    <a href="${BRAND.whatsapp}" target="_blank">
                      <img src="${SITE}/images/email/whatsapp.png" width="32" height="32" alt="WhatsApp" style="display:block; width:32px; height:32px; border-radius:50%;">
                    </a>
                  </td>
                </tr>
                <tr>
                  <td colspan="3" align="center" style="padding:14px 0 0;">
                    <a href="${SITE}" target="_blank" style="font-size:14px; font-weight:600; letter-spacing:1px; color:${BRAND.goldLight}; text-decoration:none;">denverblacklimo.llc</a>
                  </td>
                </tr>
              </table>

              <p style="margin:16px 0 0; font-size:13px; line-height:1.9; color:#ffffff;">
                <a href="${BRAND.phoneHref}" style="color:#ffffff; text-decoration:none; font-weight:600;">${BRAND.phone}</a><br>
                <a href="mailto:${BRAND.email}" style="color:#ffffff; text-decoration:none;">${BRAND.email}</a><br>
                <span style="color:#9a9a9a; font-size:12px;">Denver, Colorado &nbsp;&middot;&nbsp; Available 24/7</span>
              </p>

              <p style="margin:18px 0 0; padding-top:14px; border-top:1px solid #2b2b2b; font-size:11px; color:#7d7d7d; letter-spacing:0.4px;">
                &copy; ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Gold section heading used inside the body. */
function heading(text) {
  return `<p style="margin:0 0 12px; font-size:11px; font-weight:700; color:${BRAND.gold}; text-transform:uppercase; letter-spacing:2px;">${esc(text)}</p>`;
}

/** Two-column label/value table that stacks on small screens. */
function rowsTable(rows) {
  const body = rows
    .filter((r) => r && r.value)
    .map(
      (r) => `<tr>
        <td class="stackLabel" style="padding:7px 12px 7px 0; font-size:13px; color:${BRAND.muted}; width:150px; vertical-align:top;">${esc(r.label)}</td>
        <td class="stackValue" style="padding:7px 0; font-size:14px; color:${BRAND.text}; font-weight:500; vertical-align:top;">${esc(r.value)}</td>
      </tr>`
    )
    .join('');
  if (!body) return '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">${body}</table>`;
}

/** Light bordered panel used to group details. */
function panel(innerHtml) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; background:#ffffff; border:1px solid ${BRAND.line}; border-radius:8px;">
    <tr><td style="padding:18px 20px;">${innerHtml}</td></tr>
  </table>`;
}

/** Primary gold button. */
function button(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 0;">
    <tr><td style="background:${BRAND.gold}; border-radius:6px;">
      <a href="${url}" style="display:inline-block; padding:13px 30px; font-size:12px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:${BRAND.black}; text-decoration:none;">${esc(label)}</a>
    </td></tr>
  </table>`;
}

// ─────────────────────────────────────────────
// DETAIL HELPERS
// ─────────────────────────────────────────────

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

/** True when the pickup is less than `hours` away — flagged for the dispatcher. */
function isShortNotice(data, hours = 3) {
  if (!data.pickup_date) return false
  const stamp = Date.parse(`${data.pickup_date}T${data.pickup_time || '00:00'}`)
  if (Number.isNaN(stamp)) return false
  return stamp - Date.now() < hours * 60 * 60 * 1000
}

function tripRows(data) {
  return [
    { label: 'Reference', value: data.reference },
    { label: 'Service', value: data.service_type },
    { label: 'Trip Type', value: data.trip_type },
    { label: 'Pickup Date', value: data.pickup_date },
    { label: 'Pickup Time', value: data.pickup_time },
    { label: 'Pickup Location', value: data.pickup_location },
    { label: 'Drop-off', value: data.dropoff_location },
  ];
}

function airportRows(data) {
  if (!data.airline_name) return [];
  return [
    { label: 'Direction', value: data.airport_direction },
    { label: 'Airline', value: `${data.airline_name}${data.airline_code ? ` (${data.airline_code})` : ''}` },
    { label: 'Flight Number', value: data.flight_number },
    data.terminal ? { label: 'Meet & Greet', value: `${data.terminal} Terminal – Level 5, Island 2` } : null,
  ].filter(Boolean);
}

function vehicleRows(data) {
  return [
    { label: 'Passengers', value: data.passengers },
    { label: 'Luggage', value: data.luggage },
    { label: 'Vehicle', value: data.vehicle_preference || data.vehicle_category },
  ];
}

// ─────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────

function buildCustomerConfirmationEmail(data) {
  const firstName = data.name ? String(data.name).split(' ')[0] : 'there';
  const extra = buildDetailRows(data);
  const air = airportRows(data);

  const content = `
    <div class="pad" style="padding:34px 32px 8px;">
      <h1 class="h1" style="margin:0 0 10px; font-size:23px; line-height:1.3; color:${BRAND.text}; font-weight:700;">
        Thank you, ${esc(firstName)} — we have your request
      </h1>
      <p style="margin:0 0 6px; font-size:15px; line-height:1.6; color:${BRAND.muted};">
        Your reservation request has been received. Our team is reviewing the details and will contact you
        shortly by phone, text or email to confirm availability and provide your personalized quote.
      </p>
      <p style="margin:0 0 18px; font-size:13px; line-height:1.6; color:${BRAND.muted};">
        This message confirms your request — it is not yet a confirmed reservation.
      </p>
      ${
        data.reference
          ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 6px;">
              <tr><td style="border:1px solid ${BRAND.line}; border-left:3px solid ${BRAND.gold}; border-radius:6px; padding:12px 18px;">
                <span style="font-size:11px; letter-spacing:1.5px; color:${BRAND.muted}; text-transform:uppercase;">Your reference</span><br>
                <span style="font-size:19px; font-weight:700; letter-spacing:1px; color:${BRAND.text};">${esc(data.reference)}</span>
              </td></tr>
            </table>
            <p style="margin:6px 0 22px; font-size:12px; color:${BRAND.muted};">Quote this reference when you call or text us about this trip.</p>`
          : ''
      }
    </div>

    <div class="pad" style="padding:0 32px 8px;">
      ${panel(`${heading('Trip Summary')}${rowsTable(tripRows(data))}`)}
    </div>

    ${air.length ? `<div class="pad" style="padding:14px 32px 0;">${panel(`${heading('Flight Information')}${rowsTable(air)}`)}</div>` : ''}
    ${extra.length ? `<div class="pad" style="padding:14px 32px 0;">${panel(`${heading('Trip Specifics')}${rowsTable(extra)}`)}</div>` : ''}

    <div class="pad" style="padding:14px 32px 0;">
      ${panel(`${heading('Passengers & Vehicle')}${rowsTable(vehicleRows(data))}`)}
    </div>

    ${data.special_requests ? `<div class="pad" style="padding:14px 32px 0;">${panel(`${heading('Special Requests')}<p style="margin:0; font-size:14px; line-height:1.6; color:${BRAND.text};">${esc(data.special_requests)}</p>`)}</div>` : ''}

    <div class="pad" style="padding:24px 32px 34px;">
      <p style="margin:0 0 4px; font-size:14px; color:${BRAND.text}; font-weight:600;">Need to make a change?</p>
      <p style="margin:0; font-size:14px; line-height:1.6; color:${BRAND.muted};">
        Call or text us any time at
        <a href="${BRAND.phoneHref}" style="color:${BRAND.gold}; text-decoration:none; font-weight:600;">${BRAND.phone}</a>
        — we are available 24 hours a day.
      </p>
      ${button('View Our Services', `${SITE}/services`)}
    </div>`;

  return shell({
    title: 'Booking Request Received',
    preheader: `We received your reservation request for ${data.service_type || 'your trip'}.`,
    contentHtml: content,
  });
}

function buildAdminAlertEmail(data, bookingId) {
  const extra = buildDetailRows(data);
  const air = airportRows(data);

  const content = `
    <div class="pad" style="padding:34px 32px 8px;">
      <h1 class="h1" style="margin:0 0 8px; font-size:23px; line-height:1.3; color:${BRAND.text}; font-weight:700;">
        New booking request
      </h1>
      <p style="margin:0 0 ${isShortNotice(data) ? '16px' : '22px'}; font-size:15px; line-height:1.6; color:${BRAND.muted};">
        ${esc(data.name || 'A customer')} submitted a reservation request through the website.
      </p>
      ${
        isShortNotice(data)
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; background:#fff8e1; border:1px solid ${BRAND.gold}; border-radius:8px; margin-bottom:22px;">
              <tr><td style="padding:14px 18px;">
                <p style="margin:0; font-size:14px; font-weight:700; color:#8a6d1a;">SHORT NOTICE — pickup is within 3 hours</p>
                <p style="margin:4px 0 0; font-size:13px; color:#8a6d1a;">Contact this customer immediately to confirm availability.</p>
              </td></tr>
            </table>`
          : ''
      }
    </div>

    <div class="pad" style="padding:0 32px 8px;">
      ${panel(`${heading('Customer')}${rowsTable([
        { label: 'Name', value: data.name },
        { label: 'Phone', value: data.phone },
        { label: 'Email', value: data.email },
        { label: 'Company', value: data.company },
      ])}`)}
    </div>

    <div class="pad" style="padding:14px 32px 0;">
      ${panel(`${heading('Trip')}${rowsTable(tripRows(data))}`)}
    </div>

    ${air.length ? `<div class="pad" style="padding:14px 32px 0;">${panel(`${heading('Flight Information')}${rowsTable(air)}`)}</div>` : ''}
    ${extra.length ? `<div class="pad" style="padding:14px 32px 0;">${panel(`${heading('Trip Specifics')}${rowsTable(extra)}`)}</div>` : ''}

    <div class="pad" style="padding:14px 32px 0;">
      ${panel(`${heading('Passengers & Vehicle')}${rowsTable(vehicleRows(data))}`)}
    </div>

    ${data.special_requests ? `<div class="pad" style="padding:14px 32px 0;">${panel(`${heading('Special Requests')}<p style="margin:0; font-size:14px; line-height:1.6; color:${BRAND.text};">${esc(data.special_requests)}</p>`)}</div>` : ''}

    <div class="pad" style="padding:22px 32px 34px;">
      <p style="margin:0 0 2px; font-size:13px; color:${BRAND.muted};">Booking reference</p>
      <p style="margin:0; font-size:13px; color:${BRAND.text}; font-family:'Courier New',monospace;">${esc(bookingId)}</p>
      ${button('Open Admin Dashboard', `${ADMIN_URL}/admin`)}
    </div>`;

  return shell({
    title: 'New Booking Request',
    preheader: `${data.name || 'A customer'} — ${data.service_type || 'booking request'}`,
    contentHtml: content,
  });
}

function buildAdminReplyEmail(customerName, messageBody) {
  const safeMessage = esc(messageBody).replace(/\n/g, '<br>');
  const content = `
    <div class="pad" style="padding:34px 32px 10px;">
      <h1 class="h1" style="margin:0 0 14px; font-size:23px; line-height:1.3; color:${BRAND.text}; font-weight:700;">
        Hello ${esc(customerName || 'there')},
      </h1>
      <div style="font-size:15px; line-height:1.7; color:${BRAND.text};">${safeMessage}</div>
    </div>
    <div class="pad" style="padding:18px 32px 34px;">
      <p style="margin:0 0 4px; font-size:14px; color:${BRAND.text}; font-weight:600;">Denver Black Limo LLC</p>
      <p style="margin:0; font-size:14px; line-height:1.6; color:${BRAND.muted};">
        <a href="${BRAND.phoneHref}" style="color:${BRAND.gold}; text-decoration:none; font-weight:600;">${BRAND.phone}</a>
        — available 24/7
      </p>
    </div>`;

  return shell({ title: 'Message from Denver Black Limo', preheader: 'A message regarding your reservation.', contentHtml: content });
}

function buildInquiryAdminEmail(data, id) {
  const content = `
    <div class="pad" style="padding:34px 32px 8px;">
      <h1 class="h1" style="margin:0 0 8px; font-size:23px; line-height:1.3; color:${BRAND.text}; font-weight:700;">
        New ${esc(data.type === 'Quote' ? 'quote request' : 'message')}
      </h1>
      <p style="margin:0 0 22px; font-size:15px; line-height:1.6; color:${BRAND.muted};">
        ${esc(data.name || 'Someone')} contacted you through the website.
      </p>
    </div>
    <div class="pad" style="padding:0 32px 8px;">
      ${panel(`${heading('Contact')}${rowsTable([
        { label: 'Name', value: data.name },
        { label: 'Email', value: data.email },
        { label: 'Phone', value: data.phone },
        { label: 'Service', value: data.service },
        { label: 'Event Date', value: data.event_date },
      ])}`)}
    </div>
    <div class="pad" style="padding:14px 32px 0;">
      ${panel(`${heading('Message')}<p style="margin:0; font-size:14px; line-height:1.7; color:${BRAND.text};">${esc(data.message).replace(/\n/g, '<br>')}</p>`)}
    </div>
    <div class="pad" style="padding:22px 32px 34px;">
      <p style="margin:0 0 2px; font-size:13px; color:${BRAND.muted};">Reference</p>
      <p style="margin:0; font-size:13px; color:${BRAND.text}; font-family:'Courier New',monospace;">${esc(id)}</p>
      ${button('Open Admin Dashboard', `${ADMIN_URL}/admin`)}
    </div>`;

  return shell({
    title: 'New Website Inquiry',
    preheader: `${data.name || 'Someone'} sent a message through the website.`,
    contentHtml: content,
  });
}

function buildInquiryConfirmationEmail(data) {
  const firstName = data.name ? String(data.name).split(' ')[0] : 'there';
  const content = `
    <div class="pad" style="padding:34px 32px 10px;">
      <h1 class="h1" style="margin:0 0 10px; font-size:23px; line-height:1.3; color:${BRAND.text}; font-weight:700;">
        Thank you, ${esc(firstName)}
      </h1>
      <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:${BRAND.muted};">
        We have received your message and a member of our team will respond shortly.
        For urgent requests, please call or text us — we are available 24 hours a day.
      </p>
    </div>
    ${data.message ? `<div class="pad" style="padding:0 32px 8px;">${panel(`${heading('Your Message')}<p style="margin:0; font-size:14px; line-height:1.7; color:${BRAND.text};">${esc(data.message).replace(/\n/g, '<br>')}</p>`)}</div>` : ''}
    <div class="pad" style="padding:22px 32px 34px;">
      <p style="margin:0; font-size:14px; line-height:1.6; color:${BRAND.muted};">
        Call or text
        <a href="${BRAND.phoneHref}" style="color:${BRAND.gold}; text-decoration:none; font-weight:600;">${BRAND.phone}</a>
      </p>
      ${button('Book Your Ride', `${SITE}/book`)}
    </div>`;

  return shell({ title: 'We received your message', preheader: 'Thank you for contacting Denver Black Limo.', contentHtml: content });
}

// ─────────────────────────────────────────────
// SENDING
// ─────────────────────────────────────────────

/**
 * Sends one email and reports the outcome. Resend returns API failures in the
 * response body (it does not throw), so the `error` field must be checked or
 * failures pass silently.
 */
async function deliver({ to, subject, html, label }) {
  const resend = getResend();
  if (!resend) {
    console.warn(`RESEND_API_KEY not set — skipped ${label} to ${to}`);
    return { ok: false, error: 'Email service not configured' };
  }
  try {
    const { data, error } = await resend.emails.send({ from: SENDER_EMAIL, to, subject, html });
    if (error) {
      const message = error.message || JSON.stringify(error);
      console.error(`EMAIL FAILED (${label}) to ${to}: ${message}`);
      if (/testing emails|own email address|verify a domain/i.test(message)) {
        console.error(
          'Resend is in test mode: unverified domains may only send to the account owner. ' +
            'Verify denverblacklimo.llc in Resend and set SENDER_EMAIL=noreply@denverblacklimo.llc.'
        );
      }
      return { ok: false, error: message };
    }
    console.log(`Email sent (${label}) to ${to}${data && data.id ? ` [${data.id}]` : ''}`);
    return { ok: true, id: data && data.id };
  } catch (err) {
    console.error(`EMAIL ERROR (${label}) to ${to}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/** Customer confirmation + admin alert. Each is sent independently. */
async function sendBookingEmails(bookingData, bookingId) {
  if (bookingData.email) {
    await deliver({
      to: bookingData.email,
      subject: 'Booking Request Received — Denver Black Limo LLC',
      html: buildCustomerConfirmationEmail(bookingData),
      label: 'booking confirmation',
    });
  }
  await deliver({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `New Booking Request — ${bookingData.name || 'Website'}`,
    html: buildAdminAlertEmail(bookingData, bookingId),
    label: 'booking admin alert',
  });
}

/** Inquiry confirmation + admin alert. Each is sent independently. */
async function sendInquiryEmails(data, id) {
  if (data.email) {
    await deliver({
      to: data.email,
      subject: 'We Received Your Message — Denver Black Limo LLC',
      html: buildInquiryConfirmationEmail(data),
      label: 'inquiry confirmation',
    });
  }
  await deliver({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `New ${data.type === 'Quote' ? 'Quote Request' : 'Inquiry'} — ${data.name || 'Website'}`,
    html: buildInquiryAdminEmail(data, id),
    label: 'inquiry admin alert',
  });
}

/** Admin → customer reply from the dashboard. */
async function sendAdminReply(to, subject, customerName, message) {
  return deliver({
    to,
    subject,
    html: buildAdminReplyEmail(customerName, message),
    label: 'admin reply',
  });
}

module.exports = {
  SENDER_EMAIL,
  ADMIN_NOTIFY_EMAIL,
  getResend,
  sendBookingEmails,
  sendInquiryEmails,
  sendAdminReply,
  buildCustomerConfirmationEmail,
  buildAdminAlertEmail,
  buildAdminReplyEmail,
  buildInquiryAdminEmail,
  buildInquiryConfirmationEmail,
};
