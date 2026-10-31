/**
 * The trip record — what the office sends when a charge is disputed.
 *
 * Three things have been recorded separately up to now: what the chauffeur
 * pressed and when (trip_events), how long the car waited, and what they
 * photographed (trip_photos). Each is readable in the admin, and none of it is
 * sendable. A customer who disputes a damage charge or a wait-time line does
 * not get given a login.
 *
 * This puts the three together in one document, in the order they happened.
 *
 * It states the wait as a measured gap and stops there. The agreement bills
 * wait time "after the scheduled pick-up time in 15-minute increments", and
 * for airport work the clock starts 30 minutes after gate arrival — gate
 * arrival is not something this system knows, and the scheduled pick-up is
 * stored as local wall-clock text while the events are absolute timestamps.
 * A document that printed a figure derived from those two would be wrong by
 * hours for anyone reading it in another timezone, and it would be wrong in
 * writing, to the customer. So the arithmetic the office must do itself is
 * named rather than guessed at.
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const { COMPANY, DISPATCH } = require('./terms');

const LOGO = path.join(__dirname, 'assets', 'logo.png');

const GOLD = '#b8901f';
const INK = '#1a1a1a';
const MUTED = '#5b6068';
const RULE = '#c9ccd1';
const ALERT = '#9c2b2b';

/** pdfkit embeds JPEG and PNG only — see renderPhoto. */
const EMBEDDABLE = ['image/jpeg', 'image/png'];

const STATUS_LABELS = {
  en_route: 'On the way',
  arrived: 'Arrived at pick-up',
  on_board: 'Passenger on board',
  dropped_off: 'Dropped off',
  no_show: 'No-show',
};

const PHOTO_LABELS = {
  vehicle_before: 'Vehicle before',
  vehicle_after: 'Vehicle after',
  damage: 'Damage',
  no_show: 'No-show',
  signature: 'Signed for on delivery',
  other: 'Other',
};

const CONTENT_WIDTH = (doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;

/**
 * Times are printed in the company's own zone, and said to be.
 *
 * A record that prints "18:41" without saying whose clock that is invites the
 * exact argument the document exists to end.
 */
const TZ = process.env.COMPANY_TIMEZONE || 'America/Denver';

function at(value, withDate = false) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    timeZone: TZ,
    ...(withDate ? { year: 'numeric', month: 'short', day: 'numeric' } : {}),
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function minutesBetween(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

function heading(doc, text) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 90) doc.addPage();
  doc.moveDown(0.9);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(GOLD)
    .text(text.toUpperCase(), { characterSpacing: 0.6 });
  doc.moveDown(0.4);
}

function rule(doc) {
  const x = doc.page.margins.left;
  doc.moveTo(x, doc.y).lineTo(x + CONTENT_WIDTH(doc), doc.y)
    .strokeColor(RULE).lineWidth(0.6).stroke();
  doc.moveDown(0.5);
}

/** A two-column fact block, so the header reads at a glance. */
function facts(doc, rows) {
  const x = doc.page.margins.left;
  const width = CONTENT_WIDTH(doc);
  const labelWidth = 104;
  for (const [label, value] of rows) {
    if (!value) continue;
    const top = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED)
      .text(`${label}`, x, top, { width: labelWidth });
    doc.font('Helvetica').fontSize(9).fillColor(INK)
      .text(String(value), x + labelWidth, top, { width: width - labelWidth });
    doc.y = Math.max(doc.y, top) + 2;
  }
}

/** The sequence, as recorded. */
function timeline(doc, events) {
  const x = doc.page.margins.left;
  const width = CONTENT_WIDTH(doc);

  if (!events.length) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(MUTED)
      .text('No status was recorded by the chauffeur for this trip.', x, doc.y, { width });
    return;
  }

  for (const e of events) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 56) doc.addPage();
    const top = doc.y;

    doc.circle(x + 3, top + 5, 2.6).fillColor(GOLD).fill();
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK)
      .text(STATUS_LABELS[e.status] || e.status, x + 14, top, { width: width - 14, continued: true });
    doc.font('Helvetica').fillColor(MUTED).text(`   ${at(e.occurred_at, true)}`);

    const details = [];
    if (e.driver_name) details.push(`Recorded by ${e.driver_name}`);
    if (e.lat != null && e.lng != null) {
      details.push(`Position ${Number(e.lat).toFixed(5)}, ${Number(e.lng).toFixed(5)}`);
    }
    const lag = minutesBetween(e.occurred_at, e.recorded_at);
    if (lag >= 5) {
      // Said plainly, because it is the first thing anyone disputing a
      // timestamp will raise.
      details.push(`Pressed with no mobile signal; reached our system ${lag} minutes later`);
    }
    if (e.note) details.push(e.note);

    if (details.length) {
      doc.font('Helvetica').fontSize(8).fillColor(MUTED)
        .text(details.join(' · '), x + 14, doc.y + 1, { width: width - 14 });
    }
    doc.moveDown(0.45);
  }
}

