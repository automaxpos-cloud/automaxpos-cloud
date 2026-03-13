CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  txn_id TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL DEFAULT 'airtel_sms_email',
  source_email TEXT,
  sender_email TEXT,
  source_email_message_id TEXT,
  payer_phone TEXT,
  amount NUMERIC(12,2),
  currency TEXT DEFAULT 'ZMW',
  raw_subject TEXT,
  raw_body TEXT,
  matched_request_id UUID NULL,
  match_status TEXT NOT NULL DEFAULT 'unmatched',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_matched_request
ON payment_transactions (matched_request_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
ON payment_transactions (match_status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_imported_at
ON payment_transactions (imported_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_message_id
ON payment_transactions (source_email_message_id);
