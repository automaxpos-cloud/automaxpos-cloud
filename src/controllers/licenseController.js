const crypto = require("crypto");
const { pool } = require("../db/pool");
const licenseService = require("../services/licenseService");

function toEpochSeconds(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

async function logAudit({ adminUser, action, backendId, businessId, licenseId, oldValue, newValue }) {
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
        adminUser || "system",
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

function buildRequestId() {
  return `REQ-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

async function current(req, res) {
  const backendId = req.backend?.id;
  if (!backendId) {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "backend context missing" });
  }
  try {
    const lic = await licenseService.getBackendLicense(backendId);
    if (!lic) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "License not found" });
    }
    return res.json({
      ok: true,
      license: {
        payload_b64: lic.payload_b64,
        sig_b64: lic.sig_b64
      },
      meta: {
        license_id: lic.license_id,
        plan: licenseService.normalizePlan(lic.plan, lic.device_limit),
        device_limit: lic.device_limit,
        issued_at: toEpochSeconds(lic.issued_at),
        expires_at: toEpochSeconds(lic.expires_at),
        grace_ends_at: toEpochSeconds(lic.grace_ends_at),
        status: lic.status || "ACTIVE"
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("LICENSE CURRENT ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to load license" });
  }
}

async function request(req, res) {
  const backend = req.backend || null;
  const user = req.user || null;
  const body = req.body || {};
  try {
    // Debug log for request payload (masked)
    console.log("[LICENSE_REQUEST] payload", {
      backend_id: body.backend_id,
      business_id: body.business_id,
      branch_id: body.branch_id,
      machine_id: body.machine_id,
      request_type: body.request_type,
      requested_plan: body.requested_plan,
      requested_total_device_limit: body.requested_total_device_limit,
      amount_expected: body.amount_expected
    });

    if (backend) {
      if (body.backend_id && String(body.backend_id) !== String(backend.id)) {
        return res.status(403).json({ ok: false, error: "BACKEND_MISMATCH", message: "Backend mismatch" });
      }
      if (body.business_id && String(body.business_id) !== String(backend.business_id)) {
        return res.status(403).json({ ok: false, error: "BUSINESS_MISMATCH", message: "Business mismatch" });
      }
      if (body.branch_id && String(body.branch_id) !== String(backend.branch_id)) {
        return res.status(403).json({ ok: false, error: "BRANCH_MISMATCH", message: "Branch mismatch" });
      }
    } else if (user) {
      const role = String(user.role || user.user_role || "").toUpperCase();
      const userBusinessId = String(user.business_id || "").trim();
      if (!userBusinessId && !["SUPERADMIN", "SUPER_ADMIN", "LICENSING_ADMIN", "SUPPORT_ADMIN"].includes(role)) {
        return res.status(403).json({ ok: false, error: "BUSINESS_REQUIRED", message: "business_id required" });
      }
      const backendId = String(body.backend_id || "").trim();
      const businessId = String(body.business_id || "").trim();
      const branchId = String(body.branch_id || "").trim();
      if (!backendId || !businessId || !branchId) {
        return res.status(400).json({ ok: false, error: "MISSING_FIELDS", message: "backend_id, business_id, branch_id required" });
      }
      if (userBusinessId && businessId !== userBusinessId) {
        return res.status(403).json({ ok: false, error: "BUSINESS_MISMATCH", message: "Business mismatch" });
      }
      const backendRow = await pool.query(
        `SELECT id, business_id, branch_id, machine_id FROM backend_devices WHERE id=$1`,
        [backendId]
      );
      if (!backendRow.rows.length) {
        return res.status(404).json({ ok: false, error: "BACKEND_NOT_FOUND", message: "Backend not found" });
      }
      if (String(backendRow.rows[0].business_id) !== businessId) {
        return res.status(403).json({ ok: false, error: "BUSINESS_MISMATCH", message: "Business mismatch" });
      }
      if (String(backendRow.rows[0].branch_id) !== branchId) {
        return res.status(403).json({ ok: false, error: "BRANCH_MISMATCH", message: "Branch mismatch" });
      }
    }

    const businessName = String(body.business_name || "").trim();
    const contactPerson = String(body.contact_person || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const payerPhone = String(body.payer_phone || "").trim();
    const requestedPlan = String(body.requested_plan || body.plan || "").trim();
    const requestedTotal = Number.isFinite(Number(body.requested_total_device_limit))
      ? Number(body.requested_total_device_limit)
      : null;
    const deviceCount = Number.isFinite(Number(body.device_count))
      ? Number(body.device_count)
      : requestedTotal;

    if (!businessName || !contactPerson || !email || !phone || !payerPhone || !requestedPlan || deviceCount == null) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS", message: "Missing required contact or plan fields" });
    }

    let backendId = backend ? backend.id : String(body.backend_id || "").trim();
    let businessId = backend ? backend.business_id : String(body.business_id || "").trim();
    let branchId = backend ? backend.branch_id : String(body.branch_id || "").trim();

    const backendRow = await pool.query(
      `SELECT machine_id FROM backend_devices WHERE id=$1`,
      [backendId]
    );
    const machineId = String(body.machine_id || backendRow.rows[0]?.machine_id || "").trim();
    const requestId = String(body.request_id || body.requestId || "").trim() || buildRequestId();

    const existing = await pool.query(
      `SELECT id FROM license_requests WHERE request_id = $1 LIMIT 1`,
      [requestId]
    );
    if (existing.rows.length) {
      return res.status(409).json({ ok: false, error: "REQUEST_ALREADY_EXISTS" });
    }

    const requestedAt = body.requested_at ? new Date(body.requested_at) : new Date();
    await pool.query(
      `
      INSERT INTO license_requests (
        request_id,
        product,
        version,
        customer_name,
        email,
        phone,
        address,
        location,
        plan,
        device_limit,
        machine_id,
        device_id,
        backend_id,
        business_id,
        branch_id,
        requested_at,
        status,
        created_at,
        updated_at,
        business_name,
        contact_person,
        notes,
        requested_plan,
        device_count,
        delivery_method,
        request_type,
        requested_total_device_limit,
        extra_device_count,
        current_plan,
        current_total_device_limit,
        hardware_bundle,
        amount_expected,
        payment_status,
        payment_method,
        payer_phone
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,NOW(),NOW(),
        $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33
      )
      `,
      [
        requestId,
        String(body.product || "AutoMax POS"),
        String(body.version || ""),
        businessName,
        email,
        phone,
        String(body.address || ""),
        String(body.location || ""),
        requestedPlan,
        deviceCount,
        machineId,
        String(body.device_id || ""),
        backendId,
        businessId,
        branchId,
        requestedAt,
        "PENDING",
        businessName,
        contactPerson,
        String(body.notes || ""),
        requestedPlan,
        deviceCount,
        "cloud_pull",
        String(body.request_type || "new_license"),
        requestedTotal,
        Number.isFinite(Number(body.extra_device_count)) ? Number(body.extra_device_count) : null,
        String(body.current_plan || ""),
        Number.isFinite(Number(body.current_total_device_limit)) ? Number(body.current_total_device_limit) : null,
        String(body.hardware_bundle || ""),
        Number.isFinite(Number(body.amount_expected)) ? Number(body.amount_expected) : null,
        "pending_payment",
        "airtel_get_cash",
        payerPhone
      ]
    );

    return res.json({ ok: true, request_id: requestId, status: "PENDING" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("LICENSE REQUEST ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err.message || "Server error" });
  }
}

async function requests(req, res) {
  const backend = req.backend || null;
  const user = req.user || null;
  const backendId = String(req.query.backend_id || "").trim();

  if (backend) {
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
         payment_reference,
         paid_amount,
         payment_method,
         payment_source,
         payer_phone,
         created_at
       FROM license_requests
       WHERE backend_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [backend.id]
    );
    return res.json({ ok: true, rows: rows.rows || [] });
  }

  if (!user?.business_id) {
    return res.status(403).json({ ok: false, error: "BUSINESS_REQUIRED" });
  }
  if (!backendId) {
    return res.status(400).json({ ok: false, error: "BACKEND_ID_REQUIRED" });
  }
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
       payment_reference,
       paid_amount,
       payment_method,
       payment_source,
       payer_phone,
       created_at
     FROM license_requests
     WHERE backend_id = $1
       AND business_id = $2
     ORDER BY created_at DESC
     LIMIT 50`,
    [backendId, user.business_id]
  );
  return res.json({ ok: true, rows: rows.rows || [] });
}

async function status(req, res) {
  const backend = req.backend || {};
  const backendId = String(req.query.backend_id || backend.id || "").trim();
  if (!backendId) {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
  }
  if (backendId && String(backendId) !== String(backend.id)) {
    return res.status(403).json({ ok: false, error: "BACKEND_MISMATCH" });
  }
  try {
    const lic = await licenseService.getBackendLicense(backend.id);
    const reqRow = await pool.query(
      `
      SELECT status, requested_plan, device_count, requested_at
      FROM license_requests
      WHERE backend_id=$1
      ORDER BY requested_at DESC NULLS LAST, created_at DESC
      LIMIT 1
      `,
      [backend.id]
    );
    const lastReq = reqRow.rows[0] || null;
    const hasLicense = !!lic;
    let statusLabel = lastReq?.status || (hasLicense ? "LICENSE_READY" : "NO_REQUEST");
    if (lic) {
      const now = Date.now();
      const expMs = lic.expires_at ? new Date(lic.expires_at).getTime() : null;
      if (String(lic.status || "").toUpperCase() === "REVOKED") {
        statusLabel = "LICENSE_REVOKED";
      } else if (expMs && Number.isFinite(expMs) && expMs < now) {
        statusLabel = "LICENSE_EXPIRED";
      } else {
        statusLabel = "LICENSE_READY";
      }
    }
    return res.json({
      ok: true,
      has_license: hasLicense,
      status: statusLabel,
      license_id: lic?.license_id || null,
      plan: lic ? licenseService.normalizePlan(lic.plan, lic.device_limit) : (lastReq?.requested_plan || null),
      device_limit: lic?.device_limit ?? lastReq?.device_count ?? null,
      issued_at: lic ? toEpochSeconds(lic.issued_at) : null,
      expiry_date: lic ? toEpochSeconds(lic.expires_at) : null,
      delivery_methods: ["cloud_pull"]
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("LICENSE STATUS ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

async function pull(req, res) {
  const backend = req.backend || {};
  const backendId = String(req.query.backend_id || backend.id || "").trim();
  if (!backendId) {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST" });
  }
  if (backendId && String(backendId) !== String(backend.id)) {
    return res.status(403).json({ ok: false, error: "BACKEND_MISMATCH" });
  }
  try {
    const lic = await licenseService.getBackendLicense(backend.id);
    if (!lic) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "No license found" });
    }
    await logAudit({
      adminUser: `backend:${backend.id}`,
      action: "LICENSE_PULLED",
      backendId: backend.id,
      businessId: backend.business_id,
      licenseId: lic.license_id,
      oldValue: null,
      newValue: { status: lic.status }
    });
    return res.json({
      ok: true,
      license: {
        payload_b64: lic.payload_b64,
        sig_b64: lic.sig_b64
      },
      meta: {
        license_id: lic.license_id,
        plan: licenseService.normalizePlan(lic.plan, lic.device_limit),
        device_limit: lic.device_limit,
        issued_at: toEpochSeconds(lic.issued_at),
        expires_at: toEpochSeconds(lic.expires_at),
        grace_ends_at: toEpochSeconds(lic.grace_ends_at),
        status: lic.status || "ACTIVE"
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("LICENSE PULL ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

async function activate(req, res) {
  const backend = req.backend || {};
  try {
    const lic = await licenseService.getBackendLicense(backend.id);
    if (!lic) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "No license found" });
    }
    await logAudit({
      adminUser: `backend:${backend.id}`,
      action: "LICENSE_ACTIVATED",
      backendId: backend.id,
      businessId: backend.business_id,
      licenseId: lic.license_id,
      oldValue: null,
      newValue: { status: lic.status }
    });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("LICENSE ACTIVATE ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

module.exports = { current, request, status, pull, activate, requests };
