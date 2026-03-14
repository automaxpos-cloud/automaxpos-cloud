const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");

exports.login = async (req, res) => {
  const { username, password, remember } = req.body || {};
  const loginId = String(username || "").trim().toLowerCase();
  const adminUser = process.env.SUPERADMIN_USERNAME || process.env.OWNER_EMAIL;
  const adminHash = process.env.SUPERADMIN_PASSWORD_HASH || process.env.OWNER_PASSWORD_HASH;
  const secret = process.env.JWT_SECRET;

  if (!adminUser || !adminHash || !secret) {
    return res.status(500).json({
      ok: false,
      message: "Auth not configured",
      code: "AUTH_NOT_CONFIGURED"
    });
  }

  if (!loginId || !password) {
    return res.status(400).json({
      ok: false,
      message: "username and password required",
      code: "BAD_REQUEST"
    });
  }

  // 1) env-based SUPERADMIN (keep intact)
  if (String(username) === String(adminUser)) {
    const ok = await bcrypt.compare(String(password), String(adminHash));
    if (!ok) {
      return res.status(401).json({
        ok: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS"
      });
    }
    const token = jwt.sign(
      {
        role: "SUPERADMIN",
        username: adminUser,
        auth_source: "env_superadmin"
      },
      secret,
      { expiresIn: remember ? "30d" : "12h" }
    );
    return res.json({ ok: true, token });
  }

  // 2) cloud_users table
  try {
    const result = await pool.query(
      `SELECT id, username, email, password_hash, role, business_id, branch_id, is_active
       FROM cloud_users
       WHERE LOWER(username) = $1 OR LOWER(email) = $1
       LIMIT 1`,
      [loginId]
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({
        ok: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS"
      });
    }
    const ok = await bcrypt.compare(String(password), String(user.password_hash));
    if (!ok) {
      return res.status(401).json({
        ok: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS"
      });
    }
    await pool.query(
      `UPDATE cloud_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [user.id]
    );
    const token = jwt.sign(
      {
        user_id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        business_id: user.business_id,
        branch_id: user.branch_id,
        auth_source: "cloud_user"
      },
      secret,
      { expiresIn: remember ? "30d" : "12h" }
    );
    return res.json({ ok: true, token });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("CLOUD USER LOGIN ERROR:", err);
    return res.status(500).json({
      ok: false,
      message: "Server error",
      code: "SERVER_ERROR"
    });
  }
};

exports.refresh = async (req, res) => {
  res.status(501).json({ ok: false, error: "NOT_IMPLEMENTED" });
};
