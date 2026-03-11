const bcrypt = require("bcrypt");
const { query } = require("../db/pool");
const { v4: uuidv4 } = require("uuid");

function generateApiKey() {
  return uuidv4().replace(/-/g, "") + uuidv4().replace(/-/g, "");
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

  const existing = await query(
    `SELECT id FROM backend_devices
     WHERE ($1::uuid IS NOT NULL AND installation_id = $1)
        OR ($2::text IS NOT NULL AND machine_id = $2)
     ORDER BY last_seen_at DESC NULLS LAST, created_at DESC NULLS LAST, id
     LIMIT 1`,
    [installation_id || null, device_fingerprint || null]
  );

  if (existing.rows.length) {
    const backendId = existing.rows[0].id;
    await query(
      `UPDATE backend_devices
       SET business_id = $1,
           branch_id = $2,
           api_key_hash = $3,
           backend_version = $4,
           backend_name = $5,
           installation_id = $6,
           machine_id = $7,
           device_secret_hash = $8,
           is_active = TRUE,
           last_seen_at = NOW()
       WHERE id = $9`,
      [
        business_id,
        branch_id,
        backendTokenHash,
        app_version || null,
        backend_name || null,
        installation_id || null,
        device_fingerprint || null,
        deviceSecretHash,
        backendId
      ]
    );

    // eslint-disable-next-line no-console
    console.log("[HOSTED_REGISTER] machine_id=%s client_backend_id=%s stored_backend_id=%s action=update business_id=%s branch_id=%s token_prefix=%s",
      device_fingerprint, clientBackendId || "-", backendId, business_id, branch_id, tokenPrefix
    );

    return res.json({
      ok: true,
      backend_id: backendId,
      backend_token: backendToken,
      api_key: backendToken,
      business_id,
      branch_id,
      reused: true
    });
  }

  const result = await query(
    `INSERT INTO backend_devices
     (business_id, branch_id, api_key_hash, is_active, backend_version, machine_id, backend_name, last_seen_at, installation_id, device_secret_hash)
     VALUES ($1,$2,$3,TRUE,$4,$5,$6,NOW(),$7,$8)
     RETURNING id`,
    [
      business_id,
      branch_id,
      backendTokenHash,
      app_version || null,
      device_fingerprint || null,
      backend_name || null,
      installation_id || null,
      deviceSecretHash
    ]
  );

  // eslint-disable-next-line no-console
  console.log("[HOSTED_REGISTER] machine_id=%s client_backend_id=%s stored_backend_id=%s action=insert business_id=%s branch_id=%s token_prefix=%s",
    device_fingerprint, clientBackendId || "-", result.rows[0].id, business_id, branch_id, tokenPrefix
  );

  return res.json({
    ok: true,
    backend_id: result.rows[0].id,
    backend_token: backendToken,
    api_key: backendToken,
    business_id,
    branch_id
  });
}

module.exports = { createBusiness, createBranch, registerBackend };
