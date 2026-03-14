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

async function registerBackend(req, res) {
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

  let result = null;
  if (installation_id) {
    result = await query(
      `INSERT INTO backend_devices
       (business_id, branch_id, api_key_hash, is_active, backend_version, machine_id, backend_name, last_seen_at, installation_id, device_secret_hash)
       VALUES ($1,$2,$3,TRUE,$4,$5,$6,NOW(),$7,$8)
       ON CONFLICT (installation_id)
       DO UPDATE SET
         business_id = EXCLUDED.business_id,
         branch_id = EXCLUDED.branch_id,
         api_key_hash = EXCLUDED.api_key_hash,
         is_active = TRUE,
         backend_version = EXCLUDED.backend_version,
         machine_id = EXCLUDED.machine_id,
         backend_name = EXCLUDED.backend_name,
         device_secret_hash = EXCLUDED.device_secret_hash,
         last_seen_at = NOW()
       RETURNING id, (xmax = 0) AS inserted`,
      [
        business_id,
        branch_id,
        backendTokenHash,
        app_version || null,
        device_fingerprint || null,
        backend_name || null,
        installation_id,
        deviceSecretHash
      ]
    );
  } else {
    result = await query(
      `INSERT INTO backend_devices
       (business_id, branch_id, api_key_hash, is_active, backend_version, machine_id, backend_name, last_seen_at, device_secret_hash)
       VALUES ($1,$2,$3,TRUE,$4,$5,$6,NOW(),$7)
       ON CONFLICT (machine_id)
       DO UPDATE SET
         business_id = EXCLUDED.business_id,
         branch_id = EXCLUDED.branch_id,
         api_key_hash = EXCLUDED.api_key_hash,
         is_active = TRUE,
         backend_version = EXCLUDED.backend_version,
         backend_name = EXCLUDED.backend_name,
         device_secret_hash = EXCLUDED.device_secret_hash,
         last_seen_at = NOW()
       RETURNING id, (xmax = 0) AS inserted`,
      [
        business_id,
        branch_id,
        backendTokenHash,
        app_version || null,
        device_fingerprint || null,
        backend_name || null,
        deviceSecretHash
      ]
    );
  }

  const backendId = result.rows[0].id;
  const action = result.rows[0].inserted ? "insert" : "update";
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

module.exports = { createBusiness, createBranch, registerBackend, rotateBackendToken };
