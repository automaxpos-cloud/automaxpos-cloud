ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS request_type TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS current_plan TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS current_total_device_limit INTEGER;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS extra_device_count INTEGER;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS requested_total_device_limit INTEGER;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS hardware_bundle TEXT;
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS amount_expected NUMERIC(14,2);
ALTER TABLE license_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
