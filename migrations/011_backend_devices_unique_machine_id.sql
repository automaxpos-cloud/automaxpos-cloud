-- Deduplicate backend_devices by machine_id (keep most recent)
WITH ranked AS (
  SELECT
    id,
    machine_id,
    ROW_NUMBER() OVER (
      PARTITION BY machine_id
      ORDER BY
        last_seen_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id
    ) AS rn
  FROM backend_devices
  WHERE machine_id IS NOT NULL
)
DELETE FROM backend_devices
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE rn > 1
);

-- Enforce uniqueness of machine_id (allow multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS uq_backend_devices_machine_id
  ON backend_devices(machine_id)
  WHERE machine_id IS NOT NULL;
