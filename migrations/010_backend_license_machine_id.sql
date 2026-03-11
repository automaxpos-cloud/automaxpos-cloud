-- Add machine_id to backend_licenses for vendor linking
ALTER TABLE backend_licenses ADD COLUMN IF NOT EXISTS machine_id TEXT;

CREATE INDEX IF NOT EXISTS idx_backend_licenses_machine_id ON backend_licenses(machine_id);

UPDATE backend_licenses bl
SET machine_id = bd.machine_id
FROM backend_devices bd
WHERE bl.backend_id = bd.id
  AND bl.machine_id IS NULL;
