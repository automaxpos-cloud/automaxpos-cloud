CREATE TABLE IF NOT EXISTS license_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id TEXT NOT NULL,
  backend_id UUID NULL,
  business_id UUID NULL,
  machine_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NULL,
  reissue_count INTEGER NOT NULL DEFAULT 0,
  replaced_by_license_id TEXT NULL,
  replaced_from_license_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_activations_license_id
ON license_activations (license_id);

CREATE INDEX IF NOT EXISTS idx_license_activations_machine_id
ON license_activations (machine_id);

CREATE INDEX IF NOT EXISTS idx_license_activations_status
ON license_activations (status);
