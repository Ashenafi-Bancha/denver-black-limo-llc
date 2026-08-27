/**
 * The reservation agreement as a PDF, and the fingerprint that ties a
 * signature to the exact wording it was given.
 *
 * The text comes from terms.js — the same module the booking emails and the
 * website's /terms page render — so the document a customer signs can never
 * drift from the one they were shown.
 *
 * Two forms come out of here:
 *   - unsigned: attached to the confirmation email so the customer has a copy
 *     to read, with an acceptance page showing where the signature will go
 *   - signed:   the same document plus the captured signature, the signer's
 *     name, the timestamp, their IP and browser, and the fingerprint below
 *
 * That last part is what makes the signature hold up: the ESIGN Act and UETA
 * ask for intent, consent, a signature tied to the record, and a retained
 * copy. The acceptance page carries the first three and the PDF itself is the
 * fourth.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const { PREAMBLE, SECTIONS, COMPANY, DISPATCH } = require('./terms');

const LOGO = path.join(__dirname, 'assets', 'logo.png');
const SITE = (process.env.SITE_URL || 'https://denverblacklimo.llc').replace(/\/$/, '');

const GOLD = '#b8901f';
const INK = '#1a1a1a';
const MUTED = '#5b6068';
const RULE = '#c9ccd1';

/**
 * Fingerprint of the agreement wording. Stored with every signature, so if the
 * terms are ever revised it stays provable which version was agreed to.
 */
const TERMS_VERSION = crypto
  .createHash('sha256')
  .update(JSON.stringify({ PREAMBLE, SECTIONS }))
  .digest('hex')
  .slice(0, 16);

/** "2026-08-25" → "August 25, 2026", without timezone drift. */
function longDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso || '');
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(d);
}

/** A full timestamp in Denver time, which is where the office reads it. */
function stamp(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    dateStyle: 'long',
    timeStyle: 'long',
  }).format(date || new Date());
}

function clock12(hhmm) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return String(hhmm || '');
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
}

/**
 * A drawn signature arrives as a data URL from a canvas. Anything that is not
 * a modestly sized PNG is refused rather than embedded.
 */
function signatureBuffer(dataUrl) {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || '').trim());
  if (!m) return null;
  const buf = Buffer.from(m[1], 'base64');
  if (!buf.length || buf.length > 600 * 1024) return null;
  // PNG magic number: refuse anything wearing the wrong hat.
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return buf;
}

// ── Drawing helpers ──────────────────────────────────────────────────────

const CONTENT_WIDTH = (doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;

function heading(doc, text) {
  if (doc.y > doc.page.height - 140) doc.addPage();
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(GOLD).text(text.toUpperCase(), { characterSpacing: 0.6 });
  doc.moveDown(0.35);
}

function para(doc, text, opts = {}) {
  doc
    .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(opts.size || 9)
    .fillColor(opts.color || MUTED)
    .text(text, { align: 'justify', lineGap: 1.4, ...opts });
  doc.moveDown(0.45);
}

function subPara(doc, title, text) {
  const width = CONTENT_WIDTH(doc);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(`${title}${text ? ' — ' : ''}`, { continued: Boolean(text), width });
  if (text) doc.font('Helvetica').fillColor(MUTED).text(text, { align: 'justify', lineGap: 1.4, width });
  doc.moveDown(0.45);
}

function bullets(doc, items) {
  doc.font('Helvetica').fontSize(9).fillColor(MUTED);
  for (const item of items) {
    if (doc.y > doc.page.height - 90) doc.addPage();
    const x = doc.page.margins.left;
    const y = doc.y;
    doc.circle(x + 3, y + 4.5, 1.6).fillColor(GOLD).fill();
    doc.fillColor(MUTED).text(item, x + 12, y, { width: CONTENT_WIDTH(doc) - 12, align: 'justify', lineGap: 1.2 });
    doc.moveDown(0.3);
  }
  doc.moveDown(0.2);
}

/** Two-column table with a tinted header row. */
function table(doc, head, rows) {
  const width = Math.min(360, CONTENT_WIDTH(doc));
  const colA = Math.round(width * 0.52);
  const colB = width - colA;
  const x = doc.page.margins.left;
  const rowH = 17;

  if (doc.y + rowH * (rows.length + 1) > doc.page.height - 80) doc.addPage();
  let y = doc.y;

  const top = y;
  doc.rect(x, y, width, rowH).fillColor('#f3f4f6').fill();
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(INK);
  doc.text(head[0], x + 7, y + 5, { width: colA - 14, lineBreak: false });
  doc.text(head[1], x + colA + 7, y + 5, { width: colB - 14, lineBreak: false });
  y += rowH;

  doc.font('Helvetica').fontSize(8.5);
  for (const r of rows) {
    doc.rect(x, y, width, rowH).strokeColor(RULE).lineWidth(0.5).stroke();
    doc.fillColor(MUTED).text(String(r[0]), x + 7, y + 5, { width: colA - 14, lineBreak: false });
    doc.fillColor(INK).text(String(r[1]), x + colA + 7, y + 5, { width: colB - 14, lineBreak: false });
    y += rowH;
  }
  doc.rect(x, top, width, y - top).strokeColor(RULE).lineWidth(0.5).stroke();
  doc.y = y;
  doc.moveDown(0.7);
  doc.x = doc.page.margins.left;
}

/** The reservation this agreement belongs to, boxed at the top of page one. */
function bookingBox(doc, b) {
  const rows = [
    ['Reservation #', b.reference || '—'],
    ['Client', b.name || '—'],
    ['Service', b.service_type || '—'],
    ['Pick-up', [longDate(b.pickup_date), b.pickup_time ? clock12(b.pickup_time) : ''].filter(Boolean).join(' at ') || '—'],
    ['From', b.pickup_location || '—'],
    ['To', b.dropoff_location || '—'],
    ['Vehicle', b.vehicle_preference || b.vehicle_category || '—'],
  ];
  const width = CONTENT_WIDTH(doc);
  const x = doc.page.margins.left;
  const rowH = 15;
  const boxH = rows.length * rowH + 12;

  const top = doc.y;
  doc.rect(x, top, width, boxH).strokeColor(RULE).lineWidth(0.8).stroke();
  let y = top + 6;
  for (const [k, v] of rows) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(INK).text(k, x + 10, y, { width: 90, lineBreak: false });
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(String(v), x + 105, y, { width: width - 115, lineBreak: false });
    y += rowH;
  }
  doc.y = top + boxH;
  doc.x = x;
  doc.moveDown(1);
}

