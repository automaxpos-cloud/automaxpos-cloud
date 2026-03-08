const { pool } = require("../db/pool");

async function upsertRegisterActivity(req, res) {
  try {
    const backend = req.backend || null;
    const {
      register_name,
      cashier_name,
      device_id,
      last_activity_type,
      last_seen_at
    } = req.body || {};

    if (!backend?.business_id || !backend?.branch_id || !backend?.id) {
      return res.status(401).json({
        ok: false,
        message: "Unauthorized",
        code: "UNAUTHORIZED"
      });
    }

    if (!register_name) {
      return res.status(400).json({
        ok: false,
        message: "register_name required",
        code: "BAD_REQUEST"
      });
    }

    const result = await pool.query(
      `INSERT INTO pos_register_activity
       (business_id, branch_id, backend_id, register_name, cashier_name, device_id, last_activity_type, last_seen_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,NOW()),NOW(),NOW())
       ON CONFLICT (business_id, branch_id, register_name)
       DO UPDATE SET
         backend_id = EXCLUDED.backend_id,
         cashier_name = EXCLUDED.cashier_name,
         device_id = EXCLUDED.device_id,
         last_activity_type = EXCLUDED.last_activity_type,
         last_seen_at = EXCLUDED.last_seen_at,
         updated_at = NOW()
       RETURNING id`,
      [
        backend.business_id,
        backend.branch_id,
        backend.id,
        register_name,
        cashier_name || null,
        device_id || null,
        last_activity_type || null,
        last_seen_at || null
      ]
    );

    return res.json({
      ok: true,
      id: result.rows[0]?.id || null
    });
  } catch (err) {
    console.error("REGISTER ACTIVITY ERROR:", err);
    return res.status(500).json({ ok: false, message: "SERVER_ERROR", code: "SERVER_ERROR" });
  }
}

module.exports = { upsertRegisterActivity };
