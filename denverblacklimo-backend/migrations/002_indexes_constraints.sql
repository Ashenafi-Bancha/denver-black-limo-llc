-- 002_indexes_constraints.sql — indexes, status guards, and updated_at triggers

-- ── Indexes for the admin dashboard queries ──
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_email      ON bookings (email);

CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_type       ON inquiries (type);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries (created_at DESC);

-- ── Status CHECK constraints (NOT VALID so legacy rows never block a deploy) ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
      CHECK (status IN ('Pending','Reviewed','Quoted','Confirmed','Completed','Cancelled')) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_type_check') THEN
    ALTER TABLE inquiries ADD CONSTRAINT inquiries_type_check
      CHECK (type IN ('Contact','Quote')) NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_status_check') THEN
    ALTER TABLE inquiries ADD CONSTRAINT inquiries_status_check
      CHECK (status IN ('New','Read','Replied','Closed')) NOT VALID;
  END IF;
END $$;

-- ── Auto-maintain updated_at on any UPDATE ──
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_updated ON bookings;
CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_inquiries_updated ON inquiries;
CREATE TRIGGER trg_inquiries_updated
  BEFORE UPDATE ON inquiries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_site_settings_updated ON site_settings;
CREATE TRIGGER trg_site_settings_updated
  BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
