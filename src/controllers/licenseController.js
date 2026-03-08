const licenseService = require("../services/licenseService");

async function verify(req, res) {
  const { license_key, machine_id, backend_id } = req.body || {};
  if (!license_key || !machine_id || !backend_id) {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "license_key, machine_id, backend_id required" });
  }
  try {
    const result = await licenseService.verifyLicense(req.backend, { license_key, machine_id, backend_id });
    if (!result.valid) {
      return res.status(200).json({ ok: false, valid: false, status: result.status || "INVALID" });
    }
    return res.json({ ok: true, valid: true, status: result.status, plan: result.plan || "" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("LICENSE VERIFY ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to verify license" });
  }
}

module.exports = { verify };
