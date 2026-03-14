CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Base table (safe on existing DBs)
CREATE TABLE IF NOT EXISTS license_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core identifiers
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS backend_id TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS machine_id TEXT;

-- Business/contact
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS phone TEXT;

-- Request details
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS current_plan TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS current_total_device_limit INTEGER;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS request_type TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS requested_plan TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS extra_device_count INTEGER DEFAULT 0;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS requested_total_device_limit INTEGER;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS hardware_bundle TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS amount_expected NUMERIC(12,2);
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Status/payment fields
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS request_status TEXT DEFAULT 'pending';
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS payment_txn_id TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(14,2);
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS payment_confirmed_by TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS payment_notes TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS delivery_method TEXT;

-- Legacy compatibility fields
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS product TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS device_limit INTEGER;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

-- Indexes (guarded for partial schemas)
CREATE INDEX IF NOT EXISTS idx_license_requests_backend_id
ON license_requests (backend_id);

CREATE INDEX IF NOT EXISTS idx_license_requests_business_id
ON license_requests (business_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='license_requests' AND column_name='request_status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_license_requests_request_status ON license_requests (request_status)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_license_requests_created_at
ON license_requests (created_at DESC);
