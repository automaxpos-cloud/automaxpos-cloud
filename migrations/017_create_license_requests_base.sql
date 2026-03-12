CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS license_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,

  backend_id TEXT,
  business_id TEXT,
  branch_id TEXT,
  machine_id TEXT,

  business_name TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,

  current_plan TEXT,
  current_total_device_limit INTEGER,

  request_type TEXT NOT NULL,
  requested_plan TEXT,
  extra_device_count INTEGER DEFAULT 0,
  requested_total_device_limit INTEGER,

  hardware_bundle TEXT,
  amount_expected NUMERIC(12,2),
  payment_status TEXT DEFAULT 'unpaid',
  request_status TEXT DEFAULT 'pending',
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,

  -- Legacy compatibility fields used by existing admin screens/queries
  product TEXT,
  version TEXT,
  customer_name TEXT,
  address TEXT,
  location TEXT,
  plan TEXT,
  device_limit INTEGER,
  device_id TEXT,
  requested_at TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING',
  payment_method TEXT,
  payment_txn_id TEXT,
  payment_amount NUMERIC(14,2),
  payment_confirmed_by TEXT,
  payment_confirmed_at TIMESTAMPTZ,
  payment_notes TEXT,
  delivery_method TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_requests_backend_id
ON license_requests (backend_id);

CREATE INDEX IF NOT EXISTS idx_license_requests_business_id
ON license_requests (business_id);

CREATE INDEX IF NOT EXISTS idx_license_requests_request_status
ON license_requests (request_status);

CREATE INDEX IF NOT EXISTS idx_license_requests_created_at
ON license_requests (created_at DESC);
