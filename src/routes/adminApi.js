const express = require("express");
const { pool } = require("../db/pool");
const adminJwt = require("../middleware/adminJwt");
const licenseService = require("../services/licenseService");

const router = express.Router();

function normalizePaymentStatus(value) {
  const raw = String(value || "").trim().toUpperCase();
  const allowed = new Set(["PENDING", "PAID", "PARTIAL", "WAIVED", "REFUNDED"]);
  return allowed.has(raw) ? raw : "PENDING";
}

function normalizePaymentMethod(value) {
  const raw = String(value || "").trim();
  const allowed = new Set(["Mobile Money", "Bank Transfer", "Cash", "Card"]);
  return allowed.has(raw) ? raw : null;
}

async function logAudit({ admin, action, backendId, businessId, licenseId, oldValue, newValue }) {
  try {
    await pool.query(
      `
      INSERT INTO license_audit_logs (
        admin_user,
        action,
        backend_id,
        business_id,
        license_id,
        old_value_json,
        new_value_json,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
      `,
      [
        admin?.username || "admin",
        action,
        backendId || null,
        businessId || null,
        licenseId || null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null
      ]
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("LICENSE AUDIT LOG FAILED:", err?.message || err);
  }
}

function requireRole(allowed) {
  const allowedSet = new Set((allowed || []).map((r) => String(r).toUpperCase()));
  return (req, res, next) => {
    const role = String(req.admin?.role || "").toUpperCase();
    if (!allowedSet.has(role)) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN" });
    }
    return next();
  };
}

