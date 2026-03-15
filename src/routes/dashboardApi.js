const express = require("express");
const { pool } = require("../db/pool");
const authUser = require("../middleware/authUser");

const router = express.Router();

function normalizePlan(raw) {
  const plan = String(raw || "").trim();
  const map = {
    Starter: "Starter",
    Standard: "Standard",
    Business: "Business",
    Enterprise: "Enterprise"
  };
  return map[plan] || "Starter";
}

function baseLimitForPlan(plan) {
  const normalized = normalizePlan(plan);
  const map = {
    Starter: 1,
    Standard: 3,
    Business: 5,
    Enterprise: 10
  };
  return map[normalized] || 1;
}

function calcAmountExpected({ requestType, plan, hardwareBundle, extraCount }) {
  const type = String(requestType || "").toLowerCase();
  const bundle = String(hardwareBundle || "No Printer");
  const planKey = normalizePlan(plan);
  const prices = {
    Starter: {
      "No Printer": 5500,
      "58mm Thermal Bluetooth Printer": 6500,
      "80mm Thermal Bluetooth Printer": 8000
    },
    Standard: {
      "No Printer": 6500,
      "58mm Thermal Bluetooth Printer": 7500,
      "80mm Thermal Bluetooth Printer": 9000
    },
    Business: {
      "No Printer": 7500,
      "58mm Thermal Bluetooth Printer": 8500,
      "80mm Thermal Bluetooth Printer": 10000
    },
    Enterprise: {
      "No Printer": 10000,
      "58mm Thermal Bluetooth Printer": 11000,
      "80mm Thermal Bluetooth Printer": 12500
    }
  };

  if (type === "device_addon") {
    return Math.max(0, Number(extraCount || 0)) * 500;
  }
  if (type === "new_license" || type === "upgrade") {
    return Number(prices[planKey]?.[bundle] || 0) || null;
  }
  return null;
}

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

