-- Uploaded CMS images live in the database, not on disk.
--
-- App Platform containers have an ephemeral filesystem: anything written to
-- ./public/uploads is destroyed on the next deploy or restart, so disk-backed
-- uploads would vanish. The DB is the only persistent store this app has, and
-- serving them under /api/images also keeps them on a route that is actually
-- proxied to the backend (/uploads is not).
CREATE TABLE IF NOT EXISTS site_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mime_type   VARCHAR(100) NOT NULL,
  byte_size   INTEGER      NOT NULL,
  data        BYTEA        NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
