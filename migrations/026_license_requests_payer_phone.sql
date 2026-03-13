ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS payer_phone TEXT;
