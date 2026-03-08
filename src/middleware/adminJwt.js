const jwt = require("jsonwebtoken");

function adminJwt(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      ok: false,
      message: "Auth not configured",
      code: "AUTH_NOT_CONFIGURED"
    });
  }

  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return res.status(401).json({
      ok: false,
      message: "Unauthorized",
      code: "UNAUTHORIZED"
    });
  }

  try {
    const payload = jwt.verify(token, secret);
    if (!payload || (payload.role !== "SUPER_ADMIN" && payload.role !== "SUPERADMIN")) {
      return res.status(403).json({
        ok: false,
        message: "Forbidden",
        code: "FORBIDDEN"
      });
    }
    req.admin = payload;
    return next();
  } catch (e) {
    return res.status(401).json({
      ok: false,
      message: "Unauthorized",
      code: "UNAUTHORIZED"
    });
  }
}

module.exports = adminJwt;
