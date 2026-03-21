CREATE TABLE IF NOT EXISTS demo_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT UNIQUE NOT NULL,
  first_activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  sales_count INTEGER DEFAULT 0,
  max_sales INTEGER DEFAULT 50,
  status TEXT DEFAULT 'ACTIVE',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demo_licenses_status
  ON demo_licenses (status);
