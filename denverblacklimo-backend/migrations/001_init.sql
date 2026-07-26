-- 001_init.sql — core schema for Denver Black Limo
-- Idempotent so it can also upgrade databases created by the old boot-time script.

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- provides gen_random_uuid()

-- ── Bookings: requests from the multi-service booking wizard ──
CREATE TABLE IF NOT EXISTS bookings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status                  VARCHAR(50)  NOT NULL DEFAULT 'Pending',
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Customer
  name                    VARCHAR(255),
  phone                   VARCHAR(50),
  email                   VARCHAR(255),
  company                 VARCHAR(255),

  -- Service / trip
  service_type            VARCHAR(255),
  trip_type               VARCHAR(50),

  -- Airport / flight
  airport_direction       VARCHAR(50),
  airline_code            VARCHAR(10),
  airline_name            VARCHAR(255),
  terminal                VARCHAR(50),
  flight_number           VARCHAR(100),

  -- Route
  pickup_date             VARCHAR(50),
  pickup_time             VARCHAR(50),
  pickup_location         VARCHAR(255),
  dropoff_location        VARCHAR(255),
  additional_stops        TEXT,

  -- Round trip
  return_pickup_location  VARCHAR(255),
  return_date             VARCHAR(50),
  return_time             VARCHAR(50),

  -- Passengers & vehicle
  passengers              VARCHAR(50),
  luggage                 VARCHAR(50),
  vehicle_preference      VARCHAR(255),
  special_requests        TEXT,

  -- Service-specific fields (FBO, event, itinerary, etc.)
  details                 JSONB
);

-- Upgrade legacy bookings tables that predate these columns.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS company    VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS details    JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── Inquiries: contact messages + quote requests ──
CREATE TABLE IF NOT EXISTS inquiries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(20)  NOT NULL DEFAULT 'Contact',
  status      VARCHAR(50)  NOT NULL DEFAULT 'New',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  name        VARCHAR(255),
  email       VARCHAR(255),
  phone       VARCHAR(50),
  service     VARCHAR(255),
  event_date  VARCHAR(50),
  message     TEXT
);

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── Site settings: the CMS content store (key → JSON) ──
CREATE TABLE IF NOT EXISTS site_settings (
  key         VARCHAR(255) PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
