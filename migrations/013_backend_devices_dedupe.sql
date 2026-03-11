-- Deduplicate backend_devices by machine_id / installation_id and repoint child rows
-- Keep newest by last_seen_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
WITH ranked AS (
  SELECT
    id,
    COALESCE(installation_id::text, machine_id, NULLIF(backend_name, ''), id::text) AS dedupe_key,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(installation_id::text, machine_id, NULLIF(backend_name, ''), id::text)
      ORDER BY last_seen_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn,
    FIRST_VALUE(id) OVER (
      PARTITION BY COALESCE(installation_id::text, machine_id, NULLIF(backend_name, ''), id::text)
      ORDER BY last_seen_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS keep_id
  FROM backend_devices
)
UPDATE backend_heartbeats bh
SET backend_id = r.keep_id
FROM ranked r
WHERE bh.backend_id = r.id AND r.rn > 1;

UPDATE inventory_snapshots s
SET backend_id = r.keep_id
FROM ranked r
WHERE s.backend_id = r.id AND r.rn > 1;

UPDATE pos_register_activity pra
SET backend_id = r.keep_id
FROM ranked r
WHERE pra.backend_id = r.id AND r.rn > 1;

UPDATE sync_log sl
SET backend_id = r.keep_id
FROM ranked r
WHERE sl.backend_id = r.id AND r.rn > 1;

UPDATE sales sa
SET backend_id = r.keep_id
FROM ranked r
WHERE sa.backend_id = r.id AND r.rn > 1;

UPDATE synced_sales ss
SET backend_id = r.keep_id
FROM ranked r
WHERE ss.backend_id = r.id AND r.rn > 1;

UPDATE synced_returns sr
SET backend_id = r.keep_id
FROM ranked r
WHERE sr.backend_id = r.id AND r.rn > 1;

UPDATE backend_licenses bl
SET backend_id = r.keep_id
FROM ranked r
WHERE bl.backend_id = r.id AND r.rn > 1;

UPDATE license_requests lr
SET backend_id = r.keep_id
FROM ranked r
WHERE lr.backend_id = r.id AND r.rn > 1;

-- Delete duplicates
DELETE FROM backend_devices
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Enforce uniqueness for machine_id / installation_id (allow NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS backend_devices_unique_machine
  ON backend_devices(machine_id)
  WHERE machine_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS backend_devices_unique_installation
  ON backend_devices(installation_id)
  WHERE installation_id IS NOT NULL;
