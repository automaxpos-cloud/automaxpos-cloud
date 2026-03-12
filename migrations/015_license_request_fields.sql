ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS requested_plan TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS device_count INTEGER;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS delivery_method TEXT;
