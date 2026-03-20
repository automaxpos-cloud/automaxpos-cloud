const bcrypt = require("bcrypt");
const { query } = require("../db/pool");
const { v4: uuidv4 } = require("uuid");

function generateApiKey() {
  return uuidv4().replace(/-/g, "") + uuidv4().replace(/-/g, "");
}

function maskId(value) {
  const v = String(value || "");
  if (!v) return "-";
  if (v.length <= 8) return "***";
  return `${v.slice(0, 4)}***${v.slice(-4)}`;
}

async function createBusiness(req, res) {
  const { business_name, owner_name, email, phone } = req.body || {};
  if (!business_name) {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "business_name required" });
  }
  const result = await query(
    `INSERT INTO businesses (name, owner_name, email, phone)
     VALUES ($1,$2,$3,$4)
     RETURNING id`,
    [String(business_name), owner_name || null, email || null, phone || null]
  );
  return res.json({ ok: true, business_id: result.rows[0].id });
}

async function createBranch(req, res) {
  const { business_id, branch_name, location } = req.body || {};
  if (!business_id || !branch_name) {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "business_id and branch_name required" });
  }
  const result = await query(
    `INSERT INTO branches (business_id, name, location)
     VALUES ($1,$2,$3)
     RETURNING id`,
    [business_id, String(branch_name), location || null]
  );
  return res.json({ ok: true, branch_id: result.rows[0].id, business_id });
}

