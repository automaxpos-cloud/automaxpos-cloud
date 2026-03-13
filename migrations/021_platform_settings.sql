CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cloud_base_url TEXT,
  support_email TEXT,
  heartbeat_online_threshold_seconds INTEGER NOT NULL DEFAULT 300,
  heartbeat_offline_threshold_seconds INTEGER NOT NULL DEFAULT 900,
  enable_auto_backend_registration BOOLEAN NOT NULL DEFAULT TRUE,
  enable_audit_logging BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
