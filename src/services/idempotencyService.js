const { pool } = require("../db/pool");

async function findIdempotency(client, key) {
  const res = await client.query(
    "SELECT idempotency_key FROM sync_idempotency WHERE idempotency_key = $1",
    [key]
  );
  return res.rows[0] || null;
}

async function insertIdempotency(client, key, endpointName, responseHash = null) {
  await client.query(
    `INSERT INTO sync_idempotency (idempotency_key, endpoint_name, response_hash)
     VALUES ($1,$2,$3)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [key, endpointName, responseHash]
  );
}

module.exports = { findIdempotency, insertIdempotency };
