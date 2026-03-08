-- Phase 2 core schema for final architecture
CREATE TABLE IF NOT EXISTS registered_backends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  backend_name TEXT,
  device_fingerprint TEXT,
  app_version TEXT,
  api_key_hash TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_heartbeat_at TIMESTAMPTZ,
  last_seen_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS synced_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  backend_id UUID NOT NULL REFERENCES backend_devices(id) ON DELETE CASCADE,
  receipt_no TEXT,
  local_sale_uuid TEXT NOT NULL UNIQUE,
  subtotal NUMERIC(14,2) DEFAULT 0,
  discount NUMERIC(14,2) DEFAULT 0,
  tax NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) DEFAULT 0,
  payment_method TEXT,
  cashier_name TEXT,
  local_created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS synced_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_sale_id UUID NOT NULL REFERENCES synced_sales(id) ON DELETE CASCADE,
  product_id TEXT,
  sku TEXT,
  barcode TEXT,
  product_name TEXT,
  variant_name TEXT,
  unit_price NUMERIC(14,2) DEFAULT 0,
  qty NUMERIC(14,3) DEFAULT 0,
  weight_qty NUMERIC(14,3),
  line_total NUMERIC(14,2) DEFAULT 0,
  product_type TEXT
);

CREATE TABLE IF NOT EXISTS synced_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  backend_id UUID NOT NULL REFERENCES backend_devices(id) ON DELETE CASCADE,
  local_return_uuid TEXT NOT NULL UNIQUE,
  return_no TEXT,
  sale_ref_uuid TEXT,
  total NUMERIC(14,2) DEFAULT 0,
  refund_method TEXT,
  cashier_name TEXT,
  local_created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_payload_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backend_heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backend_id UUID NOT NULL REFERENCES backend_devices(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  app_version TEXT,
  status TEXT NOT NULL DEFAULT 'ONLINE',
  heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json TEXT
);

CREATE TABLE IF NOT EXISTS sync_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  endpoint_name TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_registered_backends_business_branch ON registered_backends(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_synced_sales_business_branch ON synced_sales(business_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_synced_sales_local_uuid ON synced_sales(local_sale_uuid);
CREATE INDEX IF NOT EXISTS idx_synced_returns_local_uuid ON synced_returns(local_return_uuid);
CREATE INDEX IF NOT EXISTS idx_backend_heartbeats_backend ON backend_heartbeats(backend_id);
