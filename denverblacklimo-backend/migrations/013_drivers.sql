-- 013_drivers.sql
--
-- Drivers become records instead of six text columns on a booking.
--
-- Until now a driver was a name, an email and a phone number attached to one
-- trip, which was enough to email a trip sheet and nothing more. It cannot
-- carry a licence that expires, an insurance policy that lapses, or the
-- question the office actually has to answer before a trip goes out: is this
-- person legal to drive it today.
--
-- Numbered 013 rather than 012 because 012 is taken on another branch. The
-- runner records each file by name and applies whatever it has not seen, so a
-- gap costs nothing — production is already living with one at 009.

CREATE TABLE IF NOT EXISTS drivers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Who they are. Email is the identity: it is what the trip sheet is sent to
  -- and what the old text columns were already keyed on.
  name                  VARCHAR(255) NOT NULL,
  email                 VARCHAR(255) NOT NULL,
  phone                 VARCHAR(50),

  -- What they drive. Free text, matching how the fleet is named everywhere
  -- else on the site rather than inventing a second vocabulary.
  vehicle_type          VARCHAR(255),
  vehicle_plate         VARCHAR(50),

  -- The paperwork an operator gets audited on. Dates are DATE, not text:
  -- these are the one thing here that has to be compared reliably.
  license_number        VARCHAR(100),
  license_expires       DATE,
  insurance_policy      VARCHAR(100),
  insurance_expires     DATE,
  -- A DOT medical card is required for commercial passenger work and lapses
  -- more often than the other two, because it is the one nobody diarises.
  medical_expires       DATE,

  -- Free text, not numeric: outside drivers are paid a flat trip rate, a
  -- percentage, or "as agreed", and forcing that into a number loses
  -- information. Same reasoning as bookings.driver_pay.
  default_pay           VARCHAR(100),
  notes                 TEXT,

  -- Inactive rather than deleted. A driver who has left still appears on the
  -- trips they ran, and deleting them would rewrite history.
  active                BOOLEAN      NOT NULL DEFAULT true,

  -- Filled by the driver app when it exists. Nothing writes these yet, and
  -- the dashboard says "no position reported" rather than inventing one.
  last_lat              NUMERIC(9,6),
  last_lng              NUMERIC(9,6),
  last_location_at      TIMESTAMPTZ
);

-- One record per email, however it was typed.
CREATE UNIQUE INDEX IF NOT EXISTS drivers_email_idx ON drivers (lower(email));
CREATE INDEX IF NOT EXISTS drivers_active_idx ON drivers (active);

-- ── Link bookings to the record ───────────────────────────────────────────
--
-- The existing driver_name / driver_email / driver_phone / driver_vehicle
-- columns stay, deliberately. They are the snapshot of what was actually sent
-- on that trip sheet. If a driver later changes their car or their number, the
-- trip that already went out must still show what the office dispatched —
-- a booking is a record of what happened, not a live view of a person.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS bookings_driver_id_idx ON bookings (driver_id);

-- ── Backfill from the drivers already dispatched ──────────────────────────
--
-- Everyone the office has ever sent a trip sheet to becomes a record, taking
-- their most recent details. Runs once; the unique index makes a re-run a
-- no-op rather than a duplicate.
INSERT INTO drivers (name, email, phone, vehicle_type)
SELECT DISTINCT ON (lower(driver_email))
       COALESCE(NULLIF(TRIM(driver_name), ''), driver_email),
       TRIM(driver_email),
       NULLIF(TRIM(COALESCE(driver_phone, '')), ''),
       NULLIF(TRIM(COALESCE(driver_vehicle, '')), '')
  FROM bookings
 WHERE driver_email IS NOT NULL AND TRIM(driver_email) <> ''
 ORDER BY lower(driver_email), COALESCE(driver_dispatched_at, updated_at) DESC
ON CONFLICT DO NOTHING;

UPDATE bookings b
   SET driver_id = d.id
  FROM drivers d
 WHERE b.driver_id IS NULL
   AND b.driver_email IS NOT NULL
   AND lower(TRIM(b.driver_email)) = lower(d.email);
