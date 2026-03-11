const express = require("express");
const { pool } = require("../db/pool");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

function normalizePlan(plan) {
  return String(plan || "").trim();
}

router.get("/health", (_req, res) => {
  return res.json({ ok: true, service: "publicApi", time: new Date().toISOString() });
});

router.post("/license-requests", auth, async (req, res) => {
  try {
    const body = req.body || {};
    const requestId = String(body.requestId || "").trim();
    if (!requestId) {
      return res.status(400).json({ ok: false, error: "REQUEST_ID_REQUIRED" });
    }

    const backend = req.backend || {};
    if (body.backendId && String(body.backendId) !== String(backend.id)) {
      return res.status(403).json({ ok: false, error: "BACKEND_MISMATCH" });
    }
    if (body.businessId && String(body.businessId) !== String(backend.business_id)) {
      return res.status(403).json({ ok: false, error: "BUSINESS_MISMATCH" });
    }
    if (body.branchId && String(body.branchId) !== String(backend.branch_id)) {
      return res.status(403).json({ ok: false, error: "BRANCH_MISMATCH" });
    }

    const exists = await pool.query(
      `SELECT id FROM license_requests WHERE request_id = $1 LIMIT 1`,
      [requestId]
    );
    if (exists.rows.length) {
      return res.status(409).json({ ok: false, error: "REQUEST_ALREADY_EXISTS" });
    }

    const requestedAt = body.requestedAt ? new Date(body.requestedAt) : new Date();
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
        updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,NOW(),NOW()
      )
      `,
      [
        requestId,
        String(body.product || "AutoMax POS"),
        String(body.version || ""),
        String(body.customerName || ""),
        String(body.email || ""),
        String(body.phone || ""),
        String(body.address || ""),
        String(body.location || ""),
        normalizePlan(body.plan),
        Number.isFinite(Number(body.deviceLimit)) ? Number(body.deviceLimit) : null,
        String(body.machineId || ""),
        String(body.deviceId || ""),
        backend.id,
        backend.business_id,
        backend.branch_id,
        requestedAt,
        String(body.status || "PENDING").toUpperCase()
      ]
    );

    return res.json({ ok: true, requestId });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("PUBLIC LICENSE REQUEST ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

router.post("/backend-license/register", auth, async (req, res) => {
  try {
    const body = req.body || {};
    const licenseId = String(body.licenseId || body.license_id || "").trim();
    const machineId = String(body.machineId || body.machine_id || "").trim();
    if (!licenseId) {
      return res.status(400).json({ ok: false, error: "LICENSE_ID_REQUIRED" });
    }
    if (!machineId) {
      return res.status(400).json({ ok: false, error: "MACHINE_ID_REQUIRED" });
    }

    const backend = req.backend || {};
    if (body.backendId && String(body.backendId) !== String(backend.id)) {
      return res.status(403).json({ ok: false, error: "BACKEND_MISMATCH" });
    }
    if (body.businessId && String(body.businessId) !== String(backend.business_id)) {
      return res.status(403).json({ ok: false, error: "BUSINESS_MISMATCH" });
    }
    if (body.branchId && String(body.branchId) !== String(backend.branch_id)) {
      return res.status(403).json({ ok: false, error: "BRANCH_MISMATCH" });
    }

    const issuedAt = body.issuedAt ? new Date(body.issuedAt) : null;
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    const graceEndsAt = body.graceEnds ? new Date(body.graceEnds) : null;
    const status = String(body.status || "ACTIVE").trim().toUpperCase();
    const plan = normalizePlan(body.plan);
    const deviceLimit = Number.isFinite(Number(body.deviceLimit)) ? Number(body.deviceLimit) : null;

    const byMachine = await pool.query(
      `SELECT id FROM backend_licenses WHERE machine_id = $1 LIMIT 1`,
      [machineId]
    );
    const byBackend = !byMachine.rows.length
      ? await pool.query(`SELECT id FROM backend_licenses WHERE backend_id = $1 LIMIT 1`, [backend.id])
      : { rows: [] };

    if (byMachine.rows.length || byBackend.rows.length) {
      const id = byMachine.rows[0]?.id || byBackend.rows[0]?.id;
      await pool.query(
        `
        UPDATE backend_licenses
        SET license_id=$1,
            plan=$2,
            device_limit=$3,
            issued_at=$4,
            expires_at=$5,
            grace_ends_at=$6,
            status=$7,
            backend_id=$8,
            business_id=$9,
            branch_id=$10,
            machine_id=$11,
            updated_at=NOW()
        WHERE id=$12
        `,
        [
          licenseId,
          plan || null,
          deviceLimit,
          issuedAt,
          expiresAt,
          graceEndsAt,
          status,
          backend.id,
          backend.business_id,
          backend.branch_id,
          machineId,
          id
        ]
      );
      return res.json({ ok: true, licenseId });
    }

    await pool.query(
      `
      INSERT INTO backend_licenses (
        business_id,
        branch_id,
        backend_id,
        machine_id,
        license_id,
        plan,
        device_limit,
        issued_at,
        expires_at,
        grace_ends_at,
        status,
        updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()
      )
      `,
      [
        backend.business_id,
        backend.branch_id,
        backend.id,
        machineId,
        licenseId,
        plan || null,
        deviceLimit,
        issuedAt,
        expiresAt,
        graceEndsAt,
        status
      ]
    );

    return res.json({ ok: true, licenseId });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("PUBLIC LICENSE REGISTER ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
