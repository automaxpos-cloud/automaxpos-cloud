CREATE TABLE IF NOT EXISTS license_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user TEXT,
  action TEXT NOT NULL,
  backend_id UUID,
  business_id UUID,
  license_id TEXT,
  old_value_json TEXT,
  new_value_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_audit_action ON license_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_license_audit_backend ON license_audit_logs(backend_id);
CREATE INDEX IF NOT EXISTS idx_license_audit_business ON license_audit_logs(business_id);