router.get("/summary", adminJwt, async (_req, res) => {
  try {
    const pendingReq = await pool.query(
      `SELECT COUNT(*) AS c FROM license_requests WHERE status='PENDING'`
    );
    const issuedLic = await pool.query(`SELECT COUNT(*) AS c FROM backend_licenses`);
    const revokedLic = await pool.query(
      `SELECT COUNT(*) AS c FROM backend_licenses WHERE status='REVOKED'`
    );
    const activeBusinesses = await pool.query(
      `
      SELECT COUNT(DISTINCT business_id) AS c
      FROM backend_licenses
      WHERE status='ACTIVE'
        AND (issued_at IS NULL OR issued_at <= NOW())
        AND (expires_at IS NULL OR expires_at >= NOW())
      `
    );
    const backends = await pool.query(`SELECT COUNT(*) AS c FROM backend_devices`);
    const expiringSoon = await pool.query(
      `SELECT COUNT(*) AS c
       FROM backend_licenses
       WHERE status='ACTIVE'
         AND expires_at IS NOT NULL
         AND expires_at <= NOW() + INTERVAL '30 days'`
    );

    return res.json({
      ok: true,
      pending_requests: Number(pendingReq.rows[0]?.c || 0),
      issued_licenses: Number(issuedLic.rows[0]?.c || 0),
      active_businesses: Number(activeBusinesses.rows[0]?.c || 0),
      active_backends: Number(backends.rows[0]?.c || 0),
      expiring_soon: Number(expiringSoon.rows[0]?.c || 0),
      revoked_licenses: Number(revokedLic.rows[0]?.c || 0)
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN SUMMARY ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/me", adminJwt, (req, res) => {
  return res.json({ ok: true, admin: req.admin || null });
});

router.get("/license-requests", adminJwt, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const rows = await pool.query(
      `
      SELECT
        lr.id,
        lr.request_id,
        lr.customer_name,
        lr.business_name,
        lr.contact_person,
        lr.email,
        lr.phone,
        lr.plan,
        lr.device_limit,
        lr.request_type,
        lr.requested_plan,
        lr.requested_total_device_limit,
        lr.extra_device_count,
        lr.current_plan,
        lr.current_total_device_limit,
        lr.hardware_bundle,
        lr.amount_expected,
        lr.notes,
        lr.machine_id,
        lr.backend_id,
        lr.business_id,
        lr.branch_id,
        lr.requested_at,
        lr.status,
        lr.payment_status,
        lr.payment_method,
        lr.payment_txn_id,
        lr.payment_amount,
        lr.payment_confirmed_by,
        lr.payment_confirmed_at,
        lr.payment_notes,
        lr.version,
        lr.location,
        lr.address
      FROM license_requests lr
      WHERE (
        $1 = '' OR
        lr.request_id ILIKE '%' || $1 || '%' OR
        lr.customer_name ILIKE '%' || $1 || '%' OR
        lr.business_name ILIKE '%' || $1 || '%' OR
        lr.contact_person ILIKE '%' || $1 || '%' OR
        lr.email ILIKE '%' || $1 || '%' OR
        lr.machine_id ILIKE '%' || $1 || '%'
      )
      ORDER BY lr.created_at DESC
      LIMIT 500
      `,
      [q]
    );
    return res.json({ ok: true, rows: rows.rows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN REQUESTS ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.post(
  "/license-requests/:id/confirm-payment",
  adminJwt,
  requireRole(["SUPER_ADMIN", "LICENSING_ADMIN"]),
  async (req, res) => {
  try {
    const requestId = String(req.params.id || "").trim();
    const method = normalizePaymentMethod(req.body?.payment_method);
    const txnId = String(req.body?.payment_txn_id || "").trim();
    const notes = String(req.body?.payment_notes || "").trim();
    const amount = req.body?.payment_amount != null ? Number(req.body.payment_amount) : null;
    if (!requestId) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    if (!method) return res.status(400).json({ ok: false, error: "PAYMENT_METHOD_REQUIRED" });
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ ok: false, error: "PAYMENT_AMOUNT_REQUIRED" });
    }

    const result = await pool.query(
      `
      UPDATE license_requests
      SET payment_status='PAID',
          payment_method=$2,
          payment_txn_id=$3,
          payment_amount=$4,
          payment_notes=$5,
          payment_confirmed_by=$6,
          payment_confirmed_at=NOW(),
          updated_at=NOW()
      WHERE id=$1
      RETURNING id, request_id, payment_status
      `,
      [requestId, method, txnId || null, amount, notes || null, req.admin?.username || "admin"]
    );

    if (!result.rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    return res.json({ ok: true, row: result.rows[0] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("CONFIRM PAYMENT ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
  }
);

router.post(
  "/license-requests/:id/mark-issued",
  adminJwt,
  requireRole(["SUPER_ADMIN", "LICENSING_ADMIN"]),
  async (req, res) => {
  try {
    const requestId = String(req.params.id || "").trim();
    if (!requestId) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    const reqRow = await pool.query(
      `SELECT id, payment_status FROM license_requests WHERE id=$1`,
      [requestId]
    );
    if (!reqRow.rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    if (String(reqRow.rows[0].payment_status || "").toUpperCase() !== "PAID") {
      return res.status(403).json({ ok: false, error: "PAYMENT_REQUIRED" });
    }
    await pool.query(
      `UPDATE license_requests SET status='ISSUED', updated_at=NOW() WHERE id=$1`,
      [requestId]
    );
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("MARK ISSUED ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
  }
);

router.post(
  "/license-requests/:id/reject",
  adminJwt,
  requireRole(["SUPER_ADMIN", "LICENSING_ADMIN"]),
  async (req, res) => {
  try {
    const requestId = String(req.params.id || "").trim();
    if (!requestId) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    await pool.query(
      `UPDATE license_requests SET status='REJECTED', updated_at=NOW() WHERE id=$1`,
      [requestId]
    );
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("REJECT REQUEST ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
  }
);

  router.get("/licenses", adminJwt, async (_req, res) => {
    try {
      const rows = await pool.query(
        `
      SELECT
        bl.id,
        bl.license_id,
        bl.plan,
        bl.device_limit,
        0 AS used_devices,
        bl.issued_at,
        bl.expires_at,
        bl.grace_ends_at,
        bl.status,
        bl.payload_b64,
        bl.sig_b64,
        bl.backend_id,
        bl.business_id,
        bl.branch_id,
        b.name AS business_name,
        br.name AS branch_name,
        bd.machine_id,
        bd.backend_version,
        bd.last_seen_at AS last_heartbeat
      FROM backend_licenses bl
      LEFT JOIN businesses b ON b.id = bl.business_id
      LEFT JOIN branches br ON br.id = bl.branch_id
      LEFT JOIN backend_devices bd ON bd.id = bl.backend_id
      ORDER BY bl.updated_at DESC
      LIMIT 500
      `
    );
    return res.json({ ok: true, rows: rows.rows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN LICENSES ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.post(
  "/licenses/:id/revoke",
  adminJwt,
  requireRole(["SUPER_ADMIN", "LICENSING_ADMIN"]),
  async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    const result = await pool.query(
      `UPDATE backend_licenses
       SET status='REVOKED', updated_at=NOW()
       WHERE id=$1
       RETURNING id, backend_id, business_id, license_id`,
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    await logAudit({
      admin: req.admin,
      action: "LICENSE_REVOKE",
      backendId: result.rows[0].backend_id,
      businessId: result.rows[0].business_id,
      licenseId: result.rows[0].license_id,
      oldValue: { status: "ACTIVE" },
      newValue: { status: "REVOKED" }
    });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("REVOKE LICENSE ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
  }
);

router.post(
  "/licenses/:id/renew",
  adminJwt,
  requireRole(["SUPER_ADMIN", "LICENSING_ADMIN"]),
  async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    const row = await pool.query(
      `SELECT backend_id, business_id, license_id, plan, device_limit, expires_at
       FROM backend_licenses
       WHERE id=$1`,
      [id]
    );
    if (!row.rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    const lic = await licenseService.issueBackendLicense({
      backendId: row.rows[0].backend_id,
      plan: row.rows[0].plan,
      deviceLimitOverride: row.rows[0].device_limit
    });
    await logAudit({
      admin: req.admin,
      action: "LICENSE_RENEW",
      backendId: lic.backend_id,
      businessId: lic.business_id,
      licenseId: lic.license_id,
      oldValue: { expires_at: row.rows[0].expires_at },
      newValue: { expires_at: lic.expires_at }
    });
    return res.json({ ok: true, license: lic });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("RENEW LICENSE ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
  }
);

router.get("/licenses/:id/json", adminJwt, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    const row = await pool.query(
      `SELECT id, backend_id, business_id, license_id, payload_b64, sig_b64
       FROM backend_licenses
       WHERE id=$1`,
      [id]
    );
    if (!row.rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
    await logAudit({
      admin: req.admin,
      action: "LICENSE_DOWNLOAD",
      backendId: row.rows[0].backend_id,
      businessId: row.rows[0].business_id,
      licenseId: row.rows[0].license_id,
      oldValue: null,
      newValue: null
    });
    return res.json({
      ok: true,
      license: {
        license_id: row.rows[0].license_id,
        payload_b64: row.rows[0].payload_b64,
        sig_b64: row.rows[0].sig_b64
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("LICENSE JSON ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.post(
  "/licenses/manual",
  adminJwt,
  requireRole(["SUPER_ADMIN", "LICENSING_ADMIN"]),
  async (req, res) => {
    try {
      const backendId = String(req.body?.backend_id || "").trim();
      const plan = String(req.body?.plan || "").trim();
      const deviceLimit = req.body?.device_limit != null ? Number(req.body.device_limit) : null;
      const expiresAt = String(req.body?.expires_at || "").trim();
      if (!backendId) return res.status(400).json({ ok: false, error: "BACKEND_REQUIRED" });
      if (!plan) return res.status(400).json({ ok: false, error: "PLAN_REQUIRED" });

      const lic = await licenseService.issueBackendLicense({
        backendId,
        plan,
        deviceLimitOverride: Number.isFinite(deviceLimit) ? deviceLimit : null,
        expiresAtOverride: expiresAt || null
      });
      await logAudit({
        admin: req.admin,
        action: "LICENSE_CREATE",
        backendId: lic.backend_id,
        businessId: lic.business_id,
        licenseId: lic.license_id,
        oldValue: null,
        newValue: lic
      });
      return res.json({ ok: true, license: lic });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("MANUAL LICENSE CREATE ERROR:", err);
      return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  }
);

router.post(
  "/licenses/:id/update",
  adminJwt,
  requireRole(["SUPER_ADMIN", "LICENSING_ADMIN"]),
  async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();
      if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
      const row = await pool.query(
        `SELECT id, backend_id, business_id, license_id, plan, device_limit, expires_at
         FROM backend_licenses
         WHERE id=$1`,
        [id]
      );
      if (!row.rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND" });

      const plan = String(req.body?.plan || row.rows[0].plan || "").trim();
      const deviceLimit = req.body?.device_limit != null ? Number(req.body.device_limit) : row.rows[0].device_limit;
      const expiresAt = String(req.body?.expires_at || "").trim();

      const lic = await licenseService.issueBackendLicense({
        backendId: row.rows[0].backend_id,
        plan,
        deviceLimitOverride: Number.isFinite(deviceLimit) ? deviceLimit : null,
        expiresAtOverride: expiresAt || null
      });
      await logAudit({
        admin: req.admin,
        action: "LICENSE_UPDATE",
        backendId: lic.backend_id,
        businessId: lic.business_id,
        licenseId: lic.license_id,
        oldValue: {
          plan: row.rows[0].plan,
          device_limit: row.rows[0].device_limit,
          expires_at: row.rows[0].expires_at
        },
        newValue: lic
      });
      return res.json({ ok: true, license: lic });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("MANUAL LICENSE UPDATE ERROR:", err);
      return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
    }
  }
);

router.get("/catalog/businesses", adminJwt, async (_req, res) => {
  try {
    const rows = await pool.query(
      `SELECT id, name FROM businesses ORDER BY name ASC`
    );
    return res.json({ ok: true, rows: rows.rows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN BUSINESSES ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/catalog/backends", adminJwt, async (req, res) => {
  try {
    const businessId = String(req.query.business_id || "").trim();
    const rows = await pool.query(
      `
      SELECT
        bd.id,
        bd.backend_name,
        bd.machine_id,
        bd.business_id,
        bd.branch_id,
        b.name AS business_name,
        br.name AS branch_name
      FROM backend_devices bd
      LEFT JOIN businesses b ON b.id = bd.business_id
      LEFT JOIN branches br ON br.id = bd.branch_id
      WHERE ($1 = '' OR bd.business_id::text = $1)
      ORDER BY bd.last_seen_at DESC NULLS LAST, bd.created_at DESC
      LIMIT 500
      `,
      [businessId]
    );
    return res.json({ ok: true, rows: rows.rows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN BACKENDS CATALOG ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/backends", adminJwt, async (_req, res) => {
    try {
      const rows = await pool.query(
        `
      SELECT
        bd.id AS backend_id,
        COALESCE(bd.backend_name, bd.id::text) AS backend_name,
        bd.business_id,
        bd.branch_id,
        b.name AS business_name,
        br.name AS branch_name,
        bd.machine_id,
        bd.backend_version,
        bd.last_seen_at AS last_heartbeat,
        bd.is_active,
        bd.is_flagged,
        CASE
          WHEN bd.last_seen_at >= NOW() - INTERVAL '10 minutes' THEN 'ONLINE'
          ELSE 'OFFLINE'
        END AS status,
        bl.license_id,
        bl.plan AS license_plan,
        bl.device_limit AS license_device_limit,
        bl.status AS license_status,
        lreq.request_id AS pending_request_id,
        lreq.plan AS pending_plan,
        lreq.device_limit AS pending_device_limit
      FROM backend_devices bd
      LEFT JOIN businesses b ON b.id = bd.business_id
      LEFT JOIN branches br ON br.id = bd.branch_id
      LEFT JOIN LATERAL (
        SELECT bl.*
        FROM backend_licenses bl
        WHERE (bl.machine_id IS NOT NULL AND bl.machine_id = bd.machine_id)
           OR bl.backend_id = bd.id
        ORDER BY
          CASE WHEN bl.machine_id = bd.machine_id THEN 0 ELSE 1 END,
          bl.updated_at DESC
        LIMIT 1
      ) bl ON TRUE
      LEFT JOIN LATERAL (
        SELECT lr.request_id, lr.plan, lr.device_limit
        FROM license_requests lr
        WHERE lr.machine_id = bd.machine_id
          AND lr.status = 'ISSUED'
        ORDER BY lr.updated_at DESC NULLS LAST, lr.requested_at DESC NULLS LAST
        LIMIT 1
      ) lreq ON TRUE
      ORDER BY bd.last_seen_at DESC NULLS LAST
      LIMIT 500
      `
    );
    return res.json({ ok: true, rows: rows.rows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN BACKENDS ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.get("/debug/backend", adminJwt, async (req, res) => {
  try {
    const backendId = String(req.query.backend_id || "").trim();
    const machineId = String(req.query.machine_id || "").trim();
    if (!backendId && !machineId) {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "backend_id or machine_id required" });
    }

    let row = null;
    if (backendId) {
      const result = await pool.query(
        `SELECT id, machine_id, business_id, branch_id, is_active, backend_version,
                LEFT(api_key_hash, 8) AS api_key_hash_prefix
         FROM backend_devices
         WHERE id = $1`,
        [backendId]
      );
      row = result.rows[0] || null;
    }
    if (!row && machineId) {
      const result = await pool.query(
        `SELECT id, machine_id, business_id, branch_id, is_active, backend_version,
                LEFT(api_key_hash, 8) AS api_key_hash_prefix
         FROM backend_devices
         WHERE machine_id = $1`,
        [machineId]
      );
      row = result.rows[0] || null;
    }

    return res.json({ ok: true, row });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN DEBUG BACKEND ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.post("/backends/:id/disable", adminJwt, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    const result = await pool.query(
      `UPDATE backend_devices SET is_active=FALSE WHERE id=$1 RETURNING id`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("DISABLE BACKEND ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.post("/backends/:id/flag", adminJwt, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    const result = await pool.query(
      `UPDATE backend_devices
       SET is_flagged=NOT COALESCE(is_flagged, FALSE)
       WHERE id=$1
       RETURNING id, is_flagged`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    return res.json({ ok: true, flagged: result.rows[0].is_flagged });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("FLAG BACKEND ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
