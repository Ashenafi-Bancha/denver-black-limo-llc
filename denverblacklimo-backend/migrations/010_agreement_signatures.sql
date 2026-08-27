-- 010_agreement_signatures.sql
--
-- Electronic signing of the reservation agreement.
--
-- Every booking gets a long random token, which is the only thing standing
-- between the public and someone else's reservation details, so it is
-- generated from two UUIDs rather than anything guessable. Existing bookings
-- are backfilled so the office can send a signing link for a trip that was
-- taken before this feature existed.
--
-- The signature itself lives in its own table rather than as columns on the
-- booking: it is an evidentiary record, written once and never edited, and
-- keeping it separate makes that intent obvious.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agreement_token     VARCHAR(64);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;

UPDATE bookings
   SET agreement_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
 WHERE agreement_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_agreement_token_idx ON bookings (agreement_token);

CREATE TABLE IF NOT EXISTS agreement_signatures (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  signer_name       VARCHAR(255) NOT NULL,
  -- The drawn signature, as a PNG data URL. Kept beside the audit fields so a
  -- signed copy can be regenerated at any time from the record alone.
  signature_png     TEXT,
  signed_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  signer_ip         VARCHAR(64),
  signer_user_agent TEXT,
  -- Fingerprint of the agreement wording that was displayed, so a later
  -- revision of the terms cannot be mistaken for what this person agreed to.
  terms_version     VARCHAR(32)
);

-- One signature per booking: signing twice would leave two records claiming
-- to be the agreement.
CREATE UNIQUE INDEX IF NOT EXISTS agreement_signatures_booking_idx ON agreement_signatures (booking_id);
