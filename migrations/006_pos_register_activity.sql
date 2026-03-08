-- Phase 6: POS register activity tracking
CREATE TABLE IF NOT EXISTS pos_register_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  backend_id UUID NOT NULL REFERENCES registered_backends(id) ON DELETE CASCADE,
  register_name TEXT NOT NULL,
  cashier_name TEXT,
  device_id TEXT,
  last_activity_type TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_register_activity_unique
  ON pos_register_activity(business_id, branch_id, register_name);

CREATE INDEX IF NOT EXISTS idx_pos_register_activity_last_seen
  ON pos_register_activity(business_id, branch_id, last_seen_at DESC);
