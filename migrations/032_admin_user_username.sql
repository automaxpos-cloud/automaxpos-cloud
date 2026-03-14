-- Ensure username column exists and is unique for admin users
ALTER TABLE cloud_users ADD COLUMN IF NOT EXISTS username TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cloud_users_username
ON cloud_users (LOWER(username))
WHERE username IS NOT NULL;

