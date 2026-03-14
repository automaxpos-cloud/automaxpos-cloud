const express = require("express");
const { pool } = require("../db/pool");
const adminJwt = require("../middleware/adminJwt");
const licenseService = require("../services/licenseService");
const { matchPaymentTransaction } = require("../services/paymentMatchService");

const router = express.Router();

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "SUPPORT", "VIEWER"]);

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

function normalizeAdminRole(role) {
  const raw = String(role || "").trim().toUpperCase();
  if (raw === "SUPERADMIN") return "SUPER_ADMIN";
  return ADMIN_ROLES.has(raw) ? raw : null;
}

async function logAdminUserAudit(admin, action, targetUserId, details) {
  try {
    await pool.query(
      `INSERT INTO cloud_audit_logs (actor_user_id, actor_username, action, entity_type, entity_id, details_json)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        admin?.user_id || null,
        admin?.username || null,
        action,
        "cloud_users",
        targetUserId || null,
        details ? JSON.stringify(details) : null
      ]
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("ADMIN USER AUDIT ERROR:", err?.message || err);
  }
}

async function countActiveSuperAdmins(excludeId) {
  const rows = await pool.query(
    `SELECT COUNT(*) AS c
     FROM cloud_users
     WHERE UPPER(role) IN ('SUPER_ADMIN','SUPERADMIN')
       AND COALESCE(is_active, TRUE) = TRUE
       AND ($1::uuid IS NULL OR id <> $1::uuid)`,
    [excludeId || null]
  );
  return Number(rows.rows[0]?.c || 0);
}

async function ensureNotLastSuperAdmin(targetId) {
  const remaining = await countActiveSuperAdmins(targetId);
  return remaining > 0;
}

router.get("/summary", adminJwt, async (_req, res) => {
  try {
    const pendingReq = await pool.query(
      `SELECT COUNT(*) AS c
       FROM license_requests
       WHERE UPPER(COALESCE(request_status, status, 'PENDING')) = 'PENDING'`
    );
    const issuedLic = await pool.query(`SELECT COUNT(*) AS c FROM backend_licenses`);
    const revokedLic = await pool.query(
      `SELECT COUNT(*) AS c FROM backend_licenses WHERE status='REVOKED'`
    );
    const activeBusinesses = await pool.query(
      `SELECT COUNT(*) AS c FROM businesses`
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

router.get("/users", adminJwt, requireRole(["SUPER_ADMIN"]), async (_req, res) => {
  try {
    const rows = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.username,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        u.updated_at,
        u.created_by,
        u.revoked_at,
        u.revoked_by,
        u.last_login_at,
        cu.username AS created_by_username,
        ru.username AS revoked_by_username
      FROM cloud_users u
      LEFT JOIN cloud_users cu ON cu.id = u.created_by
      LEFT JOIN cloud_users ru ON ru.id = u.revoked_by
      WHERE UPPER(u.role) IN ('SUPER_ADMIN','SUPERADMIN','ADMIN','SUPPORT','VIEWER')
      ORDER BY u.created_at DESC
      `
    );
    return res.json({ ok: true, rows: rows.rows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN USERS LIST ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to load users" });
  }
});

router.post("/users", adminJwt, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const fullName = String(req.body?.full_name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = normalizeAdminRole(req.body?.role);
    const isActive = req.body?.is_active !== false;

    if (!fullName) return res.status(400).json({ ok: false, error: "FULL_NAME_REQUIRED" });
    if (!email) return res.status(400).json({ ok: false, error: "EMAIL_REQUIRED" });
    if (!password) return res.status(400).json({ ok: false, error: "PASSWORD_REQUIRED" });
    if (!role) return res.status(400).json({ ok: false, error: "INVALID_ROLE" });

    const existing = await pool.query(
      `SELECT id FROM cloud_users WHERE LOWER(email) = $1 OR LOWER(username) = $1 LIMIT 1`,
      [email]
    );
    if (existing.rows.length) {
      return res.status(400).json({ ok: false, error: "DUPLICATE_EMAIL", message: "Email already exists" });
    }

    const bcrypt = require("bcrypt");
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `
      INSERT INTO cloud_users
        (username, email, password_hash, full_name, role, is_active, created_by, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
      RETURNING id
      `,
      [email, email, hash, fullName, role, isActive, req.admin?.user_id || null]
    );
    await logAdminUserAudit(req.admin, "ADMIN_USER_CREATED", result.rows[0]?.id, {
      email,
      role,
      is_active: isActive
    });
    return res.json({ ok: true, id: result.rows[0]?.id || null });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN USER CREATE ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to create user" });
  }
});

