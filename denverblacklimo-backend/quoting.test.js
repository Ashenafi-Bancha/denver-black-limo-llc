/**
 * Quote arithmetic. Plain Node, no framework, so `node quoting.test.js` works
 * without adding a dependency — the same shape as pricing/engine.test.js.
 *
 * The first group reproduces the client's own mock-up exactly. If those
 * numbers ever stop matching, the screen he approved and the screen we ship
 * have diverged.
 */
const { priceQuote } = require('./quoting');

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        expected ${JSON.stringify(expected)}`);
    console.log(`        actual   ${JSON.stringify(actual)}`);
  }
}

// The rate card as the mock-up implies it.
const CONFIG = { gratuityPercent: 20, cardFeePercent: 5, taxPercent: 0 };

console.log('\nThe client’s mock-up, reproduced exactly\n');
{
  const q = priceQuote({
    rateType: 'flat',
    baseFare: 240,
    config: CONFIG,
    paymentOption: 'deposit',
    depositRequired: 100,
    amountPaid: 100,
  });

  check('base fare', q.baseFare, 240);
  check('gratuity is 20% of the fare', q.gratuity, 48);
  check('card fee is 5% of fare plus gratuity', q.cardFee, 14.4);
  check('subtotal', q.subtotal, 302.4);
  check('tax', q.tax, 0);
  check('TOTAL', q.total, 302.4);
  check('amount paid', q.amountPaid, 100);
  check('BALANCE DUE', q.balanceDue, 202.4);
  check('deposit required', q.depositRequired, 100);
  check('not fully paid', q.fullyPaid, false);
}

console.log('\nGratuity is charged on the extras too — the client’s rule\n');
{
  const q = priceQuote({
    rateType: 'flat',
    baseFare: 240,
    charges: [
      { kind: 'additional_stop', quantity: 2, unitRate: 20 },
      { kind: 'waiting_time', quantity: 3, unitRate: 15 },
    ],
    config: CONFIG,
  });

  check('extras total', q.chargesTotal, 85);
  check('gratuity is taken on fare + extras', q.gratuityBase, 325);
  check('gratuity', q.gratuity, 65);
  check('card fee sits on top of the gratuity', q.cardFee, 19.5);
  check('total', q.total, 409.5);
}

console.log('\nEach extra keeps its quantity and unit rate\n');
{
  const q = priceQuote({
    baseFare: 100,
    charges: [{ kind: 'additional_stop', quantity: 2, unitRate: 20 }],
    config: CONFIG,
  });
  check('line reads back as 2 x $20', [q.charges[0].quantity, q.charges[0].unitRate], [2, 20]);
  check('line amount', q.charges[0].amount, 40);
  check('a known kind is labelled', q.charges[0].label, 'Additional stop');
}

console.log('\nHourly work\n');
{
  const q = priceQuote({
    rateType: 'hourly',
    hours: 4,
    hourlyRate: 85,
    config: { ...CONFIG, minimumHours: 3 },
  });
  check('four hours at $85', q.baseFare, 340);
  check('billed hours', q.billedHours, 4);

  const short = priceQuote({
    rateType: 'hourly',
    hours: 1,
    hourlyRate: 85,
    config: { ...CONFIG, minimumHours: 3 },
  });
  check('under the minimum bills the minimum', short.billedHours, 3);
  check('and charges for it', short.baseFare, 255);
}

console.log('\nThe card fee only when a card is used\n');
{
  const cash = priceQuote({ baseFare: 240, config: CONFIG, cardFeeApplies: false });
  check('no fee on cash', cash.cardFee, 0);
  check('and the total drops accordingly', cash.total, 288);
  check('the rate shown is zero, not 5', cash.cardFeePercent, 0);
}

console.log('\nOverrides, for a price agreed on the telephone\n');
{
  const q = priceQuote({ baseFare: 240, config: CONFIG, gratuityOverride: 60 });
  check('an agreed gratuity replaces the percentage', q.gratuity, 60);
  check('and the card fee follows the new figure', q.cardFee, 15);

  const zero = priceQuote({ baseFare: 240, config: CONFIG, gratuityOverride: 0 });
  check('a waived gratuity is honoured, not treated as absent', zero.gratuity, 0);
}

console.log('\nDiscount and tax\n');
{
  const q = priceQuote({ baseFare: 240, config: { ...CONFIG, taxPercent: 8 }, discount: 20 });
  check('discount comes off before tax', q.subtotal, 282.4);
  check('tax is 8% of the subtotal', q.tax, 22.59);
  check('total', q.total, 304.99);

  const silly = priceQuote({ baseFare: 100, config: CONFIG, discount: 9999 });
  check('a discount cannot make the total negative', silly.total, 0);
  check('nor the subtotal', silly.subtotal, 0);
}

console.log('\nDeposits and balances\n');
{
  // The client's own example: $300 total, $200 deposit, $100 left.
  const q = priceQuote({
    baseFare: 300,
    config: { gratuityPercent: 0, cardFeePercent: 0, taxPercent: 0 },
    paymentOption: 'deposit',
    depositRequired: 200,
    amountPaid: 200,
  });
  check('total', q.total, 300);
  check('deposit required', q.depositRequired, 200);
  check('balance after the deposit', q.balanceDue, 100);
  check('not fully paid yet', q.fullyPaid, false);

  const settled = priceQuote({
    baseFare: 300,
    config: { gratuityPercent: 0, cardFeePercent: 0, taxPercent: 0 },
    paymentOption: 'deposit',
    depositRequired: 200,
    amountPaid: 300,
  });
  check('paying the balance clears it', settled.balanceDue, 0);
  check('and marks it settled', settled.fullyPaid, true);

  const greedy = priceQuote({
    baseFare: 100,
    config: { gratuityPercent: 0, cardFeePercent: 0, taxPercent: 0 },
    paymentOption: 'deposit',
    depositRequired: 500,
  });
  check('a deposit cannot exceed the total', greedy.depositRequired, 100);

  const inFull = priceQuote({
    baseFare: 100,
    config: { gratuityPercent: 0, cardFeePercent: 0, taxPercent: 0 },
    paymentOption: 'full',
  });
  check('paying in full asks for the whole total', inFull.depositRequired, 100);

  const overpaid = priceQuote({
    baseFare: 100,
    config: { gratuityPercent: 0, cardFeePercent: 0, taxPercent: 0 },
    amountPaid: 150,
  });
  check('an overpayment never shows a negative balance', overpaid.balanceDue, 0);
}

console.log('\nThe arithmetic itself\n');
{
  // 0.1 + 0.2 in floating point is 0.30000000000000004. In cents it is 30.
  const q = priceQuote({
    baseFare: 0.1,
    charges: [{ kind: 'other', quantity: 1, unitRate: 0.2 }],
    config: { gratuityPercent: 0, cardFeePercent: 0, taxPercent: 0 },
  });
  check('cents, not floats', q.total, 0.3);

  const odd = priceQuote({ baseFare: 33.33, config: { gratuityPercent: 20 } });
  check('gratuity rounds to the cent', odd.gratuity, 6.67);

  const parts = priceQuote({
    baseFare: 240,
    charges: [{ kind: 'tolls', quantity: 1, unitRate: 13.5 }],
    config: CONFIG,
  });
  const summed =
    parts.baseFare + parts.chargesTotal + parts.gratuity + parts.cardFee - parts.discount;
  check('the parts on screen add up to the subtotal', Math.round(summed * 100) / 100, parts.subtotal);
}

console.log('\nRubbish in\n');
{
  const q = priceQuote({});
  check('an empty quote is zero, not NaN', q.total, 0);

  const junk = priceQuote({
    baseFare: 'abc',
    charges: [{ kind: 'nonsense', quantity: 'two', unitRate: '$20' }],
    config: CONFIG,
  });
  check('an unreadable fare is zero', junk.baseFare, 0);
  check('an unknown kind falls back to other', junk.charges[0].kind, 'other');
  check('an unreadable quantity is zero', junk.charges[0].quantity, 0);

  const negative = priceQuote({ baseFare: -500, config: CONFIG });
  check('a negative fare is refused', negative.baseFare, 0);
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
