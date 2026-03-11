-- Remove duplicate backend_devices rows (keep newest by last_seen_at/created_at)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(machine_id::text, NULLIF(backend_name,''), id::text)
      ORDER BY last_seen_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM backend_devices
)
DELETE FROM backend_devices
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
