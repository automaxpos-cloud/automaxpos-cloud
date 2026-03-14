const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/pool");

async function getCloudUserColumns() {
  const res = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='cloud_users'
    `
  );
  return new Set(res.rows.map((r) => r.column_name));
}

function selectUserCol(cols, col, alias, fallback = "NULL") {
  return cols.has(col) ? `${col} AS ${alias}` : `${fallback} AS ${alias}`;
}

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
    const cols = await getCloudUserColumns();
    if (!cols.size) {
      return res.status(500).json({
        ok: false,
        message: "Admin user storage not initialized",
        code: "USER_TABLE_MISSING"
      });
    }
    if (!cols.has("password_hash") || !cols.has("role")) {
      return res.status(500).json({
        ok: false,
        message: "Admin user schema missing required fields",
        code: "USER_SCHEMA_INVALID"
      });
    }

    let where = null;
    if (cols.has("username") && cols.has("email")) {
      where = "LOWER(username) = $1 OR LOWER(email) = $1";
    } else if (cols.has("username")) {
      where = "LOWER(username) = $1";
    } else if (cols.has("email")) {
      where = "LOWER(email) = $1";
    } else {
      return res.status(500).json({
        ok: false,
        message: "Admin user schema missing login fields",
        code: "USER_SCHEMA_INVALID"
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        ${selectUserCol(cols, "username", "username")},
        ${selectUserCol(cols, "email", "email")},
        password_hash,
        role,
        ${selectUserCol(cols, "business_id", "business_id")},
        ${selectUserCol(cols, "branch_id", "branch_id")},
        ${selectUserCol(cols, "is_active", "is_active", "TRUE")}
      FROM cloud_users
      WHERE ${where}
      LIMIT 1
      `,
      [loginId]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({
        ok: false,
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS"
      });
    }
    if (user.is_active === false) {
      return res.status(403).json({
        ok: false,
        message: "Account is inactive",
        code: "ACCOUNT_INACTIVE"
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
      message: err?.message ? `Login failed: ${err.message}` : "Server error",
      code: "SERVER_ERROR"
    });
  }
};

exports.refresh = async (req, res) => {
  res.status(501).json({ ok: false, error: "NOT_IMPLEMENTED" });
};
