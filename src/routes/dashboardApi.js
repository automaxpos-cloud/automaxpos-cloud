const express = require("express");
const { pool } = require("../db/pool");
const authUser = require("../middleware/authUser");

const router = express.Router();

function getScopedFilters(req, res) {
  const role = req.user?.role || null;
  let businessId = req.query.business_id || null;
  let branchId = req.query.branch_id || null;

  if (role === "BUSINESS_OWNER" || role === "AUDITOR" || role === "BRANCH_MANAGER") {
    businessId = req.user?.business_id || null;
  }
  if (role === "BRANCH_MANAGER") {
    branchId = req.user?.branch_id || null;
  }

  if (!businessId) {
    res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "business_id required" });
    return null;
  }
  return { businessId, branchId };
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

router.get("/summary", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;

    const activeBranches = await pool.query(
      `SELECT COUNT(DISTINCT branch_id) AS c
       FROM backend_devices
       WHERE last_seen_at >= NOW() - INTERVAL '10 minutes'
         AND ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId]
    );
    const activeBackends = await pool.query(
      `SELECT COUNT(DISTINCT COALESCE(machine_id::text, id::text)) AS c
       FROM backend_devices
       WHERE last_seen_at >= NOW() - INTERVAL '10 minutes'
         AND ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId]
    );

    const businessRow = businessId
      ? await pool.query("SELECT name FROM businesses WHERE id = $1", [businessId])
      : null;
    const branchRow = branchId
      ? await pool.query("SELECT name FROM branches WHERE id = $1", [branchId])
      : null;

    return res.json({
      active_branches: Number(activeBranches.rows[0].c || 0),
      active_backends: Number(activeBackends.rows[0].c || 0),
      business_name: businessRow && businessRow.rows[0] ? businessRow.rows[0].name : null,
      branch_name: branchRow && branchRow.rows[0] ? branchRow.rows[0].name : null
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("DASHBOARD SUMMARY ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/sales/recent", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const range = parseRange(req);
    const result = await pool.query(
      range
        ? `SELECT s.receipt_no,
                b.name AS business_name,
                br.name AS branch_name,
                s.total,
                s.cashier_name,
                COALESCE(s.local_created_at, s.synced_at) AS created_at
           FROM synced_sales s
           LEFT JOIN businesses b ON b.id = s.business_id
           LEFT JOIN branches br ON br.id = s.branch_id
           WHERE ($1::uuid IS NULL OR s.business_id = $1)
             AND ($2::uuid IS NULL OR s.branch_id = $2)
             AND COALESCE(s.local_created_at, s.synced_at)::date BETWEEN $3::date AND $4::date
           ORDER BY COALESCE(s.local_created_at, s.synced_at) DESC
           LIMIT 20`
        : `SELECT s.receipt_no,
                b.name AS business_name,
                br.name AS branch_name,
                s.total,
                s.cashier_name,
                COALESCE(s.local_created_at, s.synced_at) AS created_at
           FROM synced_sales s
           LEFT JOIN businesses b ON b.id = s.business_id
           LEFT JOIN branches br ON br.id = s.branch_id
           WHERE ($1::uuid IS NULL OR s.business_id = $1)
             AND ($2::uuid IS NULL OR s.branch_id = $2)
           ORDER BY COALESCE(s.local_created_at, s.synced_at) DESC
           LIMIT 20`
      ,
      range ? [businessId, branchId, range.start, range.end] : [businessId, branchId]
    );
    return res.json({ rows: result.rows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("DASHBOARD SALES ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/backends", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const result = await pool.query(
      `WITH ranked AS (
         SELECT
           bd.*,
           ROW_NUMBER() OVER (
             PARTITION BY COALESCE(bd.machine_id::text, bd.id::text)
             ORDER BY bd.last_seen_at DESC NULLS LAST, bd.created_at DESC NULLS LAST, bd.id DESC
           ) AS rn
         FROM backend_devices bd
         WHERE ($1::uuid IS NULL OR bd.business_id = $1)
           AND ($2::uuid IS NULL OR bd.branch_id = $2)
       )
       SELECT
         r.id AS backend_id,
         COALESCE(r.backend_name, r.id::text) AS backend_name,
         b.name AS business_name,
         br.name AS branch_name,
         r.last_seen_at AS last_heartbeat_at,
         r.backend_version,
         CASE
           WHEN r.last_seen_at >= NOW() - INTERVAL '10 minutes' THEN 'online'
           ELSE 'offline'
         END AS status
       FROM ranked r
       LEFT JOIN businesses b ON b.id = r.business_id
       LEFT JOIN branches br ON br.id = r.branch_id
       WHERE r.rn = 1
       ORDER BY r.last_seen_at DESC NULLS LAST`
      ,
      [businessId, branchId]
    );
    return res.json({ rows: result.rows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("DASHBOARD BACKENDS ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/sync-health", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const pending = await pool.query(
      `SELECT COALESCE(SUM(pending_sync_count),0) AS c
       FROM backend_devices
       WHERE ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId]
    );

    let failed = { rows: [{ c: 0 }] };
    try {
      const exists = await pool.query(
        `SELECT to_regclass('public.sync_log') AS t`
      );
      if (exists.rows[0].t) {
        failed = await pool.query(
          `SELECT COUNT(*) AS c FROM sync_log
           WHERE status='FAILED'
             AND ($1::uuid IS NULL OR backend_id IN (
               SELECT id FROM backend_devices WHERE ($1::uuid IS NULL OR business_id = $1)
                 AND ($2::uuid IS NULL OR branch_id = $2)
             ))`,
          [businessId, branchId]
        );
      }
    } catch (_) {}

    const lastSale = await pool.query(
      `SELECT MAX(COALESCE(local_created_at, synced_at)) AS last_synced_sale_at
       FROM synced_sales
       WHERE ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId]
    );

    const lastReturn = await pool.query(
      `SELECT MAX(COALESCE(local_created_at, synced_at)) AS last_synced_return_at
       FROM synced_returns
       WHERE ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId]
    );

    const lastSnapshot = await pool.query(
      `SELECT MAX(snapshot_time) AS last_inventory_snapshot_at
       FROM inventory_snapshots
       WHERE ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId]
    );

    const lastHeartbeat = await pool.query(
      `SELECT MAX(last_seen_at) AS last_heartbeat_at
       FROM backend_devices
       WHERE ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId]
    );

    const pendingCount = Number(pending.rows[0].c || 0);
    const failedCount = Number(failed.rows[0].c || 0);
    const lastHeartbeatAt = lastHeartbeat.rows[0].last_heartbeat_at || null;

    const backendStatus =
      !lastHeartbeatAt ? "OFFLINE"
      : (new Date(lastHeartbeatAt) >= new Date(Date.now() - 5 * 60 * 1000)) ? "ONLINE"
      : (new Date(lastHeartbeatAt) >= new Date(Date.now() - 15 * 60 * 1000)) ? "STALE"
      : "OFFLINE";

    let cloudStatus = "DISCONNECTED";
    if (lastHeartbeatAt && backendStatus !== "OFFLINE") {
      cloudStatus = (failedCount > 0 || pendingCount > 0) ? "DEGRADED" : "CONNECTED";
    }

    return res.json({
      backend_status: backendStatus,
      cloud_status: cloudStatus,
      last_heartbeat_at: lastHeartbeatAt,
      last_synced_sale_at: lastSale.rows[0].last_synced_sale_at || null,
      last_synced_return_at: lastReturn.rows[0].last_synced_return_at || null,
      last_inventory_snapshot_at: lastSnapshot.rows[0].last_inventory_snapshot_at || null,
      pending_sync_count: pendingCount,
      failed_sync_count: failedCount
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("DASHBOARD SYNC HEALTH ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// Admin helper lists (for filters)
router.get("/businesses", authUser, async (req, res) => {
  try {
    const role = req.user?.role || null;
    if (role === "SUPERADMIN" || role === "SUPER_ADMIN") {
      const result = await pool.query(`SELECT id, name FROM businesses ORDER BY name ASC`);
      return res.json({ rows: result.rows || [] });
    }
    if (role === "BUSINESS_OWNER" || role === "AUDITOR" || role === "BRANCH_MANAGER") {
      const businessId = req.user?.business_id || null;
      if (!businessId) return res.json({ rows: [] });
      const result = await pool.query(`SELECT id, name FROM businesses WHERE id=$1`, [businessId]);
      return res.json({ rows: result.rows || [] });
    }
    return res.status(403).json({ ok: false, message: "Forbidden", code: "FORBIDDEN" });
  } catch (err) {
    console.error("DASHBOARD BUSINESS LIST ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/branches", authUser, async (req, res) => {
  try {
    const role = req.user?.role || null;
    let businessId = req.query.business_id || null;
    if (role === "BUSINESS_OWNER" || role === "AUDITOR" || role === "BRANCH_MANAGER") {
      businessId = req.user?.business_id || null;
    }
    if (role === "BRANCH_MANAGER") {
      const branchId = req.user?.branch_id || null;
      const result = await pool.query(
        `SELECT id, name, business_id FROM branches
         WHERE id = $1
         ORDER BY name ASC`,
        [branchId]
      );
      return res.json({ rows: result.rows || [] });
    }
    const result = await pool.query(
      `SELECT id, name, business_id FROM branches
       WHERE ($1::uuid IS NULL OR business_id = $1)
       ORDER BY name ASC`,
      [businessId]
    );
    return res.json({ rows: result.rows || [] });
  } catch (err) {
    console.error("DASHBOARD BRANCH LIST ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

// Remote owner endpoints
router.get("/today-sales", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const result = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS count
       FROM synced_sales
       WHERE COALESCE(local_created_at, synced_at)::date = CURRENT_DATE
         AND ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId]
    );
    return res.json({
      total: Number(result.rows[0].total || 0),
      count: Number(result.rows[0].count || 0)
    });
  } catch (err) {
    console.error("DASHBOARD TODAY SALES ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/branch-comparison", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId } = scope;
    const period = String(req.query.period || "today").toLowerCase();
    const dateFilter =
      period === "month"
        ? "date_trunc('month', COALESCE(s.local_created_at, s.synced_at)) = date_trunc('month', NOW())"
        : "COALESCE(s.local_created_at, s.synced_at)::date = CURRENT_DATE";

    const result = await pool.query(
      `SELECT br.name AS branch_name, b.name AS business_name,
              COALESCE(SUM(s.total),0) AS total, COUNT(*) AS count
       FROM synced_sales s
       LEFT JOIN branches br ON br.id = s.branch_id
       LEFT JOIN businesses b ON b.id = s.business_id
       WHERE ${dateFilter}
         AND ($1::uuid IS NULL OR s.business_id = $1)
       GROUP BY br.name, b.name
       ORDER BY total DESC`,
      [businessId]
    );
    return res.json({ rows: result.rows || [] });
  } catch (err) {
    console.error("DASHBOARD BRANCH COMPARISON ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/active-cashiers", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const result = await pool.query(
      `SELECT COALESCE(cashier_name,'Unknown') AS cashier_name,
              COUNT(*) AS count,
              COALESCE(SUM(total),0) AS total
       FROM synced_sales
       WHERE COALESCE(local_created_at, synced_at)::date = CURRENT_DATE
         AND ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)
       GROUP BY cashier_name
       ORDER BY total DESC`,
      [businessId, branchId]
    );
    return res.json({ rows: result.rows || [] });
  } catch (err) {
    console.error("DASHBOARD ACTIVE CASHIERS ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/low-stock", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const result = await pool.query(
      `SELECT payload_json
       FROM inventory_snapshots
       WHERE ($1::uuid IS NULL OR business_id = $1)
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
    console.error("DASHBOARD LOW STOCK ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/inventory-summary", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const result = await pool.query(
      `SELECT total_products, total_stock_value, payload_json, snapshot_time
       FROM inventory_snapshots
       WHERE ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)
       ORDER BY snapshot_time DESC
       LIMIT 1`,
      [businessId, branchId]
    );
    if (!result.rows.length) {
      return res.json({
        total_products: 0,
        total_stock_qty: 0,
        total_stock_value: 0,
        snapshot_time: null
      });
    }
    let payload = {};
    try {
      payload = JSON.parse(result.rows[0].payload_json || "{}");
    } catch {
      payload = {};
    }
    return res.json({
      total_products: Number(result.rows[0].total_products || 0),
      total_stock_qty: Number(payload?.snapshot?.total_stock_qty || 0),
      total_stock_value: Number(result.rows[0].total_stock_value || 0),
      snapshot_time: result.rows[0].snapshot_time || null
    });
  } catch (err) {
    console.error("DASHBOARD INVENTORY SUMMARY ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
