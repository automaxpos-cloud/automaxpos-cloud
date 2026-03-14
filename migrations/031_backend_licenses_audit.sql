-- Issuer/approver/audit fields for backend_licenses
ALTER TABLE backend_licenses ADD COLUMN IF NOT EXISTS issued_by_admin_id UUID;
ALTER TABLE backend_licenses ADD COLUMN IF NOT EXISTS issued_by_name TEXT;
ALTER TABLE backend_licenses ADD COLUMN IF NOT EXISTS issued_by_email TEXT;
ALTER TABLE backend_licenses ADD COLUMN IF NOT EXISTS approved_by_admin_id UUID;
ALTER TABLE backend_licenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE backend_licenses ADD COLUMN IF NOT EXISTS updated_by_admin_id UUID;
ALTER TABLE backend_licenses ADD COLUMN IF NOT EXISTS revoked_by_admin_id UUID;
ALTER TABLE backend_licenses ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE backend_licenses ADD COLUMN IF NOT EXISTS reissued_by_admin_id UUID;
ALTER TABLE backend_licenses ADD COLUMN IF NOT EXISTS reissued_at TIMESTAMPTZ;

