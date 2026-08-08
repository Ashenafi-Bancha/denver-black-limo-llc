-- The return leg can have its own stops and drop-off, just like the outbound one.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_dropoff_location  VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_additional_stops  TEXT;
