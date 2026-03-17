const express = require("express");
const { pool } = require("../db/pool");
const authUser = require("../middleware/authUser");

const router = express.Router();
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function requireBusinessId(req, res) {
  const businessId = req.query.business_id || null;
  if (!businessId) {
    res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "business_id required" });
    return null;
  }
  return businessId;
}

function parseRange(req) {
  const start = String(req.query.start_date || "").trim();
  const end = String(req.query.end_date || "").trim();
  const ok = /^\d{4}-\d{2}-\d{2}$/;
  if (ok.test(start) && ok.test(end)) {
    return { start, end };
  }
  return null;
}

router.get("/today-sales", authUser, async (req, res) => {
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
    const range = parseRange(req);
    const sales = await pool.query(
      range
        ? `SELECT COALESCE(ROUND(SUM(total)::numeric,2),0) AS gross_sales, COUNT(*) AS transactions
           FROM synced_sales
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`
        : `SELECT COALESCE(ROUND(SUM(total)::numeric,2),0) AS gross_sales, COUNT(*) AS transactions
           FROM synced_sales
           WHERE COALESCE(local_created_at, synced_at)::date = CURRENT_DATE
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    const returns = await pool.query(
      range
        ? `SELECT COALESCE(ROUND(SUM(total)::numeric,2),0) AS returns_total, COUNT(*) AS returns_count
           FROM synced_returns
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`
        : `SELECT COALESCE(ROUND(SUM(total)::numeric,2),0) AS returns_total, COUNT(*) AS returns_count
           FROM synced_returns
           WHERE COALESCE(local_created_at, synced_at)::date = CURRENT_DATE
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    const gross = round2(sales.rows[0].gross_sales || 0);
    const returnsTotal = round2(returns.rows[0].returns_total || 0);
    const net = round2(gross - returnsTotal);
    return res.json({
      gross_sales_today: gross,
      returns_today: returnsTotal,
      net_sales_today: net,
      transactions_count: Number(sales.rows[0].transactions || 0),
      returns_count: Number(returns.rows[0].returns_count || 0)
    });
  } catch (err) {
    console.error("CLOUD DASHBOARD TODAY SALES ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/month-sales", authUser, async (req, res) => {
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
    const range = parseRange(req);
    const sales = await pool.query(
      range
        ? `SELECT COALESCE(ROUND(SUM(total)::numeric,2),0) AS gross_sales
           FROM synced_sales
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`
        : `SELECT COALESCE(ROUND(SUM(total)::numeric,2),0) AS gross_sales
           FROM synced_sales
           WHERE date_trunc('month', COALESCE(local_created_at, synced_at)) = date_trunc('month', CURRENT_DATE)
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    const returns = await pool.query(
      range
        ? `SELECT COALESCE(ROUND(SUM(total)::numeric,2),0) AS returns_total
           FROM synced_returns
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`
        : `SELECT COALESCE(ROUND(SUM(total)::numeric,2),0) AS returns_total
           FROM synced_returns
           WHERE date_trunc('month', COALESCE(local_created_at, synced_at)) = date_trunc('month', CURRENT_DATE)
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    const gross = round2(sales.rows[0].gross_sales || 0);
    const returnsTotal = round2(returns.rows[0].returns_total || 0);
    const net = round2(gross - returnsTotal);
    return res.json({
      gross_sales_month: gross,
      returns_month: returnsTotal,
      net_sales_month: net
    });
  } catch (err) {
    console.error("CLOUD DASHBOARD MONTH SALES ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/branch-sales", authUser, async (req, res) => {
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
    const range = parseRange(req);
    const result = await pool.query(
      range
        ? `SELECT br.name AS branch, b.name AS business_name,
                COALESCE(ROUND(SUM(s.total)::numeric,2),0) AS sales, COUNT(*) AS transactions
           FROM synced_sales s
           LEFT JOIN branches br ON br.id = s.branch_id
           LEFT JOIN businesses b ON b.id = s.business_id
           WHERE s.business_id = $1
             AND ($2::uuid IS NULL OR s.branch_id = $2)
             AND COALESCE(s.local_created_at, s.synced_at)::date BETWEEN $3::date AND $4::date
           GROUP BY br.name, b.name
           ORDER BY sales DESC`
        : `SELECT br.name AS branch, b.name AS business_name,
                COALESCE(ROUND(SUM(s.total)::numeric,2),0) AS sales, COUNT(*) AS transactions
           FROM synced_sales s
           LEFT JOIN branches br ON br.id = s.branch_id
           LEFT JOIN businesses b ON b.id = s.business_id
           WHERE s.business_id = $1
             AND ($2::uuid IS NULL OR s.branch_id = $2)
           GROUP BY br.name, b.name
           ORDER BY sales DESC`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    return res.json({ rows: result.rows || [] });
  } catch (err) {
    console.error("CLOUD DASHBOARD BRANCH SALES ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/active-cashiers", authUser, async (req, res) => {
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
    const range = parseRange(req);
    const result = await pool.query(
      range
        ? `SELECT COALESCE(cashier_name,'Unknown') AS cashier_name,
                COUNT(*) AS transactions,
                COALESCE(ROUND(SUM(total)::numeric,2),0) AS total
           FROM synced_sales
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)
           GROUP BY cashier_name
           ORDER BY transactions DESC`
        : `SELECT COALESCE(cashier_name,'Unknown') AS cashier_name,
                COUNT(*) AS transactions,
                COALESCE(ROUND(SUM(total)::numeric,2),0) AS total
           FROM synced_sales
           WHERE COALESCE(local_created_at, synced_at) > NOW() - INTERVAL '10 minutes'
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)
           GROUP BY cashier_name
           ORDER BY transactions DESC`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    return res.json({ rows: result.rows || [] });
  } catch (err) {
    console.error("CLOUD DASHBOARD ACTIVE CASHIERS ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/active-registers", authUser, async (req, res) => {
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
    const result = await pool.query(
      `SELECT
         r.register_name,
         r.cashier_name,
         r.last_seen_at,
         r.last_sale_at,
         b.name AS business_name,
         br.name AS branch_name,
         CASE
           WHEN r.last_seen_at >= NOW() - INTERVAL '2 minutes' THEN 'ONLINE'
           WHEN r.last_seen_at >= NOW() - INTERVAL '15 minutes' THEN 'IDLE'
           ELSE 'OFFLINE'
         END AS status
       FROM pos_register_activity r
       LEFT JOIN businesses b ON b.id = r.business_id
       LEFT JOIN branches br ON br.id = r.branch_id
       WHERE r.business_id = $1
         AND ($2::uuid IS NULL OR r.branch_id = $2)
       ORDER BY r.last_seen_at DESC`,
      [businessId, branchId]
    );
    return res.json({ rows: result.rows || [] });
  } catch (err) {
    console.error("CLOUD DASHBOARD ACTIVE REGISTERS ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/status", authUser, async (req, res) => {
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

    const result = await pool.query(
      `SELECT GREATEST(
         (SELECT MAX(COALESCE(local_created_at, synced_at)) FROM synced_sales
          WHERE business_id = $1 AND ($2::uuid IS NULL OR branch_id = $2)),
         (SELECT MAX(COALESCE(local_created_at, synced_at)) FROM synced_returns
          WHERE business_id = $1 AND ($2::uuid IS NULL OR branch_id = $2)),
         (SELECT MAX(snapshot_time) FROM inventory_snapshots
          WHERE business_id = $1 AND ($2::uuid IS NULL OR branch_id = $2)),
         (SELECT MAX(last_seen_at) FROM backend_devices
          WHERE business_id = $1 AND ($2::uuid IS NULL OR branch_id = $2)),
         (SELECT MAX(last_seen_at) FROM pos_register_activity
          WHERE business_id = $1 AND ($2::uuid IS NULL OR branch_id = $2))
       ) AS last_activity_at`,
      [businessId, branchId]
    );

    const lastActivityAt = result.rows[0]?.last_activity_at || null;
    const revision = lastActivityAt ? new Date(lastActivityAt).toISOString() : null;

    console.log("[CLOUD STATUS UPDATE]", {
      businessId,
      branchId,
      revision,
      lastActivityAt,
      eventType: "STATUS_POLL"
    });

    return res.json({
      business_id: businessId,
      branch_id: branchId,
      last_activity_at: lastActivityAt,
      last_sync_at: lastActivityAt,
      last_sale_at: null,
      revision
    });
  } catch (err) {
    console.error("CLOUD DASHBOARD STATUS ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/returns-summary", authUser, async (req, res) => {
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
    const range = parseRange(req);
    const result = await pool.query(
      range
        ? `SELECT COALESCE(ROUND(SUM(total)::numeric,2),0) AS total_returns, COUNT(*) AS transactions
           FROM synced_returns
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`
        : `SELECT COALESCE(ROUND(SUM(total)::numeric,2),0) AS total_returns, COUNT(*) AS transactions
           FROM synced_returns
           WHERE COALESCE(local_created_at, synced_at)::date = CURRENT_DATE
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    return res.json({
      total_returns: Number(result.rows[0].total_returns || 0),
      transactions: Number(result.rows[0].transactions || 0)
    });
  } catch (err) {
    console.error("CLOUD DASHBOARD RETURNS SUMMARY ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/returns-recent", authUser, async (req, res) => {
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
    const range = parseRange(req);
    const result = await pool.query(
      range
        ? `SELECT r.return_no,
                COALESCE(
                  NULLIF(r.raw_payload_json::jsonb->>'sale_receipt_no',''),
                  NULLIF(r.raw_payload_json::jsonb->>'receipt_no',''),
                  NULLIF(r.raw_payload_json::jsonb->>'sale_receipt','')
                ) AS sale_receipt_no,
                b.name AS business_name,
                br.name AS branch_name,
                r.total,
                r.refund_method,
                r.cashier_name,
                COALESCE(r.local_created_at, r.synced_at) AS created_at
           FROM synced_returns r
           LEFT JOIN businesses b ON b.id = r.business_id
           LEFT JOIN branches br ON br.id = r.branch_id
           WHERE r.business_id = $1
             AND ($2::uuid IS NULL OR r.branch_id = $2)
             AND COALESCE(r.local_created_at, r.synced_at)::date BETWEEN $3::date AND $4::date
           ORDER BY COALESCE(r.local_created_at, r.synced_at) DESC
           LIMIT 20`
        : `SELECT r.return_no,
                COALESCE(
                  NULLIF(r.raw_payload_json::jsonb->>'sale_receipt_no',''),
                  NULLIF(r.raw_payload_json::jsonb->>'receipt_no',''),
                  NULLIF(r.raw_payload_json::jsonb->>'sale_receipt','')
                ) AS sale_receipt_no,
                b.name AS business_name,
                br.name AS branch_name,
                r.total,
                r.refund_method,
                r.cashier_name,
                COALESCE(r.local_created_at, r.synced_at) AS created_at
           FROM synced_returns r
           LEFT JOIN businesses b ON b.id = r.business_id
           LEFT JOIN branches br ON br.id = r.branch_id
           WHERE r.business_id = $1
             AND ($2::uuid IS NULL OR r.branch_id = $2)
           ORDER BY COALESCE(r.local_created_at, r.synced_at) DESC
           LIMIT 20`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    return res.json({ rows: result.rows || [] });
  } catch (err) {
    console.error("CLOUD DASHBOARD RETURNS RECENT ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/low-stock", authUser, async (req, res) => {
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
    const products = Array.isArray(payload?.snapshot?.products)
      ? payload.snapshot.products
      : [];
    const rows = products
      .map((row) => ({
        product_id: row.product_id || null,
        product_name: row.product_name || row.product || null,
        stock: Number(row.stock || 0),
        reorder_level: Number(row.reorder_level || 0),
        category: row.category || null
      }))
      .filter((row) => Number(row.stock) <= Number(row.reorder_level || 0))
      .sort((a, b) => Number(a.stock) - Number(b.stock));
    return res.json({ rows });
  } catch (err) {
    console.error("CLOUD DASHBOARD LOW STOCK ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/inventory/summary", authUser, async (req, res) => {
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
        item_count: 0,
        total_stock: 0,
        total_items_qty: 0,
        total_kgs_qty: 0,
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
    const snap = payload?.snapshot || {};
    const products = Array.isArray(payload?.snapshot?.products)
      ? payload.snapshot.products
      : [];
    const rows = products.map((row) => ({
      product_id: row.product_id || null,
      product_name: row.product_name || row.product || null,
      product_type: row.product_type || row.type || null,
      unit_label: row.unit_label || null,
      stock: Number(row.stock || 0),
      reorder_level: Number(row.reorder_level || 0),
      category: row.category || null
    }));
    const item_count = Number(snap.total_products || rows.length || 0);
    const total_stock = round2(
      Number(snap.total_stock_qty ?? rows.reduce((sum, r) => sum + Number(r.stock || 0), 0))
    );
    const snapItems = snap.total_items_qty != null ? Number(snap.total_items_qty) : null;
    const snapKgs = snap.total_kgs_qty != null ? Number(snap.total_kgs_qty) : null;
    let total_items_qty = Number.isFinite(snapItems) ? snapItems : 0;
    let total_kgs_qty = Number.isFinite(snapKgs) ? snapKgs : 0;
    let source = Number.isFinite(snapItems) || Number.isFinite(snapKgs) ? "snapshot_totals" : "snapshot_products";

    let itemProducts = 0;
    let weightProducts = 0;
    let unknownProducts = 0;
    let calcItems = 0;
    let calcKgs = 0;
    let debugCount = 0;
    for (const r of rows) {
      const type = String(r.product_type || "").toUpperCase();
      const unit = String(r.unit_label || "").toLowerCase();
      const isWeight = type === "WEIGHT" || unit === "kg" || unit === "kgs";
      const isUnknown = !type && !unit;
      if (isUnknown) unknownProducts += 1;
      if (isWeight) {
        weightProducts += 1;
        calcKgs += Number(r.stock || 0);
      } else {
        itemProducts += 1;
        calcItems += Number(r.stock || 0);
      }
      if (debug && debugCount < 50) {
        console.log("[INV SUMMARY]", {
          product_id: r.product_id,
          product_name: r.product_name,
          product_type: r.product_type,
          unit_label: r.unit_label,
          stock: r.stock,
          bucket: isWeight ? "KGS" : "ITEMS",
          unknown_type: isUnknown
        });
        debugCount += 1;
      }
    }

    const snapPresent = Number.isFinite(snapItems) || Number.isFinite(snapKgs);
    const snapSeemsCombined = snapPresent && weightProducts > 0 && Number(snapKgs || 0) === 0;
    const diffItems = Math.abs((snapItems || 0) - calcItems);
    const diffKgs = Math.abs((snapKgs || 0) - calcKgs);
    const snapMismatch = snapPresent && (diffItems > 0.01 || diffKgs > 0.01);

    if (!snapPresent || snapSeemsCombined || snapMismatch) {
      total_items_qty = calcItems;
      total_kgs_qty = calcKgs;
      source = "snapshot_products";
    }

    if (debug) {
      console.log("[INV SUMMARY TOTALS]", {
        total_items_qty,
        total_kgs_qty,
        item_products: itemProducts,
        weight_products: weightProducts,
        unknown_products: unknownProducts,
        snap_items: snapItems,
        snap_kgs: snapKgs,
        snap_present: snapPresent,
        snap_mismatch: snapMismatch,
        snap_seems_combined: snapSeemsCombined
      });
    } else if (unknownProducts > 0) {
      console.warn("[INV SUMMARY] unknown product_type/unit_label count:", unknownProducts);
    }
    const response = {
      rows,
      item_count,
      total_stock,
      total_items_qty: round2(total_items_qty),
      total_kgs_qty: round2(total_kgs_qty),
      total_weight_qty: round2(total_kgs_qty),
      total_weight_unit: "kg",
      business_id: businessId,
      branch_id: branchId,
      source
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
    console.error("CLOUD DASHBOARD INVENTORY SUMMARY ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
