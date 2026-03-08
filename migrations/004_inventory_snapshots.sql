-- Inventory snapshots for remote dashboard
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  backend_id UUID NOT NULL REFERENCES backend_devices(id) ON DELETE CASCADE,
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_products INTEGER DEFAULT 0,
  total_stock_value NUMERIC(14,2),
  payload_json TEXT
);