async function getBackendLicensesColumns() {
  const res = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='backend_licenses'`
  );
  return new Set(res.rows.map((r) => r.column_name));
}

function selectCol(cols, name, alias) {
  if (cols.has(name)) return `bl.${name}${alias ? " AS " + alias : ""}`;
  return `NULL${alias ? " AS " + alias : ""}`;
}

function selectColExpr(cols, name) {
  return cols.has(name) ? `bl.${name}` : "NULL";
}

function buildLicenseJson(row) {
  let payload = null;
  try {
    payload = row?.payload_b64 ? JSON.parse(Buffer.from(row.payload_b64, "base64").toString("utf8")) : null;
  } catch (_) {
    payload = null;
  }
  return {
    license_id: row?.license_id || null,
    payload: payload || null,
    signature: {
      algorithm: "RSA-SHA256",
      key_id: process.env.LICENSE_KEY_ID || "jpmax-license-key-2026-01",
      value: row?.sig_b64 || null
    },
    payload_b64: row?.payload_b64 || null,
    sig_b64: row?.sig_b64 || null
  };
}

router.get("/summary", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;

    const activeBranches = await pool.query(
      `SELECT COUNT(DISTINCT branch_id) AS c
       FROM backend_devices
       WHERE is_active = TRUE
         AND last_seen_at >= NOW() - INTERVAL '2 minutes'
         AND ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId]
    );
    const activeBackends = await pool.query(
      `SELECT COUNT(DISTINCT COALESCE(machine_id::text, NULLIF(backend_name,''), id::text)) AS c
       FROM backend_devices
       WHERE is_active = TRUE
         AND last_seen_at >= NOW() - INTERVAL '2 minutes'
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
       `SELECT
         bd.id AS backend_id,
         COALESCE(bd.backend_name, bd.id::text) AS backend_name,
         bd.business_id,
         bd.branch_id,
         bd.machine_id,
         bd.installation_id AS device_id,
         b.name AS business_name,
         br.name AS branch_name,
         bd.last_seen_at AS last_heartbeat_at,
         bd.backend_version,
         CASE
           WHEN bd.last_seen_at >= NOW() - INTERVAL '2 minutes' THEN 'online'
           ELSE 'offline'
         END AS status
       FROM backend_devices bd
       LEFT JOIN businesses b ON b.id = bd.business_id
       LEFT JOIN branches br ON br.id = bd.branch_id
       WHERE bd.is_active = TRUE
         AND ($1::uuid IS NULL OR bd.business_id = $1)
         AND ($2::uuid IS NULL OR bd.branch_id = $2)
       ORDER BY bd.last_seen_at DESC NULLS LAST`
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
       WHERE is_active = TRUE
         AND ($1::uuid IS NULL OR business_id = $1)
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId]
    );

    const pendingCount = Number(pending.rows[0].c || 0);
    const failedCount = Number(failed.rows[0].c || 0);
    const lastHeartbeatAt = lastHeartbeat.rows[0].last_heartbeat_at || null;

    const backendStatus =
      !lastHeartbeatAt ? "OFFLINE"
      : (new Date(lastHeartbeatAt) >= new Date(Date.now() - 2 * 60 * 1000)) ? "ONLINE"
      : (new Date(lastHeartbeatAt) >= new Date(Date.now() - 10 * 60 * 1000)) ? "STALE"
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

router.get("/licenses/current", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const backendId = String(req.query.backend_id || "").trim();
    if (!backendId) {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "backend_id required" });
    }
    const backend = await pool.query(
      `SELECT id, business_id, branch_id
       FROM backend_devices
       WHERE id = $1`,
      [backendId]
    );
    if (!backend.rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Backend not found" });
    }
    const row = backend.rows[0];
    if (String(row.business_id || "") !== String(businessId || "")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Backend not in business scope" });
    }
    if (branchId && String(row.branch_id || "") !== String(branchId || "")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Backend not in branch scope" });
    }
    const license = await pool.query(
      `SELECT license_id, plan, device_limit, issued_at, expires_at, status
       FROM backend_licenses
       WHERE backend_id = $1
       LIMIT 1`,
      [backendId]
    );
    if (!license.rows.length) {
      return res.json({ ok: true, license: null });
    }
    return res.json({ ok: true, license: license.rows[0] });
  } catch (err) {
    console.error("DASHBOARD LICENSE CURRENT ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/licenses/available", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const backendId = String(req.query.backend_id || "").trim();
    if (!backendId) {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "backend_id required" });
    }

    const backend = await pool.query(
      `SELECT id, business_id, branch_id, machine_id
       FROM backend_devices
       WHERE id = $1`,
      [backendId]
    );
    if (!backend.rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Backend not found" });
    }
    const backendRow = backend.rows[0];
    if (String(backendRow.business_id || "") !== String(businessId || "")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Backend not in business scope" });
    }
    if (branchId && String(backendRow.branch_id || "") !== String(branchId || "")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Backend not in branch scope" });
    }

    const cols = await getBackendLicensesColumns();
    const rows = await pool.query(
      `
      SELECT
        bl.id,
        bl.license_id,
        bl.backend_id,
        bl.business_id,
        bl.branch_id,
        bl.machine_id,
        ${selectCol(cols, "plan_name", "plan_name")},
        bl.plan,
        ${selectCol(cols, "total_device_limit", "total_device_limit")},
        bl.device_limit,
        ${selectCol(cols, "license_status", "license_status")},
        bl.status,
        bl.issued_at,
        bl.expires_at,
        ${selectCol(cols, "approved_at", "approved_at")},
        ${selectCol(cols, "updated_at", "updated_at")},
        ${selectCol(cols, "request_id", "request_id")},
        b.name AS business_name,
        br.name AS branch_name,
        COALESCE(bd.backend_name, bd.id::text) AS backend_name,
        COALESCE(bl.machine_id, bd.machine_id) AS machine_id,
        bd.installation_id::text AS device_id
      FROM backend_licenses bl
      LEFT JOIN LATERAL (
        SELECT bd.*
        FROM backend_devices bd
        WHERE bd.id = bl.backend_id
           OR (bl.machine_id IS NOT NULL AND bd.machine_id = bl.machine_id)
        ORDER BY
          CASE WHEN bd.id = bl.backend_id THEN 0 ELSE 1 END,
          bd.last_seen_at DESC NULLS LAST,
          bd.created_at DESC
        LIMIT 1
      ) bd ON TRUE
      LEFT JOIN businesses b ON b.id = bl.business_id
      LEFT JOIN branches br ON br.id = bl.branch_id
      WHERE bl.backend_id = $1
         OR (bl.machine_id IS NOT NULL AND bl.machine_id = $2)
      ORDER BY COALESCE(${selectColExpr(cols, "approved_at")}, ${selectColExpr(cols, "updated_at")}, bl.issued_at) DESC NULLS LAST
      LIMIT 20
      `,
      [backendId, backendRow.machine_id || null]
    );

    const out = (rows.rows || []).map((r) => ({
      id: r.id,
      license_id: r.license_id,
      business_name: r.business_name || null,
      branch_name: r.branch_name || null,
      backend_name: r.backend_name || null,
      backend_id: r.backend_id || null,
      machine_id: r.machine_id || null,
      device_id: r.device_id || null,
      plan: r.plan_name || r.plan || null,
      device_limit: r.total_device_limit ?? r.device_limit ?? null,
      status: r.license_status || r.status || null,
      issued_at: r.issued_at || null,
      expires_at: r.expires_at || null,
      published_at: r.approved_at || r.updated_at || r.issued_at || null,
      request_id: r.request_id || null
    }));

    return res.json({ ok: true, rows: out });
  } catch (err) {
    console.error("DASHBOARD AVAILABLE LICENSES ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/licenses/available/:id/json", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const id = String(req.params.id || "").trim();
    if (!id) {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "license id required" });
    }

    const cols = await getBackendLicensesColumns();
    const row = await pool.query(
      `SELECT
         bl.id,
         bl.license_id,
         bl.backend_id,
         bl.business_id,
         bl.branch_id,
         ${selectCol(cols, "payload_b64", "payload_b64")},
         ${selectCol(cols, "sig_b64", "sig_b64")},
         bl.issued_at,
         bl.expires_at,
         ${selectCol(cols, "license_status", "license_status")},
         bl.status
       FROM backend_licenses bl
       WHERE bl.id = $1
       LIMIT 1`,
      [id]
    );
    if (!row.rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    const lic = row.rows[0];
    if (String(lic.business_id || "") !== String(businessId || "")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    if (branchId && String(lic.branch_id || "") !== String(branchId || "")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    const expectedBackend = String(req.query.backend_id || "").trim();
    if (expectedBackend && String(lic.backend_id || "") !== expectedBackend) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }

    const license = buildLicenseJson(lic);
    return res.json({ ok: true, license });
  } catch (err) {
    console.error("DASHBOARD LICENSE JSON ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/licenses/requests", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const rows = await pool.query(
      `SELECT
         request_id,
         request_type,
         requested_plan,
         requested_total_device_limit,
         extra_device_count,
         hardware_bundle,
         amount_expected,
         status,
         payment_status,
         created_at
       FROM license_requests
       WHERE business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)
       ORDER BY created_at DESC
       LIMIT 20`,
      [businessId, branchId]
    );
    return res.json({ ok: true, rows: rows.rows || [] });
  } catch (err) {
    console.error("DASHBOARD LICENSE REQUESTS ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.post("/licenses/request", authUser, async (req, res) => {
  try {
    const scope = getScopedFilters(req, res);
    if (!scope) return;
    const { businessId, branchId } = scope;
    const body = req.body || {};
    const backendId = String(body.backend_id || "").trim();
    if (!backendId) {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "backend_id required" });
    }
    const backend = await pool.query(
      `SELECT id, business_id, branch_id, machine_id
       FROM backend_devices
       WHERE id = $1`,
      [backendId]
    );
    if (!backend.rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Backend not found" });
    }
    const row = backend.rows[0];
    if (String(row.business_id || "") !== String(businessId || "")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Backend not in business scope" });
    }
    if (branchId && String(row.branch_id || "") !== String(branchId || "")) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Backend not in branch scope" });
    }

    const requestType = String(body.request_type || "new_license").trim();
    const requestedPlan = normalizePlan(body.requested_plan || body.plan || "Starter");
    const extraDeviceCount = Math.max(0, Number(body.extra_device_count || 0));
    const currentPlan = normalizePlan(body.current_plan || requestedPlan);
    const currentTotal = Number(body.current_total_device_limit || baseLimitForPlan(currentPlan));
    const baseLimit = baseLimitForPlan(requestedPlan);
    const requestedTotal =
      requestType === "device_addon"
        ? currentTotal + extraDeviceCount
        : baseLimit + extraDeviceCount;
    const hardwareBundle = String(body.hardware_bundle || "No Printer");
    const amountExpected = calcAmountExpected({
      requestType,
      plan: requestedPlan,
      hardwareBundle,
      extraCount: extraDeviceCount
    });

    const businessName = String(body.business_name || "").trim();
    const contactPerson = String(body.contact_person || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const notes = String(body.notes || "").trim();

    const requestId = String(body.request_id || "").trim() || `REQ-${Date.now()}`;

    const insert = await pool.query(
      `INSERT INTO license_requests (
         request_id,
         business_id,
         branch_id,
         backend_id,
         machine_id,
         business_name,
         contact_person,
         email,
         phone,
         request_type,
         requested_plan,
         extra_device_count,
         requested_total_device_limit,
         current_plan,
         current_total_device_limit,
         hardware_bundle,
         amount_expected,
         notes,
         requested_at,
         status,
         payment_status,
         created_at,
         updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
         NOW(),'PENDING','PENDING',NOW(),NOW()
       ) RETURNING request_id`,
      [
        requestId,
        businessId,
        row.branch_id,
        backendId,
        row.machine_id,
        businessName,
        contactPerson,
        email,
        phone,
        requestType,
        requestedPlan,
        extraDeviceCount,
        requestedTotal,
        currentPlan,
        currentTotal,
        hardwareBundle,
        amountExpected,
        notes
      ]
    );

    return res.json({ ok: true, request_id: insert.rows[0]?.request_id || requestId });
  } catch (err) {
    console.error("DASHBOARD LICENSE REQUEST ERROR:", err);
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
