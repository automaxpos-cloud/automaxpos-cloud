const { query } = require("../db/pool");

async function recordHeartbeat(backend, payload) {
  const { app_version, status, local_time, stats } = payload || {};
  const pendingSync = Number(stats?.pending_sync_jobs || 0);

  await query(
    `UPDATE backend_devices
     SET last_seen_at = NOW(),
         backend_version = $1,
         pending_sync_count = $2
     WHERE id = $3`,
    [app_version || null, pendingSync, backend.id]
  );

  await query(
    `INSERT INTO backend_heartbeats
     (backend_id, business_id, branch_id, app_version, status, heartbeat_at, payload_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      backend.id,
      backend.business_id,
      backend.branch_id,
      app_version || null,
      status || "ONLINE",
      local_time ? new Date(local_time) : new Date(),
      JSON.stringify(payload || {})
    ]
  );
}

module.exports = { recordHeartbeat };
