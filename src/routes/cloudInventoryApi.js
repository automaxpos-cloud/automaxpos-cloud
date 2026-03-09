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
    const debug = String(req.query.debug || "").trim() === "1";
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
      return res.json({
        rows: [],
        total_items_qty: 0,
        total_weight_qty: 0,
        total_weight_unit: "kg",
        business_id: businessId,
        branch_id: branchId,
        source: "no_snapshot"
      });
    }
    let payload = {};
    try {
      payload = JSON.parse(result.rows[0].payload_json);
    } catch {
      payload = {};
    }
    const products = Array.isArray(payload?.snapshot?.products)
      ? payload.snapshot.products
      : [];
    let totalItems = 0;
    let totalKgs = 0;
    let itemProducts = 0;
    let weightProducts = 0;
    let unknownProducts = 0;
    let debugCount = 0;
    const rows = products.map((row) => {
      const type = String(row.product_type ?? row.type ?? "").trim().toUpperCase();
      const unit = String(row.unit_label || "").toLowerCase();
      const qty = Number(row.stock ?? 0);
      const isWeight = type === "WEIGHT" || unit === "kg" || unit === "kgs";
      const isUnknown = !type && !unit;
      if (isUnknown) unknownProducts += 1;
      if (isWeight) {
        weightProducts += 1;
        totalKgs += qty;
      } else {
        itemProducts += 1;
        totalItems += qty;
      }
      if (debug && debugCount < 50) {
        console.log("[INV SUMMARY ROW]", {
          product: row.product_name || row.product || null,
          product_type: row.product_type || row.type || null,
          unit_label: row.unit_label || null,
          stock: qty,
          bucket: isWeight ? "KGS" : "ITEMS"
        });
        debugCount += 1;
      }
      return {
        product: row.product_name || row.product || null,
        product_type: row.product_type || row.type || null,
        unit_label: row.unit_label || null,
        stock: qty,
        branch: branchRow && branchRow.rows[0] ? branchRow.rows[0].name : null,
        business: businessRow.rows[0] ? businessRow.rows[0].name : null
      };
    });
    const response = {
      rows,
      total_items_qty: Number(totalItems.toFixed(2)),
      total_weight_qty: Number(totalKgs.toFixed(2)),
      total_weight_unit: "kg",
      business_id: businessId,
      branch_id: branchId,
      source: "snapshot_products"
    };
    if (debug) {
      response.debug = {
        included_products: rows.length,
        item_products: itemProducts,
        weight_products: weightProducts,
        unknown_products: unknownProducts,
        business_id: businessId,
        branch_id: branchId,
        timestamp: new Date().toISOString()
      };
    }
    return res.json(response);
  } catch (err) {
    console.error("CLOUD INVENTORY SUMMARY ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
