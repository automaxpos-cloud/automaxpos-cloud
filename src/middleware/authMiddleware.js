const bcrypt = require("bcrypt");
const { query } = require("../db/pool");

async function authMiddleware(req, res, next) {
  try {
    const auth = String(req.headers.authorization || "");
    const apiKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const backendId = String(req.headers["x-backend-id"] || "").trim();
    const businessId = String(req.headers["x-business-id"] || "").trim();
    const branchId = String(req.headers["x-branch-id"] || "").trim();

    if (!apiKey || !backendId || !businessId || !branchId) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Missing auth headers" });
    }

    const result = await query(
      "SELECT id, api_key_hash, is_active, business_id, branch_id FROM backend_devices WHERE id = $1",
      [backendId]
    );

    if (!result.rows.length) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Unknown backend" });
    }

    const row = result.rows[0];

    if (!row.is_active) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Backend disabled" });
    }

    if (String(row.business_id) !== businessId || String(row.branch_id) !== branchId) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Backend context mismatch" });
    }

    const ok = await bcrypt.compare(apiKey, row.api_key_hash || "");
    if (!ok) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Invalid API key" });
    }

    req.backend = { id: row.id, business_id: row.business_id, branch_id: row.branch_id };
    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("AUTH ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Auth error" });
  }
}

module.exports = authMiddleware;
