const backendService = require("../services/backendService");

async function heartbeat(req, res) {
  try {
    await backendService.recordHeartbeat(req.backend, req.body || {});
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
