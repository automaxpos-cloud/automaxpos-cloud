DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='platform_settings') THEN
    -- Add missing columns from either schema
    ALTER TABLE platform_settings
      ADD COLUMN IF NOT EXISTS heartbeat_online_threshold_seconds INTEGER,
      ADD COLUMN IF NOT EXISTS heartbeat_offline_threshold_seconds INTEGER,
      ADD COLUMN IF NOT EXISTS online_threshold_seconds INTEGER,
      ADD COLUMN IF NOT EXISTS offline_threshold_seconds INTEGER,
      ADD COLUMN IF NOT EXISTS cloud_base_url TEXT;

    -- Backfill between naming variants
    UPDATE platform_settings
      SET heartbeat_online_threshold_seconds = COALESCE(heartbeat_online_threshold_seconds, online_threshold_seconds, 300),
          heartbeat_offline_threshold_seconds = COALESCE(heartbeat_offline_threshold_seconds, offline_threshold_seconds, 900),
          online_threshold_seconds = COALESCE(online_threshold_seconds, heartbeat_online_threshold_seconds, 300),
          offline_threshold_seconds = COALESCE(offline_threshold_seconds, heartbeat_offline_threshold_seconds, 900)
    WHERE heartbeat_online_threshold_seconds IS NULL
       OR heartbeat_offline_threshold_seconds IS NULL
       OR online_threshold_seconds IS NULL
       OR offline_threshold_seconds IS NULL;
  END IF;
END$$;
