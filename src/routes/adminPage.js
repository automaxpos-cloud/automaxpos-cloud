const express = require("express");
const { CLOUD_BASE_URL } = require("../config/env");

const router = express.Router();

router.get(
  [
    "/",
    "/automax-pos",
    "/automax-pos/requests",
    "/automax-pos/issued",
    "/automax-pos/licenses",
    "/automax-pos/backends",
    "/automax-pos/businesses",
    "/automax-pos/sync",
    "/settings"
  ],
  (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>JP Max Admin Portal - AutoMax POS Control Panel</title>
  <script>
    (function () {
      const saved = localStorage.getItem("automax-theme") || "dark";
      document.documentElement.setAttribute("data-theme", saved);
    })();
  </script>
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
      --neutral: #94a3b8;
      --sidebar-bg: #0f1728;
      --sidebar-item-bg: #121c30;
      --sidebar-text: #e6e9ef;
      --sidebar-active: #2e78ff;
    }
    :root[data-theme="light"] {
      --bg: #f3f6fb;
      --panel: #ffffff;
      --panel-2: #f7f9fc;
      --text: #0f172a;
      --muted: #475569;
      --accent: #2563eb;
      --good: #16a34a;
      --bad: #dc2626;
      --warn: #d97706;
      --border: #d9e0ee;
      --neutral: #64748b;
      --sidebar-bg: #f4f6fb;
      --sidebar-item-bg: #ffffff;
      --sidebar-text: #1a1a1a;
      --sidebar-active: #2e6cff;
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
    .layout {
      display: grid;
      grid-template-columns: 230px 1fr;
      min-height: 100vh;
    }
    aside {
      border-right: 1px solid var(--border);
      padding: 18px 16px;
      background: var(--sidebar-bg);
    }
    .brand { font-weight: 600; margin-bottom: 18px; }
    nav a {
      display: block;
      padding: 10px 12px;
      margin-bottom: 8px;
      border-radius: 8px;
      text-decoration: none;
      color: var(--sidebar-text);
      border: 1px solid var(--border);
      background: var(--sidebar-item-bg);
    }
    nav a:hover { border-color: var(--sidebar-active); }
    nav a.active { background: var(--sidebar-active); color: #fff; }
    main { padding: 20px 28px; }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .page-title { margin: 0; font-size: 20px; font-weight: 600; }
    .theme-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: #0b1220;
      color: var(--text);
      cursor: pointer;
    }
    :root[data-theme="light"] .theme-toggle {
      background: #e2e8f0;
      color: #0f172a;
      border-color: #cbd5e1;
    }
    .theme-toggle:hover { border-color: var(--accent); }
    .theme-icon { width: 16px; height: 16px; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .muted { color: var(--muted); }
    .grid { display: grid; gap: 16px; }
    .cards { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .card {
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }
    .card h3 { margin: 0 0 6px; font-size: 14px; color: var(--muted); }
    .card .value { font-size: 20px; font-weight: 600; }
    .toolbar { display: flex; gap: 10px; align-items: center; margin: 12px 0; flex-wrap: wrap; }
    .toolbar .status-line { color: var(--muted); font-size: 12px; }
    .empty {
      padding: 14px;
      color: var(--muted);
      border: 1px dashed var(--border);
      border-radius: 10px;
      background: rgba(17,26,43,0.4);
    }
    input, select, textarea {
      background: var(--panel-2);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    th, td { padding: 9px 10px; font-size: 12.5px; border-bottom: 1px solid var(--border); }
    th { text-align: left; color: var(--muted); background: rgba(255,255,255,0.02); }
    tr:last-child td { border-bottom: none; }
    .btn {
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: #1f2a40;
      color: #fff;
      cursor: pointer;
    }
    .btn.primary { background: var(--accent); }
    .status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-pending { color: var(--warn); background: rgba(250,204,21,0.15); }
    .badge-paid { color: var(--good); background: rgba(37,192,109,0.15); }
    .badge-refunded { color: var(--bad); background: rgba(239,68,68,0.15); }
    .badge-active { color: var(--good); background: rgba(37,192,109,0.15); }
    .badge-expired { color: var(--warn); background: rgba(250,204,21,0.15); }
    .badge-revoked { color: var(--bad); background: rgba(239,68,68,0.15); }
    .badge-online { color: var(--good); background: rgba(37,192,109,0.15); }
    .badge-offline { color: var(--bad); background: rgba(239,68,68,0.15); }
    .badge-license-active { color: var(--good); background: rgba(37,192,109,0.15); }
    .badge-license-none { color: var(--warn); background: rgba(250,204,21,0.15); }
    .badge-license-expired { color: var(--bad); background: rgba(239,68,68,0.15); }
    .badge-license-revoked { color: var(--neutral); background: rgba(148,163,184,0.15); }
    .badge-license-pending { color: var(--warn); background: rgba(250,204,21,0.15); }
    .hidden { display: none; }
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #111a2b;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 10px 14px;
      border-radius: 10px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.35);
      display: none;
      z-index: 50;
    }
    .modal {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: none; align-items: center; justify-content: center;
    }
    .modal .panel {
      width: 420px; max-width: 92%;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }
    .modal .panel h3 { margin-top: 0; }
    .row { display: flex; gap: 10px; }
    .row > div { flex: 1; }
    .spacer { flex: 1; }
    .detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .detail-item { padding: 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel-2); font-size: 12px; }
    .detail-item span { color: var(--muted); display: block; font-size: 11px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="layout">
    <aside>
      <div class="brand">JP Max Admin Portal<div class="muted" style="margin-top:6px;">AutoMax POS Control Panel</div></div>
      <nav>
        <a href="/jpmax-admin" id="nav-portal">JP Max Portal</a>
        <a href="/jpmax-admin/automax-pos" id="nav-overview">AutoMax POS Overview</a>
        <a href="/jpmax-admin/automax-pos/requests" id="nav-requests">License Requests</a>
        <a href="/jpmax-admin/automax-pos/issued" id="nav-issued">Issued Licenses</a>
        <a href="/jpmax-admin/automax-pos/licenses" id="nav-manual">Manual License Manager</a>
        <a href="/jpmax-admin/automax-pos/backends" id="nav-backends">Backends</a>
        <a href="/jpmax-admin/automax-pos/businesses" id="nav-businesses">Business Owners</a>
        <a href="/jpmax-admin/automax-pos/sync" id="nav-sync">Sync Monitoring</a>
        <a href="/jpmax-admin/settings" id="nav-settings">Platform Settings</a>
      </nav>
      <div class="card" id="login-card" style="margin-top:18px;">
        <div class="muted" style="margin-bottom:6px;">Admin Login</div>
        <input id="admin_user" type="text" placeholder="superadmin" style="width:100%;margin-bottom:8px;" />
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
          <input id="admin_pass" type="password" placeholder="password" style="width:100%;" />
          <button class="btn" id="admin_toggle_pass" type="button">Show</button>
        </div>
        <label class="muted" style="display:flex;gap:6px;align-items:center;margin-bottom:8px;">
          <input id="admin_remember" type="checkbox" />
          Remember me
        </label>
        <button class="btn primary" id="admin_login_btn">Login</button>
        <div id="admin_login_status" class="muted" style="margin-top:8px;"></div>
      </div>
      <div class="card hidden" id="account-card" style="margin-top:18px;">
        <div id="account-text" class="muted"></div>
        <button class="btn" id="admin_logout_btn" style="margin-top:10px;">Logout</button>
      </div>
    </aside>
    <main>
      <div class="topbar">
        <div>
          <div class="page-title">JP Max Admin Portal</div>
          <div class="muted">AutoMax POS Control Panel</div>
        </div>
        <button class="theme-toggle" id="themeToggle" type="button" aria-label="Switch theme" title="Switch theme">
          <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 2a1 1 0 0 1 1 1v1.1a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm6.36 3.64a1 1 0 0 1 0 1.41l-.78.78a1 1 0 1 1-1.41-1.41l.78-.78a1 1 0 0 1 1.41 0ZM12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm9 5a1 1 0 0 1 0 2h-1.1a1 1 0 1 1 0-2H21Zm-3.64 7.36a1 1 0 0 1-1.41 0l-.78-.78a1 1 0 0 1 1.41-1.41l.78.78a1 1 0 0 1 0 1.41ZM13 19.9a1 1 0 1 1-2 0V21a1 1 0 1 1 2 0v-1.1ZM5.64 18.36a1 1 0 0 1 0-1.41l.78-.78a1 1 0 1 1 1.41 1.41l-.78.78a1 1 0 0 1-1.41 0ZM4.1 13a1 1 0 1 1 0-2H3a1 1 0 1 1 0 2h1.1Zm1.54-7.36a1 1 0 0 1 1.41 0l.78.78a1 1 0 1 1-1.41 1.41l-.78-.78a1 1 0 0 1 0-1.41Z"/>
          </svg>
          <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M21 14.5A8.5 8.5 0 1 1 9.5 3a.75.75 0 0 1 .74.98 7 7 0 0 0 9.78 9.78.75.75 0 0 1 .98.74Z"/>
          </svg>
        </button>
      </div>
      <section id="section-portal" class="hidden">
        <h1>JP Max Admin Portal</h1>
        <div class="muted">Internal platform control center</div>
        <div class="grid cards" style="margin-top:12px;">
          <div class="card">
            <h3>AutoMax POS Control Panel</h3>
            <div class="value">Operational Admin</div>
            <div class="muted" style="margin-top:6px;">Manage businesses, licenses, backends, and sync.</div>
          </div>
          <div class="card">
            <h3>Platform Settings</h3>
            <div class="value">Internal</div>
            <div class="muted" style="margin-top:6px;">Roles, access, and global settings.</div>
          </div>
        </div>
      </section>
      <section id="section-overview">
        <h1>AutoMax POS Control Panel</h1>
        <div class="muted">Admin summary</div>
        <div class="grid cards" style="margin-top:12px;">
          <div class="card"><h3>Pending License Requests</h3><div class="value" id="sum_pending">--</div></div>
          <div class="card"><h3>Issued Licenses</h3><div class="value" id="sum_issued">--</div></div>
          <div class="card"><h3>Active Businesses</h3><div class="value" id="sum_businesses">--</div></div>
          <div class="card"><h3>Active Backends</h3><div class="value" id="sum_backends">--</div></div>
          <div class="card"><h3>Expiring Soon</h3><div class="value" id="sum_expiring">--</div></div>
          <div class="card"><h3>Revoked Licenses</h3><div class="value" id="sum_revoked">--</div></div>
        </div>
      </section>

      <section id="section-requests" class="hidden">
        <h1>License Requests</h1>
        <div class="toolbar">
          <input id="request_search" placeholder="Search by request id, business, contact, email, machine id" style="min-width:260px;" />
          <button class="btn" id="requests_refresh">Refresh</button>
          <div class="status-line" id="requests_status"></div>
        </div>
        <div id="requests_empty" class="empty hidden">No license requests found.</div>
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Business Name</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Request Type</th>
              <th>Requested Plan</th>
              <th>Requested Devices</th>
              <th>Hardware Bundle</th>
              <th>Amount</th>
              <th>Machine ID</th>
              <th>Backend ID</th>
              <th>Requested At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="requests_body"></tbody>
        </table>
      </section>

      <section id="section-issued" class="hidden">
        <h1>Issued Licenses</h1>
        <div class="toolbar">
          <button class="btn" id="licenses_refresh">Refresh</button>
          <div class="status-line" id="licenses_status"></div>
        </div>
        <div id="licenses_empty" class="empty hidden">No issued licenses found.</div>
        <table>
          <thead>
            <tr>
              <th>License ID</th>
              <th>Backend ID</th>
              <th>Business</th>
              <th>Branch</th>
              <th>Plan</th>
              <th>Device Limit</th>
              <th>Used Devices</th>
              <th>Machine ID</th>
              <th>Issued At</th>
              <th>Expires At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="licenses_body"></tbody>
        </table>
      </section>

      <section id="section-manual" class="hidden">
        <h1>Manual License Manager</h1>
        <div class="muted">Issue and manage signed licenses from the cloud generator.</div>
        <div class="card" style="margin-top:10px;">
          <div class="row">
            <div class="muted" style="flex:1;">Download the latest AutoMax License Generator executables.</div>
            <a class="btn" href="/downloads/AutoMax_License_Generator_GUI.exe">Download GUI</a>
            <a class="btn" href="/downloads/AutoMax_License_Generator.exe">Download CLI</a>
          </div>
        </div>
        <div class="card" style="margin-top:12px;">
          <div class="row">
            <div>
              <label class="muted">Business Owner</label>
              <select id="manual_business" style="width:100%;"></select>
            </div>
            <div>
              <label class="muted">Backend</label>
              <select id="manual_backend" style="width:100%;"></select>
            </div>
          </div>
          <div class="row" style="margin-top:8px;">
            <div>
              <label class="muted">Issue Type</label>
              <select id="manual_issue_type" style="width:100%;">
                <option value="new_license">New License</option>
                <option value="renewal">Renewal</option>
                <option value="device_addon">Extra Device Add-On</option>
                <option value="upgrade">Plan Upgrade</option>
                <option value="correction">Correction / Reissue</option>
              </select>
            </div>
            <div>
              <label class="muted">Plan</label>
              <select id="manual_plan" style="width:100%;">
                <option>Starter</option>
                <option>Standard</option>
                <option>Business</option>
                <option>Enterprise</option>
              </select>
            </div>
            <div>
              <label class="muted">Base Device Limit</label>
              <input id="manual_base_limit" type="number" readonly style="width:100%;" />
            </div>
            <div>
              <label class="muted">Extra Device Count</label>
              <input id="manual_extra_devices" type="number" min="0" value="0" style="width:100%;" />
            </div>
            <div>
              <label class="muted">Total Device Limit</label>
              <input id="manual_total_limit" type="number" readonly style="width:100%;" />
            </div>
          </div>
          <div class="row" style="margin-top:8px;">
            <div>
              <label class="muted">Issued Date</label>
              <input id="manual_issued_at" type="date" style="width:100%;" />
            </div>
            <div>
              <label class="muted">Expiry Date</label>
              <input id="manual_expires" type="date" style="width:100%;" />
            </div>
            <div>
              <label class="muted">License Status</label>
              <select id="manual_status_select" style="width:100%;">
                <option value="active">active</option>
                <option value="expired">expired</option>
                <option value="revoked">revoked</option>
              </select>
            </div>
            <div>
              <label class="muted">Previous License ID</label>
              <input id="manual_prev_license" type="text" readonly style="width:100%;" />
            </div>
            <div>
              <label class="muted">License Version</label>
              <input id="manual_license_version" type="number" readonly style="width:100%;" />
            </div>
          </div>
          <div class="row" style="margin-top:8px;">
            <div>
              <label class="muted">Change Reason</label>
              <input id="manual_change_reason" type="text" readonly style="width:100%;" />
            </div>
            <div>
              <label class="muted">Request ID</label>
              <input id="manual_request_id" type="text" style="width:100%;" />
            </div>
            <div>
              <label class="muted">Hardware Bundle</label>
              <input id="manual_hardware_bundle" type="text" style="width:100%;" />
            </div>
            <div>
              <label class="muted">Quoted Price</label>
              <input id="manual_quoted_price" type="number" min="0" style="width:100%;" />
            </div>
          </div>
          <div class="row" style="margin-top:10px;">
            <div class="spacer"></div>
            <button class="btn" id="manual_refresh">Refresh Lists</button>
            <button class="btn primary" id="manual_create">Create / Update</button>
          </div>
        </div>
        <div class="toolbar">
          <button class="btn" id="manual_list_refresh">Refresh Licenses</button>
          <div class="status-line" id="manual_status"></div>
        </div>
        <div id="manual_empty" class="empty hidden">No licenses found.</div>
        <table>
          <thead>
            <tr>
              <th>License ID</th>
              <th>Backend</th>
              <th>Business</th>
              <th>Plan</th>
              <th>Device Limit</th>
              <th>Expires At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="manual_body"></tbody>
        </table>
      </section>

      <section id="section-backends" class="hidden">
        <h1>Backends</h1>
        <div class="toolbar">
          <button class="btn" id="backends_refresh">Refresh</button>
          <div class="status-line" id="backends_status"></div>
        </div>
        <div id="backends_empty" class="empty hidden">No backends found.</div>
        <table>
          <thead>
            <tr>
              <th>Backend ID</th>
              <th>Business</th>
              <th>Branch</th>
              <th>Machine ID</th>
              <th>Version</th>
              <th>Last Heartbeat</th>
              <th>Status</th>
              <th>License ID</th>
              <th>Plan</th>
              <th>Device Limit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="backends_body"></tbody>
        </table>
      </section>

      <section id="section-businesses" class="hidden">
        <h1>Business Owners</h1>
        <div class="toolbar">
          <button class="btn" id="businesses_refresh">Refresh</button>
          <div class="status-line" id="businesses_status"></div>
        </div>
        <div id="businesses_empty" class="empty hidden">No businesses found.</div>
        <table>
          <thead>
            <tr>
              <th>Business ID</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody id="businesses_body"></tbody>
        </table>
      </section>

      <section id="section-sync" class="hidden">
        <h1>Sync Monitoring</h1>
        <div class="toolbar">
          <button class="btn" id="sync_refresh">Refresh</button>
          <div class="status-line" id="sync_status"></div>
        </div>
        <div class="grid cards" style="margin-bottom:14px;">
          <div class="card"><h3>Total Backends</h3><div class="value" id="sync_total">--</div></div>
          <div class="card"><h3>Online</h3><div class="value" id="sync_online">--</div></div>
          <div class="card"><h3>Delayed</h3><div class="value" id="sync_delayed">--</div></div>
          <div class="card"><h3>Offline</h3><div class="value" id="sync_offline">--</div></div>
          <div class="card"><h3>Sales Synced Today</h3><div class="value" id="sync_sales">--</div></div>
          <div class="card"><h3>Inventory Snapshots Today</h3><div class="value" id="sync_inventory">--</div></div>
          <div class="card"><h3>Heartbeat Events Today</h3><div class="value" id="sync_heartbeats">--</div></div>
        </div>

        <div class="card" style="margin-bottom:14px;">
          <h3 style="margin-top:0;">Recent Backend Activity</h3>
          <div id="sync_recent_empty" class="empty hidden">No recent backend activity.</div>
          <table>
            <thead>
              <tr>
                <th>Backend</th>
                <th>Business</th>
                <th>Branch</th>
                <th>Machine ID</th>
                <th>Last Heartbeat</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="sync_recent_body"></tbody>
          </table>
        </div>

        <div class="card">
          <h3 style="margin-top:0;">Delayed / Offline Backends</h3>
          <div id="sync_delayed_empty" class="empty hidden">No delayed backends.</div>
          <table>
            <thead>
              <tr>
                <th>Backend</th>
                <th>Business</th>
                <th>Branch</th>
                <th>Last Heartbeat</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="sync_delayed_body"></tbody>
          </table>
        </div>
      </section>

      <section id="section-settings" class="hidden">
        <h1>Platform Settings</h1>
        <div class="card" style="margin-bottom:14px;">
          <div class="muted">Internal JP Max settings and hosted sync thresholds.</div>
          <div class="row" style="margin-top:12px;">
            <div>
              <label class="muted">Cloud Base URL</label>
              <input id="settings_cloud_base_url" type="text" style="width:100%;" placeholder="https://automaxpos-cloud.onrender.com" />
            </div>
            <div>
              <label class="muted">Online Threshold (seconds)</label>
              <input id="settings_online_threshold" type="number" min="30" step="30" style="width:100%;" />
            </div>
            <div>
              <label class="muted">Offline Threshold (seconds)</label>
              <input id="settings_offline_threshold" type="number" min="60" step="60" style="width:100%;" />
            </div>
          </div>
          <div class="toolbar" style="margin-top:10px;">
            <button class="btn primary" id="settings_save">Save Settings</button>
            <div class="status-line" id="settings_status"></div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <div class="modal" id="payment_modal">
    <div class="panel">
      <h3>Confirm Payment</h3>
      <div class="row">
        <div>
          <label class="muted">Method</label>
          <select id="pay_method" style="width:100%;">
            <option value="">Select</option>
            <option>Mobile Money</option>
            <option>Bank Transfer</option>
            <option>Cash</option>
            <option>Card</option>
          </select>
        </div>
        <div>
          <label class="muted">Amount</label>
          <input id="pay_amount" type="number" placeholder="0.00" style="width:100%;" />
        </div>
      </div>
      <div style="margin-top:8px;">
        <label class="muted">Transaction ID</label>
        <input id="pay_txn" type="text" placeholder="Ref/Txn ID" style="width:100%;" />
      </div>
      <div style="margin-top:8px;">
        <label class="muted">Notes</label>
        <textarea id="pay_notes" rows="3" style="width:100%;"></textarea>
      </div>
      <div class="row" style="margin-top:12px;">
        <div class="spacer"></div>
        <button class="btn" id="pay_cancel">Cancel</button>
        <button class="btn primary" id="pay_confirm">Confirm</button>
      </div>
    </div>
  </div>
  <div class="modal" id="detail_modal">
    <div class="panel">
      <h3 id="detail_title">Details</h3>
      <div class="detail-grid" id="detail_grid"></div>
      <div class="row" style="margin-top:12px;">
        <div class="spacer"></div>
        <button class="btn" id="detail_reject">Reject</button>
        <button class="btn primary" id="detail_approve">Approve</button>
        <button class="btn" id="detail_close">Close</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>

  <script>
    const byId = (id) => document.getElementById(id);
    const tokenKey = "cloud_admin_token";
    const rememberKey = "vendor_admin_username";
    let activeRequestId = null;
    let requestMap = new Map();
    let licenseMap = new Map();
    let backendMap = new Map();

    function setToast(msg, color) {
      const el = byId("toast");
      if (!el) return;
      el.textContent = msg;
      el.style.display = "block";
      el.style.borderColor = color || "var(--border)";
      setTimeout(() => (el.style.display = "none"), 2500);
    }

    function authHeaders() {
      const token = localStorage.getItem(tokenKey) || "";
      return { Authorization: "Bearer " + token };
    }

    function setActiveNav() {
      const path = window.location.pathname;
      const map = {
        "/jpmax-admin": "nav-portal",
        "/jpmax-admin/automax-pos": "nav-overview",
        "/jpmax-admin/automax-pos/requests": "nav-requests",
        "/jpmax-admin/automax-pos/issued": "nav-issued",
        "/jpmax-admin/automax-pos/licenses": "nav-manual",
        "/jpmax-admin/automax-pos/backends": "nav-backends",
        "/jpmax-admin/automax-pos/businesses": "nav-businesses",
        "/jpmax-admin/automax-pos/sync": "nav-sync",
        "/jpmax-admin/settings": "nav-settings"
      };
      Object.values(map).forEach((id) => byId(id)?.classList.remove("active"));
      const active = map[path] || "nav-portal";
      byId(active)?.classList.add("active");
    }

    function showSection() {
      const path = window.location.pathname;
      const sections = ["portal", "overview", "requests", "issued", "manual", "backends", "businesses", "sync", "settings"];
      sections.forEach((s) => byId("section-" + s)?.classList.add("hidden"));
      if (path.endsWith("/automax-pos")) return byId("section-overview")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/requests")) return byId("section-requests")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/issued")) return byId("section-issued")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/licenses")) return byId("section-manual")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/backends")) return byId("section-backends")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/businesses")) return byId("section-businesses")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/sync")) return byId("section-sync")?.classList.remove("hidden");
      if (path.endsWith("/settings")) return byId("section-settings")?.classList.remove("hidden");
      byId("section-portal")?.classList.remove("hidden");
    }

    function badge(text, cls) {
      return '<span class="status ' + cls + '">' + text + "</span>";
    }

    function statusBadge(status) {
      const s = String(status || "").toUpperCase();
      if (s === "PENDING") return badge(s, "badge-pending");
      if (s === "APPROVED") return badge(s, "badge-active");
      if (s === "REJECTED") return badge(s, "badge-revoked");
      if (s === "ISSUED" || s === "ACTIVE") return badge(s, "badge-active");
      if (s === "REVOKED") return badge(s, "badge-revoked");
      if (s === "EXPIRED") return badge(s, "badge-expired");
      return badge(s || "UNKNOWN", "badge-pending");
    }

    function paymentBadge(status) {
      const s = String(status || "").toUpperCase();
      if (s === "PAID") return badge(s, "badge-paid");
      if (s === "REFUNDED") return badge(s, "badge-refunded");
      return badge(s || "PENDING", "badge-pending");
    }

    function onlineBadge(status) {
      const s = String(status || "").toUpperCase();
      return s === "ONLINE" ? badge("ONLINE", "badge-online") : badge("OFFLINE", "badge-offline");
    }

    function formatDeviceLimit(value) {
      if (value == null || value === "") return "-";
      const n = Number(value);
      if (Number.isFinite(n) && n === 0) return "Unlimited";
      return String(value);
    }

    function licenseBadge(status, hasLicense, hasPending) {
      const s = String(status || "").toUpperCase();
      if (hasLicense) {
        if (s === "REVOKED") return badge("REVOKED", "badge-license-revoked");
        if (s === "EXPIRED") return badge("EXPIRED", "badge-license-expired");
        return badge("ACTIVE LICENSE", "badge-license-active");
      }
      if (hasPending) {
        return badge("LICENSE NOT ACTIVATED", "badge-license-pending");
      }
      return badge("NO LICENSE", "badge-license-none");
    }

    function renderDetails(title, entries) {
      byId("detail_title").textContent = title;
      const grid = byId("detail_grid");
      grid.innerHTML = "";
      entries.forEach(({ label, value, warn }) => {
        const item = document.createElement("div");
        item.className = "detail-item";
        item.style.borderColor = warn ? "var(--warn)" : "var(--border)";
        item.innerHTML = "<span>" + label + "</span>" + (value ?? "-");
        grid.appendChild(item);
      });
      const showActions = title === "License Request";
      byId("detail_approve").style.display = showActions ? "inline-flex" : "none";
      byId("detail_reject").style.display = showActions ? "inline-flex" : "none";
      byId("detail_modal").style.display = "flex";
    }

    async function doLogin() {
      const username = byId("admin_user")?.value.trim() || "";
      const password = byId("admin_pass")?.value.trim() || "";
      const status = byId("admin_login_status");
      if (!username || !password) return (status.textContent = "Enter credentials.");
      status.textContent = "Logging in...";
      const res = await fetch("/api/cloud/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) {
        status.textContent = data.message || "Login failed.";
        return;
      }
      localStorage.setItem(tokenKey, data.token);
      const meRes = await fetch("/api/admin/me", { headers: authHeaders() });
      const me = await meRes.json().catch(() => ({}));
      if (!meRes.ok) {
        localStorage.removeItem(tokenKey);
        status.textContent = "Forbidden: JP Max admin only.";
        return;
      }
      if (byId("admin_remember")?.checked) {
        localStorage.setItem(rememberKey, username);
      } else {
        localStorage.removeItem(rememberKey);
      }
      status.textContent = "Logged in.";
      toggleLogin(true, me.admin || {});
      await refreshAll();
    }

    function toggleLogin(isLoggedIn, data) {
      byId("login-card")?.classList.toggle("hidden", isLoggedIn);
      byId("account-card")?.classList.toggle("hidden", !isLoggedIn);
      if (isLoggedIn) {
        const role = data?.role || data?.user?.role || "SUPERADMIN";
        byId("account-text").textContent =
          "Logged in as: " + (data?.username || data?.user?.username || "admin") + " (" + role + ")";
      }
    }

    function logout() {
      localStorage.removeItem(tokenKey);
      toggleLogin(false, {});
      setToast("Logged out", "var(--warn)");
    }

    async function loadSummary(silent) {
      const res = await fetch("/api/admin/summary", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (!silent) setToast("Failed to load summary.", "var(--bad)");
        byId("sum_pending").textContent = "Error";
        byId("sum_issued").textContent = "Error";
        byId("sum_businesses").textContent = "Error";
        byId("sum_backends").textContent = "Error";
        byId("sum_expiring").textContent = "Error";
        byId("sum_revoked").textContent = "Error";
        return;
      }
      const pending = Number(data.pending_requests ?? 0);
      const issued = Number(data.issued_licenses ?? 0);
      const businesses = Number(data.active_businesses ?? 0);
      const backends = Number(data.active_backends ?? 0);
      const expiring = Number(data.expiring_soon ?? 0);
      const revoked = Number(data.revoked_licenses ?? 0);
      byId("sum_pending").textContent = pending ? String(pending) : "No pending requests";
      byId("sum_issued").textContent = issued ? String(issued) : "No issued licenses yet";
      byId("sum_businesses").textContent = businesses ? String(businesses) : "No active businesses";
      byId("sum_backends").textContent = backends ? String(backends) : "No backends registered";
      byId("sum_expiring").textContent = expiring ? String(expiring) : "No expiring licenses";
      byId("sum_revoked").textContent = revoked ? String(revoked) : "No revoked licenses";
    }

    async function loadRequests(silent) {
      byId("requests_status").textContent = "Loading...";
      const q = byId("request_search")?.value.trim() || "";
      const url = "/api/admin/license-requests" + (q ? "?q=" + encodeURIComponent(q) : "");
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || "Failed to load requests.";
        byId("requests_status").textContent = msg;
        if (!silent) return setToast(msg, "var(--bad)");
        return;
      }
      const body = byId("requests_body");
      body.innerHTML = "";
      requestMap = new Map((data.rows || []).map((r) => [String(r.id), r]));
      byId("requests_status").textContent = (data.rows || []).length + " rows";
      byId("requests_empty").classList.toggle("hidden", (data.rows || []).length > 0);
      (data.rows || []).forEach((r) => {
        const paid = String(r.payment_status || "").toUpperCase() === "PAID";
        const businessName = r.business_name || r.customer_name || "-";
        const contactName = r.contact_person || "-";
        const requestedPlan = r.requested_plan || r.plan || "-";
        const requestedDevices =
          r.requested_total_device_limit ??
          r.device_limit ??
          r.extra_device_count ??
          "-";
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><button class='btn' data-copy='" + (r.request_id || r.id || "") + "'>Copy</button> " + (r.request_id || r.id || "-") + "</td>" +
          "<td>" + businessName + "</td>" +
          "<td>" + contactName + "</td>" +
          "<td>" + (r.email || "-") + "</td>" +
          "<td>" + (r.phone || "-") + "</td>" +
          "<td>" + (r.request_type || "-") + "</td>" +
          "<td>" + requestedPlan + "</td>" +
          "<td>" + requestedDevices + "</td>" +
          "<td>" + (r.hardware_bundle || "-") + "</td>" +
          "<td>" + (r.amount_expected != null ? "K" + r.amount_expected : "-") + "</td>" +
          "<td>" + (r.machine_id ? r.machine_id.slice(0, 10) + "..." : "-") + "</td>" +
          "<td>" + (r.backend_id || "-") + "</td>" +
          "<td>" + (r.requested_at ? new Date(r.requested_at).toLocaleString() : "-") + "</td>" +
          "<td>" + statusBadge(r.status || r.request_status) + "</td>" +
          "<td>" +
          "<button class='btn' data-action='view' data-id='" + r.id + "'>View</button> " +
          "<button class='btn' data-action='approve' data-id='" + r.id + "'>Approve</button> " +
          "<button class='btn' data-action='reject' data-id='" + r.id + "'>Reject</button>" +
          "</td>";
        body.appendChild(tr);
      });
    }

    async function loadLicenses(silent) {
      byId("licenses_status").textContent = "Loading...";
      const res = await fetch("/api/admin/licenses", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || "Failed to load licenses.";
        byId("licenses_status").textContent = msg;
        if (!silent) return setToast(msg, "var(--bad)");
        return;
      }
      const body = byId("licenses_body");
      body.innerHTML = "";
      licenseMap = new Map((data.rows || []).map((r) => [String(r.id), r]));
      byId("licenses_status").textContent = (data.rows || []).length + " rows";
      byId("licenses_empty").classList.toggle("hidden", (data.rows || []).length > 0);
      (data.rows || []).forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><button class='btn' data-copy='" + (r.license_id || "") + "'>Copy</button> " + (r.license_id || "-") + "</td>" +
          "<td>" + (r.backend_id || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.branch_name || "-") + "</td>" +
          "<td>" + (r.plan || "-") + "</td>" +
          "<td>" + formatDeviceLimit(r.device_limit) + "</td>" +
          "<td>" + (r.used_devices ?? "-") + "</td>" +
          "<td>" + (r.machine_id ? r.machine_id.slice(0, 10) + "..." : "-") + "</td>" +
          "<td>" + (r.issued_at ? new Date(r.issued_at).toLocaleString() : "-") + "</td>" +
          "<td>" + (r.expires_at ? new Date(r.expires_at).toLocaleString() : "-") + "</td>" +
          "<td>" + statusBadge(r.status) + "</td>" +
          "<td>" +
          "<button class='btn' data-action='view' data-id='" + r.id + "'>View</button> " +
          "<button class='btn' data-action='renew' data-id='" + r.id + "'>Renew</button> " +
          "<button class='btn' data-action='revoke' data-id='" + r.id + "'>Revoke</button> " +
          "<button class='btn' data-action='download' data-id='" + r.id + "'>Download JSON</button>" +
          "</td>";
        body.appendChild(tr);
      });
    }

    async function loadBackends(silent) {
      byId("backends_status").textContent = "Loading...";
      const res = await fetch("/api/admin/backends", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || "Failed to load backends.";
        byId("backends_status").textContent = msg;
        if (!silent) return setToast(msg, "var(--bad)");
        return;
      }
      const body = byId("backends_body");
      body.innerHTML = "";
      backendMap = new Map((data.rows || []).map((r) => [String(r.backend_id), r]));
      byId("backends_status").textContent = (data.rows || []).length + " rows";
      byId("backends_empty").classList.toggle("hidden", (data.rows || []).length > 0);
      (data.rows || []).forEach((r) => {
        const hasLicense = !!r.license_id;
        const hasPending = !hasLicense && !!r.pending_request_id;
        const planValue = hasLicense ? r.license_plan : r.pending_plan;
        const limitValue = hasLicense ? r.license_device_limit : r.pending_device_limit;
        const licenseBadgeHtml = licenseBadge(r.license_status, hasLicense, hasPending);
        const licenseCell = hasLicense
          ? (r.license_id || "-") + " " + licenseBadgeHtml
          : licenseBadgeHtml;
        const missingLink = !r.business_id || !r.branch_id || !r.business_name || !r.branch_name;
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><button class='btn' data-copy='" + (r.backend_id || "") + "'>Copy</button> " + (r.backend_id || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.branch_name || "-") + "</td>" +
          "<td>" + (r.machine_id ? r.machine_id.slice(0, 10) + "..." : "-") + "</td>" +
          "<td>" + (r.backend_version || "-") + "</td>" +
          "<td>" + (r.last_heartbeat ? new Date(r.last_heartbeat).toLocaleString() : "-") + "</td>" +
          "<td>" + onlineBadge(r.status) + (missingLink ? " " + badge("MISMATCH", "badge-pending") : "") + "</td>" +
          "<td>" + licenseCell + "</td>" +
          "<td>" + (planValue || "-") + "</td>" +
          "<td>" + formatDeviceLimit(limitValue) + "</td>" +
          "<td>" +
          "<button class='btn' data-action='view' data-id='" + r.backend_id + "'>View</button> " +
          "<button class='btn' data-action='disable' data-id='" + r.backend_id + "'>Disable</button> " +
          "<button class='btn' data-action='flag' data-id='" + r.backend_id + "'>Flag</button>" +
          "</td>";
        body.appendChild(tr);
      });
    }

    async function loadBusinesses(silent) {
      const res = await fetch("/api/admin/catalog/businesses", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      const body = byId("businesses_body");
      body.innerHTML = "";
      if (!res.ok) {
        byId("businesses_status").textContent = "Failed to load.";
        if (!silent) return setToast("Failed to load businesses.", "var(--bad)");
        return;
      }
      byId("businesses_status").textContent = (data.rows || []).length + " rows";
      byId("businesses_empty").classList.toggle("hidden", (data.rows || []).length > 0);
      (data.rows || []).forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + (r.id || "-") + "</td>" +
          "<td>" + (r.name || "-") + "</td>";
        body.appendChild(tr);
      });

      const bizSelect = byId("manual_business");
      if (bizSelect) {
        bizSelect.innerHTML = "<option value=''>Select business</option>";
        (data.rows || []).forEach((r) => {
          const opt = document.createElement("option");
          opt.value = r.id;
          opt.textContent = r.name || r.id;
          bizSelect.appendChild(opt);
        });
      }
    }

    async function loadBackendsCatalog(_silent) {
      const bizId = byId("manual_business")?.value || "";
      const url = "/api/admin/catalog/backends" + (bizId ? "?business_id=" + encodeURIComponent(bizId) : "");
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      const backendSelect = byId("manual_backend");
      if (!backendSelect) return;
      backendSelect.innerHTML = "<option value=''>Select backend</option>";
      if (!res.ok) return;
      (data.rows || []).forEach((r) => {
        const opt = document.createElement("option");
        const labelParts = [
          r.backend_name || "Backend",
          r.business_name ? " (" + r.business_name + ")" : "",
          r.branch_name ? " - " + r.branch_name : ""
        ];
        opt.value = r.id;
        opt.textContent = labelParts.join("");
        backendSelect.appendChild(opt);
      });
    }

    async function loadManualLicenses(silent) {
      byId("manual_status").textContent = "Loading...";
      const res = await fetch("/api/admin/licenses", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        byId("manual_status").textContent = "Failed to load.";
        if (!silent) return setToast("Failed to load licenses.", "var(--bad)");
        return;
      }
      const body = byId("manual_body");
      body.innerHTML = "";
      licenseMap = new Map((data.rows || []).map((r) => [String(r.id), r]));
      byId("manual_status").textContent = (data.rows || []).length + " rows";
      byId("manual_empty").classList.toggle("hidden", (data.rows || []).length > 0);
      (data.rows || []).forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + (r.license_id || "-") + "</td>" +
          "<td>" + (r.backend_id || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.plan_name || r.plan || "-") + "</td>" +
          "<td>" + formatDeviceLimit(r.device_limit) + "</td>" +
          "<td>" + (r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "-") + "</td>" +
          "<td>" + statusBadge(r.status) + "</td>" +
          "<td>" +
          "<button class='btn' data-action='load' data-id='" + r.id + "'>Load</button> " +
          "<button class='btn' data-action='revoke' data-id='" + r.id + "'>Revoke</button> " +
          "<button class='btn' data-action='download' data-id='" + r.id + "'>Download JSON</button>" +
          "</td>";
        body.appendChild(tr);
      });
    }

    function manualBaseLimit(plan) {
      const p = String(plan || "").trim();
      if (p === "Starter") return 1;
      if (p === "Standard") return 3;
      if (p === "Business") return 5;
      if (p === "Enterprise") return 10;
      return 1;
    }

    async function loadSyncMonitor(silent) {
      byId("sync_status").textContent = "Loading...";
      const res = await fetch("/api/admin/sync-monitor", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || "Failed to load sync monitoring.";
        byId("sync_status").textContent = msg;
        if (!silent) setToast(msg, "var(--bad)");
        return;
      }
      const summary = data.summary || {};
      byId("sync_status").textContent = "Updated " + new Date().toLocaleTimeString();
      byId("sync_total").textContent = summary.total_backends ?? 0;
      byId("sync_online").textContent = summary.online_backends ?? 0;
      byId("sync_delayed").textContent = summary.delayed_backends ?? 0;
      byId("sync_offline").textContent = summary.offline_backends ?? 0;
      byId("sync_sales").textContent = summary.sales_synced_today ?? 0;
      byId("sync_inventory").textContent = summary.inventory_snapshots_today ?? 0;
      byId("sync_heartbeats").textContent = summary.heartbeat_events_today ?? 0;

      const recentBody = byId("sync_recent_body");
      const delayedBody = byId("sync_delayed_body");
      recentBody.innerHTML = "";
      delayedBody.innerHTML = "";

      const recent = data.recent_activity || [];
      const delayed = data.delayed_backends || [];
      byId("sync_recent_empty").classList.toggle("hidden", recent.length > 0);
      byId("sync_delayed_empty").classList.toggle("hidden", delayed.length > 0);

      recent.forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + (r.backend_id || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.branch_name || "-") + "</td>" +
          "<td>" + (r.machine_id ? r.machine_id.slice(0, 10) + "..." : "-") + "</td>" +
          "<td>" + (r.last_heartbeat ? new Date(r.last_heartbeat).toLocaleString() : "-") + "</td>" +
          "<td>" + onlineBadge(r.status) + "</td>";
        recentBody.appendChild(tr);
      });

      delayed.forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + (r.backend_id || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.branch_name || "-") + "</td>" +
          "<td>" + (r.last_heartbeat ? new Date(r.last_heartbeat).toLocaleString() : "-") + "</td>" +
          "<td>" + onlineBadge(r.status) + "</td>";
        delayedBody.appendChild(tr);
      });
    }

    async function loadPlatformSettings(silent) {
      byId("settings_status").textContent = "Loading...";
      const res = await fetch("/api/admin/platform-settings", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data?.code || data?.error || "";
        const msg = data?.message || data?.error || "Failed to load settings.";
        byId("settings_status").textContent = msg;
        if (!silent && code !== "PLATFORM_SETTINGS_TABLE_MISSING") {
          setToast("Failed to load settings.", "var(--bad)");
        }
        return;
      }
      const s = data.settings || {};
      byId("settings_cloud_base_url").value = s.cloud_base_url || "";
      byId("settings_online_threshold").value = s.heartbeat_online_threshold_seconds ?? 300;
      byId("settings_offline_threshold").value = s.heartbeat_offline_threshold_seconds ?? 900;
      if (s.source === "defaults_table_missing") {
        byId("settings_status").textContent =
          "Using defaults. Saving is unavailable until platform settings storage is initialized.";
        byId("settings_save").disabled = true;
      } else if (s.source === "defaults_created") {
        byId("settings_status").textContent = "Defaults created";
        byId("settings_save").disabled = false;
      } else {
        byId("settings_status").textContent = "Settings loaded";
        byId("settings_save").disabled = false;
      }
    }

    async function savePlatformSettings() {
      const cloudBaseUrl = byId("settings_cloud_base_url").value.trim();
      const online = Number(byId("settings_online_threshold").value);
      const offline = Number(byId("settings_offline_threshold").value);
      if (!cloudBaseUrl) {
        byId("settings_status").textContent = "Cloud Base URL is required.";
        return setToast("Cloud Base URL is required.", "var(--bad)");
      }
      if (!/^https?:\\/\\//i.test(cloudBaseUrl)) {
        byId("settings_status").textContent = "Cloud Base URL must be a valid URL.";
        return setToast("Invalid Cloud Base URL.", "var(--bad)");
      }
      if (!Number.isFinite(online) || online <= 0) {
        byId("settings_status").textContent = "Online threshold must be > 0.";
        return setToast("Online threshold must be > 0.", "var(--bad)");
      }
      if (!Number.isFinite(offline) || offline <= 0 || offline < online) {
        byId("settings_status").textContent = "Offline threshold must be >= online.";
        return setToast("Offline threshold must be >= online.", "var(--bad)");
      }
      const res = await fetch("/api/admin/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          cloud_base_url: cloudBaseUrl,
          heartbeat_online_threshold_seconds: online,
          heartbeat_offline_threshold_seconds: offline
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data?.code || data?.error || "";
        if (code === "PLATFORM_SETTINGS_TABLE_MISSING") {
          byId("settings_status").textContent =
            "Using defaults. Saving is unavailable until platform settings storage is initialized.";
          byId("settings_save").disabled = true;
          return;
        }
        const msg = data?.message || data?.error || "Failed to save settings.";
        byId("settings_status").textContent = msg;
        return setToast(msg, "var(--bad)");
      }
      byId("settings_status").textContent = "Settings saved " + new Date().toLocaleTimeString();
      setToast("Settings saved.", "var(--good)");
    }

    function manualChangeReason(issueType) {
      const t = String(issueType || "").toLowerCase();
      if (t === "renewal") return "renewal";
      if (t === "device_addon") return "device_addon";
      if (t === "upgrade") return "plan_upgrade";
      if (t === "correction") return "correction";
      return "initial_issue";
    }

    function updateManualDerived() {
      const issueType = byId("manual_issue_type")?.value || "new_license";
      const plan = byId("manual_plan")?.value || "Starter";
      const base = manualBaseLimit(plan);
      const extra = Number(byId("manual_extra_devices")?.value || 0);
      const total = base + (Number.isFinite(extra) ? extra : 0);
      byId("manual_base_limit").value = base;
      byId("manual_total_limit").value = total;
      byId("manual_change_reason").value = manualChangeReason(issueType);
      byId("manual_plan").disabled = issueType === "device_addon";
    }

    async function refreshAll() {
      const token = localStorage.getItem(tokenKey);
      if (!token) {
        return setToast("Please login to load admin data.", "var(--warn)");
      }
      await Promise.allSettled([
        loadSummary(true),
        loadRequests(true),
        loadLicenses(true),
        loadBackends(true),
        loadBusinesses(true),
        loadBackendsCatalog(true),
        loadManualLicenses(true),
        loadSyncMonitor(true),
        loadPlatformSettings(true)
      ]);
      updateManualDerived();
    }

    function bindTableActions() {
      byId("requests_body").addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (btn.dataset.copy) {
          navigator.clipboard.writeText(btn.dataset.copy || "");
          return setToast("Copied", "var(--good)");
        }
        const id = btn.dataset.id;
        if (btn.dataset.action === "pay") {
          activeRequestId = id;
          byId("payment_modal").style.display = "flex";
        }
        if (btn.dataset.action === "issue") {
          const resp = await fetch("/api/admin/license-requests/" + id + "/mark-issued", {
            method: "POST",
            headers: authHeaders()
          });
          if (!resp.ok) {
            setToast("Payment required before issuing.", "var(--warn)");
          } else {
            setToast("Marked as issued.", "var(--good)");
          }
          await loadRequests();
        }
        if (btn.dataset.action === "approve") {
          const resp = await fetch("/api/admin/license-requests/" + id + "/approve", {
            method: "POST",
            headers: authHeaders()
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            setToast(data?.message || data?.error || "Approval failed.", "var(--bad)");
          } else {
            setToast("Request approved. License " + (data.license_id || "") + " issued.", "var(--good)");
          }
          await loadRequests();
          await loadLicenses();
        }
        if (btn.dataset.action === "reject") {
          await fetch("/api/admin/license-requests/" + id + "/reject", {
            method: "POST",
            headers: authHeaders()
          });
          setToast("Request rejected.", "var(--warn)");
          await loadRequests();
        }
        if (btn.dataset.action === "view") {
          const r = requestMap.get(String(id));
          if (!r) return;
          activeRequestId = id;
          renderDetails("License Request", [
            { label: "Request ID", value: r.request_id || r.id },
            { label: "Business Name", value: r.business_name || r.customer_name },
            { label: "Contact Person", value: r.contact_person || "-" },
            { label: "Email", value: r.email },
            { label: "Phone", value: r.phone },
            { label: "Request Type", value: r.request_type || "-" },
            { label: "Requested Plan", value: r.requested_plan || r.plan || "-" },
            { label: "Requested Total Devices", value: r.requested_total_device_limit ?? r.device_limit ?? "-" },
            { label: "Extra Device Count", value: r.extra_device_count ?? "-" },
            { label: "Current Plan", value: r.current_plan || "-" },
            { label: "Current Total Devices", value: r.current_total_device_limit ?? "-" },
            { label: "Hardware Bundle", value: r.hardware_bundle || "-" },
            { label: "Amount Expected", value: r.amount_expected != null ? "K" + r.amount_expected : "-" },
            { label: "Notes", value: r.notes || "-" },
            { label: "Machine ID", value: r.machine_id },
            { label: "Backend ID", value: r.backend_id, warn: !r.backend_id },
            { label: "Business ID", value: r.business_id, warn: !r.business_id },
            { label: "Branch ID", value: r.branch_id, warn: !r.branch_id },
            { label: "Requested At", value: r.requested_at }
          ]);
        }
        if (btn.dataset.action === "load") {
          const r = requestMap.get(String(id));
          if (!r) return;
          byId("manual_business").value = r.business_id || "";
          await loadBackendsCatalog();
          byId("manual_backend").value = r.backend_id || "";
          byId("manual_issue_type").value = r.request_type || "new_license";
          byId("manual_plan").value = r.requested_plan || r.plan || "Starter";
          byId("manual_extra_devices").value = r.extra_device_count ?? 0;
          byId("manual_request_id").value = r.request_id || "";
          byId("manual_hardware_bundle").value = r.hardware_bundle || "";
          byId("manual_quoted_price").value = r.amount_expected ?? "";
          updateManualDerived();
          setToast("Request loaded into generator.", "var(--good)");
        }
      });

      byId("licenses_body").addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (btn.dataset.copy) {
          navigator.clipboard.writeText(btn.dataset.copy || "");
          return setToast("Copied", "var(--good)");
        }
        const id = btn.dataset.id;
        if (btn.dataset.action === "revoke") {
          await fetch("/api/admin/licenses/" + id + "/revoke", { method: "POST", headers: authHeaders() });
          setToast("License revoked.", "var(--warn)");
          await loadLicenses();
        }
        if (btn.dataset.action === "renew") {
          await fetch("/api/admin/licenses/" + id + "/renew", { method: "POST", headers: authHeaders() });
          setToast("License renewed.", "var(--good)");
          await loadLicenses();
        }
        if (btn.dataset.action === "download") {
          const res = await fetch("/api/admin/licenses/" + id + "/json", { headers: authHeaders() });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return;
          const blob = new Blob([JSON.stringify(data.license, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = (data.license?.license_id || "license") + ".json";
          a.click();
          URL.revokeObjectURL(url);
        }
        if (btn.dataset.action === "view") {
          const r = licenseMap.get(String(id));
          if (!r) return;
          renderDetails("Issued License", [
            { label: "License ID", value: r.license_id },
            { label: "Plan", value: r.plan },
            { label: "Device Limit", value: r.device_limit },
            { label: "Backend ID", value: r.backend_id, warn: !r.backend_id },
            { label: "Business ID", value: r.business_id, warn: !r.business_id },
            { label: "Branch ID", value: r.branch_id, warn: !r.branch_id },
            { label: "Machine ID", value: r.machine_id },
            { label: "Issued At", value: r.issued_at },
            { label: "Expires At", value: r.expires_at },
            { label: "Status", value: r.status }
          ]);
        }
      });

      byId("backends_body").addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (btn.dataset.copy) {
          navigator.clipboard.writeText(btn.dataset.copy || "");
          return setToast("Copied", "var(--good)");
        }
        const id = btn.dataset.id;
        if (btn.dataset.action === "disable") {
          await fetch("/api/admin/backends/" + id + "/disable", { method: "POST", headers: authHeaders() });
          setToast("Backend disabled.", "var(--warn)");
          await loadBackends();
        }
        if (btn.dataset.action === "flag") {
          await fetch("/api/admin/backends/" + id + "/flag", { method: "POST", headers: authHeaders() });
          setToast("Backend flag toggled.", "var(--good)");
          await loadBackends();
        }
        if (btn.dataset.action === "view") {
          const r = backendMap.get(String(id));
          if (!r) return;
          renderDetails("Backend Cross-check", [
            { label: "Backend ID", value: r.backend_id },
            { label: "Backend Name", value: r.backend_name },
            { label: "Machine ID", value: r.machine_id },
            { label: "Business", value: r.business_name, warn: !r.business_name },
            { label: "Branch", value: r.branch_name, warn: !r.branch_name },
            { label: "Business ID", value: r.business_id, warn: !r.business_id },
            { label: "Branch ID", value: r.branch_id, warn: !r.branch_id },
            { label: "License ID", value: r.license_id, warn: !r.license_id },
            { label: "License Status", value: r.license_status || (r.pending_request_id ? "NOT_ACTIVATED" : "NO_LICENSE") },
            { label: "Plan", value: r.license_plan || r.pending_plan },
            { label: "Device Limit", value: formatDeviceLimit(r.license_device_limit ?? r.pending_device_limit) },
            { label: "Pending Request ID", value: r.pending_request_id },
            { label: "Heartbeat", value: r.last_heartbeat },
            { label: "Status", value: r.status }
          ]);
        }
      });

      byId("manual_body").addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const id = btn.dataset.id;
        if (btn.dataset.action === "revoke") {
          await fetch("/api/admin/licenses/" + id + "/revoke", { method: "POST", headers: authHeaders() });
          setToast("License revoked.", "var(--warn)");
          await loadManualLicenses();
        }
        if (btn.dataset.action === "download") {
          const res = await fetch("/api/admin/licenses/" + id + "/json", { headers: authHeaders() });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return;
          const blob = new Blob([JSON.stringify(data.license, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = (data.license?.license_id || "license") + ".json";
          a.click();
          URL.revokeObjectURL(url);
        }
        if (btn.dataset.action === "load") {
          const r = licenseMap.get(String(id));
          if (!r) return;
          byId("manual_backend").value = r.backend_id || "";
          const reason = String(r.change_reason || "");
          const issueType =
            reason === "device_addon" ? "device_addon"
            : reason === "renewal" ? "renewal"
            : reason === "plan_upgrade" ? "upgrade"
            : reason === "correction" ? "correction"
            : "new_license";
          byId("manual_issue_type").value = issueType;
          byId("manual_plan").value = r.plan_name || r.plan || "Business";
          byId("manual_base_limit").value = r.base_device_limit ?? "";
          byId("manual_extra_devices").value = r.extra_device_count ?? 0;
          byId("manual_total_limit").value = r.total_device_limit ?? r.device_limit ?? "";
          byId("manual_prev_license").value = r.previous_license_id || "";
          byId("manual_license_version").value = r.license_version ?? "";
          byId("manual_change_reason").value = r.change_reason || "";
          byId("manual_status_select").value = r.license_status || "active";
          if (r.expires_at) {
            const d = new Date(r.expires_at);
            byId("manual_expires").value = d.toISOString().slice(0, 10);
          }
          if (r.issued_at) {
            const d = new Date(r.issued_at);
            byId("manual_issued_at").value = d.toISOString().slice(0, 10);
          }
          updateManualDerived();
          setToast("Loaded license into form.", "var(--good)");
        }
      });
    }

    function bindPaymentModal() {
      byId("pay_cancel").addEventListener("click", () => {
        byId("payment_modal").style.display = "none";
      });
      byId("pay_confirm").addEventListener("click", async () => {
        if (!activeRequestId) return;
        const body = {
          payment_method: byId("pay_method").value,
          payment_txn_id: byId("pay_txn").value,
          payment_amount: byId("pay_amount").value,
          payment_notes: byId("pay_notes").value
        };
        const resp = await fetch("/api/admin/license-requests/" + activeRequestId + "/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(body)
        });
        if (!resp.ok) {
          setToast("Payment confirmation failed.", "var(--bad)");
        } else {
          setToast("Payment confirmed.", "var(--good)");
        }
        byId("payment_modal").style.display = "none";
        await loadRequests();
      });
    }

    async function init() {
      setActiveNav();
      showSection();
      bindTableActions();
      bindPaymentModal();

      const themeBtn = byId("themeToggle");
      if (themeBtn) {
        themeBtn.addEventListener("click", () => {
          const current = localStorage.getItem("automax-theme") || "dark";
          const next = current === "dark" ? "light" : "dark";
          localStorage.setItem("automax-theme", next);
          document.documentElement.setAttribute("data-theme", next);
        });
      }

      byId("admin_login_btn").addEventListener("click", doLogin);
      byId("admin_logout_btn").addEventListener("click", logout);
      byId("admin_toggle_pass").addEventListener("click", () => {
        const input = byId("admin_pass");
        if (!input) return;
        const next = input.type === "password" ? "text" : "password";
        input.type = next;
        byId("admin_toggle_pass").textContent = next === "password" ? "Show" : "Hide";
      });
      byId("requests_refresh").addEventListener("click", loadRequests);
      byId("licenses_refresh").addEventListener("click", loadLicenses);
      byId("backends_refresh").addEventListener("click", loadBackends);
      byId("businesses_refresh").addEventListener("click", loadBusinesses);
      byId("sync_refresh").addEventListener("click", loadSyncMonitor);
      byId("settings_save").addEventListener("click", savePlatformSettings);
      byId("manual_refresh").addEventListener("click", async () => {
        await loadBusinesses();
        await loadBackendsCatalog();
        updateManualDerived();
      });
      byId("manual_list_refresh").addEventListener("click", loadManualLicenses);
      byId("manual_create").addEventListener("click", async () => {
        const backendId = byId("manual_backend").value;
        const issueType = byId("manual_issue_type").value;
        const planName = byId("manual_plan").value;
        const baseDeviceLimit = byId("manual_base_limit").value;
        const extraDeviceCount = byId("manual_extra_devices").value;
        const issuedAt = byId("manual_issued_at").value;
        const expiryDate = byId("manual_expires").value;
        const licenseStatus = byId("manual_status_select").value;
        const requestId = byId("manual_request_id").value;
        const hardwareBundle = byId("manual_hardware_bundle").value;
        const quotedPrice = byId("manual_quoted_price").value;
        const body = {
          backend_id: backendId,
          issue_type: issueType,
          plan_name: planName,
          base_device_limit: baseDeviceLimit ? Number(baseDeviceLimit) : null,
          extra_device_count: extraDeviceCount ? Number(extraDeviceCount) : 0,
          issued_at: issuedAt || null,
          expiry_date: expiryDate || null,
          license_status: licenseStatus || "active",
          request_id: requestId || null,
          hardware_bundle: hardwareBundle || null,
          quoted_price: quotedPrice ? Number(quotedPrice) : null
        };
        if (!backendId) return setToast("Select a backend first.", "var(--warn)");
        const res = await fetch("/api/admin/licenses/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return setToast(data.error || "Failed to create license.", "var(--bad)");
        }
        setToast("License created/updated.", "var(--good)");
        await loadManualLicenses();
      });
      byId("manual_issue_type").addEventListener("change", updateManualDerived);
      byId("manual_plan").addEventListener("change", updateManualDerived);
      byId("manual_extra_devices").addEventListener("input", updateManualDerived);
      byId("manual_business").addEventListener("change", loadBackendsCatalog);
      byId("request_search").addEventListener("input", () => {
        clearTimeout(window.__reqTimer);
        window.__reqTimer = setTimeout(loadRequests, 300);
      });
      byId("detail_close").addEventListener("click", () => {
        byId("detail_modal").style.display = "none";
      });
      byId("detail_approve").addEventListener("click", async () => {
        if (!activeRequestId) return;
        const resp = await fetch("/api/admin/license-requests/" + activeRequestId + "/approve", {
          method: "POST",
          headers: authHeaders()
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          setToast(data?.message || data?.error || "Approval failed.", "var(--bad)");
          return;
        }
        setToast("Request approved. License " + (data.license_id || "") + " issued.", "var(--good)");
        byId("detail_modal").style.display = "none";
        await loadRequests();
        await loadLicenses();
      });
      byId("detail_reject").addEventListener("click", async () => {
        if (!activeRequestId) return;
        await fetch("/api/admin/license-requests/" + activeRequestId + "/reject", {
          method: "POST",
          headers: authHeaders()
        });
        setToast("Request rejected.", "var(--warn)");
        byId("detail_modal").style.display = "none";
        await loadRequests();
      });

      const token = localStorage.getItem(tokenKey);
      const savedUser = localStorage.getItem(rememberKey) || "";
      if (savedUser) {
        byId("admin_user").value = savedUser;
        byId("admin_remember").checked = true;
      }
      if (token) {
        const res = await fetch("/api/admin/me", { headers: authHeaders() });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          toggleLogin(true, data.admin || {});
          await refreshAll();
          await loadBusinesses();
          await loadBackendsCatalog();
          await loadManualLicenses();
          return;
        }
      }
      toggleLogin(false, {});
      showSection();
    }

    init();
  </script>
</body>
</html>`);
});

module.exports = router;
