-- 012_quotes.sql
--
-- Price quotes sent from the admin, and the customer's acceptance.
--
-- A quote is its own record rather than columns on the booking, because a
-- trip can be quoted more than once — a price is revised, a vehicle changes,
-- a customer asks for a different date — and each of those is a separate
-- offer with its own terms and its own answer. Keeping them apart means the
-- history survives; overwriting a column would erase what was previously
-- offered and accepted.
--
-- The line items are stored as sent. If the rate card changes next month, a
-- quote already in a customer's inbox must still show the numbers they were
-- given, so nothing here is recalculated on read.

CREATE TABLE IF NOT EXISTS quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,

  -- The only credential on the public accept link, so it comes from a
  -- cryptographic source, exactly as the agreement token does.
  token           VARCHAR(64) NOT NULL,

  currency        VARCHAR(8)  NOT NULL DEFAULT 'USD',
  -- [{ label, amount }] as sent, never recalculated.
  line_items      JSONB       NOT NULL DEFAULT '[]'::jsonb,
  total           NUMERIC(10,2) NOT NULL,
  note            TEXT,
  valid_until     DATE,

  -- What the pricing engine suggested when the quote was written, kept beside
  -- the number actually sent. Over time this shows whether the rate card
  -- matches what the office really charges.
  suggested_total NUMERIC(10,2),

  status          VARCHAR(20) NOT NULL DEFAULT 'Sent',  -- Sent | Accepted | Declined
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at    TIMESTAMPTZ,
  responder_ip    VARCHAR(64),
  responder_agent TEXT,
  decline_reason  TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS quotes_token_idx      ON quotes (token);
CREATE INDEX        IF NOT EXISTS quotes_booking_idx    ON quotes (booking_id, sent_at DESC);
CREATE INDEX        IF NOT EXISTS quotes_status_idx     ON quotes (status);

-- Denormalised onto the booking so the dashboard list can show quote state
-- without joining every row it renders.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_status  VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_total   NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_sent_at TIMESTAMPTZ;

-- What the customer was shown by the estimator when they booked. The office
-- needs to see it before quoting: a number far from what the site promised is
-- a conversation to have deliberately, not by accident.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS estimate_shown NUMERIC(10,2);
