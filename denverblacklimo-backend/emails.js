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
/**
 * Alerts can go to several people — the owner and whoever is testing, say.
 * Set ADMIN_NOTIFY_EMAIL to a comma-separated list; Resend takes an array of
 * recipients. A single address still works unchanged.
 */
const ADMIN_NOTIFY_EMAIL = (
  process.env.ADMIN_NOTIFY_EMAIL ||
  process.env.ADMIN_EMAIL ||
  'info@denverblacklimo.llc'
)
  .split(',')
  .map((address) => address.trim())
  .filter(Boolean);

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
    .brand1 { font-size:24px !important; }
    .brand2 { font-size:17px !important; }
    .stackLabel { display:block !important; width:100% !important; padding-bottom:2px !important; }
    .stackValue { display:block !important; width:100% !important; padding-bottom:10px !important; }
    .col { display:block !important; width:100% !important; padding-right:0 !important; box-sizing:border-box; }
    .col + .col { margin-top:10px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:#f2f2f3; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f3;">
    <tr>
      <td align="center" class="wrap" style="padding:28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background:#ffffff; border-radius:10px; overflow:hidden; border:1px solid ${BRAND.line};">

          <!-- Header: full logo artwork beside the brand lockup, gold rule underneath -->
          <tr>
            <!-- #000 exactly: the logo artwork is on pure black, so any other shade shows its square edge -->
            <td style="background:#000000; padding:18px 28px; border-bottom:4px solid ${BRAND.gold};">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:18px; vertical-align:middle;">
                    <img src="${SITE}/images/logo-512.png" width="118" height="118" alt="Denver Black Limo LLC"
                         style="display:block; width:118px; height:118px;">
                  </td>
                  <td style="vertical-align:middle;">
                    <div class="brand1" style="font-size:34px; font-weight:700; letter-spacing:3px; color:#ffffff; line-height:1.1;">DENVER</div>
                    <div class="brand2" style="font-size:24px; font-weight:700; letter-spacing:2px; color:${BRAND.goldLight}; line-height:1.2;">BLACK LIMO, LLC</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body: pure white -->
          <tr><td style="background:#ffffff;">${contentHtml}</td></tr>

          <!-- Footer: contact columns with gold icons, social links, copyright -->
          <tr>
            <td style="background:#ffffff; padding:26px 24px 22px; border-top:3px solid ${BRAND.gold};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  ${[
                    { icon: 'phone', line: BRAND.phone, href: BRAND.phoneHref, sub: 'Available 24/7' },
                    { icon: 'email', line: BRAND.email, href: `mailto:${BRAND.email}`, sub: 'We reply quickly' },
                    { icon: 'location', line: 'Denver, Colorado', href: SITE, sub: 'Serving the Denver Metro Area' },
                  ]
                    .map(
                      (c) => `<td class="col" align="center" style="width:33%; vertical-align:top; padding:0 6px;">
                        <img src="${SITE}/images/email/${c.icon}.png" width="44" height="44" alt="" style="display:block; margin:0 auto 8px; width:44px; height:44px;">
                        <a href="${c.href}" style="display:block; font-size:13px; font-weight:700; color:${BRAND.text}; text-decoration:none; line-height:1.4;">${esc(c.line)}</a>
                        <span style="display:block; font-size:11px; color:${BRAND.muted}; line-height:1.4;">${esc(c.sub)}</span>
                      </td>`
                    )
                    .join('')}
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:20px auto 0;">
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
              </table>

              <p style="margin:16px 0 0; font-size:12px; text-align:center;">
                <a href="${SITE}" target="_blank" style="font-weight:600; letter-spacing:1px; color:${BRAND.gold}; text-decoration:none;">denverblacklimo.llc</a>
              </p>
              <p style="margin:12px 0 0; padding-top:12px; border-top:1px solid ${BRAND.line}; font-size:11px; text-align:center; color:${BRAND.muted}; letter-spacing:0.4px;">
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
  // Stops and the return leg are rendered by tripRows()/returnRows() so that both
  // legs read in the same pickup → stops → drop-off order.
  return rows;
}

