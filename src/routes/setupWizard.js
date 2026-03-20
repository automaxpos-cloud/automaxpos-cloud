const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const bcrypt = require("bcrypt");
const { pool } = require("../db/pool");

const router = express.Router();
const { NODE_ENV } = require("../config/env");

const ENABLE_SETUP_WIZARD = String(process.env.ENABLE_SETUP_WIZARD || "").toLowerCase() === "true";

async function isSetupAllowed() {
  if (NODE_ENV !== "production") return true;
  if (ENABLE_SETUP_WIZARD) return true;
  try {
    const userCount = await pool.query("SELECT COUNT(*) AS c FROM cloud_users");
    const businessCount = await pool.query("SELECT COUNT(*) AS c FROM businesses");
    const branchCount = await pool.query("SELECT COUNT(*) AS c FROM branches");
    const users = Number(userCount.rows?.[0]?.c || 0);
    const businesses = Number(businessCount.rows?.[0]?.c || 0);
    const branches = Number(branchCount.rows?.[0]?.c || 0);
    return users === 0 || businesses === 0 || branches === 0;
  } catch (err) {
    console.error("[SETUP] setup allowed check failed:", err);
    return false;
  }
}

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

function normalizeBranchPrefix(city) {
  const raw = String(city || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!raw) return "BR";
  let prefix = raw.slice(0, 3);
  if (prefix.length === 1) prefix = prefix + "XX";
  if (prefix.length === 2) prefix = prefix + "X";
  return prefix;
}

async function getNextBranchSequence(db, businessId, prefix) {
  const regex = `^${prefix}-([0-9]+)$`;
  const res = await db.query(
    `SELECT MAX(CAST(SUBSTRING(code FROM $2) AS INT)) AS max_seq
     FROM branches
     WHERE business_id = $1 AND code ~ $2`,
    [businessId, regex]
  );
  return Number(res.rows?.[0]?.max_seq || 0) + 1;
}

