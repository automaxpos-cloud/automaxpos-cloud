const { ingestSnapshot } = require("../services/inventorySnapshotService");

async function syncSnapshot(req, res) {
  try {
    const result = await ingestSnapshot(req.backend, req.body || {});
    return res.json({ ok: true, ...result });
  } catch (err) {
    if (err && err.code === "BAD_REQUEST") {
      return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: err.message });
    }
    // eslint-disable-next-line no-console
    console.error("INVENTORY SNAPSHOT ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to sync snapshot" });
  }
}

module.exports = { syncSnapshot };
