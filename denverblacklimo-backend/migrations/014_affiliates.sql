-- 014_affiliates.sql
--
-- Affiliates: the partner companies that run a trip on our behalf.
--
-- An affiliate is a business, not a person. Denver Black Limo farms a
-- reservation out to "ABC Transportation LLC", and that company supplies
-- whichever chauffeur and vehicle it likes. This is deliberately separate from
-- the drivers table: a driver is someone we dispatch directly and whose licence
-- and insurance we hold, an affiliate is a company we hand the whole job to.
-- Conflating them would mean the office could not tell which of the two is
-- actually responsible for a trip.
--
-- The same relationship runs in the other direction too — corporate operators
-- farm trips out to us — so one affiliate has many reservations and none of
-- their details are copied onto a booking.

CREATE TABLE IF NOT EXISTS affiliates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- The company is the affiliate. contact_name is whoever answers the phone
  -- there, which is useful but never the identity of the record.
  company_name   VARCHAR(255) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  phone          VARCHAR(50),
  contact_name   VARCHAR(255),
  notes          TEXT,

  -- Inactive rather than deleted. A company we have stopped working with still
  -- ran the trips it ran, and removing it would rewrite them.
  active         BOOLEAN      NOT NULL DEFAULT true
);

-- One record per company mailbox, however it was typed. The farmout sheet is
-- sent to this address, so two records sharing one would be a real ambiguity.
CREATE UNIQUE INDEX IF NOT EXISTS affiliates_email_idx ON affiliates (lower(email));
CREATE INDEX IF NOT EXISTS affiliates_active_idx ON affiliates (active);

-- ── The reservation relationship ──────────────────────────────────────────
--
-- A plain foreign key, with none of the company's details copied onto the
-- booking. Unlike the driver columns — which existed as loose text before the
-- drivers table did, and are kept as a snapshot of what was dispatched — there
-- is no history here to preserve, so the reference is the whole story and an
-- affiliate that corrects its phone number corrects it everywhere at once.
--
-- RESTRICT rather than SET NULL: an affiliate with trips against it cannot be
-- deleted at all. The API retires it instead, but making that a database
-- guarantee means no future code path can quietly detach a reservation from
-- the company that ran it.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id) ON DELETE RESTRICT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS affiliate_assigned_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS affiliate_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS bookings_affiliate_id_idx ON bookings (affiliate_id);
