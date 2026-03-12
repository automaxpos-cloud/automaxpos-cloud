CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS backend_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  backend_id UUID NOT NULL REFERENCES backend_devices(id) ON DELETE CASCADE,
  machine_id TEXT,
  license_id TEXT NOT NULL,
  plan TEXT,
  device_limit INTEGER,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  grace_ends_at TIMESTAMPTZ,
  features_json TEXT,
  payload_b64 TEXT,
  sig_b64 TEXT,
  status TEXT DEFAULT 'ACTIVE',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  plan_name TEXT,
  base_device_limit INTEGER,
  extra_device_count INTEGER DEFAULT 0,
  total_device_limit INTEGER,
  license_version INTEGER DEFAULT 1,
  previous_license_id TEXT,
  change_reason TEXT,
  license_status TEXT,
  request_id TEXT,
  hardware_bundle TEXT,
  quoted_price NUMERIC(14,2),

  UNIQUE (backend_id)
);

CREATE INDEX IF NOT EXISTS idx_backend_licenses_status ON backend_licenses(status);
CREATE INDEX IF NOT EXISTS idx_backend_licenses_machine_id ON backend_licenses(machine_id);

DO $$
BEGIN
  IF to_regclass('public.licenses') IS NOT NULL THEN
    INSERT INTO backend_licenses (
      business_id,
      branch_id,
      backend_id,
      machine_id,
      license_id,
      plan,
      device_limit,
      issued_at,
      expires_at,
      status,
      updated_at
    )
    SELECT
      l.business_id,
      bd.branch_id,
      bd.id AS backend_id,
      l.machine_id,
      l.license_key,
      l.plan,
      NULL,
      l.created_at,
      l.expires_at,
      l.status,
      NOW()
    FROM licenses l
    JOIN backend_devices bd
      ON bd.business_id = l.business_id
     AND (bd.machine_id IS NOT NULL AND bd.machine_id = l.machine_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM backend_licenses bl WHERE bl.backend_id = bd.id
    );
  END IF;
END $$;
