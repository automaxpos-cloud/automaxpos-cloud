CREATE TABLE IF NOT EXISTS device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backend_id UUID,
  license_id TEXT,
  fingerprint_hash TEXT NOT NULL,
  hostname TEXT,
  platform TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_license
  ON device_fingerprints (license_id);

CREATE INDEX IF NOT EXISTS idx_device_fingerprints_backend
  ON device_fingerprints (backend_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_device_fingerprints_license_hash
  ON device_fingerprints (license_id, fingerprint_hash);
