-- 018_trip_expenses.sql
--
-- What the trip cost the chauffeur out of pocket.
--
-- The agreement already says "Additional charges may apply for wait times,
-- additional stops, tolls/parking, and damages". Wait time became provable in
-- 016 and damage in 017. Tolls and parking were still nowhere: a driver pays
-- the E-470 toll and the DIA structure themselves, and unless they remember to
-- mention it on the telephone the company never bills it and never pays them
-- back. It is a small sum that happens on most airport runs.
--
-- Separate from trip_photos rather than another kind of one, because this has
-- an amount. Money that lives in a free-text note cannot be added up, and the
-- office needs a total per booking to put on an invoice.

CREATE TABLE IF NOT EXISTS trip_expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Who paid it. SET NULL, like trip_events and trip_photos: retiring a driver
  -- must not erase what they are owed from the record of the trip.
  driver_id   UUID         REFERENCES drivers(id) ON DELETE SET NULL,
  driver_name VARCHAR(255),

  --   toll     — E-470 and the like, the common one
  --   parking  — the airport structure, a hotel, a meter
  --   fuel     — rare, but it happens on a long charter
  --   cleaning — a valet after a mess, which the agreement bills on
  --   other
  kind        VARCHAR(32)  NOT NULL DEFAULT 'other',

  -- NUMERIC, so it can be summed in SQL. Note that node-pg hands this back as
  -- the string "12.50" — every reader has to coerce.
  amount      NUMERIC(10,2) NOT NULL CHECK (amount > 0),

  note        TEXT,

  -- The same two clocks as everywhere else: when it was paid, and when the
  -- server heard. A toll paid in a canyon syncs later and must keep its time.
  incurred_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  recorded_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- The receipt, when there is one. SET NULL rather than CASCADE: an admin
  -- deleting a blurred photograph must not delete the money with it.
  photo_id    UUID         REFERENCES trip_photos(id) ON DELETE SET NULL,

  -- Makes a retry idempotent, as for photographs — a submission can time out
  -- after the server has committed it, and the app will send it again.
  client_id   VARCHAR(64)  UNIQUE
);

CREATE INDEX IF NOT EXISTS trip_expenses_booking_idx ON trip_expenses (booking_id, incurred_at);
CREATE INDEX IF NOT EXISTS trip_expenses_driver_idx  ON trip_expenses (driver_id);
