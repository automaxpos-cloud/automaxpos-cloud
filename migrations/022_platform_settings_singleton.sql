CREATE TABLE IF NOT EXISTS platform_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  cloud_base_url TEXT NOT NULL DEFAULT '',
  online_threshold_seconds INTEGER NOT NULL DEFAULT 300,
  offline_threshold_seconds INTEGER NOT NULL DEFAULT 900,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
