const { ingestReturn } = require("../services/returnsIngestService");

async function syncReturns(req, res) {
  try {
    const body = req.body || {};
    const result = await ingestReturn(req.backend, body);
    return res.json({ ok: true, ...result });
  } catch (err) {
    if (err && err.code === "BAD_REQUEST") {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: err.message });
    }
    // eslint-disable-next-line no-console
    console.error("RETURNS SYNC ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to sync returns" });
  }
}

module.exports = { syncReturns };
