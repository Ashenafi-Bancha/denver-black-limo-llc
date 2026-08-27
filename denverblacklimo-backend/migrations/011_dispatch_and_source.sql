-- 011_dispatch_and_source.sql
--
-- Two things the office needs that the website alone never produced.
--
-- 1. Driver dispatch. Trips are sometimes run by an outside chauffeur, who
--    needs the trip sheet by email. The assignment is kept on the booking
--    rather than in a separate drivers table: a driver here is a name, an
--    email and a phone number attached to one trip, and the list of drivers
--    the office actually uses falls out of past dispatches on its own.
--
-- 2. Where the booking came from. Phone bookings are entered by hand in the
--    admin, and telling them apart from website bookings is the whole point of
--    counting orders — a month where the website went quiet but the phone did
--    not is a very different month.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_name          VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_email         VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_phone         VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_vehicle       VARCHAR(255);
-- Free text, not a number: outside drivers are paid a flat trip rate, a
-- percentage, or "as agreed", and forcing that into a numeric column would
-- only lose information.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_pay           VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_notes         TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_dispatched_at TIMESTAMPTZ;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source VARCHAR(50);

-- Everything already in the table arrived through the booking form.
UPDATE bookings SET source = 'Website' WHERE source IS NULL;
ALTER TABLE bookings ALTER COLUMN source SET DEFAULT 'Website';

-- Counting orders by month and by source is the common read, and it scans the
-- whole table rather than the recent page the dashboard lists.
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings (created_at);
CREATE INDEX IF NOT EXISTS bookings_source_idx     ON bookings (source);
