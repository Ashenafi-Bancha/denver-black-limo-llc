-- 015_driver_auth.sql
--
-- Driver accounts: the drivers table gains credentials, and sessions become
-- records rather than something implied by an unexpired token.
--
-- Until now there was exactly one identity in this system — a shared admin
-- password — and the token said `{ role: 'admin' }` with no user in it. A
-- driver app needs the opposite: the API has to answer "who is this, and which
-- trips are theirs", for each of several people, on devices the company does
-- not control.
--
-- Sessions are stored because the agreement promises the office can sign a
-- driver's device out remotely, which a stateless token cannot do: once issued
-- it is valid until it expires, wherever it is. Refresh tokens are therefore
-- kept here, hashed, so that revoking one actually ends the session.

-- ── Credentials ───────────────────────────────────────────────────────────
--
-- No password column exists because drivers have never logged in. They do not
-- sign themselves up either: the office creates the driver and sets the first
-- password, which is why there is no verification token or self-service
-- registration here.
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password_hash    TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password_set_at  TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_login_at    TIMESTAMPTZ;

-- Brute force protection. Rate limiting by IP is already in front of the
-- route, but that does nothing about one attacker working slowly through many
-- addresses against a single known email, so the count lives on the account.
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS failed_attempts  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS locked_until     TIMESTAMPTZ;

-- ── Sessions ──────────────────────────────────────────────────────────────
--
-- One row per signed-in device. The refresh token is stored as a SHA-256
-- digest, never in the clear: a leaked database must not hand over working
-- sessions. The digest is enough, because verifying only ever needs to compare
-- a presented token against it.
CREATE TABLE IF NOT EXISTS driver_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id    UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  token_hash   TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  -- Set when the office signs the device out, or when the driver signs out.
  -- The row is kept rather than deleted so the office can see that a device
  -- was revoked and when.
  revoked_at   TIMESTAMPTZ,
  -- Enough to recognise a device in a list. Deliberately not a fingerprint:
  -- the point is "iPhone, last used Tuesday", not tracking.
  device_label VARCHAR(255),
  last_ip      VARCHAR(64)
);

-- The lookup on every refresh is by digest, so it carries the index.
CREATE UNIQUE INDEX IF NOT EXISTS driver_sessions_token_idx ON driver_sessions (token_hash);
CREATE INDEX IF NOT EXISTS driver_sessions_driver_idx ON driver_sessions (driver_id);

-- ON DELETE CASCADE above is deliberate and differs from how bookings treat a
-- driver. A booking must keep the driver that ran it, so drivers are retired
-- rather than deleted; a session is not history, it is a key. If a driver
-- record ever does go, their keys go with it.
