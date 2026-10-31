-- 017_trip_photos.sql
--
-- What the chauffeur saw.
--
-- The agreement makes the client liable for "smoking in the vehicles,
-- vomiting in vehicle, excessive spills/messes, burns, tears, broken
-- glassware", and bills a no-show. Every one of those is a charge argued
-- after the fact against a customer who remembers it differently, and today
-- the only record is the driver's word. A photograph taken at the time, with
-- the time kept, is what makes those terms collectable.
--
-- Bytes go in Postgres, like site_images and for the same reason: App Platform
-- gives each container an ephemeral disk, so anything written to ./public is
-- destroyed on the next deploy, and only /api is proxied to this service.
--
-- Unlike site_images these are NOT public. A picture of a damaged interior, a
-- passenger's luggage or the door they failed to come out of is not something
-- to serve to anyone who guesses a URL. Every read is behind a token.

CREATE TABLE IF NOT EXISTS trip_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- Who took it. SET NULL rather than CASCADE for the same reason as
  -- trip_events: retiring a driver must not erase the evidence from the trips
  -- they ran.
  driver_id   UUID         REFERENCES drivers(id) ON DELETE SET NULL,
  driver_name VARCHAR(255),

  -- What it is evidence of. Kept deliberately small; the office reads these
  -- as labels on a timeline, not as a taxonomy.
  --   vehicle_before / vehicle_after — condition at the start and the end,
  --     which is the pair a damage charge is argued from
  --   damage   — the thing itself
  --   no_show  — nobody at the pick-up
  --   other    — a receipt, a parking sign, whatever the trip needed
  kind        VARCHAR(32)  NOT NULL DEFAULT 'other',
  note        TEXT,

  -- The same two clocks as trip_events, and for the same reason: a photo taken
  -- in a car park with no signal and uploaded an hour later is evidence of the
  -- car park, not of the hour later.
  taken_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  recorded_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Where it was taken, when the device offered it.
  lat         NUMERIC(9,6),
  lng         NUMERIC(9,6),

  -- The device's own id for this photo. An upload is large enough to time out
  -- after the server already committed it, and the app will retry; without
  -- this that retry would store the picture twice.
  client_id   VARCHAR(64)  UNIQUE,

  mime_type   VARCHAR(100) NOT NULL,
  byte_size   INTEGER      NOT NULL,
  data        BYTEA        NOT NULL
);

-- The common read is "this trip's photos, oldest first". Never SELECT *: the
-- blob is TOASTed out of line, so listing without `data` does not touch it.
CREATE INDEX IF NOT EXISTS trip_photos_booking_idx ON trip_photos (booking_id, taken_at);
CREATE INDEX IF NOT EXISTS trip_photos_driver_idx  ON trip_photos (driver_id);
