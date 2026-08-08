-- Records when the office asked this customer for a Google review, so the admin
-- can see it was already sent and avoid pestering the same person twice.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_request_sent_at TIMESTAMPTZ;