/** True when the pickup is less than `hours` away — flagged for the dispatcher. */
function isShortNotice(data, hours = 3) {
  if (!data.pickup_date) return false
  const stamp = Date.parse(`${data.pickup_date}T${data.pickup_time || '00:00'}`)
  if (Number.isNaN(stamp)) return false
  return stamp - Date.now() < hours * 60 * 60 * 1000
}

/** Stops are stored joined with " || " — show them as a readable list. */
function formatStops(raw) {
  if (!raw) return '';
  return String(raw).split('||').map((s) => s.trim()).filter(Boolean).join(', ');
}

function tripRows(data) {
  // Listed in journey order: pickup, then stops along the way, then the drop-off.
  return [
    { label: 'Reference', value: data.reference },
    { label: 'Service', value: data.service_type },
    { label: 'Trip Type', value: data.trip_type },
    { label: 'Pickup Date', value: data.pickup_date },
    { label: 'Pickup Time', value: data.pickup_time },
    { label: 'Pickup Location', value: data.pickup_location },
    { label: 'Stops', value: formatStops(data.additional_stops) },
    { label: 'Drop-off', value: data.dropoff_location },
  ];
}

/** The return leg, in the same pickup → stops → drop-off order. */
function returnRows(data) {
  if (!data.return_date && !data.return_pickup_location && !data.return_dropoff_location) return [];
  return [
    { label: 'Return Date', value: data.return_date },
    { label: 'Return Time', value: data.return_time },
    {
      label: 'Return Flight',
      value: [data.return_flight_number, data.return_airline_name].filter(Boolean).join(' · '),
    },
    { label: 'Return Pickup', value: data.return_pickup_location },
    { label: 'Return Stops', value: formatStops(data.return_additional_stops) },
    { label: 'Return Drop-off', value: data.return_dropoff_location },
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
// RESERVATION RECEIPT
// ─────────────────────────────────────────────
//
// Both booking emails are laid out as a reservation receipt, the format the
// client's office works from (pick-up block, booked-on box, client and
// passenger, routing, payment status, notes). Same data, same shape, so the
// customer and the dispatcher are reading the same document.

const { PREAMBLE, SECTIONS, PAYMENT_SCHEDULE, CANCELLATION_WINDOWS, DISPATCH } = require('./terms');

const DENVER_TZ = 'America/Denver';
const INK = '#1f2328';
const RULE = '#2b2b2b';

/** "08/25/2026 - Tuesday" from an ISO date, weekday computed without timezone drift. */
function longDate(iso) {
  if (!iso) return '';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(dt);
  return `${m[2]}/${m[3]}/${m[1]} - ${weekday}`;
}

/** "04:42 PM / 16:42" from "16:42": both clocks, so nobody misreads an evening pickup. */
function clock(hhmm) {
  if (!hhmm) return '';
  const m = String(hhmm).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return String(hhmm);
  const h = Number(m[1]);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m[2]} ${h >= 12 ? 'PM' : 'AM'} / ${String(h).padStart(2, '0')}:${m[2]}`;
}

/** "08/21/2026 03:25 PM", Denver time, which is where the office reads it. */
function bookedOn(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER_TZ, month: '2-digit', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date).replace(',', '');
}

const isAirportTrip = (d) => Boolean(d.airline_name || d.flight_number) || /airport/i.test(d.service_type || '');
const isArrival = (d) => isAirportTrip(d) && /arriv/i.test(d.airport_direction || '');
const isDeparture = (d) => isAirportTrip(d) && /depart/i.test(d.airport_direction || '');

/** Where the chauffeur stands at DEN, per the company's pick-up procedures. */
function meetPoint(terminal) {
  const t = String(terminal || '').toLowerCase();
  if (t.includes('west')) return 'West Terminal, Door 506, Island 2 (outside Baggage Claim 16)';
  if (t.includes('east')) return 'East Terminal, Door 511, Island 2 (outside Baggage Claim 6)';
  return '';
}

function flightLabel(d) {
  return [d.airline_name, d.flight_number].filter(Boolean).join(' ');
}

/** The banner line at the top of the receipt: "AIRPORT ARRIVAL", "MOUNTAIN RESORT TRANSPORTATION", ... */
function tripHeadline(d) {
  if (isArrival(d)) return 'AIRPORT ARRIVAL';
  if (isDeparture(d)) return 'AIRPORT DEPARTURE';
  return String(d.service_type || 'RESERVATION REQUEST').toUpperCase();
}

function tripNotes(d) {
  if (isArrival(d)) {
    const f = flightLabel(d);
    return `Airport arrival request received. ${f ? `Flight ${f}` : 'The flight'} will be monitored and the pick-up time adjusted to the actual arrival.`;
  }
  if (isDeparture(d)) return 'Airport departure request received. The pick-up time will be confirmed against the flight so there is time to spare.';
  return 'Reservation request received. We will confirm availability and send your quote.';
}

/** Label: value line inside a bordered box. */
function line(label, value, opts = {}) {
  if (!value) return '';
  const v = opts.raw ? value : esc(value);
  return `<p style="margin:0 0 5px; font-size:13px; line-height:1.5; color:${INK};"><b>${esc(label)}:</b> ${v}</p>`;
}

/** Thin black-bordered box, the receipt's building block. */
function box(innerHtml, extraStyle = '') {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; border:1px solid ${RULE}; ${extraStyle}">
    <tr><td style="padding:10px 12px;">${innerHtml}</td></tr>
  </table>`;
}

/** Small centred label + value cell, for the Pax / Vehicle / Provider strip. */
function cell(label, value) {
  return `<td class="col" style="border:1px solid ${RULE}; padding:8px 10px; text-align:center; vertical-align:top;">
    <div style="font-size:12px; font-weight:700; color:${INK}; padding-bottom:6px; border-bottom:1px solid ${RULE}; margin-bottom:6px;">${esc(label)}</div>
    <div style="font-size:13px; color:${INK}; line-height:1.4;">${esc(value || '—')}</div>
  </td>`;
}

/** The pick-up / drop-off block of the routing box. */
function routingHtml(d) {
  const extra = buildDetailRows(d);
  const stops = formatStops(d.additional_stops);
  const flight = flightLabel(d);
  const pickupTime = d.pickup_time ? clock(d.pickup_time).split(' / ')[1] : '';

  let pu = `<p style="margin:0 0 3px; font-size:13px; line-height:1.5; color:${INK};"><b>PU:</b> ${pickupTime ? `${esc(pickupTime)} : ` : ''}${esc(d.pickup_location)}</p>`;
  if (isArrival(d) && flight) {
    pu += `<p style="margin:0 0 3px 28px; font-size:12px; line-height:1.5; color:${INK};">${esc(flight)}${d.pickup_time ? ` – scheduled arrival ${esc(clock(d.pickup_time).split(' / ')[0])}` : ''}</p>`;
    pu += `<p style="margin:0 0 3px 28px; font-size:12px; line-height:1.5; color:${BRAND.muted};">Airport arrival pickup – chauffeur tracks flight</p>`;
    const meet = meetPoint(d.terminal);
    if (meet) pu += `<p style="margin:0 0 3px 28px; font-size:12px; line-height:1.5; color:${INK};"><b>Meet &amp; Greet:</b> ${esc(meet)}</p>`;
  }

  let dropoff = `<p style="margin:8px 0 3px; font-size:13px; line-height:1.5; color:${INK};"><b>DO:</b> ${esc(d.dropoff_location)}</p>`;
  if (isDeparture(d) && flight) {
    dropoff += `<p style="margin:0 0 3px 28px; font-size:12px; line-height:1.5; color:${INK};">${esc(flight)}</p>`;
  }

  const stopsHtml = stops ? `<p style="margin:8px 0 3px; font-size:13px; line-height:1.5; color:${INK};"><b>Stops:</b> ${esc(stops)}</p>` : '';

  let ret = '';
  if (d.return_date || d.return_pickup_location || d.return_dropoff_location) {
    const legs = [d.return_pickup_location, d.return_dropoff_location].filter(Boolean).join(' → ');
    const when = [longDate(d.return_date), d.return_time ? clock(d.return_time) : ''].filter(Boolean).join(' · ');
    const rFlight = [d.return_airline_name, d.return_flight_number].filter(Boolean).join(' ');
    const rStops = formatStops(d.return_additional_stops);
    ret = `<div style="margin-top:10px; padding-top:8px; border-top:1px solid ${RULE};">
      <p style="margin:0 0 3px; font-size:13px; line-height:1.5; color:${INK};"><b>Return:</b> ${esc(legs)}${when ? ` · ${esc(when)}` : ''}</p>
      ${rFlight ? `<p style="margin:0 0 3px 28px; font-size:12px; line-height:1.5; color:${INK};">${esc(rFlight)}</p>` : ''}
      ${rStops ? `<p style="margin:0 0 3px 28px; font-size:12px; line-height:1.5; color:${INK};"><b>Stops:</b> ${esc(rStops)}</p>` : ''}
    </div>`;
  }

  const extraHtml = extra.length
    ? `<div style="margin-top:10px; padding-top:8px; border-top:1px solid ${RULE};">${extra.map((r) => line(r.label, r.value)).join('')}</div>`
    : '';

  return `${pu}${stopsHtml}${dropoff}${ret}${extraHtml}`;
}

/**
 * The receipt itself. `forAdmin` adds the company name to the client block so
 * corporate bookings are obvious at a glance; everything else is identical.
 */
function reservationReceipt(d, { forAdmin = false } = {}) {
  const pax = d.passengers ? String(d.passengers) : '';
  const paxWord = pax ? `${pax} passenger${pax === '1' ? '' : 's'}` : '';
  const vehicle = d.vehicle_preference || d.vehicle_category || '';
  const arrBy = isArrival(d) ? flightLabel(d) || 'Not specified' : isDeparture(d) ? `Departing ${flightLabel(d) || 'flight not specified'}` : 'Not specified';
  const timeLabel = isArrival(d) && d.pickup_time ? `Flight Arrival – ${clock(d.pickup_time)}` : clock(d.pickup_time);

  const contact = `${esc(d.name)}<br>
    ${d.email ? `<a href="mailto:${esc(d.email)}" style="color:${BRAND.gold}; text-decoration:none;">${esc(d.email)}</a><br>` : ''}
    ${d.phone ? `<a href="tel:${esc(String(d.phone).replace(/[^\d+]/g, ''))}" style="color:${BRAND.gold}; text-decoration:none;">${esc(d.phone)}</a>` : ''}
    ${forAdmin && d.company ? `<br><span style="color:${BRAND.muted};">${esc(d.company)}</span>` : ''}`;

  return `
    <!-- Headline band -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-top:2px solid ${INK}; border-bottom:2px solid ${INK}; margin:0 0 14px;">
      <tr><td style="padding:8px 0;">
        <span style="font-size:11px; letter-spacing:1.5px; color:${BRAND.muted}; text-transform:uppercase;">Personal message</span>
        <span style="display:inline-block; margin-left:10px; font-size:14px; font-weight:700; letter-spacing:1px; color:${INK};">${esc(tripHeadline(d))}</span>
      </td></tr>
    </table>

    <!-- Pick-up block + booked-on box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td class="col" style="vertical-align:top; padding-right:12px; width:58%;">
          ${line('Pick-up Date', longDate(d.pickup_date))}
          ${line('Pick-up Time', timeLabel)}
          ${line('Reservation#', d.reference)}
          ${line('Client', contact, { raw: true })}
          ${line('Primary Passenger', `${esc(d.name)}${paxWord ? `<br><span style="color:${BRAND.muted};">${esc(paxWord)}</span>` : ''}`, { raw: true })}
        </td>
        <td class="col" style="vertical-align:top; width:42%;">
          ${box(`
            ${line('Booked On', bookedOn())}
            ${line('Arr. By', arrBy)}
            ${line('Client Ref', 'Website Booking')}
          `)}
        </td>
      </tr>
    </table>

    <!-- Pax / Vehicle / Provider strip -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; margin:14px 0 0;">
      <tr>
        ${cell('# of Pax', pax)}
        ${cell('Vehicle Type', vehicle)}
        ${cell('Service Provider', 'DENVER BLACK LIMO, LLC')}
      </tr>
    </table>

    <!-- Routing + payment status -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; margin:14px 0 0;">
      <tr>
        <td class="col" style="vertical-align:top; width:60%; padding-right:12px;">
          ${box(`
            <p style="margin:0 0 8px; padding-bottom:6px; border-bottom:1px solid ${RULE}; font-size:13px; font-weight:700; color:${INK};">Passenger &amp; Routing Information</p>
            ${line('Passenger', d.name)}
            ${line('Phone', d.phone)}
            ${line('Email', d.email)}
            <div style="margin-top:8px; padding-top:8px; border-top:1px solid ${RULE};">${routingHtml(d)}</div>
          `)}
        </td>
        <td class="col" style="vertical-align:top; width:40%;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
            <tr>
              ${cell('Pmt Type', 'Pending')}
              ${cell('Status', 'Request Received')}
            </tr>
          </table>
          <div style="height:12px; line-height:12px;">&nbsp;</div>
          ${box(`
            <p style="margin:0 0 8px; padding-bottom:6px; border-bottom:1px solid ${RULE}; font-size:13px; font-weight:700; color:${INK}; text-align:center;">Charges &amp; Fees</p>
            ${line('Rate', 'Sent separately')}
            ${line('Estimated Total', 'Sent separately')}
          `)}
        </td>
      </tr>
    </table>

    <!-- Notes -->
    <div style="margin:14px 0 0;">
      ${box(`
        <p style="margin:0 0 8px; padding-bottom:6px; border-bottom:1px solid ${RULE}; font-size:13px; font-weight:700; color:${INK};">Notes / Comments</p>
        ${line('Trip Notes', tripNotes(d))}
        ${line('Special Requests', d.special_requests || 'None listed.')}
      `)}
    </div>

    <p style="margin:12px 0 0; font-size:12px; line-height:1.6; color:${INK};">
      <b>Important:</b> This is a reservation request receipt, not a final confirmation. Your price and payment details are sent separately.
    </p>`;
}

// ─────────────────────────────────────────────
// POLICY BLOCKS (customer email)
// ─────────────────────────────────────────────

/** Two-column mini table used inside the highlight boxes. */
function miniTable(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; margin:6px 0 10px; border:1px solid ${BRAND.gold};">
    ${rows.map(([a, b], i) => `<tr style="background:${i % 2 ? '#fffdf5' : '#ffffff'};">
      <td style="padding:6px 10px; font-size:12px; color:${INK}; border-bottom:1px solid #f0e6c8;">${esc(a)}</td>
      <td style="padding:6px 10px; font-size:12px; font-weight:700; color:${INK}; border-bottom:1px solid #f0e6c8; text-align:right;">${esc(b)}</td>
    </tr>`).join('')}
  </table>`;
}

function bullets(items, color = INK, size = 12) {
  return `<ul style="margin:0 0 8px; padding-left:18px;">${items
    .map((t) => `<li style="margin:0 0 5px; font-size:${size}px; line-height:1.55; color:${color};">${t}</li>`)
    .join('')}</ul>`;
}

/**
 * The part the client asked to be impossible to miss: when money is due, what
 * the card on file will be charged for, and how cancellation works. Gold
 * border and tinted background so it reads as a notice, not fine print.
 */
function paymentNoticeHtml(d) {
  const airport = isAirportTrip(d) || /aviation|fbo/i.test(d.service_type || '');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; background:#fff8e1; border:2px solid ${BRAND.gold}; border-radius:8px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 10px; font-size:13px; font-weight:700; letter-spacing:1.5px; color:#8a6d1a; text-transform:uppercase;">Important – Payment, Card on File &amp; Cancellation</p>

      <p style="margin:0 0 4px; font-size:12px; font-weight:700; color:${INK};">When payment is due</p>
      ${miniTable(PAYMENT_SCHEDULE)}
      ${bullets([
        airport
          ? '<b>Airport and FBO pick-ups require full payment at the time of booking</b> to secure your reservation.'
          : 'Airport and FBO pick-ups require full payment at the time of booking. <b>All other reservations require a 50% deposit at the time of booking.</b>',
        '<b>All deposits are non-refundable.</b> A reservation is not confirmed until the deposit or payment has been received.',
        '<b>Card on file:</b> by booking, you authorize Denver Black Limo, LLC to charge the card on file for the quoted rate and any additional time, wait time, extra stops, tolls/parking, and damages. Receipts are emailed at the time of payment, and a final receipt within 24 hours of completing your trip.',
      ])}

      <p style="margin:0 0 4px; font-size:12px; font-weight:700; color:${INK};">Cancellation notice required</p>
      ${miniTable(CANCELLATION_WINDOWS)}
      ${bullets([
        'Late cancellations and no-shows are charged in full. If we cannot reach you within <b>30 minutes</b> of the scheduled pick-up time, the vehicle is released and the full charge applies.',
        'Your quote and secure payment link arrive in a separate email. If anything on this receipt is incorrect, reply or call us <b>within 24 hours</b>.',
      ])}
    </td></tr>
  </table>`;
}

/** Airport arrivals get the terminal instructions up front, where they will be read. */
function airportNoticeHtml(d) {
  if (!isArrival(d)) return '';
  const meet = meetPoint(d.terminal);
  const flight = flightLabel(d);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; background:#f6f7f9; border:1px solid ${RULE}; border-left:4px solid ${BRAND.gold}; border-radius:8px; margin-top:14px;">
    <tr><td style="padding:16px 18px;">
      <p style="margin:0 0 10px; font-size:13px; font-weight:700; letter-spacing:1.5px; color:${INK}; text-transform:uppercase;">Airport Pick-up – What to Expect</p>
      ${bullets([
        `<b>We track your flight.</b> ${flight ? `${esc(flight)} is` : 'Your flight is'} monitored and your pick-up time moves with the actual arrival. If you change flights, tell us immediately.`,
        '<b>After landing</b>, expect a text from your chauffeur. Follow the signs to Main Terminal and Baggage Claim (this may include the airport train).',
        meet
          ? `<b>Where to meet:</b> ${esc(meet)}. Your chauffeur will be holding a sign with your name.`
          : '<b>Where to meet:</b> your chauffeur will text the exact curbside door. At DEN we stage on Island 2, West Terminal Door 506 or East Terminal Door 511, with a sign showing your name.',
        '<b>Free waiting time:</b> 30 minutes after gate arrival on domestic flights, 60 minutes on international. After that, wait time is billed in 15-minute increments.',
        `<b>Cannot find your chauffeur?</b> Call dispatch right away: <a href="${BRAND.phoneHref}" style="color:${BRAND.gold}; text-decoration:none; font-weight:700;">${esc(DISPATCH)}</a>.`,
      ])}
    </td></tr>
  </table>`;
}

/** The complete agreement, rendered from terms.js so the email and the website never disagree. */
function termsHtml() {
  const p = (t) => `<p style="margin:0 0 8px; font-size:12px; line-height:1.6; color:${BRAND.muted};">${esc(t)}</p>`;
  const renderBlock = (b) => {
    if (b.type === 'p') return p(b.text);
    if (b.type === 'sub') return `<p style="margin:0 0 8px; font-size:12px; line-height:1.6; color:${BRAND.muted};"><b style="color:${INK};">${esc(b.title)}</b>${b.text ? ` – ${esc(b.text)}` : ''}</p>`;
    if (b.type === 'bullets') return bullets(b.items.map(esc), BRAND.muted, 12);
    if (b.type === 'table') {
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 10px; border:1px solid ${BRAND.line};">
        <tr>${b.head.map((h) => `<th style="padding:5px 12px; font-size:11px; text-align:left; background:#f3f4f6; color:${INK}; border-bottom:1px solid ${BRAND.line};">${esc(h)}</th>`).join('')}</tr>
        ${b.rows.map((r) => `<tr>${r.map((c) => `<td style="padding:5px 12px; font-size:12px; color:${BRAND.muted}; border-bottom:1px solid ${BRAND.line};">${esc(c)}</td>`).join('')}</tr>`).join('')}
      </table>`;
    }
    return '';
  };

  return `
    <p style="margin:0 0 6px; font-size:14px; font-weight:700; color:${INK};">Reservation Agreement, Terms, Conditions and Cancellation Policies</p>
    ${PREAMBLE.map(p).join('')}
    ${SECTIONS.map(
      (s) => `<p style="margin:14px 0 6px; font-size:11px; font-weight:700; letter-spacing:1.5px; color:${BRAND.gold}; text-transform:uppercase;">${esc(s.title)}</p>${s.blocks.map(renderBlock).join('')}`
    ).join('')}
    <p style="margin:14px 0 0; font-size:12px; line-height:1.6; color:${BRAND.muted};">
      These terms are also published at <a href="${SITE}/terms" style="color:${BRAND.gold}; text-decoration:none;">${SITE.replace(/^https?:\/\//, '')}/terms</a>.
    </p>`;
}

