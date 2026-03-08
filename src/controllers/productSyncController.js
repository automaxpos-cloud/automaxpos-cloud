const productSyncService = require("../services/productSyncService");

async function syncProducts(req, res) {
  const { products } = req.body || {};
  if (!Array.isArray(products)) {
    return res.status(400).json({ ok: false, error: "BAD_REQUEST", message: "products array required" });
  }
  try {
    const result = await productSyncService.upsertProducts(req.backend, products);
    return res.json({ ok: true, ...result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("PRODUCT SYNC ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to sync products" });
  }
}

async function getProductChanges(req, res) {
  const sinceRevision = Number(req.query.since_revision || 0);
  try {
    const result = await productSyncService.getChanges(req.backend, sinceRevision);
    return res.json({ ok: true, ...result });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("PRODUCT CHANGES ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Failed to load product changes" });
  }
}

module.exports = { syncProducts, getProductChanges };
