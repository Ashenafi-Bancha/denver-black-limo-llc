-- 019_quote_charges_and_payments.sql
--
-- A quote that shows its working, and a booking that knows what has been paid.
--
-- Until now a quote was a list of {label, amount} the office typed by hand,
-- and nothing anywhere recorded money received. The client asked for a proper
-- charge sheet — base fare, gratuity, card fee, extras priced by quantity —
-- and for deposits with a balance collected later.
--
-- Three decisions shape this file.
--
-- **The old line items stay.** 012 was deliberate that "a quote already in a
-- customer's inbox must still show the numbers they were given". Quotes sent
-- before today have no base fare and no gratuity, and rewriting them into the
-- new shape would invent figures nobody was offered. New columns are added
-- beside the old ones; a quote is read in whichever shape it was written.
--
-- **Payments are a ledger, not a column.** The client was explicit that the
-- first deposit and the later balance must be recorded separately. A single
-- amount_paid column would answer "how much" while losing "when, how, and in
-- how many parts" — which is exactly what an argument about a payment turns
-- on. The total is summed from the ledger rather than cached beside it, so
-- the two can never disagree.
--
-- **Percentages are stored as sent.** gratuity_percent and card_fee_percent
-- are written onto the quote, not only into settings. When the rate card
-- changes next month, a quote from today must still explain its own numbers.

-- ── The charge sheet ──────────────────────────────────────────────────────

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS rate_type        VARCHAR(16);  -- flat | hourly
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS base_fare        NUMERIC(10,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS billed_hours     NUMERIC(6,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS hourly_rate      NUMERIC(10,2);

-- [{ kind, label, quantity, unitRate, amount }] — the quantity and the unit
-- rate are both kept so the quote can say "2 stops x $20.00" rather than a
-- bare $40.00 the customer cannot check.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS charges          JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS charges_total    NUMERIC(10,2);

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS gratuity_percent NUMERIC(6,3);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS gratuity         NUMERIC(10,2);

-- The "Service Charge" line on the client's mock-up. Named for what it is:
-- the processor's cut on money taken by card. Zero when the customer pays
-- cash or by Zelle, because then it costs the company nothing.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS card_fee_percent NUMERIC(6,3);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS card_fee         NUMERIC(10,2);

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount         NUMERIC(10,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS subtotal         NUMERIC(10,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tax_percent      NUMERIC(6,3);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS tax              NUMERIC(10,2);

-- Where the customer pays. A link the office pastes in for now; when a
-- payment provider is connected this is the column it writes to, and nothing
-- else has to change.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS payment_link     TEXT;

-- ── What the booking owes, and how it is being settled ────────────────────

-- full | deposit
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_option   VARCHAR(16);
-- payment_link | venmo | zelle | cash | credit_card
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method   VARCHAR(32);

-- The client proposed: Pending Quote, Quote Sent, Deposit Requested, Deposit
-- Paid, Balance Due, Balance Payment Requested, Fully Paid — and said to
-- merge them with what exists rather than adopt all of them. bookings.status
-- stays the office's own workflow (Pending / Confirmed / Completed), exactly
-- as driver_status was kept apart from it in 016. This column answers only
-- "where is the money", which is a different question.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status   VARCHAR(32);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_required NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_due_date DATE;

-- The mock-up asks for two note fields. The customer-facing one already
-- exists as special_requests — the placeholder on his drawing ("pickup
-- details, special requests") describes that column exactly — so only the
-- office's own notes are new. driver_notes is not reused: that is dispatch
-- talking to the chauffeur, and it is shown in the driver app.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS internal_notes   TEXT;

-- ── The payments themselves ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID          NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- deposit  — the first part payment
  -- balance  — what was left, collected later
  -- full     — paid in one go
  -- refund   — negative, and the only kind allowed to be
  kind        VARCHAR(20)   NOT NULL DEFAULT 'deposit',

  amount      NUMERIC(10,2) NOT NULL CHECK (amount <> 0),
  method      VARCHAR(32),

  -- A Venmo note, a Zelle confirmation, a Square receipt id — whatever the
  -- office can point at when a customer says they already paid.
  reference   TEXT,

  received_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  recorded_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  recorded_by VARCHAR(255),
  note        TEXT
);

CREATE INDEX IF NOT EXISTS booking_payments_booking_idx
  ON booking_payments (booking_id, received_at);

-- Every booking that has not been quoted is, by definition, awaiting one.
-- Backfilled rather than left null so the office's filters have something to
-- work with from the first day.
UPDATE bookings SET payment_status = 'Pending Quote' WHERE payment_status IS NULL;
