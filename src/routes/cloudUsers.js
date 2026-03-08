const express = require("express");
const bcrypt = require("bcrypt");
const { pool } = require("../db/pool");
const adminJwt = require("../middleware/adminJwt");

const router = express.Router();

const ROLES = new Set(["SUPERADMIN", "BUSINESS_OWNER", "BRANCH_MANAGER", "AUDITOR"]);

function bad(res, message, code = "BAD_REQUEST") {
  return res.status(400).json({ ok: false, message, code });
}

function forbidden(res) {
  return res.status(403).json({ ok: false, message: "Forbidden", code: "FORBIDDEN" });
}

async function auditLog(actor, action, entityType, entityId, details) {
  try {
    await pool.query(
      `INSERT INTO cloud_audit_logs (actor_user_id, actor_username, action, entity_type, entity_id, details_json)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        actor?.user_id || null,
        actor?.username || null,
        action,
        entityType,
        entityId || null,
        details ? JSON.stringify(details) : null
      ]
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("AUDIT LOG ERROR:", err.message);
  }
}

async function ensureBusinessBranch(businessId, branchId) {
  if (!branchId) return true;
  const br = await pool.query("SELECT business_id FROM branches WHERE id = $1", [branchId]);
  if (!br.rows[0]) return false;
  if (businessId && br.rows[0].business_id !== businessId) return false;
  return true;
}

router.get("/", adminJwt, async (req, res) => {
  if (req.admin?.role !== "SUPER_ADMIN" && req.admin?.role !== "SUPERADMIN") return forbidden(res);
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.full_name, u.role, u.is_active, u.created_at,
              u.business_id, u.branch_id,
              b.name AS business_name,
              br.name AS branch_name
       FROM cloud_users u
       LEFT JOIN businesses b ON b.id = u.business_id
       LEFT JOIN branches br ON br.id = u.branch_id
       ORDER BY u.created_at DESC`
    );
    return res.json({ ok: true, rows: result.rows || [] });
  } catch (err) {
    console.error("USERS LIST ERROR:", err);
    return res.status(500).json({ ok: false, message: "Server error", code: "SERVER_ERROR" });
  }
});

router.post("/", adminJwt, async (req, res) => {
  if (req.admin?.role !== "SUPER_ADMIN" && req.admin?.role !== "SUPERADMIN") return forbidden(res);
  try {
    const {
      username,
      full_name,
      password,
      role,
      business_id,
      branch_id,
      is_active
    } = req.body || {};

    if (!username) return bad(res, "username required");
    if (!full_name) return bad(res, "full_name required");
    if (!password) return bad(res, "password required");
    if (!role || !ROLES.has(role)) return bad(res, "invalid role");

    if (role !== "SUPERADMIN") {
      if (!business_id) return bad(res, "business_id required");
    }
    if (role === "BRANCH_MANAGER" && !branch_id) {
      return bad(res, "branch_id required");
    }
    if (!(await ensureBusinessBranch(business_id, branch_id))) {
      return bad(res, "branch_id does not belong to business_id");
    }

    const hash = await bcrypt.hash(String(password), 10);
    const result = await pool.query(
      `INSERT INTO cloud_users
       (username, password_hash, full_name, role, business_id, branch_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [
        String(username).trim(),
        hash,
        String(full_name).trim(),
        role,
        business_id || null,
        branch_id || null,
        is_active !== false
      ]
    );
    await auditLog(req.admin, "USER_CREATED", "cloud_users", result.rows[0].id, {
      username,
      role,
      business_id,
      branch_id
    });
    return res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    if (err && err.code === "23505") {
      return res.status(400).json({ ok: false, message: "username already exists", code: "DUPLICATE" });
    }
    console.error("USER CREATE ERROR:", err);
    return res.status(500).json({ ok: false, message: "Server error", code: "SERVER_ERROR" });
  }
});

router.patch("/:id", adminJwt, async (req, res) => {
  if (req.admin?.role !== "SUPER_ADMIN" && req.admin?.role !== "SUPERADMIN") return forbidden(res);
  try {
    const userId = req.params.id;
    const existing = await pool.query("SELECT * FROM cloud_users WHERE id = $1", [userId]);
    if (!existing.rows[0]) {
      return res.status(404).json({ ok: false, message: "User not found", code: "NOT_FOUND" });
    }
    const current = existing.rows[0];

    const {
      full_name,
      role,
      business_id,
      branch_id,
      is_active
    } = req.body || {};

    const nextRole = role || current.role;
    if (!ROLES.has(nextRole)) return bad(res, "invalid role");

    const nextBusinessId = business_id !== undefined ? business_id : current.business_id;
    const nextBranchId = branch_id !== undefined ? branch_id : current.branch_id;

    if (nextRole !== "SUPERADMIN") {
      if (!nextBusinessId) return bad(res, "business_id required");
    }
    if (nextRole === "BRANCH_MANAGER" && !nextBranchId) {
      return bad(res, "branch_id required");
    }
    if (!(await ensureBusinessBranch(nextBusinessId, nextBranchId))) {
      return bad(res, "branch_id does not belong to business_id");
    }

    const result = await pool.query(
      `UPDATE cloud_users
       SET full_name = COALESCE($1, full_name),
           role = $2,
           business_id = $3,
           branch_id = $4,
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id`,
      [
        full_name !== undefined ? String(full_name).trim() : null,
        nextRole,
        nextRole === "SUPERADMIN" ? null : nextBusinessId,
        nextRole === "SUPERADMIN" ? null : nextBranchId,
        typeof is_active === "boolean" ? is_active : null,
        userId
      ]
    );

    await auditLog(req.admin, "USER_UPDATED", "cloud_users", result.rows[0].id, {
      role: nextRole,
      business_id: nextBusinessId,
      branch_id: nextBranchId,
      is_active
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("USER UPDATE ERROR:", err);
    return res.status(500).json({ ok: false, message: "Server error", code: "SERVER_ERROR" });
  }
});

router.post("/:id/reset-password", adminJwt, async (req, res) => {
  if (req.admin?.role !== "SUPER_ADMIN" && req.admin?.role !== "SUPERADMIN") return forbidden(res);
  try {
    const userId = req.params.id;
    const { password } = req.body || {};
    if (!password) return bad(res, "password required");

    const existing = await pool.query("SELECT id FROM cloud_users WHERE id = $1", [userId]);
    if (!existing.rows[0]) {
      return res.status(404).json({ ok: false, message: "User not found", code: "NOT_FOUND" });
    }

    const hash = await bcrypt.hash(String(password), 10);
    await pool.query(
      `UPDATE cloud_users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hash, userId]
    );
    await auditLog(req.admin, "USER_PASSWORD_RESET", "cloud_users", userId, {});
    return res.json({ ok: true });
  } catch (err) {
    console.error("USER RESET ERROR:", err);
    return res.status(500).json({ ok: false, message: "Server error", code: "SERVER_ERROR" });
  }
});

module.exports = router;