// ─────────────────────────────────────────────
// TEMPLATES
// ─────────────────────────────────────────────

function buildCustomerConfirmationEmail(data) {
  const firstName = data.name ? String(data.name).split(' ')[0] : 'there';

  const content = `
    <div class="pad" style="padding:30px 32px 0;">
      <h1 class="h1" style="margin:0 0 8px; font-size:22px; line-height:1.3; color:${INK}; font-weight:700;">
        Thank you, ${esc(firstName)} – we have your request
      </h1>
      <p style="margin:0 0 6px; font-size:14px; line-height:1.6; color:${BRAND.muted};">
        Your reservation request has been received. Our team is reviewing the details and will contact you
        shortly by phone, text or email to confirm availability and provide your personalized quote.
      </p>
      <p style="margin:0 0 18px; font-size:13px; line-height:1.6; color:${BRAND.muted};">
        This message confirms your request – it is not yet a confirmed reservation.
      </p>
      ${reservationReceipt(data)}
    </div>

    <div class="pad" style="padding:22px 32px 0;">
      ${paymentNoticeHtml(data)}
      ${airportNoticeHtml(data)}
    </div>

    <div class="pad" style="padding:22px 32px 0;">
      <p style="margin:0 0 4px; font-size:14px; color:${INK}; font-weight:600;">Need to make a change?</p>
      <p style="margin:0; font-size:14px; line-height:1.6; color:${BRAND.muted};">
        Call or text us any time at
        <a href="${BRAND.phoneHref}" style="color:${BRAND.gold}; text-decoration:none; font-weight:600;">${BRAND.phone}</a>
        – we are available 24 hours a day. Please quote reservation <b style="color:${INK};">${esc(data.reference || '')}</b>.
      </p>
    </div>

    <div class="pad" style="padding:24px 32px 34px;">
      <div style="border-top:2px solid ${INK}; padding-top:16px;">${termsHtml()}</div>
    </div>`;

  return shell({
    title: 'Reservation Request Received',
    preheader: `Reservation request ${data.reference || ''} received – ${tripHeadline(data)}. Price and payment details follow separately.`,
    contentHtml: content,
  });
}

