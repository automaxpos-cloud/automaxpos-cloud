ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending_payment';

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS payer_phone TEXT;

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2);

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS payment_source TEXT;

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS payment_confirmed_by TEXT;

ALTER TABLE license_requests
  ADD COLUMN IF NOT EXISTS payment_notes TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='license_requests' AND column_name='payment_status'
  ) THEN
    ALTER TABLE license_requests
      ALTER COLUMN payment_status SET DEFAULT 'pending_payment';
  END IF;
END$$;
