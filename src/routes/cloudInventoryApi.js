const express = require("express");
const { pool } = require("../db/pool");
const authUser = require("../middleware/authUser");

const router = express.Router();

function requireBusinessId(req, res) {
  const businessId = req.query.business_id || null;
  if (!businessId) {
    res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "business_id required" });
    return null;
  }
  return businessId;
}

router.get("/summary", authUser, async (req, res) => {
  try {
    const role = req.user?.role || null;
    let businessId = req.query.business_id || null;
    let branchId = req.query.branch_id || null;
    if (role === "BUSINESS_OWNER" || role === "AUDITOR" || role === "BRANCH_MANAGER") {
      businessId = req.user?.business_id || null;
    }
    if (role === "BRANCH_MANAGER") {
      branchId = req.user?.branch_id || null;
    }
    businessId = requireBusinessId({ query: { business_id: businessId } }, res);
    if (!businessId) return;
    const businessRow = await pool.query("SELECT name FROM businesses WHERE id = $1", [businessId]);
    const branchRow = branchId
      ? await pool.query("SELECT name FROM branches WHERE id = $1", [branchId])
      : null;
    const result = await pool.query(
      `SELECT payload_json
       FROM inventory_snapshots
       WHERE business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)
       ORDER BY snapshot_time DESC
       LIMIT 1`,
      [businessId, branchId]
    );
    if (!result.rows.length || !result.rows[0].payload_json) {
      return res.json({ rows: [] });
    }
    let payload = {};
    try {
      payload = JSON.parse(result.rows[0].payload_json);
    } catch {
      payload = {};
    }
    const rows = Array.isArray(payload?.snapshot?.products)
      ? payload.snapshot.products.map((row) => ({
          product: row.product_name || row.product || null,
          stock: row.stock ?? 0,
          branch: branchRow && branchRow.rows[0] ? branchRow.rows[0].name : null,
          business: businessRow.rows[0] ? businessRow.rows[0].name : null
        }))
      : [];
    return res.json({ rows });
  } catch (err) {
    console.error("CLOUD INVENTORY SUMMARY ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
