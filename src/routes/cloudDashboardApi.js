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
        ? `SELECT COALESCE(SUM(total),0) AS gross_sales, COUNT(*) AS transactions
           FROM synced_sales
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`
        : `SELECT COALESCE(SUM(total),0) AS gross_sales, COUNT(*) AS transactions
           FROM synced_sales
           WHERE COALESCE(local_created_at, synced_at)::date = CURRENT_DATE
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    const returns = await pool.query(
      range
        ? `SELECT COALESCE(SUM(total),0) AS returns_total, COUNT(*) AS returns_count
           FROM synced_returns
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`
        : `SELECT COALESCE(SUM(total),0) AS returns_total, COUNT(*) AS returns_count
           FROM synced_returns
           WHERE COALESCE(local_created_at, synced_at)::date = CURRENT_DATE
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    const gross = Number(sales.rows[0].gross_sales || 0);
    const returnsTotal = Number(returns.rows[0].returns_total || 0);
    const net = gross - returnsTotal;
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
        ? `SELECT COALESCE(SUM(total),0) AS gross_sales
           FROM synced_sales
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`
        : `SELECT COALESCE(SUM(total),0) AS gross_sales
           FROM synced_sales
           WHERE date_trunc('month', COALESCE(local_created_at, synced_at)) = date_trunc('month', CURRENT_DATE)
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    const returns = await pool.query(
      range
        ? `SELECT COALESCE(SUM(total),0) AS returns_total
           FROM synced_returns
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`
        : `SELECT COALESCE(SUM(total),0) AS returns_total
           FROM synced_returns
           WHERE date_trunc('month', COALESCE(local_created_at, synced_at)) = date_trunc('month', CURRENT_DATE)
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    const gross = Number(sales.rows[0].gross_sales || 0);
    const returnsTotal = Number(returns.rows[0].returns_total || 0);
    const net = gross - returnsTotal;
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
                COALESCE(SUM(s.total),0) AS sales, COUNT(*) AS transactions
           FROM synced_sales s
           LEFT JOIN branches br ON br.id = s.branch_id
           LEFT JOIN businesses b ON b.id = s.business_id
           WHERE s.business_id = $1
             AND ($2::uuid IS NULL OR s.branch_id = $2)
             AND COALESCE(s.local_created_at, s.synced_at)::date BETWEEN $3::date AND $4::date
           GROUP BY br.name, b.name
           ORDER BY sales DESC`
        : `SELECT br.name AS branch, b.name AS business_name,
                COALESCE(SUM(s.total),0) AS sales, COUNT(*) AS transactions
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
                COALESCE(SUM(total),0) AS total
           FROM synced_sales
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)
           GROUP BY cashier_name
           ORDER BY transactions DESC`
        : `SELECT COALESCE(cashier_name,'Unknown') AS cashier_name,
                COUNT(*) AS transactions,
                COALESCE(SUM(total),0) AS total
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
        ? `SELECT COALESCE(SUM(total),0) AS total_returns, COUNT(*) AS transactions
           FROM synced_returns
           WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
             AND business_id = $1
             AND ($2::uuid IS NULL OR branch_id = $2)`
        : `SELECT COALESCE(SUM(total),0) AS total_returns, COUNT(*) AS transactions
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
      return res.json({ rows: [], item_count: 0, total_stock: 0 });
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
    const rows = products.map((row) => ({
      product_id: row.product_id || null,
      product_name: row.product_name || row.product || null,
      product_type: row.product_type || row.type || null,
      stock: Number(row.stock || 0),
      reorder_level: Number(row.reorder_level || 0),
      category: row.category || null
    }));
    const item_count = rows.length;
    const total_stock = rows.reduce((sum, r) => sum + Number(r.stock || 0), 0);
    return res.json({ rows, item_count, total_stock });
  } catch (err) {
    console.error("CLOUD DASHBOARD INVENTORY SUMMARY ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
