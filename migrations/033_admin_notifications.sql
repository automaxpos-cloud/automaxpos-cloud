CREATE TABLE IF NOT EXISTS admin_notifications (
  id BIGSERIAL PRIMARY KEY,
  notification_type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  payload_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_type
ON admin_notifications (notification_type);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created
ON admin_notifications (created_at DESC);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT REFERENCES admin_notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification
ON notification_deliveries (notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel
ON notification_deliveries (channel);