/** The measured gap, and the arithmetic the office still has to do. */
function waiting(doc, booking, events) {
  const arrived = events.find((e) => e.status === 'arrived');
  if (!arrived) return;
  const ended = events.find(
    (e) => e.status === 'on_board' || e.status === 'dropped_off' || e.status === 'no_show'
  );
  if (!ended) return;

  const minutes = minutesBetween(arrived.occurred_at, ended.occurred_at);
  if (minutes < 1) return;

  const x = doc.page.margins.left;
  const width = CONTENT_WIDTH(doc);
  const service = String(booking.service_type || '');
  const hourly = /hourly|tour/i.test(service);
  const airport = /airport|aviation|fbo/i.test(service);

  heading(doc, 'Time the vehicle was held');

  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(
    `The chauffeur was at the pick-up for ${minutes} minutes before the trip continued ` +
      `(${at(arrived.occurred_at)} to ${at(ended.occurred_at)}).`,
    x,
    doc.y,
    { width }
  );
  doc.moveDown(0.3);

  const note = hourly
    ? 'Hourly and tour work is billed from the scheduled pick-up time, so no separate wait-time charge arises on this booking.'
    : `That is ${Math.ceil(minutes / 15)} × 15-minute increment${Math.ceil(minutes / 15) === 1 ? '' : 's'} ` +
      'at the vehicle’s standard hourly rate. The agreement bills wait time from the scheduled ' +
      'pick-up time rather than from the chauffeur’s arrival' +
      (airport
        ? ', and for airport pick-ups the waiting period commences 30 minutes after gate arrival for ' +
          'domestic flights and 1 hour for international.'
        : '.') +
      ' The figure above is the recorded gap, not the billable period.';

  doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(note, x, doc.y, { width });
}

/** One photograph, with what is known about it. */
function renderPhoto(doc, photo, index) {
  const x = doc.page.margins.left;
  const width = CONTENT_WIDTH(doc);
  const boxHeight = 230;

  if (doc.y > doc.page.height - doc.page.margins.bottom - boxHeight - 40) doc.addPage();

  const top = doc.y;
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK)
    .text(`${index}. ${PHOTO_LABELS[photo.kind] || photo.kind}`, x, top, { width, continued: true });
  doc.font('Helvetica').fillColor(MUTED).text(`   ${at(photo.taken_at, true)}`);

  const details = [];
  if (photo.driver_name) details.push(`Taken by ${photo.driver_name}`);
  if (photo.lat != null && photo.lng != null) {
    details.push(`Position ${Number(photo.lat).toFixed(5)}, ${Number(photo.lng).toFixed(5)}`);
  }
  const lag = minutesBetween(photo.taken_at, photo.recorded_at);
  if (lag >= 5) details.push(`Uploaded ${lag} minutes later`);
  if (details.length) {
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(details.join(' · '), x, doc.y + 1, { width });
  }
  if (photo.note) {
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(INK).text(photo.note, x, doc.y + 1, { width });
  }
  doc.moveDown(0.35);

  if (EMBEDDABLE.includes(photo.mime_type) && photo.data) {
    try {
      doc.image(photo.data, x, doc.y, { fit: [width, boxHeight], align: 'center' });
      doc.y += boxHeight;
    } catch {
      // A corrupt or unexpected image must not cost the office the rest of
      // the record.
      unembeddable(doc, photo, 'This image could not be rendered.');
    }
  } else {
    // pdfkit reads JPEG and PNG only. A WebP is still evidence and is still
    // stored; it just cannot be printed here, and saying so is better than
    // leaving a silent gap in a document sent to a customer.
    unembeddable(doc, photo, `Format ${photo.mime_type} cannot be included in a PDF.`);
  }
  doc.moveDown(0.9);
}

