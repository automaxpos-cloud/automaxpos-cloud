const backendService = require("../services/backendService");
const deviceFingerprintService = require("../services/deviceFingerprintService");

async function heartbeat(req, res) {
  try {
    await backendService.recordHeartbeat(req.backend, req.body || {});
    const fpHash = String(req.body?.fingerprint_hash || "").trim();
    if (fpHash) {
      try {
        await deviceFingerprintService.recordFingerprint({
          backend_id: req.backend?.id || null,
          license_id: null,
          fingerprint_hash: fpHash,
          hostname: req.body?.hostname || null,
          platform: req.body?.platform || null
        });
      } catch (_) {}
    }
    res.json({ ok: true, message: "Heartbeat received" });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("HEARTBEAT ERROR:", err);
    res.status(500).json({
      ok: false,
      error: "SERVER_ERROR",
      message: err && err.message ? err.message : "Failed to record heartbeat"
    });
  }
}

module.exports = { heartbeat };
