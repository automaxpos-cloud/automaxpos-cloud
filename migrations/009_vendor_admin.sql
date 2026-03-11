-- Vendor admin dashboard + license request tracking
CREATE TABLE IF NOT EXISTS license_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE,
  product TEXT,
  version TEXT,
  customer_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  location TEXT,
  plan TEXT,
  device_limit INTEGER,
  machine_id TEXT,
  device_id TEXT,
  backend_id UUID,
  business_id UUID,
  branch_id UUID,
  requested_at TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING',
  payment_status TEXT DEFAULT 'PENDING',
  payment_method TEXT,
  payment_txn_id TEXT,
  payment_amount NUMERIC(14,2),
  payment_confirmed_by TEXT,
  payment_confirmed_at TIMESTAMPTZ,
  payment_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_requests_status ON license_requests(status);
CREATE INDEX IF NOT EXISTS idx_license_requests_payment_status ON license_requests(payment_status);
CREATE INDEX IF NOT EXISTS idx_license_requests_backend ON license_requests(backend_id);
CREATE INDEX IF NOT EXISTS idx_license_requests_business ON license_requests(business_id);

-- Ensure backend_licenses exists for hosted deployments
CREATE TABLE IF NOT EXISTS backend_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  backend_id UUID NOT NULL REFERENCES backend_devices(id) ON DELETE CASCADE,
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
  UNIQUE (backend_id)
);

CREATE INDEX IF NOT EXISTS idx_backend_licenses_status ON backend_licenses(status);

ALTER TABLE backend_devices ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
