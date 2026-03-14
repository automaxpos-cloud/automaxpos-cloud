-- Admin user management fields for cloud_users
ALTER TABLE cloud_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE cloud_users ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE cloud_users ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE cloud_users ADD COLUMN IF NOT EXISTS revoked_by UUID;
ALTER TABLE cloud_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

UPDATE cloud_users
SET email = COALESCE(email, username)
WHERE email IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_users_email
ON cloud_users (LOWER(email))
WHERE email IS NOT NULL;