/**
 * The acceptance page: the consent language, the signature itself (or the
 * space for it), and the audit detail that ties the two together.
 */
function acceptancePage(doc, b, signature) {
  doc.addPage();
  doc.font('Helvetica-Bold').fontSize(14).fillColor(INK).text('Acceptance of Agreement');
  doc.moveDown(0.6);

  para(
    doc,
    `By signing below, I confirm that I have read and agree to the Reservation Agreement, Terms, Conditions and ` +
      `Cancellation Policies of ${COMPANY} set out in this document, including the payment and deposit schedule, ` +
      `the authorization to charge the card on file for the quoted rate and any additional time, wait time, extra ` +
      `stops, tolls, parking and damages, and the cancellation notice periods. I consent to signing this agreement ` +
      `electronically, and I understand that my electronic signature has the same legal effect as a handwritten one.`,
    { size: 9.5 }
  );
  doc.moveDown(0.6);

  const x = doc.page.margins.left;
  const width = CONTENT_WIDTH(doc);
  const boxTop = doc.y;
  const boxH = 132;
  doc.rect(x, boxTop, width, boxH).strokeColor(RULE).lineWidth(0.8).stroke();

  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('SIGNATURE', x + 14, boxTop + 12, { characterSpacing: 0.8 });

  if (signature) {
    const img = signatureBuffer(signature.signature_png);
    if (img) {
      try {
        doc.image(img, x + 14, boxTop + 26, { fit: [230, 58], align: 'left' });
      } catch {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(INK).text(signature.signer_name || '', x + 14, boxTop + 46);
      }
    } else {
      doc.font('Helvetica-Oblique').fontSize(14).fillColor(INK).text(signature.signer_name || '', x + 14, boxTop + 42);
    }
  }

  // The rule the signature sits on, and the fields beneath it.
  doc.moveTo(x + 14, boxTop + 90).lineTo(x + 14 + 250, boxTop + 90).strokeColor(INK).lineWidth(0.8).stroke();
  doc.moveTo(x + width - 14 - 170, boxTop + 90).lineTo(x + width - 14, boxTop + 90).strokeColor(INK).lineWidth(0.8).stroke();

  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('Signed by (printed name)', x + 14, boxTop + 96);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('Date signed', x + width - 14 - 170, boxTop + 96);

  doc.font('Helvetica').fontSize(9.5).fillColor(INK);
  doc.text(signature ? signature.signer_name || '' : '', x + 14, boxTop + 108, { width: 250 });
  doc.text(signature ? stamp(new Date(signature.signed_at)) : '', x + width - 14 - 170, boxTop + 108, { width: 170 });

  doc.y = boxTop + boxH;
  doc.x = x;
  doc.moveDown(1.2);

  if (signature) {
    heading(doc, 'Signature record');
    const audit = [
      ['Signed at', stamp(new Date(signature.signed_at))],
      ['Reservation', b.reference || '—'],
      ['Signer name', signature.signer_name || '—'],
      ['Email on file', b.email || '—'],
      ['IP address', signature.signer_ip || '—'],
      ['Device / browser', (signature.signer_user_agent || '—').slice(0, 90)],
      ['Agreement version', signature.terms_version || TERMS_VERSION],
      ['Method', 'Electronic signature drawn or typed on denverblacklimo.llc'],
    ];
    doc.font('Helvetica').fontSize(8.5);
    for (const [k, v] of audit) {
      const y = doc.y;
      doc.font('Helvetica-Bold').fillColor(INK).text(k, x, y, { width: 120, lineBreak: false });
      doc.font('Helvetica').fillColor(MUTED).text(String(v), x + 125, y, { width: width - 125 });
      doc.moveDown(0.25);
    }
    doc.moveDown(0.6);
    para(
      doc,
      'This record is retained by Denver Black Limo, LLC and a copy has been emailed to the signer, as required for ' +
        'electronic records under the ESIGN Act and UETA.',
      { size: 8 }
    );
  } else {
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(GOLD).text('This copy is not yet signed.');
    doc.moveDown(0.3);
    para(
      doc,
      'Your reservation is confirmed once this agreement is signed. Open the “Read & Sign the Agreement” link in your ' +
        'confirmation email to sign on your phone or computer — it takes about a minute, and the signed copy is emailed ' +
        `back to you straight away. Any questions, call or text ${DISPATCH}.`,
      { size: 9.5 }
    );
  }
}

