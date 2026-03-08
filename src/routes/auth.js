const express = require("express");
const authController = require("../controllers/auth.controller");
const authUser = require("../middleware/authUser");
const { pool } = require("../db/pool");

const router = express.Router();

router.post("/login", authController.login);

router.get("/me", authUser, async (req, res) => {
  try {
    const user = req.user || {};
    let businessName = null;
    let branchName = null;
    if (user.business_id) {
      const b = await pool.query("SELECT name FROM businesses WHERE id = $1", [user.business_id]);
      businessName = b.rows[0] ? b.rows[0].name : null;
    }
    if (user.branch_id) {
      const br = await pool.query("SELECT name FROM branches WHERE id = $1", [user.branch_id]);
      branchName = br.rows[0] ? br.rows[0].name : null;
    }
    return res.json({
      ok: true,
      user: {
        user_id: user.user_id || null,
        username: user.username || null,
        role: user.role || null,
        business_id: user.business_id || null,
        branch_id: user.branch_id || null,
        business_name: businessName,
        branch_name: branchName,
        auth_source: user.auth_source || null
      }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error", code: "SERVER_ERROR" });
  }
});

module.exports = router;
