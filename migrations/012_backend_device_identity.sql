ALTER TABLE backend_devices
  ADD COLUMN IF NOT EXISTS installation_id UUID,
  ADD COLUMN IF NOT EXISTS device_secret_hash TEXT,
  ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_backend_devices_installation_id
  ON backend_devices(installation_id);
