-- Ensure backend_devices exists for hosted deployments
CREATE TABLE IF NOT EXISTS backend_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  api_key_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  backend_version TEXT,
  machine_id TEXT,
  local_ip TEXT,
  port INTEGER,
  pending_sync_count INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  backend_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_backend_devices_business ON backend_devices(business_id);
CREATE INDEX IF NOT EXISTS idx_backend_devices_branch ON backend_devices(branch_id);
