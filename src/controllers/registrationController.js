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
  const { business_id, branch_id, backend_name, device_fingerprint, app_version } = req.body || {};
  if (!business_id || !branch_id) {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "business_id and branch_id required" });
  }

  const apiKey = generateApiKey();
  const apiKeyHash = await bcrypt.hash(apiKey, 10);

  const result = await query(
    `INSERT INTO backend_devices
     (business_id, branch_id, api_key_hash, is_active, backend_version, machine_id, backend_name)
     VALUES ($1,$2,$3,TRUE,$4,$5,$6)
     RETURNING id`,
    [
      business_id,
      branch_id,
      apiKeyHash,
      app_version || null,
      device_fingerprint || null,
      backend_name || null
    ]
  );

  return res.json({
    ok: true,
    backend_id: result.rows[0].id,
    api_key: apiKey,
    business_id,
    branch_id
  });
}

module.exports = { createBusiness, createBranch, registerBackend };