router.patch("/users/:id", adminJwt, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });

    const existing = await pool.query(
      `SELECT id, email, role, is_active FROM cloud_users WHERE id=$1`,
      [id]
    );
    if (!existing.rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const current = existing.rows[0];

    const fullName = req.body?.full_name != null ? String(req.body.full_name || "").trim() : null;
    const email = req.body?.email != null ? String(req.body.email || "").trim().toLowerCase() : null;
    const role = req.body?.role != null ? normalizeAdminRole(req.body.role) : null;
    const isActive = typeof req.body?.is_active === "boolean" ? req.body.is_active : null;

    if (req.body?.role != null && !role) {
      return res.status(400).json({ ok: false, error: "INVALID_ROLE" });
    }
    if (email) {
      const dup = await pool.query(
        `SELECT id FROM cloud_users WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1`,
        [email, id]
      );
      if (dup.rows.length) {
        return res.status(400).json({ ok: false, error: "DUPLICATE_EMAIL", message: "Email already exists" });
      }
    }

    const currentRole = normalizeAdminRole(current.role) || String(current.role || "").toUpperCase();
    const nextRole = role || currentRole;
    const nextActive = isActive != null ? isActive : current.is_active !== false;

    if (currentRole === "SUPER_ADMIN" && (!nextActive || nextRole !== "SUPER_ADMIN")) {
      const ok = await ensureNotLastSuperAdmin(id);
      if (!ok) {
        return res.status(400).json({
          ok: false,
          error: "LAST_SUPER_ADMIN",
          message: "Cannot revoke or demote the last active SUPER_ADMIN."
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE cloud_users
      SET full_name = COALESCE($1, full_name),
          email = COALESCE($2, email),
          username = COALESCE($2, username),
          role = $3,
          is_active = COALESCE($4, is_active),
          revoked_at = CASE WHEN $4 = FALSE THEN NOW() ELSE revoked_at END,
          revoked_by = CASE WHEN $4 = FALSE THEN $5 ELSE revoked_by END,
          updated_at = NOW()
      WHERE id = $6
      RETURNING id, role, is_active
      `,
      [
        fullName,
        email,
        nextRole,
        isActive,
        isActive === false ? (req.admin?.user_id || null) : null,
        id
      ]
    );
    await logAdminUserAudit(req.admin, "ADMIN_USER_UPDATED", id, {
      role: nextRole,
      is_active: result.rows[0]?.is_active
    });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN USER UPDATE ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to update user" });
  }
});

router.post("/users/:id/reset-password", adminJwt, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const password = String(req.body?.password || "");
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    if (!password) return res.status(400).json({ ok: false, error: "PASSWORD_REQUIRED" });

    const bcrypt = require("bcrypt");
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `UPDATE cloud_users SET password_hash=$1, updated_at=NOW() WHERE id=$2 RETURNING id`,
      [hash, id]
    );
    if (!result.rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    await logAdminUserAudit(req.admin, "ADMIN_USER_PASSWORD_RESET", id, {});
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN USER RESET ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to reset password" });
  }
});

router.post("/users/:id/revoke", adminJwt, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });

    const existing = await pool.query(`SELECT role FROM cloud_users WHERE id=$1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const role = normalizeAdminRole(existing.rows[0].role) || String(existing.rows[0].role || "").toUpperCase();
    if (role === "SUPER_ADMIN") {
      const ok = await ensureNotLastSuperAdmin(id);
      if (!ok) {
        return res.status(400).json({ ok: false, error: "LAST_SUPER_ADMIN" });
      }
    }

    await pool.query(
      `UPDATE cloud_users
       SET is_active=FALSE, revoked_at=NOW(), revoked_by=$2, updated_at=NOW()
       WHERE id=$1`,
      [id, req.admin?.user_id || null]
    );
    await logAdminUserAudit(req.admin, "ADMIN_USER_REVOKED", id, {});
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN USER REVOKE ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.post("/users/:id/activate", adminJwt, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    await pool.query(
      `UPDATE cloud_users
       SET is_active=TRUE, revoked_at=NULL, revoked_by=NULL, updated_at=NOW()
       WHERE id=$1`,
      [id]
    );
    await logAdminUserAudit(req.admin, "ADMIN_USER_ACTIVATED", id, {});
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN USER ACTIVATE ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.delete("/users/:id", adminJwt, requireRole(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });

    const existing = await pool.query(`SELECT role FROM cloud_users WHERE id=$1`, [id]);
    if (!existing.rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const role = normalizeAdminRole(existing.rows[0].role) || String(existing.rows[0].role || "").toUpperCase();
    if (role === "SUPER_ADMIN") {
      const ok = await ensureNotLastSuperAdmin(id);
      if (!ok) {
        return res.status(400).json({ ok: false, error: "LAST_SUPER_ADMIN" });
      }
    }

    await pool.query(`DELETE FROM cloud_users WHERE id=$1`, [id]);
    await logAdminUserAudit(req.admin, "ADMIN_USER_DELETED", id, {});
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN USER DELETE ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
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
        lr.payment_reference,
        lr.payer_phone,
        lr.paid_amount,
        lr.payment_method,
        lr.payment_source,
        lr.payer_phone AS request_payer_phone,
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
    const keyId = process.env.LICENSE_KEY_ID || "jpmax-license-key-2026-01";
    const out = (rows.rows || []).map((r) => ({
      ...r,
      key_id: keyId
    }));
    return res.json({ ok: true, rows: out });
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
      `UPDATE license_requests
       SET status='ISSUED',
           request_status=COALESCE(request_status,'issued'),
           updated_at=NOW()
       WHERE id=$1`,
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
  "/license-requests/:id/approve",
  adminJwt,
  requireRole(["SUPER_ADMIN", "LICENSING_ADMIN"]),
  async (req, res) => {
  try {
    const requestId = String(req.params.id || "").trim();
    if (!requestId) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });

    const reqRow = await pool.query(
      `SELECT
         id,
         request_id,
         backend_id,
         business_id,
         branch_id,
         machine_id,
         request_type,
         requested_plan,
         requested_total_device_limit,
         extra_device_count,
         plan,
         device_limit,
         current_plan,
         current_total_device_limit,
         hardware_bundle,
         amount_expected,
         payment_status
       FROM license_requests
       WHERE id=$1`,
      [requestId]
    );
    if (!reqRow.rows.length) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }

    const row = reqRow.rows[0];
    if (String(row.payment_status || "").toLowerCase() !== "paid") {
      return res.status(403).json({ ok: false, error: "PAYMENT_REQUIRED", message: "Payment not confirmed" });
    }
    let backendId = row.backend_id;
    if (!backendId && row.machine_id) {
      const backendRes = await pool.query(
        `SELECT id FROM backend_devices WHERE machine_id=$1 ORDER BY last_seen_at DESC NULLS LAST LIMIT 1`,
        [row.machine_id]
      );
      backendId = backendRes.rows[0]?.id || null;
    }
    if (!backendId) {
      return res.status(400).json({ ok: false, error: "BACKEND_NOT_FOUND", message: "Request has no backend_id/machine_id match" });
    }

    const typeRaw = String(row.request_type || "").toLowerCase();
    const issueType =
      typeRaw === "device_addon" || typeRaw === "extra_device_addon" ? "device_addon" :
      typeRaw === "renewal" ? "renewal" :
      typeRaw === "upgrade" || typeRaw === "plan_upgrade" ? "upgrade" :
      typeRaw === "correction" ? "correction" :
      "new_license";

    const planName = row.requested_plan || row.plan || row.current_plan || "Business";
    const baseMap = { Starter: 1, Standard: 3, Business: 5, Enterprise: 10 };
    const baseDeviceLimit = baseMap[String(planName || "").trim()] || 1;
    const requestedTotal =
      row.requested_total_device_limit ??
      row.device_limit ??
      row.current_total_device_limit ??
      null;
    const extraDeviceCount =
      row.extra_device_count != null
        ? Number(row.extra_device_count)
        : (requestedTotal != null ? Math.max(0, Number(requestedTotal) - baseDeviceLimit) : 0);

    const issued = await licenseService.issueBackendLicense({
      backendId,
      issueType,
      planName,
      baseDeviceLimit,
      extraDeviceCount,
      requestId: row.request_id,
      hardwareBundle: row.hardware_bundle,
      quotedPrice: row.amount_expected
    });

    await pool.query(
      `UPDATE license_requests
       SET status='LICENSE_READY',
           request_status=COALESCE(request_status,'approved'),
           reviewed_at=NOW(),
           updated_at=NOW()
       WHERE id=$1`,
      [requestId]
    );

    return res.json({
      ok: true,
      license_id: issued?.license_id || null,
      device_limit: issued?.total_device_limit || issued?.device_limit || null
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("APPROVE REQUEST ERROR:", err?.message || err, err?.stack || "");
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "Failed to approve request" });
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
      `UPDATE license_requests
       SET status='REJECTED',
           request_status=COALESCE(request_status,'rejected'),
           updated_at=NOW()
       WHERE id=$1`,
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

router.get("/payments", adminJwt, async (req, res) => {
  try {
    const status = String(req.query.status || "").trim();
    const q = String(req.query.q || "").trim();
    const range = String(req.query.range || "").trim();
    const startDate = String(req.query.start_date || "").trim();
    const endDate = String(req.query.end_date || "").trim();

    let startTs = null;
    let endTs = null;
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (range && range !== "custom" && !startDate && !endDate) {
      if (range === "today") {
        startTs = todayUtc.toISOString();
        endTs = new Date(todayUtc.getTime() + 86400 * 1000).toISOString();
      } else if (range === "yesterday") {
        startTs = new Date(todayUtc.getTime() - 86400 * 1000).toISOString();
        endTs = todayUtc.toISOString();
      } else if (range === "last7") {
        startTs = new Date(todayUtc.getTime() - 6 * 86400 * 1000).toISOString();
        endTs = new Date(todayUtc.getTime() + 86400 * 1000).toISOString();
      } else if (range === "month") {
        const start = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1));
        const end = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() + 1, 1));
        startTs = start.toISOString();
        endTs = end.toISOString();
      }
    }
    if (startDate) {
      const d = new Date(startDate + "T00:00:00Z");
      if (!Number.isNaN(d.getTime())) startTs = d.toISOString();
    }
    if (endDate) {
      const d = new Date(endDate + "T00:00:00Z");
      if (!Number.isNaN(d.getTime())) {
        d.setUTCDate(d.getUTCDate() + 1);
        endTs = d.toISOString();
      }
    }

    const rows = await pool.query(
      `
      SELECT
        id,
        txn_id,
        payer_phone,
        amount,
        currency,
        match_status,
        matched_request_id,
        source_type,
        source_email,
        sender_email,
        imported_at,
        processed_at
      FROM payment_transactions
      WHERE ($1 = '' OR match_status = $1)
        AND ($2 = '' OR txn_id ILIKE '%' || $2 || '%' OR payer_phone ILIKE '%' || $2 || '%')
        AND ($3::timestamptz IS NULL OR imported_at >= $3::timestamptz)
        AND ($4::timestamptz IS NULL OR imported_at < $4::timestamptz)
      ORDER BY imported_at DESC
      LIMIT 500
      `,
      [status, q, startTs, endTs]
    );
    const summary = await pool.query(
      `
      SELECT
        COUNT(*) AS imported,
        COUNT(*) FILTER (WHERE match_status = 'matched') AS matched,
        COUNT(*) FILTER (WHERE match_status = 'unmatched') AS unmatched,
        COUNT(*) FILTER (WHERE match_status = 'duplicate') AS duplicate
      FROM payment_transactions
      WHERE ($1::timestamptz IS NULL OR imported_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR imported_at < $2::timestamptz)
      `,
      [startTs, endTs]
    );
    return res.json({ ok: true, summary: summary.rows[0] || {}, rows: rows.rows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN PAYMENTS ERROR:", err?.message || err, err?.stack || "");
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "Failed to load payments" });
  }
});
router.get("/payments/:id", adminJwt, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    const rows = await pool.query(
      `SELECT * FROM payment_transactions WHERE id=$1 LIMIT 1`,
      [id]
    );
    if (!rows.rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const row = rows.rows[0];
    const isSuper = String(req.admin?.role || "").toUpperCase() === "SUPER_ADMIN";
    const rawBody = String(row.raw_body || "");
    const sanitized = rawBody
      .replace(/\\bBal(?:ance)?\\s+[A-Z]{0,3}\\s*[0-9.,]+\\b/gi, "")
      .replace(/\\bComm(?:ission)?\\s+[A-Z]{0,3}\\s*[0-9.,]+\\b/gi, "")
      .replace(/\\s{2,}/g, " ")
      .replace(/\\s+\\.\\s+/g, ". ")
      .trim();
    const safeRow = {
      ...row,
      sanitized_body: sanitized || null,
      raw_body: isSuper ? row.raw_body : null,
      allow_raw: isSuper
    };
    return res.json({ ok: true, row: safeRow });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN PAYMENT DETAIL ERROR:", err?.message || err, err?.stack || "");
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "Failed to load payment" });
  }
});

