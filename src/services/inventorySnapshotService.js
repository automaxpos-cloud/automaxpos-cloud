const { pool } = require("../db/pool");
const { findIdempotency, insertIdempotency } = require("./idempotencyService");

async function ingestSnapshot(backend, payload) {
  const client = await pool.connect();
  const { idempotency_key, snapshot } = payload || {};
  if (!idempotency_key) {
    const err = new Error("idempotency_key required");
    err.code = "BAD_REQUEST";
    throw err;
  }

  try {
    await client.query("BEGIN");
    const existing = await findIdempotency(client, idempotency_key);
    if (existing) {
      await client.query("COMMIT");
      return { ok: true, already_processed: true };
    }

    await client.query(
      `INSERT INTO inventory_snapshots
       (business_id, branch_id, backend_id, snapshot_time, total_products, total_stock_value, payload_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        backend.business_id,
        backend.branch_id,
        backend.id,
        snapshot?.snapshot_time ? new Date(snapshot.snapshot_time) : new Date(),
        Number(snapshot?.total_products || 0),
        snapshot?.total_stock_value != null ? Number(snapshot.total_stock_value) : null,
        JSON.stringify(payload || {})
      ]
    );

    await insertIdempotency(client, idempotency_key, "inventory_snapshot");
    await client.query("COMMIT");
    return { ok: true, stored: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { ingestSnapshot };
