const stockSyncService = require("../services/stockSyncService");

async function syncStockMovements(req, res) {
  const { movements } = req.body || {};
  if (!Array.isArray(movements)) {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "movements array required" });
  }
  try {
    const result = await stockSyncService.insertMovements(req.backend, movements);
    return res.json({ ok: true, ...result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("STOCK SYNC ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to sync stock movements" });
  }
}

module.exports = { syncStockMovements };
