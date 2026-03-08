const { query } = require("../db/pool");

async function insertMovements(backend, movements) {
  let inserted = 0;
  for (const m of movements) {
    await query(
      `INSERT INTO stock_movements (
        id, business_id, branch_id, product_id, change_qty, reason, ref_type, ref_id, created_at
      ) VALUES (
        gen_random_uuid(), $1,$2,$3,$4,$5,$6,$7,$8
      )`,
      [
        backend.business_id,
        backend.branch_id,
        m.product_id || null,
        m.change_qty || 0,
        m.reason || null,
        m.ref_type || null,
        m.ref_id || null,
        m.created_at ? new Date(m.created_at) : new Date()
      ]
    );
    inserted += 1;
  }
  return { inserted };
}

module.exports = { insertMovements };