function unembeddable(doc, photo, why) {
  const x = doc.page.margins.left;
  const width = CONTENT_WIDTH(doc);
  doc.rect(x, doc.y, width, 44).strokeColor(RULE).lineWidth(0.6).stroke();
  doc.font('Helvetica').fontSize(8.5).fillColor(ALERT)
    .text(`${why} It is held in the booking record (reference ${photo.id}).`,
      x + 10, doc.y + 15, { width: width - 20 });
  doc.y += 50;
}

/** Page numbers and the provenance line, added once the length is known. */
function decorate(doc, booking) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const x = doc.page.margins.left;
    const width = CONTENT_WIDTH(doc);
    const y = doc.page.height - doc.page.margins.bottom + 16;

    // Footers sit below the bottom margin, and pdfkit treats anything past it
    // as overflow — so without lifting the margin first, every footer appends
    // a blank page carrying only that footer. agreement.js hit this too.
    const keepBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
      .text(
        `${COMPANY} · Trip record for ${booking.reference || 'this booking'} · ` +
          `Generated ${at(new Date(), true)} · Page ${i - range.start + 1} of ${range.count}`,
        x,
        y,
        { width, align: 'center', lineBreak: false }
      );
    doc.page.margins.bottom = keepBottom;
  }
}

/**
 * Builds the trip record. Resolves to a Buffer.
 *
 * `photos` must carry `data` for anything that should appear as a picture.
 */
function buildTripRecordPdf({ booking, events = [], photos = [] } = {}) {
  const b = booking || {};
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 54, bottom: 62, left: 54, right: 54 },
      bufferPages: true,
      info: {
        Title: `Trip Record${b.reference ? ` — ${b.reference}` : ''}`,
        Author: COMPANY,
        Subject: 'Record of service: chauffeur timestamps and photographs',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      const x = doc.page.margins.left;
      const width = CONTENT_WIDTH(doc);

      if (fs.existsSync(LOGO)) {
        try {
          doc.image(LOGO, x, doc.y, { fit: [58, 58] });
        } catch {
          /* a missing logo must not stop the record */
        }
      }
      doc.font('Helvetica-Bold').fontSize(19).fillColor(INK)
        .text('DENVER', x + 70, doc.y + 8, { characterSpacing: 1.5 });
      doc.font('Helvetica-Bold').fontSize(13).fillColor(GOLD)
        .text('BLACK LIMO, LLC', { characterSpacing: 1 });
      doc.y = Math.max(doc.y, 112);
      doc.x = x;
      doc.moveTo(x, doc.y).lineTo(x + width, doc.y).strokeColor(GOLD).lineWidth(2).stroke();
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fontSize(15).fillColor(INK).text('Trip Record', { width });
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(
        'A record of the chauffeur’s times and photographs for this reservation. ' +
          `All times are ${TZ.replace('_', ' ')} local.`,
        { width }
      );
      doc.moveDown(0.8);
      rule(doc);

      facts(doc, [
        ['Reference', b.reference],
        ['Passenger', b.name],
        ['Service', b.service_type],
        ['Scheduled', [b.pickup_date, b.pickup_time].filter(Boolean).join(' at ')],
        ['Pick-up', b.pickup_location],
        ['Drop-off', b.dropoff_location],
        ['Chauffeur', b.driver_name],
        ['Vehicle', b.vehicle_preference],
      ]);

      heading(doc, 'What the chauffeur recorded');
      timeline(doc, events);

      waiting(doc, b, events);

      if (photos.length) {
        heading(doc, `Photographs (${photos.length})`);
        photos.forEach((p, i) => renderPhoto(doc, p, i + 1));
      }

      heading(doc, 'About this record');
      doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(
        'Each entry above was recorded by the chauffeur on a handset at the time stated. Where a ' +
          'press or photograph was made without mobile signal, the time shown is when it happened ' +
          'and the delay before it reached our systems is stated alongside it. Questions about this ' +
          `record should be directed to dispatch on ${DISPATCH}.`,
        x,
        doc.y,
        { width }
      );

      decorate(doc, b);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildTripRecordPdf };
