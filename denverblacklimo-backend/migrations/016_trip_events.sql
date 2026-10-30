-- 016_trip_events.sql
--
-- What the chauffeur did, and when.
--
-- These timestamps are not a progress bar. The reservation agreement charges
-- for wait time past a free window, bills a no-show, and recovers damages —
-- and today nothing records when the car actually arrived, so none of those
-- is provable when a customer disputes the invoice. An append-only log of
-- what the driver pressed, and when, is the evidence that makes those terms
-- enforceable.
--
-- Append-only matters. A column that is overwritten each time says only where
-- a trip is now; a disputed charge needs the sequence, including a status that
-- was set and then corrected.

CREATE TABLE IF NOT EXISTS trip_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  -- Who pressed it. Kept even if the driver is later retired, which is why
  -- this is SET NULL rather than CASCADE: losing the driver must not erase
  -- the record of a trip they ran.
  driver_id   UUID        REFERENCES drivers(id) ON DELETE SET NULL,
  -- Denormalised so the log still reads correctly when driver_id is gone.
  driver_name VARCHAR(255),

  status      VARCHAR(32) NOT NULL,

  -- Two times, deliberately. occurred_at is when the driver says it happened;
  -- recorded_at is when the server heard about it. They are the same today,
  -- but a status pressed in a mountain dead zone and synced an hour later
  -- would differ, and the difference is exactly what a dispute turns on.
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Where the car was when it was pressed, when the device offered it. An
  -- "arrived" with a position at the pick-up address is a far stronger answer
  -- to "no one was there" than a bare timestamp.
  lat         NUMERIC(9,6),
  lng         NUMERIC(9,6),

  note        TEXT
);

-- The common read is "this trip's events, in order".
CREATE INDEX IF NOT EXISTS trip_events_booking_idx ON trip_events (booking_id, occurred_at);
CREATE INDEX IF NOT EXISTS trip_events_driver_idx  ON trip_events (driver_id);

-- ── Current state, for lists ──────────────────────────────────────────────
--
-- A cache of the latest event, so the office can see a hundred bookings
-- without a hundred lookups. The log above is the truth; these two are only
-- ever written from it.
--
-- Named driver_status, never status: bookings.status is the office's own
-- workflow — Pending, Confirmed, Completed — and the two answer different
-- questions. A trip can be Confirmed in the office and still not started.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_status    VARCHAR(32);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_status_at TIMESTAMPTZ;

-- The billing-critical one, lifted out of the log because every wait-time
-- question starts here and it should not need a join to answer.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_arrived_at TIMESTAMPTZ;
