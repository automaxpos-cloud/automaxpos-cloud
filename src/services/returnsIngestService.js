const { pool } = require("../db/pool");
const { v4: uuidv4 } = require("uuid");
const { findIdempotency, insertIdempotency } = require("./idempotencyService");

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function ingestReturn(backend, payload) {
  const client = await pool.connect();
  const { idempotency_key, return: ret } = payload;
  const localReturnUuid =
    ret?.local_return_uuid ||
    ret?.localReturnUuid ||
    ret?.return_uuid ||
    null;

  if (!idempotency_key) {
    const err = new Error("idempotency_key required");
    err.code = "BAD_REQUEST";
    throw err;
  }
  if (!localReturnUuid) {
    const err = new Error("local_return_uuid required");
    err.code = "BAD_REQUEST";
    throw err;
  }

  try {
    await client.query("BEGIN");

    const existingKey = await findIdempotency(client, idempotency_key);
    if (existingKey) {
      await client.query("COMMIT");
      return { ok: true, already_processed: true };
    }

    const existingReturn = await client.query(
      `SELECT id FROM synced_returns
       WHERE local_return_uuid = $1 AND business_id = $2 AND branch_id = $3`,
      [localReturnUuid, backend.business_id, backend.branch_id]
    );

    if (existingReturn.rows.length) {
      await insertIdempotency(client, idempotency_key, "returns_sync");
      await client.query("COMMIT");
      return { ok: true, already_exists: true };
    }

    const returnId = uuidv4();
    await client.query(
      `INSERT INTO synced_returns (
        id, business_id, branch_id, backend_id,
        local_return_uuid, return_no, sale_ref_uuid,
        total, refund_method, cashier_name,
        local_created_at, raw_payload_json
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )`,
      [
        returnId,
        backend.business_id,
        backend.branch_id,
        backend.id,
        String(localReturnUuid),
        ret?.return_no || null,
        ret?.sale_ref_uuid || null,
        safeNumber(ret?.total),
        ret?.refund_method || null,
        ret?.cashier_name || null,
        ret?.created_at ? new Date(ret.created_at) : new Date(),
        JSON.stringify(ret || {})
      ]
    );

    await insertIdempotency(client, idempotency_key, "returns_sync");
    await client.query("COMMIT");
    return { ok: true, stored: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { ingestReturn };
