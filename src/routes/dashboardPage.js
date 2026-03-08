const express = require("express");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { NODE_ENV } = require("../config/env");

const router = express.Router();

const APPDATA_DIR = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const LINK_FILE = path.join(APPDATA_DIR, "AutoMaxPOS", "cloud_setup.json");

function isSetupComplete() {
  try {
    if (fs.existsSync(LINK_FILE)) {
      const link = JSON.parse(fs.readFileSync(LINK_FILE, "utf-8"));
      return !!(link && link.business_id && link.branch_id);
    }
  } catch {}
  return false;
}

router.get("/", (req, res) => {
  if (NODE_ENV !== "production" && !isSetupComplete()) {
    return res.redirect("/setup");
  }
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AutoMax Cloud Dashboard</title>
  <style>
    @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&display=swap");
    :root {
      --bg: #0b1020;
      --panel: #111a2b;
      --panel-2: #0f1728;
      --text: #e6e9ef;
      --muted: #a6b0c3;
      --accent: #2e78ff;
      --good: #25c06d;
      --bad: #ef4444;
      --warn: #facc15;
      --border: #1f2a40;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Space Grotesk", sans-serif;
      color: var(--text);
      background:
        radial-gradient(1200px 500px at 10% -10%, #1b2c52 0%, rgba(27,44,82,0) 60%),
        radial-gradient(900px 600px at 90% -20%, #1a2a45 0%, rgba(26,42,69,0) 65%),
        var(--bg);
    }
    header {
      padding: 28px 32px 10px;
    }
    h1 { margin: 0 0 6px; font-size: 24px; }
    .muted { color: var(--muted); }
    main { padding: 12px 32px 40px; }
    .grid {
      display: grid;
      gap: 16px;
    }
    .cards {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
    .card {
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      min-height: 90px;
    }
    .card h3 { margin: 0 0 6px; font-size: 14px; color: var(--muted); }
    .card .value { font-size: 22px; font-weight: 600; }
    .section {
      margin-top: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    th, td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
    }
    th {
      text-align: left;
      color: var(--muted);
      font-weight: 500;
      background: rgba(255,255,255,0.02);
    }
    tr:last-child td { border-bottom: none; }
    .status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .online { background: rgba(37,192,109,0.15); color: var(--good); }
    .idle { background: rgba(250,204,21,0.15); color: var(--warn); }
    .offline { background: rgba(239,68,68,0.15); color: var(--bad); }
    .empty {
      padding: 16px;
      color: var(--muted);
      border: 1px dashed var(--border);
      border-radius: 12px;
      background: rgba(17,26,43,0.4);
    }
  </style>
</head>
<body>
  <header>
    <h1>AutoMax Cloud Dashboard</h1>
    <div class="muted">Synced sales + backend health</div>
    <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
      <button class="btn" id="nav-dashboard" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:#1f2a40;color:#fff;">Dashboard</button>
      <button class="btn" id="nav-monitoring" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:#1f2a40;color:#fff;">Live Monitoring</button>
      <button class="btn" id="nav-users" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:#1f2a40;color:#fff;">Users</button>
      <button class="btn" id="export_pdf_btn" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:var(--accent);color:#fff;">Export PDF</button>
      <button class="btn" id="export_xlsx_btn" style="padding:6px 12px;border-radius:8px;border:1px solid var(--border);background:#1f2a40;color:#fff;">Export Excel</button>
    </div>
  </header>
  <main>
    <section id="dashboard-section">
    <div class="section" style="margin-top:0;">
      <div class="card" id="login-card" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
        <div style="min-width:180px;">
          <label class="muted">Admin Username</label>
          <input id="admin_user" type="text" placeholder="superadmin" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);" />
        </div>
        <div style="min-width:180px;">
          <label class="muted">Admin Password</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input id="admin_pass" type="password" placeholder="password" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);" />
            <button class="btn" id="toggle_admin_pass" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:#1f2a40;color:#fff;">Show</button>
          </div>
        </div>
        <button class="btn" id="admin_login_btn" style="padding:8px 14px;border-radius:8px;border:1px solid var(--border);background:var(--accent);color:#fff;">Login</button>
        <div id="admin_login_status" class="muted"></div>
      </div>

      <div class="card" id="account-bar" style="display:none;gap:12px;flex-wrap:wrap;align-items:center;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div id="account-text" class="muted"></div>
          <div id="sync-line" class="muted"></div>
        </div>
        <button class="btn" id="admin_logout_btn" style="margin-left:auto;padding:8px 14px;border-radius:8px;border:1px solid var(--border);background:#1f2a40;color:#fff;">Logout</button>
      </div>

      <div class="card" style="margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
        <div style="min-width:240px;">
          <label class="muted">Business</label>
          <select id="filter_business" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);"></select>
        </div>
        <div style="min-width:240px;">
          <label class="muted">Branch</label>
          <select id="filter_branch" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);"></select>
        </div>
        <div style="min-width:200px;">
          <label class="muted">Date Range</label>
          <select id="filter_range" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);">
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        <div style="min-width:170px;" id="range_start_wrap">
          <label class="muted">Start</label>
          <input id="range_start" type="date" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);" />
        </div>
        <div style="min-width:170px;" id="range_end_wrap">
          <label class="muted">End</label>
          <input id="range_end" type="date" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);" />
        </div>
        <button class="btn" id="apply_filters" style="padding:8px 14px;border-radius:8px;border:1px solid var(--border);background:#1f2a40;color:#fff;">Apply</button>
      </div>
    </div>
    <div class="grid cards" id="summary-cards">
      <div class="card"><h3>Net Sales Today</h3><div class="value" id="sales-today">--</div></div>
      <div class="card"><h3>Net Sales This Month</h3><div class="value" id="sales-month">--</div></div>
      <div class="card"><h3>Active Branches</h3><div class="value" id="active-branches">--</div></div>
      <div class="card"><h3>Active Backends</h3><div class="value" id="active-backends">--</div></div>
    </div>
    <div id="summary-empty" class="muted" style="margin-top:8px;display:none;">No synced sales yet. Awaiting first sync.</div>

    <div class="section">
      <h2>Today Sales</h2>
      <div class="grid cards">
        <div class="card"><h3>Gross Sales</h3><div class="value" id="today-gross">--</div></div>
        <div class="card"><h3>Returns</h3><div class="value" id="returns-total">--</div></div>
        <div class="card"><h3>Net Sales</h3><div class="value" id="today-net">--</div></div>
        <div class="card"><h3>Transactions</h3><div class="value" id="today-count">--</div></div>
      </div>
      <div id="returns-empty" class="muted" style="margin-top:8px;display:none;">No returns yet.</div>
    </div>

    <div class="section">
      <h2>Month Sales</h2>
      <div class="grid cards">
        <div class="card"><h3>Gross Sales</h3><div class="value" id="month-gross">--</div></div>
        <div class="card"><h3>Returns</h3><div class="value" id="month-returns">--</div></div>
        <div class="card"><h3>Net Sales</h3><div class="value" id="month-net">--</div></div>
      </div>
    </div>

    <div class="section">
      <h2>Active Cashiers</h2>
      <div id="cashier-empty" class="empty" style="display:none;">No cashier activity yet.</div>
      <table id="cashier-table">
        <thead>
          <tr>
            <th>Cashier</th>
            <th>Sales Count</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody id="cashier-body"></tbody>
      </table>
    </div>

    <div class="section">
      <h2>Active Cash Registers</h2>
      <div id="register-empty" class="empty" style="display:none;">No register activity yet.</div>
      <table id="register-table">
        <thead>
          <tr>
            <th>Register</th>
            <th>Cashier</th>
            <th>Branch</th>
            <th>Last Activity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="register-body"></tbody>
      </table>
    </div>

    <div class="section">
      <h2>Low Stock Alerts</h2>
      <div id="lowstock-empty" class="empty" style="display:none;">No low stock items.</div>
      <table id="lowstock-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Stock</th>
            <th>Reorder Level</th>
          </tr>
        </thead>
        <tbody id="lowstock-body"></tbody>
      </table>
    </div>

    <div class="section">
      <h2>Branch Comparison</h2>
      <div id="branchcomp-empty" class="empty" style="display:none;">No sales yet.</div>
      <table id="branchcomp-table">
        <thead>
          <tr>
            <th>Branch</th>
            <th>Business</th>
            <th>Sales Count</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody id="branchcomp-body"></tbody>
      </table>
    </div>

    <div class="section">
      <h2>Recent Synced Sales</h2>
      <div id="sales-empty" class="empty" style="display:none;">No synced sales yet.</div>
      <table id="sales-table">
        <thead>
          <tr>
            <th>Receipt</th>
            <th>Business</th>
            <th>Branch</th>
            <th>Total</th>
            <th>Cashier</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody id="sales-body"></tbody>
      </table>
    </div>

    <div class="section">
      <h2>Recent Returns</h2>
      <div id="returns-table-empty" class="empty" style="display:none;">No returns yet.</div>
      <table id="returns-table">
        <thead>
          <tr>
            <th>Return No</th>
            <th>Business</th>
            <th>Branch</th>
            <th>Total</th>
            <th>Method</th>
            <th>Cashier</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody id="returns-body"></tbody>
      </table>
    </div>

    <div class="section">
      <h2>Backend Heartbeats</h2>
      <div id="backend-empty" class="empty" style="display:none;">No backends registered yet.</div>
      <table id="backend-table">
        <thead>
          <tr>
            <th>Backend</th>
            <th>Business</th>
            <th>Branch</th>
            <th>Last Heartbeat</th>
            <th>App Version</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="backend-body"></tbody>
      </table>
    </div>

    <div class="section">
      <h2>Sync Health</h2>
      <div class="grid cards">
        <div class="card"><h3>Backend Status</h3><div class="value" id="backend-status">--</div></div>
        <div class="card"><h3>Cloud Status</h3><div class="value" id="cloud-status">--</div></div>
        <div class="card"><h3>Last Heartbeat</h3><div class="value" id="last-heartbeat">--</div></div>
        <div class="card"><h3>Last Sale Sync</h3><div class="value" id="last-sale">--</div></div>
        <div class="card"><h3>Last Return Sync</h3><div class="value" id="last-return">--</div></div>
        <div class="card"><h3>Last Inventory Snapshot</h3><div class="value" id="last-snapshot">--</div></div>
        <div class="card"><h3>Pending Sync Jobs</h3><div class="value" id="pending-count">--</div></div>
        <div class="card"><h3>Failed Sync Jobs</h3><div class="value" id="failed-count">--</div></div>
      </div>
      <div id="sync-empty" class="muted" style="margin-top:8px;display:none;">Awaiting first sync.</div>
    </div>
    </section>

    </section>

    <section id="monitoring-section" style="display:none;">
      <div class="section" style="margin-top:0;">
        <h2>Live Monitoring</h2>
        <div class="card" style="display:flex;gap:16px;flex-wrap:wrap;">
          <div>
            <div class="muted">Status</div>
            <div id="monitoring-status" style="margin-top:4px;">Awaiting data</div>
          </div>
        </div>
      </div>
      <div class="section">
        <div id="monitoring-empty" class="empty" style="display:none;">No register activity yet.</div>
        <table id="monitoring-table">
          <thead>
            <tr>
              <th>Register</th>
              <th>Cashier</th>
              <th>Branch</th>
              <th>Last Activity</th>
              <th>Last Sale</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="monitoring-body"></tbody>
        </table>
      </div>
    </section>

    <section id="users-section" style="display:none;">
      <div class="section" style="margin-top:0;">
        <h2>Users Management</h2>
        <div class="card" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
          <input type="hidden" id="user_edit_id" />
          <div style="min-width:180px;">
            <label class="muted">Username</label>
            <input id="user_username" type="text" placeholder="james" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);" />
          </div>
          <div style="min-width:180px;">
            <label class="muted">Full Name</label>
            <input id="user_fullname" type="text" placeholder="James Phiri" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);" />
          </div>
          <div style="min-width:180px;">
            <label class="muted">Password</label>
            <input id="user_password" type="password" placeholder="password" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);" />
          </div>
          <div style="min-width:180px;">
            <label class="muted">Confirm Password</label>
            <input id="user_password2" type="password" placeholder="confirm" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);" />
          </div>
          <div style="min-width:180px;">
            <label class="muted">Role</label>
            <select id="user_role" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);">
              <option value="">Select Role</option>
              <option value="SUPERADMIN">SUPERADMIN</option>
              <option value="BUSINESS_OWNER">BUSINESS_OWNER</option>
              <option value="BRANCH_MANAGER">BRANCH_MANAGER</option>
              <option value="AUDITOR">AUDITOR</option>
            </select>
          </div>
          <div style="min-width:220px;">
            <label class="muted">Business</label>
            <select id="user_business" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);"></select>
          </div>
          <div style="min-width:220px;">
            <label class="muted">Branch</label>
            <select id="user_branch" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);"></select>
          </div>
          <div style="min-width:120px;">
            <label class="muted">Active</label>
            <input id="user_active" type="checkbox" checked style="margin-top:8px;transform:scale(1.2);" />
          </div>
          <button class="btn" id="user_save_btn" style="padding:8px 14px;border-radius:8px;border:1px solid var(--border);background:var(--accent);color:#fff;">Create User</button>
          <button class="btn" id="user_cancel_btn" style="padding:8px 14px;border-radius:8px;border:1px solid var(--border);background:#1f2a40;color:#fff;">Cancel</button>
          <div id="user_status" class="muted"></div>
        </div>
      </div>

      <div class="section">
        <h2>Users</h2>
        <div id="users-empty" class="empty" style="display:none;">No users yet.</div>
        <table id="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Role</th>
              <th>Business</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="users-body"></tbody>
        </table>
      </div>
    </section>
  </main>

  <script>
    console.log("[DASH] script loaded");
    const state = { user: null };
    function debug() { try { console.log.apply(console, ["[DASH]"].concat([].slice.call(arguments))); } catch {} }
    function byId(id) {
      const el = document.getElementById(id);
      if (!el) {
        console.warn("[DASH] missing element:", id);
      }
      return el;
    }
    function bind(id, event, handler) {
      const el = byId(id);
      if (!el) return;
      debug("bind", id);
      el.addEventListener(event, handler);
    }

    function toggleInput(id, btnId) {
      const input = byId(id);
      const btn = byId(btnId);
      if (!input || !btn) return;
      btn.addEventListener("click", function () {
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        btn.textContent = isPassword ? "Hide" : "Show";
      });
    }
    function showInitError(msg) {
      let banner = document.getElementById("init-error");
      if (!banner) {
        banner = document.createElement("div");
        banner.id = "init-error";
        banner.style.cssText = "background:#3b0d0d;color:#fff;border:1px solid #6b1b1b;padding:10px 12px;border-radius:8px;margin:12px 32px;";
        banner.textContent = "Dashboard failed to initialize. Check console.";
        document.body.prepend(banner);
      }
      if (msg) banner.textContent = msg;
    }

    function authHeaders() {
      const token = localStorage.getItem("cloud_admin_token") || "";
      return token ? { Authorization: "Bearer " + token } : {};
    }

    const MONEY_IDS = new Set([
      "sales-today",
      "sales-month",
      "today-gross",
      "returns-total",
      "today-net",
      "month-gross",
      "month-returns",
      "month-net"
    ]);
    const INT_IDS = new Set([
      "today-count",
      "returns-count",
      "active-branches",
      "active-backends",
      "pending-count",
      "failed-count"
    ]);

    function formatNumberForId(id, value) {
      if (!Number.isFinite(value)) return null;
      if (INT_IDS.has(id)) return String(Math.round(value));
      if (MONEY_IDS.has(id)) return value.toFixed(2);
      return String(value);
    }

    function setValue(id, value, fallback = "--") {
      const el = byId(id);
      if (!el) return;
      if (value === null || value === undefined) {
        el.textContent = fallback;
        return;
      }
      if (typeof value === "number") {
        const formatted = formatNumberForId(id, value);
        el.textContent = formatted !== null ? formatted : fallback;
        return;
      }
      el.textContent = String(value);
    }

    function formatAgo(value) {
      if (!value) return "--";
      const t = Date.parse(value);
      if (Number.isNaN(t)) return String(value);
      const diff = Math.max(0, Date.now() - t);
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return mins + "m ago";
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return hrs + "h ago";
      const days = Math.floor(hrs / 24);
      return days + "d ago";
    }

    function setStatusBadge(id, status, fallback = "--") {
      const el = byId(id);
      if (!el) return;
      if (!status) {
        el.textContent = fallback;
        return;
      }
      const s = String(status || "").toUpperCase();
      const cls = s === "ONLINE" || s === "CONNECTED"
        ? "online"
        : (s === "IDLE" || s === "STALE" || s === "DEGRADED")
          ? "idle"
          : "offline";
      el.innerHTML = "<span class=\\\"status " + cls + "\\\">" + s + "</span>";
    }

    async function exportDailyPdf() {
      const filters = currentFilters();
      if (!filters.business_id) {
        alert("Select a business before exporting.");
        return;
      }
      const res = await fetch("/api/cloud/reports/daily-summary.pdf" + (qs(filters) ? "?" + qs(filters) : ""), {
        headers: authHeaders()
      });
      if (!res.ok) {
        const text = await res.text();
        alert("Export failed: " + (text || "SERVER_ERROR"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "automax-daily-summary.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    async function exportExcel() {
      const filters = currentFilters();
      if (!filters.business_id) {
        alert("Select a business before exporting.");
        return;
      }
      const res = await fetch("/api/cloud/reports/sales-report.xlsx" + (qs(filters) ? "?" + qs(filters) : ""), {
        headers: authHeaders()
      });
      if (!res.ok) {
        const text = await res.text();
        alert("Export failed: " + (text || "SERVER_ERROR"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "automax-sales-report.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function currentFilters() {
      const businessId = document.getElementById("filter_business").value || "";
      const range = getDateRange();
      return {
        business_id: businessId,
        branch_id: document.getElementById("filter_branch").value || "",
        start_date: range.start,
        end_date: range.end
      };
    }

    function qs(params) {
      const p = new URLSearchParams();
      if (params.business_id) p.set("business_id", params.business_id);
      if (params.branch_id) p.set("branch_id", params.branch_id);
      if (params.start_date) p.set("start_date", params.start_date);
      if (params.end_date) p.set("end_date", params.end_date);
      return p.toString();
    }

    function formatDate(d) {
      return d.toISOString().slice(0, 10);
    }

    function getDateRange() {
      const mode = byId("filter_range")?.value || "today";
      const now = new Date();
      if (mode === "today") {
        const d = formatDate(now);
        return { start: d, end: d };
      }
      if (mode === "yesterday") {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        const s = formatDate(d);
        return { start: s, end: s };
      }
      if (mode === "this_week") {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return { start: formatDate(start), end: formatDate(end) };
      }
      if (mode === "last_week") {
        const end = new Date(now);
        end.setDate(now.getDate() - now.getDay() - 1);
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        return { start: formatDate(start), end: formatDate(end) };
      }
      if (mode === "this_month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: formatDate(start), end: formatDate(end) };
      }
      const start = byId("range_start")?.value || "";
      const end = byId("range_end")?.value || "";
      return { start, end };
    }

    function updateRangeInputs() {
      const mode = byId("filter_range")?.value || "today";
      const wrapStart = byId("range_start_wrap");
      const wrapEnd = byId("range_end_wrap");
      const isCustom = mode === "custom";
      if (wrapStart) wrapStart.style.display = isCustom ? "" : "none";
      if (wrapEnd) wrapEnd.style.display = isCustom ? "" : "none";
      if (!isCustom) {
        const range = getDateRange();
        if (byId("range_start")) byId("range_start").value = range.start;
        if (byId("range_end")) byId("range_end").value = range.end;
      }
    }

    function updateFilterContext() {
      const bizSel = byId("filter_business");
      const branchSel = byId("filter_branch");
      const bizText = bizSel?.selectedOptions?.[0]?.textContent || "All";
      const branchText = branchSel?.selectedOptions?.[0]?.textContent || "All";
      const user = state.user || {};
      const role = user.role || "";
      const name = user.username || "admin";
      const account = [];
      account.push("Logged in as: " + name + (role ? " (" + role + ")" : ""));
      account.push("Business: " + (user.business_name || bizText || "All"));
      account.push("Branch: " + (user.branch_name || branchText || "All"));
      const ctx = byId("account-context");
      const text = account.join(" | ");
      if (ctx) ctx.textContent = text;
      const bar = byId("account-text");
      if (bar) bar.textContent = text;
    }

    async function loadSummary() {
      debug("loadSummary");
      const filters = currentFilters();
      if (!filters.business_id) return;
      try {
        const res = await fetch("/api/dashboard/summary" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
        if (!res.ok) throw new Error("summary_failed");
        const data = await res.json();
        setValue("active-branches", Number(data.active_branches));
        setValue("active-backends", Number(data.active_backends));
      } catch (_) {
        setValue("active-branches", null);
        setValue("active-backends", null);
      }
      const empty = byId("summary-empty");
      if (empty) {
        const a = Number(byId("active-backends")?.textContent || 0);
        const b = Number(byId("active-branches")?.textContent || 0);
        empty.style.display = a === 0 && b === 0 ? "block" : "none";
      }
    }

    function setTableEmpty(tableId, emptyId, rows) {
      const empty = document.getElementById(emptyId);
      const table = document.getElementById(tableId);
      if (!rows.length) {
        empty.style.display = "block";
        table.style.display = "none";
      } else {
        empty.style.display = "none";
        table.style.display = "table";
      }
    }

    async function loadSales() {
      debug("loadSales");
      const filters = currentFilters();
      if (!filters.business_id) return;
      const res = await fetch("/api/dashboard/sales/recent" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setTableEmpty("sales-table", "sales-empty", rows);
      const body = document.getElementById("sales-body");
      body.innerHTML = "";
      for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (r.receipt_no || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.branch_name || "-") + "</td>" +
          "<td>" + (r.total ?? 0) + "</td>" +
          "<td>" + (r.cashier_name || "-") + "</td>" +
          "<td>" + (r.created_at || "-") + "</td>";
        body.appendChild(tr);
      }
    }

    async function loadBackends() {
      debug("loadBackends");
      const filters = currentFilters();
      if (!filters.business_id) return;
      const res = await fetch("/api/dashboard/backends" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setTableEmpty("backend-table", "backend-empty", rows);
      if (!rows.length) setSyncLine("Awaiting first heartbeat.");
      const body = document.getElementById("backend-body");
      body.innerHTML = "";
      for (const r of rows) {
        const tr = document.createElement("tr");
        const statusClass = (r.status || "").toLowerCase() === "online" ? "online" : "offline";
        tr.innerHTML = "<td>" + (r.backend_name || r.backend_id) + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.branch_name || "-") + "</td>" +
          "<td>" + (r.last_heartbeat_at || "-") + "</td>" +
          "<td>" + (r.backend_version || "-") + "</td>" +
          "<td><span class=\\\"status " + statusClass + "\\\">" + (r.status || "-") + "</span></td>";
        body.appendChild(tr);
      }
    }

    async function loadSyncHealth() {
      debug("loadSyncHealth");
      const filters = currentFilters();
      if (!filters.business_id) return;
      try {
        const res = await fetch("/api/dashboard/sync-health" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
        if (!res.ok) throw new Error("sync_failed");
        const data = await res.json();
        setStatusBadge("backend-status", data.backend_status || null);
        setStatusBadge("cloud-status", data.cloud_status || null);
        setValue("last-heartbeat", data.last_heartbeat_at ? formatAgo(data.last_heartbeat_at) : "Awaiting first heartbeat");
        setValue("last-sale", data.last_synced_sale_at ? formatAgo(data.last_synced_sale_at) : "Awaiting first sale sync");
        setValue("last-return", data.last_synced_return_at ? formatAgo(data.last_synced_return_at) : "Awaiting first return sync");
        setValue("last-snapshot", data.last_inventory_snapshot_at ? formatAgo(data.last_inventory_snapshot_at) : "Awaiting first snapshot");
        setValue("pending-count", Number(data.pending_sync_count || 0));
        setValue("failed-count", Number(data.failed_sync_count || 0));

        const cloudStatus = String(data.cloud_status || "DISCONNECTED").toUpperCase();
        const backendStatus = String(data.backend_status || "OFFLINE").toUpperCase();
        const pending = Number(data.pending_sync_count || 0);
        const failed = Number(data.failed_sync_count || 0);
        setSyncLine("Cloud: " + cloudStatus + " | Backend: " + backendStatus + " | Pending: " + pending + " | Failed: " + failed);
        const empty = byId("sync-empty");
        if (empty) {
          const hasAny =
            data.last_heartbeat_at ||
            data.last_synced_sale_at ||
            data.last_synced_return_at ||
            data.last_inventory_snapshot_at;
          empty.style.display = hasAny ? "none" : "block";
        }
      } catch (_) {
        setStatusBadge("backend-status", null);
        setStatusBadge("cloud-status", null);
        setValue("last-heartbeat", null);
        setValue("last-sale", null);
        setValue("last-return", null);
        setValue("last-snapshot", null);
        setValue("pending-count", null);
        setValue("failed-count", null);
        const empty = byId("sync-empty");
        if (empty) empty.style.display = "block";
        setSyncLine("Sync: unavailable");
      }
    }

    async function loadReturns() {
      debug("loadReturns");
      const filters = currentFilters();
      if (!filters.business_id) return;
      const res = await fetch("/api/cloud/dashboard/returns-recent" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setTableEmpty("returns-table", "returns-table-empty", rows);
      const body = document.getElementById("returns-body");
      body.innerHTML = "";
      for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (r.return_no || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.branch_name || "-") + "</td>" +
          "<td>" + (r.total ?? 0) + "</td>" +
          "<td>" + (r.refund_method || "-") + "</td>" +
          "<td>" + (r.cashier_name || "-") + "</td>" +
          "<td>" + (r.created_at || "-") + "</td>";
        body.appendChild(tr);
      }
    }

    async function loadTodaySales() {
      debug("loadTodaySales");
      const filters = currentFilters();
      if (!filters.business_id) return;
      try {
        const res = await fetch("/api/cloud/dashboard/today-sales" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
        if (!res.ok) throw new Error("today_failed");
        const data = await res.json();
        setValue("today-gross", Number(data.gross_sales_today));
        setValue("returns-total", Number(data.returns_today));
        setValue("today-net", Number(data.net_sales_today));
        setValue("today-count", Number(data.transactions_count));
        setValue("sales-today", Number(data.net_sales_today));
      } catch (_) {
        setValue("today-gross", null);
        setValue("today-count", null);
        setValue("returns-total", null);
        setValue("today-net", null);
        setValue("sales-today", null);
      }
    }

    async function loadReturnsSummary() {
      debug("loadReturnsSummary");
      const filters = currentFilters();
      if (!filters.business_id) return;
      try {
        const res = await fetch("/api/cloud/dashboard/returns-summary" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
        if (!res.ok) throw new Error("returns_failed");
        const data = await res.json();
        setValue("returns-total", Number(data.total_returns));
        setValue("returns-count", Number(data.transactions));
        const empty = byId("returns-empty");
        if (empty) empty.style.display = Number(data.transactions || 0) > 0 ? "none" : "block";
      } catch (_) {
        setValue("returns-total", null);
        setValue("returns-count", null);
        const empty = byId("returns-empty");
        if (empty) empty.style.display = "block";
      }
    }

    async function loadMonthSales() {
      debug("loadMonthSales");
      const filters = currentFilters();
      if (!filters.business_id) return;
      try {
        const res = await fetch("/api/cloud/dashboard/month-sales" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
        if (!res.ok) throw new Error("month_failed");
        const data = await res.json();
        setValue("month-gross", Number(data.gross_sales_month));
        setValue("month-returns", Number(data.returns_month));
        setValue("month-net", Number(data.net_sales_month));
        setValue("sales-month", Number(data.net_sales_month));
      } catch (_) {
        setValue("month-gross", null);
        setValue("month-returns", null);
        setValue("month-net", null);
        setValue("sales-month", null);
      }
    }

    async function loadActiveCashiers() {
      debug("loadActiveCashiers");
      const filters = currentFilters();
      if (!filters.business_id) return;
      const res = await fetch("/api/cloud/dashboard/active-cashiers" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setTableEmpty("cashier-table", "cashier-empty", rows);
      const body = document.getElementById("cashier-body");
      body.innerHTML = "";
      for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (r.cashier_name || "-") + "</td>" +
          "<td>" + (r.transactions ?? 0) + "</td>" +
          "<td>" + (r.total ?? 0) + "</td>";
        body.appendChild(tr);
      }
    }

    async function loadActiveRegisters() {
      debug("loadActiveRegisters");
      const filters = currentFilters();
      if (!filters.business_id) return;
      const res = await fetch("/api/cloud/dashboard/active-registers" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setTableEmpty("register-table", "register-empty", rows);
      const body = document.getElementById("register-body");
      body.innerHTML = "";
      for (const r of rows) {
        const status = String(r.status || "OFFLINE").toUpperCase();
        const statusClass = status === "ONLINE" ? "online" : (status === "IDLE" ? "idle" : "offline");
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (r.register_name || "-") + "</td>" +
          "<td>" + (r.cashier_name || "-") + "</td>" +
          "<td>" + (r.branch_name || "-") + "</td>" +
          "<td>" + (r.last_seen_at ? formatAgo(r.last_seen_at) : "-") + "</td>" +
          "<td><span class=\\\"status " + statusClass + "\\\">" + status + "</span></td>";
        body.appendChild(tr);
      }
    }

    async function loadLiveMonitoring() {
      debug("loadLiveMonitoring");
      const filters = currentFilters();
      if (!filters.business_id) return;
      const res = await fetch("/api/cloud/dashboard/active-registers" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setTableEmpty("monitoring-table", "monitoring-empty", rows);
      const body = document.getElementById("monitoring-body");
      if (!body) return;
      body.innerHTML = "";
      let online = 0;
      let idle = 0;
      let offline = 0;
      for (const r of rows) {
        const status = String(r.status || "OFFLINE").toUpperCase();
        if (status === "ONLINE") online += 1;
        else if (status === "IDLE") idle += 1;
        else offline += 1;
        const statusClass = status === "ONLINE" ? "online" : (status === "IDLE" ? "idle" : "offline");
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (r.register_name || "-") + "</td>" +
          "<td>" + (r.cashier_name || "-") + "</td>" +
          "<td>" + (r.branch_name || "-") + "</td>" +
          "<td>" + (r.last_seen_at ? formatAgo(r.last_seen_at) : "-") + "</td>" +
          "<td>" + (r.last_sale_at ? formatAgo(r.last_sale_at) : "-") + "</td>" +
          "<td><span class=\\\"status " + statusClass + "\\\">" + status + "</span></td>";
        body.appendChild(tr);
      }
      const statusEl = byId("monitoring-status");
      if (statusEl) {
        if (!rows.length) {
          statusEl.textContent = "Awaiting register activity";
        } else {
          statusEl.textContent = "Online: " + online + " | Idle: " + idle + " | Offline: " + offline;
        }
      }
    }

    async function loadLowStock() {
      debug("loadLowStock");
      const filters = currentFilters();
      if (!filters.business_id) return;
      const res = await fetch("/api/cloud/dashboard/low-stock" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setTableEmpty("lowstock-table", "lowstock-empty", rows);
      const body = document.getElementById("lowstock-body");
      body.innerHTML = "";
      for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (r.product_name || "-") + "</td>" +
          "<td>" + (r.stock ?? 0) + "</td>" +
          "<td>" + (r.reorder_level ?? "-") + "</td>";
        body.appendChild(tr);
      }
    }

    async function loadBranchComparison() {
      debug("loadBranchComparison");
      const filters = currentFilters();
      if (!filters.business_id) return;
      const res = await fetch("/api/cloud/dashboard/branch-sales" + (qs(filters) ? "?" + qs(filters) : ""), { headers: authHeaders() });
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setTableEmpty("branchcomp-table", "branchcomp-empty", rows);
      const body = document.getElementById("branchcomp-body");
      body.innerHTML = "";
      for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (r.branch || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.transactions ?? 0) + "</td>" +
          "<td>" + (r.sales ?? 0) + "</td>";
        body.appendChild(tr);
      }
    }

    async function loadBusinessOptions() {
      debug("loadBusinessOptions");
      const res = await fetch("/api/dashboard/businesses", { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const sel = byId("filter_business");
      if (!sel) return;
      sel.innerHTML = "<option value=\\\"\\\">All Businesses</option>";
      (data.rows || []).forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.name;
        sel.appendChild(opt);
      });
      if (state.user && state.user.business_id) {
        sel.value = state.user.business_id;
        sel.disabled = true;
      } else {
        sel.disabled = false;
      }
    }

    async function loadBranchOptions() {
      debug("loadBranchOptions");
      const businessId = byId("filter_business")?.value || "";
      const res = await fetch("/api/dashboard/branches" + (businessId ? "?business_id=" + businessId : ""), { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const sel = byId("filter_branch");
      if (!sel) return;
      sel.innerHTML = "<option value=\\\"\\\">All Branches</option>";
      (data.rows || []).forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.name;
        sel.appendChild(opt);
      });
      if (state.user && state.user.branch_id) {
        sel.value = state.user.branch_id;
        sel.disabled = true;
      } else {
        sel.disabled = false;
      }
    }

    function decodeJwt(token) {
      try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const payload = JSON.parse(atob(parts[1]));
        return payload;
      } catch {
        return null;
      }
    }

    function updateAuthContext() {
      const token = localStorage.getItem("cloud_admin_token");
      const ctx = byId("account-text");
      if (!ctx) return;
      if (!token) {
        ctx.textContent = "Logged out";
        return;
      }
      updateFilterContext();
    }

    function updateExpiryIndicator() {
      const token = localStorage.getItem("cloud_admin_token");
      const ctx = byId("account-text");
      const bar = byId("account-text");
      if (!ctx) return;
      if (!token) return;
      const payload = decodeJwt(token);
      if (!payload || !payload.exp) {
        ctx.textContent = ctx.textContent + " ? Session active";
        if (bar) bar.textContent = ctx.textContent;
        return;
      }
      const now = Math.floor(Date.now() / 1000);
      const remaining = payload.exp - now;
      if (remaining <= 0) {
        localStorage.removeItem("cloud_admin_token");
        document.getElementById("admin_login_status").textContent = "Session expired. Please login.";
        ctx.textContent = "Logged out";
        if (bar) bar.textContent = "Logged out";
        return;
      }
      const mins = Math.ceil(remaining / 60);
      ctx.textContent = ctx.textContent.split(" ? ")[0] + " ? Session expires in: " + mins + "m";
      if (bar) bar.textContent = ctx.textContent;
    }

    function setSyncLine(text) {
      const line = byId("sync-line");
      if (!line) return;
      line.textContent = text || "";
    }

    async function doLogin() {
      debug("login clicked");
      const username = byId("admin_user")?.value.trim() || "";
      const password = byId("admin_pass")?.value.trim() || "";
      const status = byId("admin_login_status");
      if (!status) return;
      status.textContent = "Logging in...";
      const res = await fetch("/api/cloud/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const raw = await res.text();
      let data = {};
      try { data = JSON.parse(raw); } catch (_) { data = {}; }
      if (!res.ok) {
        status.textContent = data.message || "Login failed.";
        return;
      }
      if (data && data.token) {
        localStorage.setItem("cloud_admin_token", data.token);
        status.textContent = "Logged in.";
        await loadAuthContext();
        await loadBusinessOptions();
        await loadBranchOptions();
        updateFilterContext();
        applyRoleUi();
        updateAuthContext();
        updateExpiryIndicator();
        toggleLoginUi(true);
      } else {
        status.textContent = "Login failed.";
      }
    }

    function doLogout() {
      debug("logout clicked");
      localStorage.removeItem("cloud_admin_token");
      const status = byId("admin_login_status");
      if (status) status.textContent = "Logged out.";
      state.user = null;
      const biz = byId("filter_business");
      const br = byId("filter_branch");
      if (biz) biz.disabled = false;
      if (br) br.disabled = false;
      updateAuthContext();
      toggleLoginUi(false);
    }

    async function loadAuthContext() {
      const token = localStorage.getItem("cloud_admin_token");
      if (!token) return;
      const res = await fetch("/api/cloud/auth/me", { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      state.user = data.user || null;
    }

    function showSection(name) {
      const dash = byId("dashboard-section");
      const monitoring = byId("monitoring-section");
      const users = byId("users-section");
      if (dash) dash.style.display = name === "dashboard" ? "block" : "none";
      if (monitoring) monitoring.style.display = name === "monitoring" ? "block" : "none";
      if (users) users.style.display = name === "users" ? "block" : "none";
    }

    function applyRoleUi() {
      const user = state.user || {};
      const role = String(user.role || "");
      const navUsers = byId("nav-users");
      if (role && role !== "SUPERADMIN") {
        if (navUsers) navUsers.style.display = "none";
      } else {
        if (navUsers) navUsers.style.display = "inline-block";
      }

      const biz = byId("filter_business");
      const br = byId("filter_branch");
      if (user.business_id && biz) {
        biz.value = user.business_id;
        biz.disabled = true;
      }
      if (user.branch_id && br) {
        br.value = user.branch_id;
        br.disabled = true;
      }
    }

    function toggleLoginUi(isLoggedIn) {
      const loginCard = byId("login-card");
      const accountBar = byId("account-bar");
      if (loginCard) loginCard.style.display = isLoggedIn ? "none" : "flex";
      if (accountBar) accountBar.style.display = isLoggedIn ? "flex" : "none";
    }

    function resetUserForm() {
      byId("user_edit_id").value = "";
      byId("user_username").value = "";
      byId("user_username").readOnly = false;
      byId("user_fullname").value = "";
      byId("user_password").value = "";
      byId("user_password2").value = "";
      byId("user_role").value = "";
      byId("user_active").checked = true;
      byId("user_save_btn").textContent = "Create User";
      byId("user_status").textContent = "";
    }

    async function loadUserBusinesses() {
      debug("loadUserBusinesses");
      const res = await fetch("/api/dashboard/businesses", { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const sel = byId("user_business");
      if (!sel) return;
      sel.innerHTML = "<option value=\\\"\\\">Select Business</option>";
      (data.rows || []).forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.name;
        sel.appendChild(opt);
      });
    }

    async function loadUserBranches() {
      debug("loadUserBranches");
      const businessId = byId("user_business")?.value || "";
      const res = await fetch("/api/dashboard/branches" + (businessId ? "?business_id=" + businessId : ""), { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const sel = byId("user_branch");
      if (!sel) return;
      sel.innerHTML = "<option value=\\\"\\\">Select Branch</option>";
      (data.rows || []).forEach((b) => {
        const opt = document.createElement("option");
        opt.value = b.id;
        opt.textContent = b.name;
        sel.appendChild(opt);
      });
    }

    async function loadUsers() {
      debug("loadUsers");
      const res = await fetch("/api/cloud/users", { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      setTableEmpty("users-table", "users-empty", rows);
      const body = document.getElementById("users-body");
      body.innerHTML = "";
      for (const r of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + (r.username || "-") + "</td>" +
          "<td>" + (r.full_name || "-") + "</td>" +
          "<td>" + (r.role || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.branch_name || "-") + "</td>" +
          "<td>" + (r.is_active ? "Active" : "Inactive") + "</td>" +
          "<td>" + (r.created_at || "-") + "</td>" +
          "<td>" +
          "<button data-action=\\\"edit\\\" data-id=\\\"" + r.id + "\\\" data-username=\\\"" + (r.username || "") + "\\\" data-fullname=\\\"" + (r.full_name || "") + "\\\" data-role=\\\"" + (r.role || "") + "\\\" data-business=\\\"" + (r.business_id || "") + "\\\" data-branch=\\\"" + (r.branch_id || "") + "\\\" data-active=\\\"" + r.is_active + "\\\" style=\\\"margin-right:6px;\\\">Edit</button>" +
          "<button data-action=\\\"reset\\\" data-id=\\\"" + r.id + "\\\" style=\\\"margin-right:6px;\\\">Reset Password</button>" +
          "<button data-action=\\\"toggle\\\" data-id=\\\"" + r.id + "\\\" data-active=\\\"" + r.is_active + "\\\">" + (r.is_active ? "Disable" : "Enable") + "</button>" +
          "</td>";
        body.appendChild(tr);
      }
    }

    async function saveUser() {
      debug("saveUser");
      const status = byId("user_status");
      if (!status) return;
      status.textContent = "Saving...";
      const id = byId("user_edit_id").value;
      const username = byId("user_username").value.trim();
      const full_name = byId("user_fullname").value.trim();
      const password = byId("user_password").value;
      const password2 = byId("user_password2").value;
      const role = byId("user_role").value;
      const business_id = byId("user_business").value || null;
      const branch_id = byId("user_branch").value || null;
      const is_active = byId("user_active").checked;

      if (!full_name) return (status.textContent = "Full name required");
      if (!role) return (status.textContent = "Role required");
      if (!id && !username) return (status.textContent = "Username required");
      if (!id && !password) return (status.textContent = "Password required");
      if (!id && password !== password2) return (status.textContent = "Passwords do not match");
      if (role !== "SUPERADMIN" && !business_id) return (status.textContent = "Business required");
      if (role === "BRANCH_MANAGER" && !branch_id) return (status.textContent = "Branch required");

      if (!id) {
        const res = await fetch("/api/cloud/users", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            username,
            full_name,
            password,
            role,
            business_id,
            branch_id,
            is_active
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          status.textContent = err.message || "Create failed";
          return;
        }
        status.textContent = "User created";
      } else {
        const res = await fetch("/api/cloud/users/" + id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            full_name,
            role,
            business_id,
            branch_id,
            is_active
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          status.textContent = err.message || "Update failed";
          return;
        }
        status.textContent = "User updated";
      }
      resetUserForm();
      await loadUsers();
    }

    async function handleUsersTableClick(e) {
      const btn = e.target;
      if (!btn || !btn.dataset || !btn.dataset.action) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === "reset") {
        const pass = prompt("New password:");
        if (!pass) return;
        const res = await fetch("/api/cloud/users/" + id + "/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ password: pass })
        });
        if (!res.ok) {
          alert("Reset failed");
          return;
        }
        alert("Password reset");
      } else if (btn.dataset.action === "toggle") {
        const active = btn.dataset.active === "true";
        const res = await fetch("/api/cloud/users/" + id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ is_active: !active })
        });
        if (!res.ok) {
          alert("Update failed");
          return;
        }
        await loadUsers();
      } else if (btn.dataset.action === "edit") {
        byId("user_edit_id").value = id;
        byId("user_username").value = btn.dataset.username || "";
        byId("user_username").readOnly = true;
        byId("user_fullname").value = btn.dataset.fullname || "";
        byId("user_role").value = btn.dataset.role || "";
        byId("user_active").checked = btn.dataset.active === "true";
        byId("user_business").value = btn.dataset.business || "";
        await loadUserBranches();
        byId("user_branch").value = btn.dataset.branch || "";
        byId("user_save_btn").textContent = "Save Changes";
      }
    }

    let refreshTimer = null;

    async function refreshAll() {
      await Promise.all([
        loadSummary(),
        loadMonthSales(),
        loadTodaySales(),
        loadReturnsSummary(),
        loadActiveCashiers(),
        loadActiveRegisters(),
        loadLiveMonitoring(),
        loadLowStock(),
        loadBranchComparison(),
        loadSales(),
        loadReturns(),
        loadBackends(),
        loadSyncHealth()
      ]);
    }

    function startAutoRefresh() {
      if (refreshTimer) return;
      refreshTimer = setInterval(async () => {
        const token = localStorage.getItem("cloud_admin_token");
        if (!token) {
          clearInterval(refreshTimer);
          refreshTimer = null;
          return;
        }
        updateExpiryIndicator();
        await refreshAll();
      }, 5000);
    }

    async function init() {
      debug("DOM ready, init");
      const pathName = window.location.pathname || "";
      const token = localStorage.getItem("cloud_admin_token");
      if (!token && pathName.startsWith("/dashboard")) {
        window.location.replace("/login");
        return;
      }
      if (token && pathName.startsWith("/login")) {
        window.location.replace("/dashboard");
        return;
      }
      bind("admin_login_btn", "click", doLogin);
      bind("admin_logout_btn", "click", doLogout);
      toggleInput("admin_pass", "toggle_admin_pass");
      bind("filter_business", "change", loadBranchOptions);
      bind("filter_range", "change", () => {
        updateRangeInputs();
      });
      bind("apply_filters", "click", async () => {
        await refreshAll();
        updateFilterContext();
      });
      bind("nav-dashboard", "click", () => showSection("dashboard"));
      bind("nav-monitoring", "click", async () => {
        showSection("monitoring");
        await loadLiveMonitoring();
      });
      bind("nav-users", "click", async () => {
        showSection("users");
        await loadUserBusinesses();
        await loadUserBranches();
        await loadUsers();
      });
      bind("export_pdf_btn", "click", exportDailyPdf);
      bind("export_xlsx_btn", "click", exportExcel);
      bind("user_business", "change", loadUserBranches);
      bind("user_save_btn", "click", saveUser);
      bind("user_cancel_btn", "click", resetUserForm);
      bind("users-body", "click", handleUsersTableClick);

      await loadAuthContext();
      applyRoleUi();
      toggleLoginUi(!!localStorage.getItem("cloud_admin_token"));
      await loadBusinessOptions();
      await loadBranchOptions();
      updateRangeInputs();
      updateFilterContext();
      updateAuthContext();
      updateExpiryIndicator();
      await refreshAll();
      startAutoRefresh();
    }
    window.addEventListener("error", (e) => {
      console.error("[DASH] runtime error:", e.message);
      showInitError("Dashboard failed to initialize. Check console.");
    });
    window.addEventListener("focus", () => {
      const token = localStorage.getItem("cloud_admin_token");
      if (token) refreshAll().catch(() => {});
    });
    document.addEventListener("visibilitychange", () => {
      const token = localStorage.getItem("cloud_admin_token");
      if (document.visibilityState === "visible" && token) {
        refreshAll().catch(() => {});
      }
    });
    init().catch((e) => {
      console.error("[DASH] init failed:", e && e.message ? e.message : e);
      showInitError("Dashboard failed to initialize. Check console.");
    });
  </script>
</body>
</html>`);
});

module.exports = router;