/** Page furniture: brand line at the top of page one, footers everywhere. */
function decorate(doc, b) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.height - 42;
    const x = doc.page.margins.left;
    const width = CONTENT_WIDTH(doc);

    doc.moveTo(x, bottom).lineTo(x + width, bottom).strokeColor(RULE).lineWidth(0.5).stroke();

    // Footers sit below the bottom margin. Without lifting the margin first,
    // pdfkit treats each one as overflow and appends a page for it.
    const keepBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7.5).fillColor(MUTED);
    doc.text(`${COMPANY} · ${DISPATCH} · ${SITE.replace(/^https?:\/\//, '')}`, x, bottom + 7, { width: width - 90, lineBreak: false });
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, x + width - 90, bottom + 7, { width: 90, align: 'right', lineBreak: false });
    if (b && b.reference) {
      doc.text(`Reservation ${b.reference}`, x, bottom + 17, { width, lineBreak: false });
    }
    doc.page.margins.bottom = keepBottom;
  }
}

/**
 * Builds the agreement PDF. Pass `signature` to produce the signed copy.
 * Resolves to a Buffer.
 */
function buildAgreementPdf({ booking, signature = null } = {}) {
  const b = booking || {};
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 54, bottom: 62, left: 54, right: 54 },
      bufferPages: true,
      info: {
        Title: `Reservation Agreement${b.reference ? ` — ${b.reference}` : ''}`,
        Author: COMPANY,
        Subject: 'Reservation Agreement, Terms, Conditions and Cancellation Policies',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      const x = doc.page.margins.left;
      const width = CONTENT_WIDTH(doc);

      // Masthead
      if (fs.existsSync(LOGO)) {
        try {
          doc.image(LOGO, x, doc.y, { fit: [58, 58] });
        } catch {
          /* a missing or unreadable logo must not stop the agreement */
        }
      }
      doc.font('Helvetica-Bold').fontSize(19).fillColor(INK).text('DENVER', x + 70, doc.y + 8, { characterSpacing: 1.5 });
      doc.font('Helvetica-Bold').fontSize(13).fillColor(GOLD).text('BLACK LIMO, LLC', { characterSpacing: 1 });
      doc.y = Math.max(doc.y, 112);
      doc.x = x;
      doc.moveTo(x, doc.y).lineTo(x + width, doc.y).strokeColor(GOLD).lineWidth(2).stroke();
      doc.moveDown(1);

      doc.font('Helvetica-Bold').fontSize(15).fillColor(INK).text('Reservation Agreement, Terms, Conditions', { width });
      doc.text('and Cancellation Policies', { width });
      doc.moveDown(0.8);

      bookingBox(doc, b);

      for (const p of PREAMBLE) para(doc, p);

      for (const section of SECTIONS) {
        heading(doc, section.title);
        for (const block of section.blocks) {
          if (block.type === 'p') para(doc, block.text);
          else if (block.type === 'sub') subPara(doc, block.title, block.text);
          else if (block.type === 'bullets') bullets(doc, block.items);
          else if (block.type === 'table') table(doc, block.head, block.rows);
        }
      }

      acceptancePage(doc, b, signature);
      decorate(doc, b);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { buildAgreementPdf, signatureBuffer, TERMS_VERSION, stamp };
