-- Phase 3 registration + name fields
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE branches ADD COLUMN IF NOT EXISTS location TEXT;

ALTER TABLE backend_devices ADD COLUMN IF NOT EXISTS backend_name TEXT;
