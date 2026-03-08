function adminAuth(req, res, next) {
  const expected = process.env.CLOUD_ADMIN_TOKEN;
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!expected) {
    return res.status(500).json({
      ok: false,
      message: "Admin auth not configured",
      code: "AUTH_NOT_CONFIGURED"
    });
  }

  if (!token || token !== expected) {
    return res.status(401).json({
      ok: false,
      message: "Unauthorized",
      code: "UNAUTHORIZED"
    });
  }

  return next();
}

module.exports = adminAuth;