router.post("/payments/:id/rematch", adminJwt, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
    const rows = await pool.query(
      `SELECT * FROM payment_transactions WHERE id=$1 LIMIT 1`,
      [id]
    );
    if (!rows.rows.length) return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    const result = await matchPaymentTransaction(rows.rows[0]);
    return res.json({ ok: true, result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN PAYMENT REMATCH ERROR:", err?.message || err, err?.stack || "");
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "Failed to rematch payment" });
  }
});

  router.get("/licenses", adminJwt, async (_req, res) => {
    try {
      const rows = await pool.query(
        `
      SELECT
        bl.id,
        bl.license_id,
        bl.plan,
        bl.device_limit,
        bl.plan_name,
        bl.base_device_limit,
        bl.extra_device_count,
        bl.total_device_limit,
        bl.license_version,
        bl.previous_license_id,
        bl.change_reason,
        bl.license_status,
        bl.request_id,
        bl.hardware_bundle,
        bl.quoted_price,
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
      issueType: "renewal",
      planName: row.rows[0].plan,
      baseDeviceLimit: row.rows[0].device_limit
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

router.post(
  "/licenses/:id/replace",
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
      issueType: "correction",
      planName: row.rows[0].plan,
      baseDeviceLimit: row.rows[0].device_limit,
      expiresAtOverride: row.rows[0].expires_at
    });
    await pool.query(
      `UPDATE backend_licenses
       SET status='REPLACED', license_status='REPLACED', updated_at=NOW()
       WHERE id=$1`,
      [id]
    );
    try {
      await pool.query(
        `UPDATE license_activations
         SET status='REPLACED',
             replaced_by_license_id=$2,
             updated_at=NOW()
         WHERE license_id=$1`,
        [row.rows[0].license_id, lic.license_id]
      );
    } catch (_) {}
    await logAudit({
      admin: req.admin,
      action: "LICENSE_REPLACED",
      backendId: lic.backend_id,
      businessId: lic.business_id,
      licenseId: lic.license_id,
      oldValue: { replaced_from: row.rows[0].license_id },
      newValue: { replaced_to: lic.license_id }
    });
    return res.json({ ok: true, license: lic });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("REPLACE LICENSE ERROR:", err);
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

router.get("/activations", adminJwt, async (_req, res) => {
  try {
    const exists = await pool.query(`SELECT to_regclass('public.license_activations') AS t`);
    if (!exists.rows[0]?.t) {
      return res.json({ ok: true, rows: [], missing: "license_activations" });
    }
    const rows = await pool.query(
      `
      SELECT
        la.id,
        la.license_id,
        la.machine_id,
        la.status,
        la.activated_at,
        la.last_seen_at,
        la.reissue_count,
        la.replaced_by_license_id,
        la.replaced_from_license_id,
        la.backend_id,
        la.business_id,
        bd.backend_name,
        b.name AS business_name
      FROM license_activations la
      LEFT JOIN backend_devices bd ON bd.id = la.backend_id
      LEFT JOIN businesses b ON b.id = la.business_id
      ORDER BY la.activated_at DESC NULLS LAST
      LIMIT 200
      `
    );
    return res.json({ ok: true, rows: rows.rows || [] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "Failed to load activations" });
  }
});

router.get("/demos", adminJwt, async (_req, res) => {
  try {
    const exists = await pool.query(`SELECT to_regclass('public.backend_demo_records') AS t`);
    if (!exists.rows[0]?.t) {
      return res.json({ ok: true, rows: [], missing: "backend_demo_records" });
    }
    const rows = await pool.query(
      `
      SELECT
        dr.id,
        dr.machine_id,
        dr.backend_id,
        dr.business_id,
        dr.first_demo_started_at,
        dr.demo_expires_at,
        dr.last_seen_at,
        dr.install_count,
        dr.status,
        bd.backend_name,
        b.name AS business_name
      FROM backend_demo_records dr
      LEFT JOIN backend_devices bd ON bd.id = dr.backend_id
      LEFT JOIN businesses b ON b.id = dr.business_id
      ORDER BY dr.first_demo_started_at DESC NULLS LAST
      LIMIT 200
      `
    );
    return res.json({ ok: true, rows: rows.rows || [] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "Failed to load demo records" });
  }
});

router.post(
  "/licenses/manual",
  adminJwt,
  requireRole(["SUPER_ADMIN", "LICENSING_ADMIN"]),
  async (req, res) => {
    try {
      const backendId = String(req.body?.backend_id || "").trim();
      const issueType = String(req.body?.issue_type || "new_license").trim();
      const planName = String(req.body?.plan_name || req.body?.plan || "").trim();
      const baseDeviceLimit = req.body?.base_device_limit != null ? Number(req.body.base_device_limit) : null;
      const extraDeviceCount = req.body?.extra_device_count != null ? Number(req.body.extra_device_count) : null;
      const issuedAt = String(req.body?.issued_at || "").trim();
      const expiresAt = String(req.body?.expiry_date || req.body?.expires_at || "").trim();
      const licenseStatus = String(req.body?.license_status || "active").trim();
      const hardwareBundle = String(req.body?.hardware_bundle || "").trim();
      const quotedPrice = req.body?.quoted_price != null ? Number(req.body.quoted_price) : null;
      const requestId = String(req.body?.request_id || "").trim();
      if (!backendId) return res.status(400).json({ ok: false, error: "BACKEND_REQUIRED" });
      if (!planName) return res.status(400).json({ ok: false, error: "PLAN_REQUIRED" });

      const lic = await licenseService.issueBackendLicense({
        backendId,
        issueType,
        planName,
        baseDeviceLimit: Number.isFinite(baseDeviceLimit) ? baseDeviceLimit : null,
        extraDeviceCount: Number.isFinite(extraDeviceCount) ? extraDeviceCount : null,
        issuedAtOverride: issuedAt || null,
        expiresAtOverride: expiresAt || null,
        licenseStatus,
        hardwareBundle,
        quotedPrice: Number.isFinite(quotedPrice) ? quotedPrice : null,
        requestId: requestId || null
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
        issueType: "correction",
        planName: plan,
        baseDeviceLimit: Number.isFinite(deviceLimit) ? deviceLimit : null,
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
      const exists = await pool.query(`SELECT to_regclass('public.backend_licenses') AS t`);
      if (!exists.rows[0]?.t) {
        return res.status(500).json({ ok: false, error: "MISSING_TABLE", message: "backend_licenses table missing" });
      }
      const flagCol = await pool.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_schema='public'
           AND table_name='backend_devices'
           AND column_name='is_flagged'
         LIMIT 1`
      );
      const hasFlag = flagCol.rowCount > 0;
      const hbExists = await pool.query(`SELECT to_regclass('public.backend_heartbeats') AS t`);
      const hasHeartbeats = !!hbExists.rows[0]?.t;
      const heartbeatJoin = hasHeartbeats
        ? `
      LEFT JOIN LATERAL (
        SELECT bh.heartbeat_at AS last_heartbeat
        FROM backend_heartbeats bh
        WHERE bh.backend_id = bd.id
        ORDER BY bh.heartbeat_at DESC
        LIMIT 1
      ) hb ON TRUE
        `
        : `
      LEFT JOIN LATERAL (
        SELECT NULL::timestamptz AS last_heartbeat
      ) hb ON TRUE
        `;
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
        COALESCE(hb.last_heartbeat, bd.last_seen_at) AS last_heartbeat,
        bd.is_active,
        ${hasFlag ? "bd.is_flagged" : "FALSE"} AS is_flagged,
        CASE
          WHEN COALESCE(hb.last_heartbeat, bd.last_seen_at) >= NOW() - INTERVAL '10 minutes' THEN 'ONLINE'
          ELSE 'OFFLINE'
        END AS status,
        bl.license_id,
        COALESCE(bl.plan_name, bl.plan) AS license_plan,
        COALESCE(bl.total_device_limit, bl.device_limit) AS license_device_limit,
        COALESCE(bl.license_status, bl.status) AS license_status,
        lreq.request_id AS pending_request_id,
        COALESCE(lreq.requested_plan, lreq.plan) AS pending_plan,
        COALESCE(lreq.requested_total_device_limit, lreq.device_limit) AS pending_device_limit
      FROM backend_devices bd
      LEFT JOIN businesses b ON b.id = bd.business_id
      LEFT JOIN branches br ON br.id = bd.branch_id
      ${heartbeatJoin}
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
        SELECT
          lr.request_id,
          lr.requested_plan,
          lr.requested_total_device_limit,
          lr.plan,
          lr.device_limit,
          lr.request_status,
          lr.status,
          lr.updated_at,
          lr.requested_at
        FROM license_requests lr
        WHERE lr.machine_id = bd.machine_id
          AND COALESCE(lr.request_status, lr.status) NOT IN ('ISSUED','REJECTED')
        ORDER BY lr.updated_at DESC NULLS LAST, lr.requested_at DESC NULLS LAST
        LIMIT 1
      ) lreq ON TRUE
      ORDER BY COALESCE(hb.last_heartbeat, bd.last_seen_at) DESC NULLS LAST
      LIMIT 500
      `
    );
    return res.json({ ok: true, rows: rows.rows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN BACKENDS ERROR:", err?.message || err, err?.stack || "");
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "Failed to load backends" });
  }
});

router.get("/sync-monitor", adminJwt, async (_req, res) => {
  try {
    const tables = await pool.query(
      `SELECT
        to_regclass('public.backend_devices') AS backend_devices,
        to_regclass('public.backend_heartbeats') AS backend_heartbeats,
        to_regclass('public.synced_sales') AS synced_sales,
        to_regclass('public.inventory_snapshots') AS inventory_snapshots`
    );
    const hasBackends = !!tables.rows[0]?.backend_devices;
    const hasHeartbeats = !!tables.rows[0]?.backend_heartbeats;
    const hasSales = !!tables.rows[0]?.synced_sales;
    const hasInventory = !!tables.rows[0]?.inventory_snapshots;

    const settingsRes = await pool.query(
      `SELECT cloud_base_url, heartbeat_online_threshold_seconds, heartbeat_offline_threshold_seconds
       FROM platform_settings
       ORDER BY updated_at DESC NULLS LAST
       LIMIT 1`
    ).catch(() => ({ rows: [] }));
    const settings = settingsRes.rows?.[0] || {};
    const onlineSec = Number(settings.heartbeat_online_threshold_seconds || 300);
    const offlineSec = Number(settings.heartbeat_offline_threshold_seconds || 900);

    const hbJoin = hasHeartbeats
      ? `
      LEFT JOIN LATERAL (
        SELECT bh.heartbeat_at AS last_heartbeat
        FROM backend_heartbeats bh
        WHERE bh.backend_id = bd.id
        ORDER BY bh.heartbeat_at DESC
        LIMIT 1
      ) hb ON TRUE
      `
      : `
      LEFT JOIN LATERAL (
        SELECT NULL::timestamptz AS last_heartbeat
      ) hb ON TRUE
      `;

    const backendRows = hasBackends
      ? await pool.query(
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
          COALESCE(hb.last_heartbeat, bd.last_seen_at) AS last_heartbeat,
          CASE
            WHEN COALESCE(hb.last_heartbeat, bd.last_seen_at) >= NOW() - ($1 || ' seconds')::interval THEN 'ONLINE'
            WHEN COALESCE(hb.last_heartbeat, bd.last_seen_at) >= NOW() - ($2 || ' seconds')::interval THEN 'DELAYED'
            ELSE 'OFFLINE'
          END AS status
        FROM backend_devices bd
        LEFT JOIN businesses b ON b.id = bd.business_id
        LEFT JOIN branches br ON br.id = bd.branch_id
        ${hbJoin}
        ORDER BY COALESCE(hb.last_heartbeat, bd.last_seen_at) DESC NULLS LAST
        LIMIT 200
        `,
          [onlineSec, offlineSec]
        )
      : { rows: [] };

    const totalBackends = backendRows.rows.length;
    const onlineBackends = backendRows.rows.filter((r) => r.status === "ONLINE").length;
    const delayedBackends = backendRows.rows.filter((r) => r.status === "DELAYED").length;
    const offlineBackends = backendRows.rows.filter((r) => r.status === "OFFLINE").length;

    const salesToday = hasSales
      ? await pool.query(
          `SELECT COUNT(*) AS c FROM synced_sales WHERE synced_at >= CURRENT_DATE`
        )
      : { rows: [{ c: 0 }] };
    const snapshotsToday = hasInventory
      ? await pool.query(
          `SELECT COUNT(*) AS c FROM inventory_snapshots WHERE snapshot_time >= CURRENT_DATE`
        )
      : { rows: [{ c: 0 }] };
    const heartbeatsToday = hasHeartbeats
      ? await pool.query(
          `SELECT COUNT(*) AS c FROM backend_heartbeats WHERE heartbeat_at >= CURRENT_DATE`
        )
      : { rows: [{ c: 0 }] };

    const recentActivity = backendRows.rows.slice(0, 20);
    const delayedList = backendRows.rows.filter((r) => r.status !== "ONLINE").slice(0, 20);

    return res.json({
      ok: true,
      summary: {
        total_backends: totalBackends,
        online_backends: onlineBackends,
        delayed_backends: delayedBackends,
        offline_backends: offlineBackends,
        sales_synced_today: Number(salesToday.rows[0]?.c || 0),
        inventory_snapshots_today: Number(snapshotsToday.rows[0]?.c || 0),
        heartbeat_events_today: Number(heartbeatsToday.rows[0]?.c || 0),
        last_activity_at: recentActivity[0]?.last_heartbeat || null
      },
      recent_activity: recentActivity,
      delayed_backends: delayedList
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN SYNC MONITOR ERROR:", err?.message || err, err?.stack || "");
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "Failed to load sync monitoring" });
  }
});

