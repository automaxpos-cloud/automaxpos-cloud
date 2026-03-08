const { query } = require("../db/pool");

async function verifyLicense(backend, payload) {
  const { license_key, machine_id } = payload;
  const res = await query(
    `SELECT id, status, plan, machine_id AS bound_machine_id, expires_at
     FROM licenses
     WHERE license_key = $1 AND business_id = $2`,
    [license_key, backend.business_id]
  );

  if (!res.rows.length) {
    return { valid: false, status: "NOT_FOUND" };
  }

  const lic = res.rows[0];
  if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
    return { valid: false, status: "EXPIRED" };
  }
  if (lic.status && String(lic.status).toUpperCase() !== "ACTIVE") {
    return { valid: false, status: String(lic.status).toUpperCase() };
  }
  if (lic.bound_machine_id && lic.bound_machine_id !== machine_id) {
    return { valid: false, status: "MACHINE_MISMATCH" };
  }

  return { valid: true, status: "ACTIVE", plan: lic.plan || "" };
}

module.exports = { verifyLicense };
