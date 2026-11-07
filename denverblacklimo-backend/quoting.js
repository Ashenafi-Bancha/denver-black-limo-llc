/**
 * What a quote comes to.
 *
 * Pure arithmetic: no database, no formatting, no rounding to "nice" numbers.
 * The client asked for each charge to be worked out on its own and for
 * gratuity, the card fee and the additional charges not to be tangled
 * together, so every step here is named, separate, and returned alongside the
 * total. The quote page and the customer's email both show the same breakdown
 * because both read it from this one place.
 *
 * ── The order, and why ───────────────────────────────────────────────────
 *
 *   1. the fare          flat, or hours x hourly rate
 *   2. + extras          each one quantity x unit rate
 *   3. + gratuity        a percentage of (fare + extras)
 *   4. + card fee        a percentage of (fare + extras + gratuity)
 *   5. - discount
 *   = subtotal
 *   6. + tax             a percentage of the subtotal
 *   = total
 *
 * Step 3 is the client's own rule: "gratuity is calculated on the final
 * amount that results from adding the additional charges to the base fare" —
 * so a trip with two extra stops tips on the stops as well as the fare.
 *
 * Step 4 sits on top of the gratuity because a card processor charges on the
 * whole amount that goes through the card, gratuity included. On the figures
 * in the client's mock-up — a $240 fare and a $14.40 fee — that is 5% of
 * $288. Note he separately said 4% and marked it "needs confirming": at 4%
 * the same mock-up would read $11.52. Both the rate and the rule therefore
 * live in settings rather than in this file, and the number he confirms can
 * be typed in without a deploy.
 *
 * ── Money ────────────────────────────────────────────────────────────────
 *
 * Everything is computed in whole cents. 0.1 + 0.2 is not 0.3 in binary
 * floating point, and a quote that is a cent out from the invoice is a
 * telephone call from a customer.
 */