router.get("/platform-settings", adminJwt, async (_req, res) => {
  try {
    const exists = await pool.query(`SELECT to_regclass('public.platform_settings') AS t`);
    if (!exists.rows[0]?.t) {
      // eslint-disable-next-line no-console
      console.warn("PLATFORM SETTINGS TABLE MISSING");
      return res.json({
        ok: true,
        settings: {
          cloud_base_url: process.env.CLOUD_BASE_URL || "https://automaxpos-cloud.onrender.com",
          heartbeat_online_threshold_seconds: 300,
          heartbeat_offline_threshold_seconds: 900,
          source: "defaults_table_missing"
        }
      });
    }
    const rows = await pool.query(
      `SELECT id, cloud_base_url, support_email, heartbeat_online_threshold_seconds,
              heartbeat_offline_threshold_seconds, enable_auto_backend_registration, enable_audit_logging
       FROM platform_settings
       ORDER BY updated_at DESC NULLS LAST
       LIMIT 1`
    );
    if (!rows.rows.length) {
      const cloudBaseUrl = process.env.CLOUD_BASE_URL || "https://automaxpos-cloud.onrender.com";
      const insert = await pool.query(
        `INSERT INTO platform_settings (
           cloud_base_url,
           heartbeat_online_threshold_seconds,
           heartbeat_offline_threshold_seconds,
           updated_at
         ) VALUES ($1,$2,$3,NOW())
         RETURNING cloud_base_url, support_email, heartbeat_online_threshold_seconds,
                   heartbeat_offline_threshold_seconds, enable_auto_backend_registration, enable_audit_logging`,
        [cloudBaseUrl, 300, 900]
      );
      const row = insert.rows[0] || {};
      return res.json({
        ok: true,
        settings: {
          cloud_base_url: row.cloud_base_url || cloudBaseUrl,
          support_email: row.support_email || "",
          heartbeat_online_threshold_seconds: row.heartbeat_online_threshold_seconds ?? 300,
          heartbeat_offline_threshold_seconds: row.heartbeat_offline_threshold_seconds ?? 900,
          enable_auto_backend_registration: row.enable_auto_backend_registration ?? true,
          enable_audit_logging: row.enable_audit_logging ?? true,
          source: "defaults_created"
        }
      });
    }
    const row = rows.rows[0] || {};
    return res.json({
      ok: true,
      settings: {
        cloud_base_url: row.cloud_base_url || process.env.CLOUD_BASE_URL || "https://automaxpos-cloud.onrender.com",
        support_email: row.support_email || "",
        heartbeat_online_threshold_seconds: row.heartbeat_online_threshold_seconds ?? 300,
        heartbeat_offline_threshold_seconds: row.heartbeat_offline_threshold_seconds ?? 900,
        enable_auto_backend_registration: row.enable_auto_backend_registration ?? true,
        enable_audit_logging: row.enable_audit_logging ?? true,
        source: "stored"
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN PLATFORM SETTINGS ERROR:", err?.message || err, err?.stack || "");
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "Failed to load settings" });
  }
});

router.put("/platform-settings", adminJwt, async (req, res) => {
  try {
    const cloudBaseUrl = String(req.body?.cloud_base_url || "").trim();
    const onlineSec = Number(req.body?.heartbeat_online_threshold_seconds);
    const offlineSec = Number(req.body?.heartbeat_offline_threshold_seconds);
    if (!cloudBaseUrl) {
      return res.status(400).json({ ok: false, error: "CLOUD_BASE_URL_REQUIRED" });
    }
    try {
      // eslint-disable-next-line no-new
      new URL(cloudBaseUrl);
    } catch {
      return res.status(400).json({ ok: false, error: "INVALID_CLOUD_BASE_URL" });
    }
    if (!Number.isFinite(onlineSec) || onlineSec <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_ONLINE_THRESHOLD" });
    }
    if (!Number.isFinite(offlineSec) || offlineSec <= 0 || offlineSec < onlineSec) {
      return res.status(400).json({ ok: false, error: "INVALID_OFFLINE_THRESHOLD" });
    }

    const exists = await pool.query(`SELECT to_regclass('public.platform_settings') AS t`);
    if (!exists.rows[0]?.t) {
      return res.status(500).json({
        ok: false,
        code: "PLATFORM_SETTINGS_TABLE_MISSING",
        message: "Platform settings storage is not initialized."
      });
    }
    const current = await pool.query(`SELECT id FROM platform_settings ORDER BY updated_at DESC NULLS LAST LIMIT 1`);
    if (current.rows[0]?.id) {
      await pool.query(
        `UPDATE platform_settings
         SET cloud_base_url=$1,
             heartbeat_online_threshold_seconds=$2,
             heartbeat_offline_threshold_seconds=$3,
             updated_at=NOW()
         WHERE id=$4`,
        [cloudBaseUrl, onlineSec, offlineSec, current.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO platform_settings (
           cloud_base_url,
           heartbeat_online_threshold_seconds,
           heartbeat_offline_threshold_seconds,
           updated_at
         ) VALUES ($1,$2,$3,NOW())`,
        [cloudBaseUrl, onlineSec, offlineSec]
      );
    }
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("ADMIN PLATFORM SETTINGS SAVE ERROR:", err?.message || err, err?.stack || "");
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "Failed to save settings" });
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
