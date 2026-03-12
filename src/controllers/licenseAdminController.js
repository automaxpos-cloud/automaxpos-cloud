const { query } = require("../db/pool");
const licenseService = require("../services/licenseService");

function toEpochSeconds(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
}

async function list(req, res) {
  try {
    const businessId = req.query.business_id || null;
    const branchId = req.query.branch_id || null;
    const backendId = req.query.backend_id || null;
    const result = await query(
      `
      SELECT
        bl.*,
        b.name AS business_name,
        br.name AS branch_name,
        bd.backend_name
      FROM backend_licenses bl
      LEFT JOIN businesses b ON b.id = bl.business_id
      LEFT JOIN branches br ON br.id = bl.branch_id
      LEFT JOIN backend_devices bd ON bd.id = bl.backend_id
      WHERE ($1::uuid IS NULL OR bl.business_id = $1)
        AND ($2::uuid IS NULL OR bl.branch_id = $2)
        AND ($3::uuid IS NULL OR bl.backend_id = $3)
      ORDER BY bl.updated_at DESC
      `,
      [businessId, branchId, backendId]
    );
    return res.json({ ok: true, rows: result.rows || [] });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("LICENSE LIST ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to load licenses" });
  }
}

async function current(req, res) {
  try {
    const backendId = String(req.query.backend_id || "").trim();
    if (!backendId) {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "backend_id required" });
    }
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
        plan: lic.plan_name || licenseService.normalizePlan(lic.plan, lic.device_limit),
        device_limit: lic.total_device_limit ?? lic.device_limit,
        issued_at: toEpochSeconds(lic.issued_at),
        expires_at: toEpochSeconds(lic.expires_at),
        grace_ends_at: toEpochSeconds(lic.grace_ends_at),
        status: lic.status || "ACTIVE",
        backend_id: lic.backend_id,
        business_id: lic.business_id,
        branch_id: lic.branch_id
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("LICENSE CURRENT ADMIN ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to load license" });
  }
}

async function issue(req, res) {
  try {
    const { backend_id, plan, device_limit } = req.body || {};
    if (!backend_id) {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "backend_id required" });
    }
    const pendingReq = await query(
      `SELECT payment_status
       FROM license_requests
       WHERE backend_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [backend_id]
    );
    if (pendingReq.rows.length) {
      const pay = String(pendingReq.rows[0].payment_status || "").toUpperCase();
      if (pay !== "PAID") {
        return res.status(403).json({ ok: false, error: "PAYMENT_REQUIRED", message: "Payment not confirmed." });
      }
    }
    const license = await licenseService.issueBackendLicense({
      backendId: String(backend_id),
      issueType: "new_license",
      planName: plan,
      baseDeviceLimit: device_limit
    });
    return res.json({ ok: true, license });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("LICENSE ISSUE ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to issue license" });
  }
}

module.exports = { list, current, issue };
