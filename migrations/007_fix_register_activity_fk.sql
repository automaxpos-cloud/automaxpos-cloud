-- Phase 7: Fix register activity backend FK to match backend_devices
ALTER TABLE pos_register_activity
  DROP CONSTRAINT IF EXISTS pos_register_activity_backend_id_fkey;

ALTER TABLE pos_register_activity
  ADD CONSTRAINT pos_register_activity_backend_id_fkey
  FOREIGN KEY (backend_id) REFERENCES backend_devices(id) ON DELETE CASCADE;
