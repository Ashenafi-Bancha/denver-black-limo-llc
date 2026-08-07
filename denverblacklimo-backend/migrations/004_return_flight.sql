-- Airport round trips return on a different flight, so the return leg needs its
-- own airline and flight number alongside the existing return date/time.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_flight_number VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_airline_name  VARCHAR(120);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS return_airline_code  VARCHAR(10);