/** Dollars to whole cents, rounding half away from zero. */
function cents(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Whole cents back to a dollar number, for JSON. */
function dollars(c) {
  return Math.round(c) / 100;
}

/**
 * A percentage of an amount in cents, rounded to the nearest cent.
 *
 * Rounded at every step rather than once at the end: the office reads these
 * lines off the screen and adds them up by eye, and a breakdown whose parts
 * do not sum to its own total is worse than one that is a cent out.
 */
function percentOf(amountCents, percent) {
  const p = Number(percent);
  if (!Number.isFinite(p) || p <= 0) return 0;
  return Math.round((amountCents * p) / 100);
}

/** The charge kinds the quote form offers. `other` carries its own label. */
const CHARGE_KINDS = [
  'additional_stop',
  'waiting_time',
  'extra_hours',
  'parking',
  'tolls',
  'airport_fee',
  'meet_greet',
  'late_night',
  'child_seat',
  'other',
];

const CHARGE_LABELS = {
  additional_stop: 'Additional stop',
  waiting_time: 'Waiting time',
  extra_hours: 'Extra hours',
  parking: 'Parking',
  tolls: 'Tolls',
  airport_fee: 'Airport fee',
  meet_greet: 'Meet & greet',
  late_night: 'Late night',
  child_seat: 'Child seat',
  other: 'Other',
};

/**
 * One extra line: a quantity and what each costs.
 *
 * Stored as the two numbers rather than their product, so the quote can say
 * "2 stops x $20.00" instead of a bare $40.00 that nobody can check.
 */
function normaliseCharge(raw) {
  const kind = CHARGE_KINDS.includes(raw && raw.kind) ? raw.kind : 'other';
  const quantity = Math.max(0, Number(raw && raw.quantity) || 0);
  const unitCents = cents(raw && raw.unitRate);
  const label = String((raw && raw.label) || CHARGE_LABELS[kind] || 'Other').slice(0, 120);
  return {
    kind,
    label,
    quantity,
    unitRate: dollars(unitCents),
    amount: dollars(Math.round(unitCents * quantity)),
    _amountCents: Math.round(unitCents * quantity),
  };
}

/**
 * Works out a quote.
 *
 * `config` holds the percentages, which come from the rate card in settings:
 *   gratuityPercent  — 20 in the client's example
 *   cardFeePercent   — the "service charge" line; see the note above
 *   taxPercent       — already in the rate card, currently blank
 *
 * Returns every intermediate figure, not just the total, because the page,
 * the email and the invoice all have to show the same working.
 */
function priceQuote(input = {}) {
  const config = input.config || {};

  // ── 1. the fare ────────────────────────────────────────────────────────
  const rateType = input.rateType === 'hourly' ? 'hourly' : 'flat';

  // An hourly booking bills whichever is greater, the hours worked or the
  // minimum the vehicle is let for. Charging under the minimum would quote a
  // price the company does not accept.
  const minimumHours = Math.max(0, Number(config.minimumHours) || 0);
  const hoursAsked = Math.max(0, Number(input.hours) || 0);
  const billedHours = rateType === 'hourly' ? Math.max(hoursAsked, minimumHours) : 0;
  const hourlyRateCents = cents(input.hourlyRate);

  const fareCents =
    rateType === 'hourly'
      ? Math.round(hourlyRateCents * billedHours)
      : Math.max(0, cents(input.baseFare));

  // ── 2. the extras ──────────────────────────────────────────────────────
  const charges = (Array.isArray(input.charges) ? input.charges : []).map(normaliseCharge);
  const chargesCents = charges.reduce((sum, c) => sum + c._amountCents, 0);

  // ── 3. gratuity, on the fare and the extras together ───────────────────
  const gratuityBaseCents = fareCents + chargesCents;
  const gratuityPercent = Number(config.gratuityPercent) || 0;
  // An explicit override lets the office agree a different tip on one booking
  // without changing the rate card for every other.
  const gratuityCents =
    input.gratuityOverride === undefined || input.gratuityOverride === null || input.gratuityOverride === ''
      ? percentOf(gratuityBaseCents, gratuityPercent)
      : Math.max(0, cents(input.gratuityOverride));

  // ── 4. the card fee, on everything going through the card ──────────────
  const cardFeeBaseCents = gratuityBaseCents + gratuityCents;
  const cardFeePercent = Number(config.cardFeePercent) || 0;
  // Only when the money is actually taken on a card. A customer paying cash
  // or by Zelle is not costing the company a processing fee, and charging one
  // would be indefensible on an invoice.
  const feeApplies = input.cardFeeApplies !== false;
  const cardFeeCents =
    input.cardFeeOverride === undefined || input.cardFeeOverride === null || input.cardFeeOverride === ''
      ? (feeApplies ? percentOf(cardFeeBaseCents, cardFeePercent) : 0)
      : Math.max(0, cents(input.cardFeeOverride));

  // ── 5. discount ────────────────────────────────────────────────────────
  // Capped at what is owed: a discount larger than the bill would produce a
  // negative total and an email offering the customer money.
  const discountCents = Math.min(
    Math.max(0, cents(input.discount)),
    gratuityBaseCents + gratuityCents + cardFeeCents
  );

  const subtotalCents = gratuityBaseCents + gratuityCents + cardFeeCents - discountCents;

  // ── 6. tax ─────────────────────────────────────────────────────────────
  const taxCents = percentOf(subtotalCents, config.taxPercent);
  const totalCents = subtotalCents + taxCents;

  // ── what has been paid, and what is left ───────────────────────────────
  const paymentOption = input.paymentOption === 'deposit' ? 'deposit' : 'full';

  // A deposit can never exceed the total; asking for more than the booking
  // costs is the kind of error that reaches a customer's card.
  const depositRequiredCents =
    paymentOption === 'deposit'
      ? Math.min(Math.max(0, cents(input.depositRequired)), totalCents)
      : totalCents;

  const amountPaidCents = Math.max(0, cents(input.amountPaid));
  const balanceDueCents = Math.max(0, totalCents - amountPaidCents);

  return {
    rateType,
    billedHours,
    hourlyRate: dollars(hourlyRateCents),

    baseFare: dollars(fareCents),
    charges: charges.map(({ _amountCents, ...c }) => c),
    chargesTotal: dollars(chargesCents),

    gratuityBase: dollars(gratuityBaseCents),
    gratuityPercent,
    gratuity: dollars(gratuityCents),

    cardFeeBase: dollars(cardFeeBaseCents),
    cardFeePercent: feeApplies ? cardFeePercent : 0,
    cardFee: dollars(cardFeeCents),

    discount: dollars(discountCents),
    subtotal: dollars(subtotalCents),

    taxPercent: Number(config.taxPercent) || 0,
    tax: dollars(taxCents),
    total: dollars(totalCents),

    paymentOption,
    depositRequired: dollars(depositRequiredCents),
    amountPaid: dollars(amountPaidCents),
    balanceDue: dollars(balanceDueCents),
    fullyPaid: balanceDueCents === 0 && totalCents > 0,
  };
}

module.exports = { priceQuote, CHARGE_KINDS, CHARGE_LABELS, cents, dollars };