function buildAdminAlertEmail(data, bookingId) {
  const content = `
    <div class="pad" style="padding:30px 32px 0;">
      <h1 class="h1" style="margin:0 0 8px; font-size:22px; line-height:1.3; color:${INK}; font-weight:700;">
        New booking request
      </h1>
      <p style="margin:0 0 ${isShortNotice(data) ? '14px' : '18px'}; font-size:14px; line-height:1.6; color:${BRAND.muted};">
        ${esc(data.name || 'A customer')} submitted a reservation request through the website.
      </p>
      ${
        isShortNotice(data)
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; background:#fff8e1; border:1px solid ${BRAND.gold}; border-radius:8px; margin-bottom:18px;">
              <tr><td style="padding:14px 18px;">
                <p style="margin:0; font-size:14px; font-weight:700; color:#8a6d1a;">SHORT NOTICE – pickup is within 3 hours</p>
                <p style="margin:4px 0 0; font-size:13px; color:#8a6d1a;">Contact this customer immediately to confirm availability.</p>
              </td></tr>
            </table>`
          : ''
      }
      ${reservationReceipt(data, { forAdmin: true })}
    </div>

    <div class="pad" style="padding:18px 32px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; background:#f6f7f9; border:1px solid ${BRAND.line}; border-radius:8px;">
        <tr><td style="padding:12px 16px;">
          <p style="margin:0; font-size:12px; line-height:1.6; color:${BRAND.muted};">
            The customer received the same receipt with the payment, card-on-file and cancellation notice${isArrival(data) ? `, the DEN pick-up instructions (${esc(meetPoint(data.terminal) || 'Island 2')})` : ''} and the full reservation agreement. <b style="color:${INK};">Next step: send the quote and payment link.</b>
          </p>
        </td></tr>
      </table>
    </div>

    <div class="pad" style="padding:20px 32px 34px;">
      <p style="margin:0 0 2px; font-size:13px; color:${BRAND.muted};">Booking ID</p>
      <p style="margin:0; font-size:13px; color:${INK}; font-family:'Courier New',monospace;">${esc(bookingId)}</p>
      ${button('Open Admin Dashboard', `${ADMIN_URL}/admin`)}
    </div>`;

  return shell({
    title: 'New Booking Request',
    preheader: `${data.name || 'A customer'} – ${tripHeadline(data)} – ${longDate(data.pickup_date)} ${clock(data.pickup_time)}`,
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
      subject: `Reservation Request ${bookingData.reference ? `${bookingData.reference} ` : ''}Received — Denver Black Limo LLC`,
      html: buildCustomerConfirmationEmail(bookingData),
      label: 'booking confirmation',
    });
  }
  await deliver({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `New Booking Request ${bookingData.reference || ''} — ${bookingData.name || 'Website'}`.replace('  ', ' '),
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


/**
 * Review request — sent by the office once a trip is complete.
 *
 * Kept deliberately short. The single job of this email is to get a happy
 * customer to the Google review box in one tap, so there is one button and
 * nothing competing with it.
 */
const GOOGLE_REVIEW_URL =
  process.env.GOOGLE_REVIEW_URL || 'https://g.page/r/CTb7bGnryiUrEAE/review';

function buildReviewRequestEmail(data) {
  const first = String(data.name || '').trim().split(' ')[0] || 'there';
  const tripLine = [data.service_type, data.pickup_date].filter(Boolean).join(' · ');

  return shell({
    title: 'How was your ride?',
    preheader: `Thank you for riding with Denver Black Limo, ${first}. Would you leave us a review?`,
    contentHtml: `
      ${heading(`Thank you, ${esc(first)}`)}
      <p style="margin:0 0 14px; font-size:15px; line-height:1.65; color:#333;">
        It was a pleasure driving you${tripLine ? ` — ${esc(tripLine)}` : ''}. We hope the journey was
        comfortable and on time.
      </p>
      <p style="margin:0 0 6px; font-size:15px; line-height:1.65; color:#333;">
        If we looked after you well, would you take a moment to leave a review? It takes less than a
        minute and genuinely helps other Colorado travelers find a chauffeur service they can trust.
      </p>
      ${button('Leave a Google review', GOOGLE_REVIEW_URL)}
      <p style="margin:22px 0 0; font-size:13px; line-height:1.6; color:#666;">
        And if anything fell short, please reply to this email instead — we would rather hear it from
        you directly and put it right.
      </p>
    `,
  });
}

async function sendReviewRequest(data) {
  return deliver({
    to: data.email,
    subject: 'How was your ride with Denver Black Limo?',
    html: buildReviewRequestEmail(data),
    label: 'review request',
  });
}

module.exports = {
  SENDER_EMAIL,
  ADMIN_NOTIFY_EMAIL,
  getResend,
  sendBookingEmails,
  sendInquiryEmails,
  sendAdminReply,
  sendReviewRequest,
  GOOGLE_REVIEW_URL,
  buildCustomerConfirmationEmail,
  buildReviewRequestEmail,
  buildAdminAlertEmail,
  buildAdminReplyEmail,
  buildInquiryAdminEmail,
  buildInquiryConfirmationEmail,
};
