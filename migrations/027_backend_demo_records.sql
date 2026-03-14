CREATE TABLE IF NOT EXISTS backend_demo_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id TEXT NOT NULL,
  backend_id UUID NULL,
  business_id UUID NULL,
  first_demo_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  demo_expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NULL,
  install_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS backend_demo_records_unique_machine
ON backend_demo_records (machine_id);

CREATE INDEX IF NOT EXISTS idx_backend_demo_records_backend_id
ON backend_demo_records (backend_id);

CREATE INDEX IF NOT EXISTS idx_backend_demo_records_business_id
ON backend_demo_records (business_id);

CREATE INDEX IF NOT EXISTS idx_backend_demo_records_status
ON backend_demo_records (status);