async function listBranchesForBackend(req, res) {
  try {
    const backend = req.backend || {};
    const businessId = backend.business_id || null;
    if (!businessId) {
      return res.status(400).json({ ok: false, error: "BUSINESS_REQUIRED" });
    }
    const onlyActive = String(req.query?.status || "").toUpperCase() === "ACTIVE";
    const rows = await query(
      `SELECT id, business_id, name, code, phone, email, address, city, manager_name, status
       FROM branches
       WHERE business_id = $1
         AND ($2::boolean IS FALSE OR COALESCE(status,'ACTIVE') = 'ACTIVE')
       ORDER BY name ASC`,
      [businessId, onlyActive]
    );
    return res.json({ ok: true, branches: rows.rows || [] });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
}

let _backendDeviceCols = null;
async function getBackendDeviceColumns() {
  if (_backendDeviceCols) return _backendDeviceCols;
  const res = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name='backend_devices'`
  );
  _backendDeviceCols = new Set(res.rows.map((r) => r.column_name));
  return _backendDeviceCols;
}

async function registerBackend(req, res) {
  try {
    const {
      business_id,
      branch_id,
      backend_name,
      device_fingerprint,
      app_version,
      installation_id,
      device_secret
    } = req.body || {};
    if (!business_id || !branch_id) {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "business_id and branch_id required" });
    }
    if (!device_fingerprint && !installation_id) {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "device_fingerprint or installation_id required" });
    }

    const backendToken = generateApiKey();
    const backendTokenHash = await bcrypt.hash(backendToken, 10);
    const deviceSecretHash = device_secret ? await bcrypt.hash(String(device_secret), 10) : null;
    const clientBackendId = req.body?.backend_id || null;
    const tokenPrefix = backendToken.slice(0, 6);

    const cols = await getBackendDeviceColumns();
    const has = (c) => cols.has(c);

    let existingId = null;
    if (installation_id && has("installation_id")) {
      const existing = await query(
        `SELECT id FROM backend_devices WHERE installation_id = $1 LIMIT 1`,
        [installation_id]
      );
      existingId = existing.rows[0]?.id || null;
    }
    if (!existingId && device_fingerprint && has("machine_id")) {
      const existing = await query(
        `SELECT id FROM backend_devices WHERE machine_id = $1 LIMIT 1`,
        [device_fingerprint]
      );
      existingId = existing.rows[0]?.id || null;
    }

    let backendId = null;
    let action = "insert";
    if (existingId) {
      const updates = [];
      const values = [];
      const addUpdate = (col, val) => {
        if (!has(col)) return;
        values.push(val);
        updates.push(`${col} = $${values.length}`);
      };
      addUpdate("business_id", business_id);
      addUpdate("branch_id", branch_id);
      addUpdate("api_key_hash", backendTokenHash);
      addUpdate("is_active", true);
      addUpdate("backend_version", app_version || null);
      addUpdate("machine_id", device_fingerprint || null);
      addUpdate("backend_name", backend_name || null);
      addUpdate("installation_id", installation_id || null);
      addUpdate("device_secret_hash", deviceSecretHash);
      if (has("last_seen_at")) {
        updates.push("last_seen_at = NOW()");
      }
      values.push(existingId);
      const result = await query(
        `UPDATE backend_devices SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING id`,
        values
      );
      backendId = result.rows[0]?.id || existingId;
      action = "update";
    } else {
      const columns = [];
      const placeholders = [];
      const values = [];
      const add = (col, val) => {
        if (!has(col)) return;
        columns.push(col);
        values.push(val);
        placeholders.push(`$${values.length}`);
      };
      add("business_id", business_id);
      add("branch_id", branch_id);
      add("api_key_hash", backendTokenHash);
      add("is_active", true);
      add("backend_version", app_version || null);
      add("machine_id", device_fingerprint || null);
      add("backend_name", backend_name || null);
      add("installation_id", installation_id || null);
      add("device_secret_hash", deviceSecretHash);
      if (has("last_seen_at")) {
        columns.push("last_seen_at");
        placeholders.push("NOW()");
      }

      const result = await query(
        `INSERT INTO backend_devices (${columns.join(", ")})
         VALUES (${placeholders.join(", ")})
         RETURNING id`,
        values
      );
      backendId = result.rows[0]?.id || null;
      action = "insert";
    }

    // eslint-disable-next-line no-console
    console.log("[HOSTED_REGISTER] machine_id=%s client_backend_id=%s stored_backend_id=%s action=%s business_id=%s branch_id=%s token_prefix=%s",
      maskId(device_fingerprint), maskId(clientBackendId || "-"), maskId(backendId), action, business_id, branch_id, tokenPrefix
    );

    try {
      const demoDays = Number(process.env.DEMO_DAYS || 14);
      const machineId = String(device_fingerprint || "").trim();
      if (machineId) {
        await query(
          `
          INSERT INTO backend_demo_records (
            machine_id,
            backend_id,
            business_id,
            first_demo_started_at,
            demo_expires_at,
            last_seen_at,
            install_count,
            status,
            created_at,
            updated_at
          )
          VALUES (
            $1,$2,$3,NOW(),NOW() + ($4 || ' days')::interval,NOW(),1,'ACTIVE',NOW(),NOW()
          )
          ON CONFLICT (machine_id) DO UPDATE SET
            backend_id = EXCLUDED.backend_id,
            business_id = EXCLUDED.business_id,
            last_seen_at = NOW(),
            install_count = backend_demo_records.install_count + 1,
            updated_at = NOW()
          `,
          [machineId, backendId, business_id, String(demoDays)]
        );
      }
    } catch (e) {
      console.warn("[DEMO_TRACK] failed:", e?.message || e);
    }

    return res.json({
      ok: true,
      backend_id: backendId,
      backend_token: backendToken,
      api_key: backendToken,
      business_id,
      branch_id,
      reused: action !== "insert"
    });
  } catch (err) {
    console.error("HOSTED REGISTER ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "SERVER_ERROR",
      message: err?.message || "Registration failed"
    });
  }
}

async function rotateBackendToken(req, res) {
  try {
    const backendId = req.backend?.id || null;
    if (!backendId) {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "backend_id required" });
    }
    const backendToken = generateApiKey();
    const backendTokenHash = await bcrypt.hash(backendToken, 10);
    const result = await query(
      `UPDATE backend_devices
       SET api_key_hash = $1,
           token_version = COALESCE(token_version, 1) + 1,
           last_seen_at = NOW()
       WHERE id = $2
       RETURNING token_version`,
      [backendTokenHash, backendId]
    );
    return res.json({
      ok: true,
      backend_id: backendId,
      backend_token: backendToken,
      token_version: result.rows[0]?.token_version || 1
    });
  } catch (err) {
    console.error("ROTATE TOKEN ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Token rotation failed" });
  }
}

module.exports = { createBusiness, createBranch, listBranchesForBackend, registerBackend, rotateBackendToken };
