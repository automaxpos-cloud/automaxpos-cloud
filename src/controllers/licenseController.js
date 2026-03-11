const licenseService = require("../services/licenseService");

function toEpochSeconds(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
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

module.exports = { current };
