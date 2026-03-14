const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const bcrypt = require("bcrypt");
const { pool } = require("../db/pool");

const router = express.Router();
const { NODE_ENV } = require("../config/env");

const APPDATA_DIR = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const LINK_DIR = path.join(APPDATA_DIR, "AutoMaxPOS");
const LINK_FILE = path.join(LINK_DIR, "cloud_setup.json");

function readLink() {
  try {
    if (fs.existsSync(LINK_FILE)) {
      return JSON.parse(fs.readFileSync(LINK_FILE, "utf-8"));
    }
  } catch {}
  return null;
}

function writeLink(data) {
  if (!fs.existsSync(LINK_DIR)) fs.mkdirSync(LINK_DIR, { recursive: true });
  fs.writeFileSync(LINK_FILE, JSON.stringify(data || {}, null, 2), "utf-8");
}

router.get("/status", async (_req, res) => {
  if (NODE_ENV === "production") {
    return res.status(404).json({ ok: false, message: "Setup disabled in production", code: "SETUP_DISABLED" });
  }
  try {
    const link = readLink();
    const userCount = await pool.query(
      "SELECT COUNT(*) AS c FROM cloud_users"
    );
    const done = !!(link && link.business_id && link.branch_id) || Number(userCount.rows[0]?.c || 0) > 0;
    return res.json({
      ok: true,
      setup_complete: done,
      linkage: link || null
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error", code: "SERVER_ERROR" });
  }
});

router.post("/bootstrap", async (req, res) => {
  if (NODE_ENV === "production") {
    return res.status(404).json({ ok: false, message: "Setup disabled in production", code: "SETUP_DISABLED" });
  }
  try {
    console.log("[SETUP] bootstrap request received");
    const {
      business_name,
      branch_name,
      admin_full_name,
      username,
      password,
      password2,
      email,
      phone
    } = req.body || {};

    console.log("[SETUP] validating input");
    if (!business_name) {
      return res.status(400).json({ ok: false, message: "Business name is required", code: "BUSINESS_REQUIRED" });
    }
    if (!branch_name) {
      return res.status(400).json({ ok: false, message: "Branch name is required", code: "BRANCH_REQUIRED" });
    }
    if (!admin_full_name) {
      return res.status(400).json({ ok: false, message: "Admin full name is required", code: "ADMIN_NAME_REQUIRED" });
    }
    if (!username) {
      return res.status(400).json({ ok: false, message: "Username is required", code: "USERNAME_REQUIRED" });
    }
    if (!password) {
      return res.status(400).json({ ok: false, message: "Password is required", code: "PASSWORD_REQUIRED" });
    }
    if (password2 != null && String(password) !== String(password2)) {
      return res.status(400).json({ ok: false, message: "Passwords do not match", code: "PASSWORD_MISMATCH" });
    }

    // prevent re-run if already linked
    const existingLink = readLink();
    if (existingLink && existingLink.business_id && existingLink.branch_id) {
      return res.status(409).json({ ok: false, message: "Setup already completed", code: "ALREADY_DONE" });
    }

    let hash;
    try {
      hash = await bcrypt.hash(String(password), 10);
    } catch (e) {
      console.error("[SETUP] password hash failed:", e);
      return res.status(500).json({ ok: false, message: "Password hash failed", code: "HASH_FAILED" });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      console.log("[SETUP] creating business");
      const b = await client.query(
        "INSERT INTO businesses (name, owner_name, email, phone) VALUES ($1,$2,$3,$4) RETURNING id",
        [String(business_name).trim(), String(admin_full_name).trim(), email || null, phone || null]
      );
      const businessId = b.rows[0].id;
      console.log("[SETUP] creating branch");
      const br = await client.query(
        "INSERT INTO branches (business_id, name, location) VALUES ($1,$2,$3) RETURNING id",
        [businessId, String(branch_name).trim(), null]
      );
      const branchId = br.rows[0].id;
      console.log("[SETUP] creating first user");
      const u = await client.query(
        `INSERT INTO cloud_users
         (username, email, password_hash, full_name, role, business_id, branch_id, is_active)
         VALUES ($1,$2,$3,'BUSINESS_OWNER',$4,$5,TRUE)
         RETURNING id`,
        [String(username).trim(), email ? String(email).trim().toLowerCase() : null, hash, String(admin_full_name).trim(), businessId, branchId]
      );

      await client.query("COMMIT");

      console.log("[SETUP] marking bootstrap complete");
      writeLink({
        business_id: businessId,
        branch_id: branchId,
        business_name: String(business_name).trim(),
        branch_name: String(branch_name).trim(),
        owner_name: String(admin_full_name).trim(),
        created_at: new Date().toISOString()
      });

      console.log("[SETUP] bootstrap success");
      return res.json({
        ok: true,
        business_id: businessId,
        branch_id: branchId,
        user_id: u.rows[0].id
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("[SETUP] bootstrap error:", err);
      if (err && err.code === "42P01") {
        return res.status(500).json({
          ok: false,
          message: "Cloud database not initialized. Run: npm run migrate",
          code: "DB_NOT_READY"
        });
      }
      if (err && err.code === "23505") {
        return res.status(400).json({ ok: false, message: "Username already exists", code: "USERNAME_EXISTS" });
      }
      if (String(err && err.message).includes("cloud_users")) {
        return res.status(500).json({ ok: false, message: "User creation failed", code: "BOOTSTRAP_USER_CREATE_FAILED" });
      }
      if (String(err && err.message).includes("branches")) {
        return res.status(500).json({ ok: false, message: "Branch creation failed", code: "BOOTSTRAP_BRANCH_CREATE_FAILED" });
      }
      if (String(err && err.message).includes("businesses")) {
        return res.status(500).json({ ok: false, message: "Business creation failed", code: "BOOTSTRAP_BUSINESS_CREATE_FAILED" });
      }
      return res.status(500).json({
        ok: false,
        message: "Server error",
        code: "SERVER_ERROR"
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[SETUP] bootstrap fatal:", err);
    return res.status(500).json({ ok: false, message: "Server error", code: "SERVER_ERROR" });
  }
});

router.get("/", (req, res) => {
  const link = readLink();
  const already = !!(link && link.business_id && link.branch_id);
  if (already) {
    return res.redirect("/dashboard");
  }
  res.type("html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>AutoMax Setup</title>
  <style>
    :root {
      --bg: #0b1020;
      --panel: #111a2b;
      --panel-2: #0f1728;
      --text: #e6e9ef;
      --muted: #a6b0c3;
      --accent: #2e78ff;
      --border: #1f2a40;
      --good: #25c06d;
      --bad: #ef4444;
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      background: var(--bg);
      color: var(--text);
    }
    .page {
      max-width: 860px;
      margin: 0 auto;
      padding: 36px 20px 60px;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .card {
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
    }
    h1 { margin: 0 0 8px; }
    h3 { margin: 0 0 10px; }
    label { display:block; margin-top:10px; color: var(--muted); }
    input {
      width: 100%;
      padding: 10px;
      margin-top: 6px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #0d1526;
      color: var(--text);
    }
    button {
      margin-top: 12px;
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--accent);
      color: #fff;
      cursor: pointer;
    }
    .muted { color: var(--muted); }
    .row { display: flex; gap: 10px; align-items: center; }
    .toggle {
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--border);
      padding: 8px 10px;
      margin-top: 6px;
    }
    .match { margin-top: 6px; font-size: 13px; }
    .match.ok { color: var(--good); }
    .match.bad { color: var(--bad); }
    .remember { margin-top: 10px; display:flex; gap:8px; align-items:center; color: var(--muted); }
    .theme-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid #1f2a40;
      background: #0b1220;
      color: #e6e9ef;
      cursor: pointer;
    }
    .theme-toggle:hover { border-color: #2e78ff; }
    .theme-icon { width: 16px; height: 16px; }
    .light body { background: #f6f7fb; color: #111; }
    .light .card { background: #ffffff; border-color: #e2e6ef; }
    .light input { background: #f2f4f9; color: #111; border-color: #d9deea; }
    .light .muted { color: #4b5563; }
    .light .toggle { color: #4b5563; border-color: #d9deea; }
  </style>
</head>
<body>
  <div class="page" id="page">
    <div class="topbar">
      <div>
        <h1>AutoMax First-Run Setup</h1>
        <div class="muted">Create your business and cloud dashboard account.</div>
      </div>
      <button class="theme-toggle" id="themeToggle" type="button" aria-label="Toggle theme">
        <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.7"/>
          <path d="M12 2.5v2.4M12 19.1v2.4M4.1 4.1l1.7 1.7M18.2 18.2l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.1 19.9l1.7-1.7M18.2 5.8l1.7-1.7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div class="card">
      <h3>Step 1: Business & Branch</h3>
      <label>Business Name</label>
      <input id="business_name" placeholder="Your Business Name"/>
      <label>Branch Name</label>
      <input id="branch_name" placeholder="Main Branch"/>
    </div>

    <div class="card">
      <h3>Step 2: Admin Account</h3>
      <label>Admin Full Name</label>
      <input id="admin_full_name" placeholder="Full Name"/>
      <label>Username</label>
      <input id="username" placeholder="admin"/>
      <label>Password</label>
      <div class="row">
        <input id="password" type="password" placeholder="password"/>
        <button class="toggle" id="togglePassword">Show</button>
      </div>
      <label>Confirm Password</label>
      <div class="row">
        <input id="password2" type="password" placeholder="confirm password"/>
        <button class="toggle" id="togglePassword2">Show</button>
      </div>
      <div id="pwMatch" class="match"></div>
      <div class="remember">
        <input id="remember" type="checkbox"/>
        <label for="remember">Remember me</label>
      </div>
      <label>Email (optional)</label>
      <input id="email" placeholder="email@example.com"/>
      <label>Phone (optional)</label>
      <input id="phone" placeholder="+260..."/>
    </div>

    <button id="submit">Create Account</button>
    <div id="status" class="muted"></div>
  </div>

  <script>
    function toggleInput(id, btnId) {
      var input = document.getElementById(id);
      var btn = document.getElementById(btnId);
      btn.addEventListener("click", function () {
        var isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.textContent = isPassword ? "Hide" : "Show";
      });
    }

    function updateMatch() {
      var p1 = document.getElementById("password").value;
      var p2 = document.getElementById("password2").value;
      var el = document.getElementById("pwMatch");
      if (!p1 || !p2) {
        el.textContent = "";
        el.className = "match";
        return;
      }
      if (p1 === p2) {
        el.textContent = "Passwords match";
        el.className = "match ok";
      } else {
        el.textContent = "Passwords do not match";
        el.className = "match bad";
      }
    }

    function loadRemember() {
      var remember = localStorage.getItem("automax_setup_remember") === "true";
      var savedUser = localStorage.getItem("automax_setup_username") || "";
      document.getElementById("remember").checked = remember;
      if (remember && savedUser) {
        document.getElementById("username").value = savedUser;
      }
    }

    function saveRemember() {
      var remember = document.getElementById("remember").checked;
      var username = document.getElementById("username").value.trim();
      localStorage.setItem("automax_setup_remember", remember ? "true" : "false");
      if (remember && username) {
        localStorage.setItem("automax_setup_username", username);
      } else {
        localStorage.removeItem("automax_setup_username");
      }
    }

    function applyTheme(theme) {
      var root = document.documentElement;
      if (theme === "light") {
        root.classList.add("light");
        root.setAttribute("data-theme", "light");
      } else {
        root.classList.remove("light");
        root.removeAttribute("data-theme");
      }
      localStorage.setItem("automax-theme", theme);
    }

    document.getElementById("submit").addEventListener("click", async function () {
      var business_name = document.getElementById("business_name").value.trim();
      var branch_name = document.getElementById("branch_name").value.trim();
      var admin_full_name = document.getElementById("admin_full_name").value.trim();
      var username = document.getElementById("username").value.trim();
      var password = document.getElementById("password").value;
      var password2 = document.getElementById("password2").value;
      var email = document.getElementById("email").value.trim();
      var phone = document.getElementById("phone").value.trim();
      var status = document.getElementById("status");

      if (!business_name || !branch_name || !admin_full_name || !username || !password) {
        status.textContent = "Please fill all required fields.";
        return;
      }
      if (password !== password2) {
        status.textContent = "Passwords do not match.";
        return;
      }
      saveRemember();
      status.textContent = "Creating account...";
      var res = await fetch("/api/cloud/setup/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_name: business_name, branch_name: branch_name, admin_full_name: admin_full_name, username: username, password: password, password2: password2, email: email, phone: phone })
      });
      var rawText = await res.text();
      var data = {};
      try { data = JSON.parse(rawText); } catch (e) { data = {}; }
      if (!res.ok) {
        if (data && data.message) {
          status.textContent = data.message;
        } else if (rawText) {
          status.textContent = rawText;
        } else {
          status.textContent = "Setup failed. Please check server logs.";
        }
        return;
      }
      window.location.href = "/setup/success";
    });

    document.getElementById("password").addEventListener("input", updateMatch);
    document.getElementById("password2").addEventListener("input", updateMatch);
    document.getElementById("remember").addEventListener("change", saveRemember);
    document.getElementById("themeToggle").addEventListener("click", function () {
      var current = localStorage.getItem("automax-theme") || "dark";
      applyTheme(current === "dark" ? "light" : "dark");
    });

    toggleInput("password", "togglePassword");
    toggleInput("password2", "togglePassword2");
    loadRemember();
    var savedTheme = localStorage.getItem("automax-theme") || "dark";
    applyTheme(savedTheme);
  </script>
</body>
</html>`);
});

router.get("/success", (_req, res) => {
  const link = readLink() || {};
  const business = link.business_name || "—";
  const branch = link.branch_name || "—";
  const adminUser = link.owner_name || "—";
  res.type("html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Setup Complete</title>
  <style>
    :root {
      --bg: #0b1020;
      --panel: #111a2b;
      --panel-2: #0f1728;
      --text: #e6e9ef;
      --muted: #a6b0c3;
      --accent: #2e78ff;
      --border: #1f2a40;
    }
    body { font-family: Arial, sans-serif; margin: 0; background: var(--bg); color: var(--text); }
    .page { max-width: 860px; margin: 0 auto; padding: 36px 20px 60px; }
    .card {
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin: 16px 0;
    }
    h1 { margin: 0 0 8px; }
    .muted { color: var(--muted); }
    .label { color: var(--muted); margin-top: 8px; }
    .value { font-weight: bold; }
    .btn {
      display: inline-block;
      margin-top: 12px;
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--accent);
      color: #fff;
      text-decoration: none;
    }
    ol { margin: 8px 0 0 18px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">
      <h1>Cloud account created successfully</h1>
      <div class="muted">Next: Open Local Backend Setup</div>

      <div class="label">Business:</div>
      <div class="value">${business}</div>

      <div class="label">Branch:</div>
      <div class="value">${branch}</div>

      <div class="label">Admin User:</div>
      <div class="value">${adminUser}</div>

      <div class="label" style="margin-top:12px;">Local Backend URL:</div>
      <div class="value">http://localhost:3000</div>

      <a class="btn" href="http://localhost:3000">Open Local Backend Setup</a>
    </div>

    <div class="card">
      <h3>Next steps:</h3>
      <ol>
        <li>Open Local Backend</li>
        <li>Create products and categories</li>
        <li>Add cashier users</li>
        <li>Install POS app on phone</li>
      </ol>
    </div>
  </div>
</body>
</html>`);
});

router.get("/getting-started", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>AutoMax Getting Started</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; max-width: 720px; }
    ul { list-style: none; padding: 0; }
    li { margin: 10px 0; }
    .ok { color: green; }
    .no { color: #999; }
  </style>
</head>
<body>
  <h1>Getting Started</h1>
  <ul>
    <li id="cloud">[ ] Cloud account created</li>
    <li id="backend">[ ] Local backend admin created</li>
    <li id="products">[ ] Products added</li>
    <li id="phone">[ ] Phone connected</li>
  </ul>
  <p>Next step: <a href="http://localhost:3000">Open Local Backend</a></p>

  <script>
    async function check() {
      try {
        const c = await fetch("/api/cloud/setup/status");
        const cdata = await c.json();
        if (cdata.setup_complete) {
          document.getElementById("cloud").textContent = "[✓] Cloud account created";
        }
      } catch {}
      try {
        const b = await fetch("http://localhost:3000/api/setup/status");
        const bdata = await b.json();
        if (bdata.setup_complete) {
          document.getElementById("backend").textContent = "[✓] Local backend admin created";
        }
      } catch {}
    }
    check();
  </script>
</body>
</html>`);
});

module.exports = router;