router.get("/status", async (_req, res) => {
  const allowed = await isSetupAllowed();
  if (!allowed) {
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
  const allowed = await isSetupAllowed();
  if (!allowed) {
    return res.status(404).json({ ok: false, message: "Setup disabled in production", code: "SETUP_DISABLED" });
  }
  try {
    console.log("[SETUP] bootstrap request received");
    console.log("[SETUP] payload", {
      business_name: req.body?.business_name,
      admin_full_name: req.body?.admin_full_name,
      username: req.body?.username,
      email: req.body?.email,
      phone: req.body?.phone,
      branches_count: Array.isArray(req.body?.branches) ? req.body.branches.length : 0
    });
    const {
      business_name,
      branch_name,
      branches,
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
    const branchList = Array.isArray(branches) ? branches : null;
    const normalizedBranches = [];
    if (branchList && branchList.length) {
      for (const b of branchList) {
        const name = String(b?.name || "").trim();
        if (!name) {
          return res.status(400).json({ ok: false, message: "Branch name is required", code: "BRANCH_REQUIRED" });
        }
        normalizedBranches.push({
          name,
          code: String(b?.code || "").trim() || null,
          phone: String(b?.phone || "").trim() || null,
          email: String(b?.email || "").trim() || null,
          address: String(b?.address || "").trim() || null,
          city: String(b?.city || "").trim() || null,
          manager_name: String(b?.manager_name || "").trim() || null,
          status: String(b?.status || "ACTIVE").trim().toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE"
        });
      }
    } else if (branch_name) {
      const name = String(branch_name).trim();
      if (!name) {
        return res.status(400).json({ ok: false, message: "Branch name is required", code: "BRANCH_REQUIRED" });
      }
      normalizedBranches.push({
        name,
        code: null,
        phone: null,
        email: null,
        address: null,
        city: null,
        manager_name: null,
        status: "ACTIVE"
      });
    } else {
      return res.status(400).json({ ok: false, message: "At least one branch is required", code: "BRANCH_REQUIRED" });
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
      console.log("[SETUP] creating branches");
      let branchId = null;
      let branchName = null;
      const codeSequences = new Map();
      for (const b of normalizedBranches) {
        const location = b.address || b.city || null;
        let code = b.code;
        if (!code) {
          const prefix = normalizeBranchPrefix(b.city || "");
          let next = codeSequences.get(prefix);
          if (!next) {
            next = await getNextBranchSequence(client, businessId, prefix);
          }
          code = `${prefix}-${String(next).padStart(3, "0")}`;
          codeSequences.set(prefix, next + 1);
        }
        const br = await client.query(
          `INSERT INTO branches
           (business_id, name, code, phone, email, address, city, manager_name, status, location, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
           RETURNING id, name`,
          [businessId, b.name, code, b.phone, b.email, b.address, b.city, b.manager_name, b.status, location]
        );
        if (!branchId) {
          branchId = br.rows[0].id;
          branchName = br.rows[0].name;
        }
      }
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
        branch_name: String(branchName || "").trim(),
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
      console.error("[SETUP] bootstrap error:", err?.message || err, err?.stack || "");
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
        message: err?.message || "Server error",
        code: "SERVER_ERROR"
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[SETUP] bootstrap fatal:", err?.message || err, err?.stack || "");
    return res.status(500).json({ ok: false, message: err?.message || "Server error", code: "SERVER_ERROR" });
  }
});

router.get("/", async (req, res) => {
  const link = readLink();
  const already = !!(link && link.business_id && link.branch_id);
  if (already) {
    return res.redirect("/dashboard");
  }
  const allowed = await isSetupAllowed();
  if (!allowed) {
    return res.status(404).json({ ok: false, message: "Setup disabled in production", code: "SETUP_DISABLED" });
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
      max-width: 1100px;
      width: min(1100px, 100%);
      margin: 0 auto;
      padding: 36px 32px 60px;
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
    select {
      width: 100%;
      padding: 10px;
      margin-top: 6px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #0d1526;
      color: var(--text);
    }
    .branch-grid input,
    .branch-grid select {
      width: 100%;
      box-sizing: border-box;
      display: block;
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
    .remember {
      margin-top: 10px;
      display:flex;
      gap:8px;
      align-items:center;
      color: var(--muted);
      justify-content: flex-start;
      width: 100%;
    }
    .remember input { margin: 0; }
    .remember label { margin: 0; }
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
    .branch-block {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      margin-top: 10px;
      background: rgba(0,0,0,0.12);
    }
    .branch-header { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom: 8px; }
    .branch-remove {
      background: transparent;
      color: var(--muted);
      border: 1px solid var(--border);
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
    }
    .branch-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
      align-items: start;
    }
    .branch-field {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .branch-field label { display:block; }
    .branch-field input,
    .branch-field select {
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
      display: block;
    }
    .branch-spacer { visibility: hidden; }
    .setup-compact .row {
      flex-wrap: wrap;
    }
    .setup-compact .row input {
      flex: 1 1 260px;
      min-width: 220px;
    }
    .setup-compact .row button {
      flex: 0 0 auto;
      white-space: nowrap;
    }
    @media (max-width: 900px) {
      .branch-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .branch-spacer { display: none; }
    }
    @media (max-width: 600px) {
      .branch-grid { grid-template-columns: 1fr; }
      .branch-spacer { display: none; }
    }
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
      <h3>Step 1: Business Details</h3>
      <label>Business Name</label>
      <input id="business_name" placeholder="Your Business Name"/>
      <label>Owner/Admin Name</label>
      <input id="admin_full_name" placeholder="Full Name"/>
      <label>Email</label>
      <input id="email" placeholder="email@example.com"/>
      <label>Phone</label>
      <input id="phone" placeholder="+260..."/>
    </div>

    <div class="card">
      <h3>Step 2: Branches</h3>
      <div id="branch-list"></div>
      <button class="toggle" id="add_branch_btn" type="button">Add Another Branch</button>
      <div class="muted" style="margin-top:8px;">At least one branch is required.</div>
    </div>

    <div class="card setup-compact">
      <h3>Step 3: Admin Account</h3>
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
    </div>

    <button id="submit" type="button">Create Account</button>
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

    var branchCounter = 0;

    function buildBranchBlock(data) {
      var branch = data || {};
      var container = document.createElement("div");
      container.className = "branch-block";
      container.dataset.index = String(branchCounter++);
      container.innerHTML =
        "<div class='branch-header'>" +
        "<strong>Branch</strong>" +
        "<button class='branch-remove' type='button'>Remove</button>" +
        "</div>" +
        "<div class='branch-grid'>" +
        "<div class='branch-field'><label>Branch Name</label><input data-field='name' placeholder='Main Branch' value='" + (branch.name || "") + "' /></div>" +
        "<div class='branch-field'><label>Branch Code (auto)</label><input data-field='code' placeholder='Auto-generated' value='" + (branch.code || "") + "' readonly /></div>" +
        "<div class='branch-field'><label>Phone</label><input data-field='phone' placeholder='+260...' value='" + (branch.phone || "") + "' /></div>" +
        "<div class='branch-field'><label>Email (optional)</label><input data-field='email' placeholder='branch@email.com' value='" + (branch.email || "") + "' /></div>" +
        "<div class='branch-field'><label>Address</label><input data-field='address' placeholder='Address' value='" + (branch.address || "") + "' /></div>" +
        "<div class='branch-field'><label>City / Town</label><input data-field='city' placeholder='City' value='" + (branch.city || "") + "' /></div>" +
        "<div class='branch-field'><label>Manager Name (optional)</label><input data-field='manager_name' placeholder='Manager' value='" + (branch.manager_name || "") + "' /></div>" +
        "<div class='branch-field'><label>Status</label>" +
        "<select data-field='status'>" +
        "<option value='ACTIVE'" + ((branch.status || "ACTIVE") === "ACTIVE" ? " selected" : "") + ">Active</option>" +
        "<option value='INACTIVE'" + ((branch.status || "") === "INACTIVE" ? " selected" : "") + ">Inactive</option>" +
        "</select></div>" +
        "<div class='branch-spacer' aria-hidden='true'></div>" +
        "</div>";

      var removeBtn = container.querySelector(".branch-remove");
      removeBtn.addEventListener("click", function () {
        var list = document.getElementById("branch-list");
        if (list && list.children.length > 1) {
          container.remove();
        }
      });
      return container;
    }

    function addBranch() {
      var list = document.getElementById("branch-list");
      if (!list) return;
      list.appendChild(buildBranchBlock({ status: "ACTIVE" }));
    }

    function collectBranches() {
      var list = document.getElementById("branch-list");
      if (!list) return [];
      var blocks = list.querySelectorAll(".branch-block");
      var branches = [];
      blocks.forEach(function (block) {
        var get = function (field) {
          var el = block.querySelector("[data-field='" + field + "']");
          return el ? String(el.value || "").trim() : "";
        };
        var name = get("name");
        if (!name) return;
        branches.push({
          name: name,
          code: get("code") || null,
          phone: get("phone") || null,
          email: get("email") || null,
          address: get("address") || null,
          city: get("city") || null,
          manager_name: get("manager_name") || null,
          status: get("status") || "ACTIVE"
        });
      });
      return branches;
    }

    document.getElementById("submit").addEventListener("click", async function (ev) {
      ev.preventDefault();
      var business_name = document.getElementById("business_name").value.trim();
      var admin_full_name = document.getElementById("admin_full_name").value.trim();
      var username = document.getElementById("username").value.trim();
      var password = document.getElementById("password").value;
      var password2 = document.getElementById("password2").value;
      var email = document.getElementById("email").value.trim();
      var phone = document.getElementById("phone").value.trim();
      var branches = collectBranches();
      var status = document.getElementById("status");

      if (!business_name || !admin_full_name || !username || !password) {
        status.textContent = "Please fill all required fields.";
        return;
      }
      if (!branches.length) {
        status.textContent = "Please add at least one branch.";
        return;
      }
      if (password !== password2) {
        status.textContent = "Passwords do not match.";
        return;
      }
      saveRemember();
      console.log("[SETUP_UI] submit", {
        url: "/api/cloud/setup/bootstrap",
        business_name: business_name,
        admin_full_name: admin_full_name,
        username: username,
        email: email,
        phone: phone,
        branches_count: branches.length
      });
      status.textContent = "Creating account...";
      try {
        var res = await fetch("/api/cloud/setup/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_name: business_name,
            admin_full_name: admin_full_name,
            username: username,
            password: password,
            password2: password2,
            email: email,
            phone: phone,
            branches: branches
          })
        });
        var rawText = await res.text();
        var data = {};
        try { data = JSON.parse(rawText); } catch (e) { data = {}; }
        console.log("[SETUP_UI] response", { status: res.status, data: data });
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
      } catch (err) {
        console.error("[SETUP_UI] request failed", err);
        status.textContent = "Setup failed. Network error.";
      }
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
    addBranch();
    document.getElementById("add_branch_btn").addEventListener("click", addBranch);
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
