const bcrypt = require("bcrypt");
const { query } = require("../db/pool");

async function authMiddleware(req, res, next) {
  try {
    const auth = String(req.headers.authorization || "");
    const apiKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const backendId = String(req.headers["x-backend-id"] || "").trim();
    const businessId = String(req.headers["x-business-id"] || "").trim();
    const branchId = String(req.headers["x-branch-id"] || "").trim();
    const tokenPrefix = apiKey ? apiKey.slice(0, 6) : "";

    const maskId = (value) => {
      const v = String(value || "");
      if (!v) return "-";
      if (v.length <= 8) return "***";
      return `${v.slice(0, 4)}***${v.slice(-4)}`;
    };

    if (!apiKey || !backendId) {
      // eslint-disable-next-line no-console
      console.log("[HOSTED_HEARTBEAT] backend_id=%s token_present=%s reason=missing_headers",
        maskId(backendId || "-"), apiKey ? "yes" : "no"
      );
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Missing auth headers" });
    }

    const result = await query(
      "SELECT id, api_key_hash, is_active, business_id, branch_id FROM backend_devices WHERE id = $1",
      [backendId]
    );

    if (!result.rows.length) {
      // eslint-disable-next-line no-console
      console.log("[HOSTED_HEARTBEAT] backend_id=%s token_prefix=%s found=no reason=backend_not_found",
        maskId(backendId), tokenPrefix
      );
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Unknown backend" });
    }

    const row = result.rows[0];

    if (!row.is_active) {
      // eslint-disable-next-line no-console
      console.log("[HOSTED_HEARTBEAT] backend_id=%s token_prefix=%s found=yes reason=backend_disabled",
        maskId(backendId), tokenPrefix
      );
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Backend disabled" });
    }

    if (businessId && branchId && (String(row.business_id) !== businessId || String(row.branch_id) !== branchId)) {
      // eslint-disable-next-line no-console
      console.log("[HOSTED_HEARTBEAT] backend_id=%s token_prefix=%s found=yes reason=context_mismatch expected_business=%s expected_branch=%s",
        maskId(backendId), tokenPrefix, row.business_id, row.branch_id
      );
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Backend context mismatch" });
    }

    const ok = await bcrypt.compare(apiKey, row.api_key_hash || "");
    if (!ok) {
      // eslint-disable-next-line no-console
      console.log("[HOSTED_HEARTBEAT] backend_id=%s token_prefix=%s found=yes reason=invalid_api_key",
        maskId(backendId), tokenPrefix
      );
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Invalid API key" });
    }

    // eslint-disable-next-line no-console
    console.log("[HOSTED_HEARTBEAT] backend_id=%s token_prefix=%s found=yes auth=ok",
      maskId(backendId), tokenPrefix
    );
    req.backend = { id: row.id, business_id: row.business_id, branch_id: row.branch_id };
    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("AUTH ERROR:", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Auth error" });
  }
}

module.exports = authMiddleware;
