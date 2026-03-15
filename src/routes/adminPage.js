const express = require("express");
const { CLOUD_BASE_URL } = require("../config/env");

const router = express.Router();

router.get(
  [
    "/",
    "/automax-pos",
    "/automax-pos/payments",
    "/automax-pos/requests",
    "/automax-pos/issued",
    "/automax-pos/licenses",
    "/automax-pos/activations",
    "/automax-pos/demos",
    "/automax-pos/backends",
    "/automax-pos/businesses",
    "/automax-pos/sync",
    "/settings",
    "/admin-users"
  ],
  (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>JP Max Admin Control Center - AutoMax POS Control Panel</title>
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
    .badge-role { color: var(--accent); background: rgba(46,120,255,0.15); }
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
      z-index: 1000;
    }
    .modal .panel {
      width: 560px; max-width: 92%;
      max-height: 88vh;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .modal .panel .content {
      flex: 1;
      overflow-y: auto;
      padding-right: 6px;
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
      <div class="brand">JP Max Admin Control Center<div class="muted" style="margin-top:6px;">AutoMax POS</div></div>
      <nav>
        <a href="/jpmax-admin" id="nav-portal">JP Max Portal</a>
        <a href="/jpmax-admin/automax-pos" id="nav-overview">AutoMax POS</a>
        <a href="/jpmax-admin/automax-pos/payments" id="nav-payments">Payments</a>
        <a href="/jpmax-admin/automax-pos/requests" id="nav-requests">License Requests</a>
        <a href="/jpmax-admin/automax-pos/issued" id="nav-issued">Issued Licenses</a>
        <a href="/jpmax-admin/automax-pos/licenses" id="nav-manual">Manual License Manager</a>
        <a href="/jpmax-admin/automax-pos/activations" id="nav-activations">License Activations</a>
        <a href="/jpmax-admin/automax-pos/demos" id="nav-demos">Demo Usage</a>
        <a href="/jpmax-admin/automax-pos/backends" id="nav-backends">Backends</a>
        <a href="/jpmax-admin/automax-pos/businesses" id="nav-businesses">Business Owners</a>
        <a href="/jpmax-admin/automax-pos/sync" id="nav-sync">Sync Monitoring</a>
        <a href="/jpmax-admin/settings" id="nav-settings">Platform Settings</a>
        <a href="/jpmax-admin/admin-users" id="nav-admin-users" class="hidden">Admin Users</a>
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
          Remember me (longer session)
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
          <div class="page-title">JP Max Admin Control Center</div>
          <div class="muted">AutoMax POS</div>
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
        <h1>JP Max Admin Control Center</h1>
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

      <section id="section-payments" class="hidden">
        <h1>Payments</h1>
        <div class="toolbar">
          <input id="payments_search" placeholder="Search by txn id, phone" style="min-width:240px;" />
          <select id="payments_status_filter" style="min-width:180px;">
            <option value="">All statuses</option>
            <option value="matched">Matched</option>
            <option value="unmatched">Unmatched</option>
            <option value="duplicate">Duplicate</option>
            <option value="invalid">Invalid</option>
          </select>
          <select id="payments_range" style="min-width:160px;">
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="custom">Custom</option>
          </select>
          <input id="payments_from" type="date" style="min-width:150px;" />
          <input id="payments_to" type="date" style="min-width:150px;" />
          <button class="btn" id="payments_refresh">Refresh</button>
          <div class="status-line" id="payments_status"></div>
        </div>
        <div class="muted" id="payments_range_label" style="margin-top:6px;"></div>
        <div class="grid cards" style="margin-bottom:12px;">
          <div class="card"><h3>Imported</h3><div class="value" id="pay_sum_today">--</div></div>
          <div class="card"><h3>Matched</h3><div class="value" id="pay_sum_matched">--</div></div>
          <div class="card"><h3>Unmatched</h3><div class="value" id="pay_sum_unmatched">--</div></div>
          <div class="card"><h3>Duplicates</h3><div class="value" id="pay_sum_duplicate">--</div></div>
        </div>
        <div id="payments_empty" class="empty hidden">No imported payments yet.</div>
        <table>
          <thead>
            <tr>
              <th>Imported At</th>
              <th>TXN ID</th>
              <th>Phone</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Matched Request</th>
              <th>Source</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="payments_body"></tbody>
        </table>
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
              <th>Request Type</th>
              <th>Requested Plan</th>
              <th>Requested Devices</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment Status</th>
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
              <th>Issued By</th>
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
        <div class="muted">Issue and update licenses from approved business requests. Core identity fields are locked to request data.</div>
        <div id="manual_context_banner" class="card" style="margin-top:10px;display:none;">
          <div class="muted" style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Loaded Request</div>
          <div id="manual_context_text" style="font-weight:600;margin-top:4px;"></div>
        </div>
        <div class="card" style="margin-top:12px;">
          <div class="row">
            <div>
              <label class="muted">Business Name</label>
              <select id="manual_business" style="width:100%;" disabled></select>
            </div>
            <div>
              <label class="muted">Business ID</label>
              <input id="manual_business_id" type="text" readonly style="width:100%;" />
            </div>
            <div>
              <label class="muted">Branch</label>
              <input id="manual_branch_name" type="text" readonly style="width:100%;" />
            </div>
            <div>
              <label class="muted">Branch ID</label>
              <input id="manual_branch_id" type="text" readonly style="width:100%;" />
            </div>
          </div>
          <div class="row" style="margin-top:8px;">
            <div>
              <label class="muted">Backend</label>
              <select id="manual_backend" style="width:100%;" disabled></select>
            </div>
            <div>
              <label class="muted">Backend ID</label>
              <input id="manual_backend_id" type="text" readonly style="width:100%;" />
            </div>
            <div>
              <label class="muted">Machine ID</label>
              <input id="manual_machine_id" type="text" readonly style="width:100%;" />
            </div>
            <div>
              <label class="muted">Device ID</label>
              <input id="manual_device_id" type="text" readonly style="width:100%;" />
            </div>
          </div>
          <div class="row" style="margin-top:8px;">
            <div>
              <label class="muted">Issue Type</label>
              <select id="manual_issue_type" style="width:100%;">
                <option value="">Select type</option>
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
              <input id="manual_request_id" type="text" readonly style="width:100%;" />
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
          <div class="row" style="margin-top:8px;">
            <div>
              <label class="muted">Contact Person</label>
              <input id="manual_contact_person" type="text" readonly style="width:100%;" />
            </div>
            <div>
              <label class="muted">Email</label>
              <input id="manual_contact_email" type="text" readonly style="width:100%;" />
            </div>
            <div>
              <label class="muted">Phone</label>
              <input id="manual_contact_phone" type="text" readonly style="width:100%;" />
            </div>
          </div>
          <div class="row" style="margin-top:10px;">
            <div class="spacer"></div>
            <button class="btn" id="manual_refresh">Refresh Lists</button>
            <button class="btn" id="manual_clear">Clear</button>
            <button class="btn primary" id="manual_create">Issue License</button>
          </div>
        </div>
        <div class="card hidden" id="manual_fallback_card" style="margin-top:12px;">
          <div class="muted">Internal fallback tools (JP Max admin only). Use only when normal issuance is unavailable.</div>
          <div class="row" style="margin-top:10px;">
            <button class="btn" id="manual_export_request" type="button">Export Request Payload</button>
            <button class="btn" id="manual_upload_btn" type="button">Upload Signed License JSON</button>
            <input id="manual_license_upload" type="file" accept="application/json,.json" style="display:none;" />
            <div class="spacer"></div>
            <button class="btn primary" id="manual_attach_license" type="button">Validate & Attach</button>
          </div>
          <div class="status-line" id="manual_fallback_status" style="margin-top:8px;"></div>
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
              <th>Issued By</th>
              <th>Issued At</th>
              <th>Expires At</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="manual_body"></tbody>
        </table>
      </section>

      <section id="section-activations" class="hidden">
        <h1>License Activations</h1>
        <div class="toolbar">
          <button class="btn" id="activations_refresh">Refresh</button>
          <div class="status-line" id="activations_status"></div>
        </div>
        <div id="activations_empty" class="empty hidden">No activation records found.</div>
        <table>
          <thead>
            <tr>
              <th>License ID</th>
              <th>Business</th>
              <th>Backend</th>
              <th>Machine ID</th>
              <th>Status</th>
              <th>Activated At</th>
              <th>Last Seen</th>
              <th>Reissue Count</th>
            </tr>
          </thead>
          <tbody id="activations_body"></tbody>
        </table>
      </section>

      <section id="section-demos" class="hidden">
        <h1>Demo Usage</h1>
        <div class="toolbar">
          <button class="btn" id="demos_refresh">Refresh</button>
          <div class="status-line" id="demos_status"></div>
        </div>
        <div id="demos_empty" class="empty hidden">No demo records found.</div>
        <table>
          <thead>
            <tr>
              <th>Machine ID</th>
              <th>Business</th>
              <th>Backend</th>
              <th>Status</th>
              <th>First Demo</th>
              <th>Demo Expires</th>
              <th>Last Seen</th>
              <th>Install Count</th>
            </tr>
          </thead>
          <tbody id="demos_body"></tbody>
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
        <div class="card" style="margin-bottom:14px;">
          <div class="muted">Internal tools (not part of the standard license workflow).</div>
          <div class="row" style="margin-top:10px;">
            <div class="muted" style="flex:1;">License generator executables (internal use only).</div>
            <a class="btn" href="/downloads/AutoMax_License_Generator_GUI.exe">Download GUI</a>
            <a class="btn" href="/downloads/AutoMax_License_Generator.exe">Download CLI</a>
          </div>
        </div>
      </section>

      <section id="section-admin-users" class="hidden">
        <h1>Admin Users</h1>
        <div class="muted">SUPER_ADMIN only.</div>
        <div class="card" style="margin-top:10px;">
          <div class="row">
            <div>
              <label class="muted">Full Name</label>
              <input id="admin_user_full_name" type="text" placeholder="Full name" style="width:100%;" />
            </div>
            <div>
              <label class="muted">Username</label>
              <input id="admin_user_username" type="text" placeholder="username" style="width:100%;" />
            </div>
            <div>
              <label class="muted">Email</label>
              <input id="admin_user_email" type="email" placeholder="email@example.com" style="width:100%;" />
            </div>
            <div>
              <label class="muted">Role</label>
              <select id="admin_user_role" style="width:100%;">
                <option value="">Select role</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                <option value="ADMIN">ADMIN</option>
                <option value="SUPPORT">SUPPORT</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>
            <div style="min-width:120px;">
              <label class="muted">Active</label>
              <select id="admin_user_active" style="width:100%;">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        <div class="row" style="margin-top:8px;">
          <div style="flex:1;">
            <label class="muted">Password</label>
            <div class="row">
              <input id="admin_user_password" type="password" placeholder="Set password" style="width:100%;" />
              <button class="btn" id="admin_user_toggle_pass" type="button">Show</button>
            </div>
          </div>
          <div style="flex:1;">
            <label class="muted">Confirm Password</label>
            <div class="row">
              <input id="admin_user_password2" type="password" placeholder="Confirm password" style="width:100%;" />
              <button class="btn" id="admin_user_toggle_pass2" type="button">Show</button>
            </div>
          </div>
          <div style="display:flex; align-items:flex-end; gap:8px;">
            <button class="btn" id="admin_user_clear" type="button">Clear</button>
            <button class="btn primary" id="admin_user_save" type="button">Create User</button>
          </div>
        </div>
        <div class="muted" id="admin_user_status" style="margin-top:8px;"></div>
        <div class="muted" id="admin_user_pw_status" style="margin-top:6px;"></div>
        </div>
        <div class="toolbar">
          <select id="admin_users_role_filter" style="min-width:160px;">
            <option value="">All roles</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPPORT">SUPPORT</option>
            <option value="VIEWER">VIEWER</option>
          </select>
          <select id="admin_users_status_filter" style="min-width:140px;">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="REVOKED">Revoked</option>
          </select>
          <button class="btn" id="admin_users_refresh">Refresh</button>
          <div class="status-line" id="admin_users_status"></div>
        </div>
        <div id="admin_users_empty" class="empty hidden">No admin users found.</div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="admin_users_body"></tbody>
        </table>
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
      <div class="row">
        <h3 id="detail_title">Details</h3>
        <div class="spacer"></div>
      </div>
      <div class="content">
        <div class="detail-grid" id="detail_grid"></div>
      </div>
      <div class="row" style="margin-top:12px;">
        <div class="spacer"></div>
        <button class="btn" id="detail_reject">Reject</button>
        <button class="btn primary" id="detail_approve">Approve</button>
        <button class="btn" id="detail_close">Close</button>
      </div>
    </div>
  </div>
  <div class="modal" id="admin_reset_modal">
    <div class="panel">
      <div class="row">
        <h3>Reset Admin Password</h3>
        <div class="spacer"></div>
      </div>
      <div class="content">
        <div style="margin-bottom:10px;">
          <label class="muted">New Password</label>
          <div class="row">
            <input id="admin_reset_password" type="password" placeholder="New password" style="width:100%;" />
            <button class="btn" id="admin_reset_toggle" type="button">Show</button>
          </div>
        </div>
        <div style="margin-bottom:10px;">
          <label class="muted">Confirm Password</label>
          <div class="row">
            <input id="admin_reset_password2" type="password" placeholder="Confirm password" style="width:100%;" />
            <button class="btn" id="admin_reset_toggle2" type="button">Show</button>
          </div>
        </div>
        <div class="muted" id="admin_reset_status"></div>
      </div>
      <div class="row" style="margin-top:12px;">
        <div class="spacer"></div>
        <button class="btn" id="admin_reset_cancel">Cancel</button>
        <button class="btn primary" id="admin_reset_confirm">Reset</button>
      </div>
    </div>
  </div>
  <div class="toast" id="toast"></div>

  <script>
    const byId = (id) => document.getElementById(id);
    const tokenKey = "cloud_admin_token";
    const rememberKey = "vendor_admin_username";
    
    function openModal(id) {
      const modal = byId(id);
      if (!modal) return;
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
    function closeModal(id) {
      const modal = byId(id);
      if (!modal) return;
      modal.style.display = "none";
      document.body.style.overflow = "";
    }

    function togglePassword(inputId, btnId) {
      const input = byId(inputId);
      const btn = byId(btnId);
      if (!input || !btn) return;
      const next = input.type === "password" ? "text" : "password";
      input.type = next;
      btn.textContent = next === "password" ? "Show" : "Hide";
    }
let activeRequestId = null;
    let activeResetUserId = null;
    let currentAdminRole = null;
    let adminUsersMap = new Map();
    let editingAdminUserId = null;
    let requestMap = new Map();
    let licenseMap = new Map();
    let backendMap = new Map();
    let manualContext = { source: null, requestId: null, licenseId: null };
    let manualRequestSnapshot = null;
    let manualFallbackLicense = null;
    const manualRequestStorageKey = "automax_manual_request_cache";

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
        "/jpmax-admin/automax-pos/payments": "nav-payments",
        "/jpmax-admin/automax-pos/requests": "nav-requests",
        "/jpmax-admin/automax-pos/issued": "nav-issued",
        "/jpmax-admin/automax-pos/licenses": "nav-manual",
        "/jpmax-admin/automax-pos/activations": "nav-activations",
        "/jpmax-admin/automax-pos/demos": "nav-demos",
        "/jpmax-admin/automax-pos/backends": "nav-backends",
        "/jpmax-admin/automax-pos/businesses": "nav-businesses",
        "/jpmax-admin/automax-pos/sync": "nav-sync",
        "/jpmax-admin/settings": "nav-settings",
        "/jpmax-admin/admin-users": "nav-admin-users"
      };
      Object.values(map).forEach((id) => byId(id)?.classList.remove("active"));
      const active = map[path] || "nav-portal";
      byId(active)?.classList.add("active");
    }

    function showSection() {
      const path = window.location.pathname;
      const sections = ["portal", "overview", "payments", "requests", "issued", "manual", "activations", "demos", "backends", "businesses", "sync", "settings", "admin-users"];
      sections.forEach((s) => byId("section-" + s)?.classList.add("hidden"));
      if (path.endsWith("/automax-pos")) return byId("section-overview")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/payments")) return byId("section-payments")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/requests")) return byId("section-requests")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/issued")) return byId("section-issued")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/licenses")) return byId("section-manual")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/activations")) return byId("section-activations")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/demos")) return byId("section-demos")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/backends")) return byId("section-backends")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/businesses")) return byId("section-businesses")?.classList.remove("hidden");
      if (path.endsWith("/automax-pos/sync")) return byId("section-sync")?.classList.remove("hidden");
      if (path.endsWith("/settings")) return byId("section-settings")?.classList.remove("hidden");
      if (path.endsWith("/admin-users")) {
        if (isSuperAdmin()) return byId("section-admin-users")?.classList.remove("hidden");
        return byId("section-portal")?.classList.remove("hidden");
      }
      byId("section-portal")?.classList.remove("hidden");
    }

    function badge(text, cls) {
      return '<span class="status ' + cls + '">' + text + "</span>";
    }

    function isSuperAdmin() {
      return String(currentAdminRole || "").toUpperCase() === "SUPER_ADMIN";
    }

    function isLicensingAdmin() {
      const role = String(currentAdminRole || "").toUpperCase();
      return role === "SUPER_ADMIN" || role === "LICENSING_ADMIN";
    }

    function updateAdminNavVisibility() {
      const nav = byId("nav-admin-users");
      if (!nav) return;
      nav.classList.toggle("hidden", !isSuperAdmin());
    }

    function updateManualFallbackVisibility() {
      const card = byId("manual_fallback_card");
      if (!card) return;
      card.classList.toggle("hidden", !isLicensingAdmin());
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

    function paymentStatusBadge(status) {
      const s = String(status || "").toUpperCase();
      if (s === "PAID") return badge("PAID", "badge-paid");
      if (s === "PAYMENT_UNDER_REVIEW") return badge("UNDER REVIEW", "badge-pending");
      if (s === "APPROVED") return badge("APPROVED", "badge-active");
      if (s === "REJECTED") return badge("REJECTED", "badge-revoked");
      return badge("PENDING PAYMENT", "badge-pending");
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
      openModal("detail_modal");
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
        body: JSON.stringify({ username, password, remember: byId("admin_remember")?.checked })
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
        currentAdminRole = role === "SUPERADMIN" ? "SUPER_ADMIN" : role;
        byId("account-text").textContent =
          "Logged in as: " + (data?.username || data?.user?.username || "admin") + " (" + role + ")";
        updateAdminNavVisibility();
        updateManualFallbackVisibility();
      } else {
        currentAdminRole = null;
        updateAdminNavVisibility();
        updateManualFallbackVisibility();
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
        const detailId = "req_detail_" + r.id;
        const detailHtml =
          "<div class='req-detail'>" +
          "<div><span class='muted'>Email:</span> " + (r.email || "-") + "</div>" +
          "<div><span class='muted'>Phone:</span> " + (r.phone || "-") + "</div>" +
          "<div><span class='muted'>Branch:</span> " + (r.branch_name || "-") + "</div>" +
          "<div><span class='muted'>Backend:</span> " + (r.backend_name || "-") + "</div>" +
          "<div><span class='muted'>Hardware:</span> " + (r.hardware_bundle || "-") + "</div>" +
          "<div><span class='muted'>Machine ID:</span> " + (r.machine_id || "-") + "</div>" +
          "<div><span class='muted'>Device ID:</span> " + (r.device_id || "-") + "</div>" +
          "<div><span class='muted'>Backend ID:</span> " + (r.backend_id || "-") + "</div>" +
          "<div><span class='muted'>Requested At:</span> " + (r.requested_at ? new Date(r.requested_at).toLocaleString() : "-") + "</div>" +
          "<div><span class='muted'>Payment Ref:</span> " + (r.payment_reference || "-") + "</div>" +
          "<div><span class='muted'>Paid Amount:</span> " + (r.paid_amount != null ? "K" + r.paid_amount : "-") + "</div>" +
          "<div class='span-2'><span class='muted'>Notes:</span> " + (r.notes || "-") + "</div>" +
          "</div>";

        tr.innerHTML =
          "<td><button class='btn ghost' data-action='toggle-detail' data-target='" + detailId + "'>Details</button> " +
          (r.request_id || r.id || "-") + "</td>" +
          "<td>" + businessName + "</td>" +
          "<td>" + contactName + "</td>" +
          "<td>" + (r.request_type || "-") + "</td>" +
          "<td>" + requestedPlan + "</td>" +
          "<td>" + requestedDevices + "</td>" +
          "<td>" + (r.amount_expected != null ? "K" + r.amount_expected : "-") + "</td>" +
          "<td>" + statusBadge(r.status || r.request_status) + "</td>" +
          "<td>" + paymentStatusBadge(r.payment_status) + "</td>" +
          "<td>" +
          "<button class='btn' data-action='load' data-id='" + r.id + "'>Load</button> " +
          "<button class='btn' data-action='view' data-id='" + r.id + "'>View</button> " +
          "<button class='btn' data-action='approve' data-id='" + r.id + "'" + (paid ? "" : " disabled") + ">Approve</button> " +
          "<button class='btn' data-action='reject' data-id='" + r.id + "'>Reject</button>" +
          "</td>";

        const detailRow = document.createElement("tr");
        detailRow.className = "req-detail-row hidden";
        detailRow.id = detailId;
        detailRow.innerHTML = "<td colspan='10'>" + detailHtml + "</td>";
        body.appendChild(tr);
        body.appendChild(detailRow);
        body.appendChild(tr);
      });
    }

    async function loadLicenses(silent) {
      byId("licenses_status").textContent = "Loading...";
      const res = await fetch("/api/admin/licenses", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = res.status === 401 ? "Unauthorized" : (data?.message || data?.error || "Failed to load licenses.");
        byId("licenses_status").textContent = msg;
        const path = window.location.pathname;
        const onLicensesPage = path.endsWith("/automax-pos/issued") || path.endsWith("/automax-pos/licenses");
        if (!silent && onLicensesPage) return setToast(msg, "var(--bad)");
        return;
      }
      const body = byId("licenses_body");
      body.innerHTML = "";
      licenseMap = new Map((data.rows || []).map((r) => [String(r.id), r]));
      byId("licenses_status").textContent = (data.rows || []).length + " rows";
      byId("licenses_empty").classList.toggle("hidden", (data.rows || []).length > 0);
      (data.rows || []).forEach((r) => {
        const tr = document.createElement("tr");
        const issuedBy = issuedByDisplay(r);
        tr.innerHTML =
          "<td><button class='btn' data-copy='" + (r.license_id || "") + "'>Copy</button> " + (r.license_id || "-") + "</td>" +
          "<td>" + (r.backend_id || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.branch_name || "-") + "</td>" +
          "<td>" + (r.plan || "-") + "</td>" +
          "<td>" + formatDeviceLimit(r.device_limit) + "</td>" +
          "<td>" + (r.used_devices ?? "-") + "</td>" +
          "<td>" + (r.machine_id ? r.machine_id.slice(0, 10) + "..." : "-") + "</td>" +
          "<td>" + issuedBy + "</td>" +
          "<td>" + (r.issued_at ? new Date(r.issued_at).toLocaleString() : "-") + "</td>" +
          "<td>" + (r.expires_at ? new Date(r.expires_at).toLocaleString() : "-") + "</td>" +
          "<td>" + statusBadge(r.status) + "</td>" +
          "<td>" +
          "<button class='btn' data-action='view' data-id='" + r.id + "'>View</button> " +
          "<button class='btn' data-action='renew' data-id='" + r.id + "'>Renew</button> " +
          "<button class='btn' data-action='replace' data-id='" + r.id + "'>Replace</button> " +
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

    async function loadActivations(silent) {
      byId("activations_status").textContent = "Loading...";
      const res = await fetch("/api/admin/activations", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || "Failed to load activations.";
        byId("activations_status").textContent = msg;
        if (!silent) return setToast(msg, "var(--bad)");
        return;
      }
      const body = byId("activations_body");
      body.innerHTML = "";
      byId("activations_status").textContent = (data.rows || []).length + " rows";
      byId("activations_empty").classList.toggle("hidden", (data.rows || []).length > 0);
      (data.rows || []).forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + (r.license_id || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.backend_name || r.backend_id || "-") + "</td>" +
          "<td>" + (r.machine_id ? r.machine_id.slice(0, 10) + "..." : "-") + "</td>" +
          "<td>" + statusBadge(r.status) + "</td>" +
          "<td>" + (r.activated_at ? new Date(r.activated_at).toLocaleString() : "-") + "</td>" +
          "<td>" + (r.last_seen_at ? new Date(r.last_seen_at).toLocaleString() : "-") + "</td>" +
          "<td>" + (r.reissue_count ?? 0) + "</td>";
        body.appendChild(tr);
      });
    }

    async function loadDemos(silent) {
      byId("demos_status").textContent = "Loading...";
      const res = await fetch("/api/admin/demos", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || "Failed to load demo records.";
        byId("demos_status").textContent = msg;
        if (!silent) return setToast(msg, "var(--bad)");
        return;
      }
      const body = byId("demos_body");
      body.innerHTML = "";
      byId("demos_status").textContent = (data.rows || []).length + " rows";
      byId("demos_empty").classList.toggle("hidden", (data.rows || []).length > 0);
      (data.rows || []).forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + (r.machine_id ? r.machine_id.slice(0, 10) + "..." : "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.backend_name || r.backend_id || "-") + "</td>" +
          "<td>" + statusBadge(r.status) + "</td>" +
          "<td>" + (r.first_demo_started_at ? new Date(r.first_demo_started_at).toLocaleString() : "-") + "</td>" +
          "<td>" + (r.demo_expires_at ? new Date(r.demo_expires_at).toLocaleString() : "-") + "</td>" +
          "<td>" + (r.last_seen_at ? new Date(r.last_seen_at).toLocaleString() : "-") + "</td>" +
          "<td>" + (r.install_count ?? 0) + "</td>";
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
        const issuedBy = issuedByDisplay(r);
        tr.innerHTML =
          "<td>" + (r.license_id || "-") + "</td>" +
          "<td>" + (r.backend_id || "-") + "</td>" +
          "<td>" + (r.business_name || "-") + "</td>" +
          "<td>" + (r.plan_name || r.plan || "-") + "</td>" +
          "<td>" + formatDeviceLimit(r.device_limit) + "</td>" +
          "<td>" + issuedBy + "</td>" +
          "<td>" + (r.issued_at ? new Date(r.issued_at).toLocaleDateString() : "-") + "</td>" +
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

    function getDateValue(id) {
      const el = byId(id);
      return el && el.value ? String(el.value) : "";
    }

    function setRangeLabel(from, to, preset) {
      const label = byId("payments_range_label");
      if (!label) return;
      if (preset && preset !== "custom") {
        const pretty = preset === "today" ? "Today"
          : preset === "yesterday" ? "Yesterday"
          : preset === "last7" ? "Last 7 Days"
          : preset === "month" ? "This Month"
          : "Custom";
        label.textContent = "Showing: " + pretty;
        return;
      }
      if (from && to) {
        label.textContent = "Showing payments from " + from + " to " + to;
      } else if (from) {
        label.textContent = "Showing payments from " + from;
      } else if (to) {
        label.textContent = "Showing payments up to " + to;
      } else {
        label.textContent = "";
      }
    }

    function setDateInput(id, value) {
      const el = byId(id);
      if (el) el.value = value || "";
    }

    function formatDateInput(d) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      return yyyy + "-" + mm + "-" + dd;
    }

    function applyPaymentsRange(preset) {
      const fromEl = byId("payments_from");
      const toEl = byId("payments_to");
      if (!fromEl || !toEl) return;
      if (preset === "custom") {
        fromEl.disabled = false;
        toEl.disabled = false;
        return;
      }
      fromEl.disabled = true;
      toEl.disabled = true;
      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      let start = null;
      let end = null;
      if (preset === "today") {
        start = today;
        end = new Date(today.getTime() + 86400 * 1000);
      } else if (preset === "yesterday") {
        start = new Date(today.getTime() - 86400 * 1000);
        end = today;
      } else if (preset === "last7") {
        start = new Date(today.getTime() - 6 * 86400 * 1000);
        end = new Date(today.getTime() + 86400 * 1000);
      } else if (preset === "month") {
        start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
      }
      setDateInput("payments_from", start ? formatDateInput(start) : "");
      if (preset === "today") {
        setDateInput("payments_to", formatDateInput(start));
      } else if (preset === "yesterday") {
        const y = new Date(end.getTime() - 86400 * 1000);
        setDateInput("payments_to", formatDateInput(y));
      } else {
        const endMinus = new Date(end.getTime() - 86400 * 1000);
        setDateInput("payments_to", formatDateInput(endMinus));
      }
    }

    async function loadPayments(silent) {
      byId("payments_status").textContent = "Loading...";
      const status = byId("payments_status_filter")?.value || "";
      const q = byId("payments_search")?.value.trim() || "";
      const start = getDateValue("payments_from");
      const end = getDateValue("payments_to");
      const range = byId("payments_range")?.value || "today";
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q) params.set("q", q);
      if (range) params.set("range", range);
      if (start) params.set("start_date", start);
      if (end) params.set("end_date", end);
      const url = "/api/admin/payments" + (params.toString() ? "?" + params.toString() : "");
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || "Failed to load payments.";
        byId("payments_status").textContent = msg;
        if (!silent) setToast(msg, "var(--bad)");
        return;
      }
      const summary = data.summary || {};
      byId("pay_sum_today").textContent = summary.imported ?? 0;
      byId("pay_sum_matched").textContent = summary.matched ?? 0;
      byId("pay_sum_unmatched").textContent = summary.unmatched ?? 0;
      byId("pay_sum_duplicate").textContent = summary.duplicate ?? 0;

      const body = byId("payments_body");
      body.innerHTML = "";
      const rows = data.rows || [];
      byId("payments_status").textContent = rows.length + " rows";
      byId("payments_empty").classList.toggle("hidden", rows.length > 0);
      rows.forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + (r.imported_at ? new Date(r.imported_at).toLocaleString() : "-") + "</td>" +
          "<td>" + (r.txn_id || "-") + "</td>" +
          "<td>" + (r.payer_phone || "-") + "</td>" +
          "<td>" + (r.amount != null ? "K" + r.amount : "-") + "</td>" +
          "<td>" + statusBadge(r.match_status || "-") + "</td>" +
          "<td>" + (r.matched_request_id || "-") + "</td>" +
          "<td>" + (r.source_type || "-") + "</td>" +
          "<td>" +
          "<button class='btn' data-action='view-payment' data-id='" + r.id + "'>View</button> " +
          "<button class='btn' data-action='rematch' data-id='" + r.id + "'>Rematch</button>" +
          "</td>";
        body.appendChild(tr);
      });
      setRangeLabel(start, end, range);
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
        return;
      }
      if (!/^https?:\\/\\//i.test(cloudBaseUrl)) {
        byId("settings_status").textContent = "Cloud Base URL must be a valid URL.";
        return;
      }
      if (!Number.isFinite(online) || online <= 0) {
        byId("settings_status").textContent = "Online threshold must be > 0.";
        return;
      }
      if (!Number.isFinite(offline) || offline <= 0 || offline < online) {
        byId("settings_status").textContent = "Offline threshold must be >= online.";
        return;
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

    function clearAdminUserForm() {
      editingAdminUserId = null;
      byId("admin_user_full_name").value = "";
      byId("admin_user_username").value = "";
      byId("admin_user_email").value = "";
      byId("admin_user_role").value = "";
      byId("admin_user_active").value = "true";
      byId("admin_user_password").value = "";
      byId("admin_user_password2").value = "";
      byId("admin_user_save").textContent = "Create User";
      byId("admin_user_status").textContent = "";
      byId("admin_user_pw_status").textContent = "";
      byId("admin_user_save").disabled = false;
    }

    function fillAdminUserForm(u) {
      editingAdminUserId = u.id;
      byId("admin_user_full_name").value = u.full_name || "";
      byId("admin_user_username").value = u.username || "";
      byId("admin_user_email").value = u.email || u.username || "";
      byId("admin_user_role").value = (u.role || "").toUpperCase() === "SUPERADMIN" ? "SUPER_ADMIN" : u.role || "";
      byId("admin_user_active").value = u.is_active === false ? "false" : "true";
      byId("admin_user_password").value = "";
      byId("admin_user_password2").value = "";
      byId("admin_user_save").textContent = "Update User";
      byId("admin_user_status").textContent = "Editing user " + (u.email || u.username || "");
      byId("admin_user_pw_status").textContent = "";
      byId("admin_user_save").disabled = false;
    }

    async function loadAdminUsers(silent) {
      if (!isSuperAdmin()) return;
      byId("admin_users_status").textContent = "Loading...";
      const res = await fetch("/api/admin/users", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || "Failed to load admin users.";
        byId("admin_users_status").textContent = msg;
        if (!silent) setToast(msg, "var(--bad)");
        return;
      }
      const rows = data.rows || [];
      adminUsersMap = new Map(rows.map((r) => [String(r.id), r]));
      renderAdminUsers();
    }

    function renderAdminUsers() {
      const roleFilter = (byId("admin_users_role_filter")?.value || "").toUpperCase();
      const statusFilter = (byId("admin_users_status_filter")?.value || "").toUpperCase();
      const rows = Array.from(adminUsersMap.values()).filter((r) => {
        const role = (String(r.role || "").toUpperCase() === "SUPERADMIN" ? "SUPER_ADMIN" : String(r.role || "").toUpperCase());
        const active = r.is_active !== false;
        if (roleFilter && role !== roleFilter) return false;
        if (statusFilter === "ACTIVE" && !active) return false;
        if (statusFilter === "REVOKED" && active) return false;
        return true;
      });
      byId("admin_users_status").textContent = rows.length + " users";
      byId("admin_users_empty").classList.toggle("hidden", rows.length > 0);
      const body = byId("admin_users_body");
      body.innerHTML = "";
      rows.forEach((r) => {
        const tr = document.createElement("tr");
        const active = r.is_active !== false;
        const status = active ? badge("ACTIVE", "badge-active") : badge("INACTIVE", "badge-revoked");
        const role = String(r.role || "").toUpperCase() === "SUPERADMIN" ? "SUPER_ADMIN" : r.role || "-";
        const roleBadge = badge(role, "badge-role");
        const lastLogin = r.last_login_at ? new Date(r.last_login_at).toLocaleString() : "-";
        const createdAt = r.created_at ? new Date(r.created_at).toLocaleString() : "-";
        tr.innerHTML =
          "<td>" + (r.full_name || "-") + "</td>" +
          "<td>" + (r.username || "-") + "</td>" +
          "<td>" + (r.email || "-") + "</td>" +
          "<td>" + roleBadge + "</td>" +
          "<td>" + status + "</td>" +
          "<td>" + lastLogin + "</td>" +
          "<td>" + createdAt + "</td>" +
          "<td>" +
            "<button class='btn' data-action='edit' data-id='" + r.id + "'>Edit</button> " +
            "<button class='btn' data-action='reset' data-id='" + r.id + "'>Reset Password</button> " +
            "<button class='btn' data-action='" + (active ? "revoke" : "activate") + "' data-id='" + r.id + "'>" + (active ? "Deactivate" : "Activate") + "</button> " +
            "<button class='btn' data-action='delete' data-id='" + r.id + "'>Delete</button>" +
          "</td>";
        body.appendChild(tr);
      });
    }

    function updateAdminUserPasswordMatch() {
      const pw = byId("admin_user_password").value;
      const pw2 = byId("admin_user_password2").value;
      const status = byId("admin_user_pw_status");
      const saveBtn = byId("admin_user_save");
      if (editingAdminUserId) {
        status.textContent = "";
        saveBtn.disabled = false;
        return;
      }
      if (!pw && !pw2) {
        status.textContent = "";
        saveBtn.disabled = false;
        return;
      }
      if (pw && pw2 && pw === pw2) {
        status.textContent = "Passwords match.";
        status.style.color = "var(--good)";
        saveBtn.disabled = false;
        return;
      }
      status.textContent = "Passwords do not match.";
      status.style.color = "var(--bad)";
      saveBtn.disabled = true;
    }

    function issuedByDisplay(r) {
      const value = r.issued_by_display || r.issued_by_name || r.issued_by_email;
      if (value) return value;
      return '<span title="Created before admin audit tracking was introduced">Legacy Import</span>';
    }

    function manualChangeReason(issueType) {
      const t = String(issueType || "").toLowerCase();
      if (t === "renewal") return "renewal";
      if (t === "device_addon") return "device_addon";
      if (t === "upgrade") return "plan_upgrade";
      if (t === "correction") return "correction";
      return "initial_issue";
    }

    function setManualFieldDisabled(id, disabled) {
      const el = byId(id);
      if (el) el.disabled = !!disabled;
    }

    function setManualFieldReadonly(id, readOnly) {
      const el = byId(id);
      if (el) el.readOnly = !!readOnly;
    }

    function updateManualActionLabel() {
      const btn = byId("manual_create");
      if (!btn) return;
      if (manualContext.source === "license") {
        btn.textContent = "Update License";
        btn.disabled = false;
        return;
      }
      if (manualContext.source === "request") {
        btn.textContent = "Issue License";
        btn.disabled = false;
        return;
      }
      btn.textContent = "Issue License";
      btn.disabled = true;
    }

    function updateManualContextBanner({ title, detail }) {
      const banner = byId("manual_context_banner");
      const text = byId("manual_context_text");
      if (!banner || !text) return;
      if (!title && !detail) {
        banner.style.display = "none";
        text.textContent = "";
        return;
      }
      banner.style.display = "block";
      banner.firstElementChild.textContent = title || "Loaded Request";
      text.textContent = detail || "";
    }

    function setManualFallbackStatus(msg, color) {
      const el = byId("manual_fallback_status");
      if (!el) return;
      el.textContent = msg || "";
      el.style.color = color || "var(--muted)";
    }

    function buildManualRequestExport() {
      if (!manualRequestSnapshot) return null;
      const r = manualRequestSnapshot;
      return {
        exported_at: new Date().toISOString(),
        request_id: r.request_id || r.id || null,
        business_id: r.business_id || null,
        business_name: r.business_name || r.business_name_ref || r.customer_name || null,
        branch_id: r.branch_id || null,
        branch_name: r.branch_name || null,
        backend_id: r.backend_id || null,
        backend_name: r.backend_name || null,
        machine_id: r.machine_id || null,
        device_id: r.device_id || null,
        request_type: r.request_type || null,
        requested_plan: r.requested_plan || r.plan || null,
        extra_device_count: r.extra_device_count ?? null,
        requested_total_device_limit: r.requested_total_device_limit ?? r.device_limit ?? null,
        current_plan: r.current_plan || null,
        current_total_device_limit: r.current_total_device_limit ?? null,
        hardware_bundle: r.hardware_bundle || null,
        amount_expected: r.amount_expected ?? null,
        contact_person: r.contact_person || null,
        email: r.email || null,
        phone: r.phone || null
      };
    }

    function downloadJson(data, filename) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "export.json";
      a.click();
      URL.revokeObjectURL(url);
    }

    function cacheManualRequest(r) {
      try {
        if (!r) return;
        sessionStorage.setItem(manualRequestStorageKey, JSON.stringify(r));
      } catch (_) {}
    }

    function clearCachedManualRequest() {
      try {
        sessionStorage.removeItem(manualRequestStorageKey);
      } catch (_) {}
    }

    async function restoreManualRequestFromStorage() {
      if (manualContext.source) return;
      let raw = null;
      try {
        raw = sessionStorage.getItem(manualRequestStorageKey);
      } catch (_) {}
      if (!raw) return;
      let payload = null;
      try {
        payload = JSON.parse(raw);
      } catch (_) {
        clearCachedManualRequest();
        return;
      }
      if (payload) {
        await applyRequestToManualForm(payload);
      }
    }

    function setManualContext(source, options = {}) {
      manualContext = {
        source: source || null,
        requestId: options.requestId || null,
        licenseId: options.licenseId || null
      };
      const lockCore = manualContext.source !== "license";
      setManualFieldDisabled("manual_business", true);
      setManualFieldDisabled("manual_backend", true);
      setManualFieldDisabled("manual_issue_type", lockCore);
      setManualFieldDisabled("manual_plan", lockCore);
      setManualFieldReadonly("manual_extra_devices", lockCore);
      setManualFieldReadonly("manual_hardware_bundle", lockCore);
      setManualFieldReadonly("manual_quoted_price", lockCore);
      updateManualActionLabel();
      if (!manualContext.source) {
        updateManualContextBanner({ title: "", detail: "" });
      }
    }

    async function applyRequestToManualForm(r) {
      if (!r) return;
      manualRequestSnapshot = r;
      manualFallbackLicense = null;
      setManualFallbackStatus("");
      setManualContext("request", { requestId: r.request_id || null });

      if (byId("manual_business")?.options?.length <= 1) {
        await loadBusinesses(true);
      }
      if (byId("manual_business")) byId("manual_business").value = r.business_id || "";
      byId("manual_business_id").value = r.business_id || "";
      byId("manual_branch_name").value = r.branch_name || "";
      byId("manual_branch_id").value = r.branch_id || "";

      await loadBackendsCatalog(true);
      if (byId("manual_backend")) byId("manual_backend").value = r.backend_id || "";
      byId("manual_backend_id").value = r.backend_id || "";
      byId("manual_machine_id").value = r.machine_id || "";
      byId("manual_device_id").value = r.device_id || "";

      byId("manual_issue_type").value = r.request_type || "new_license";
      byId("manual_plan").value = r.requested_plan || r.plan || "Starter";
      byId("manual_extra_devices").value = r.extra_device_count ?? 0;
      byId("manual_request_id").value = r.request_id || "";
      byId("manual_hardware_bundle").value = r.hardware_bundle || "";
      byId("manual_quoted_price").value = r.amount_expected ?? "";
      byId("manual_contact_person").value = r.contact_person || "";
      byId("manual_contact_email").value = r.email || "";
      byId("manual_contact_phone").value = r.phone || "";

      updateManualDerived();
      if (r.requested_total_device_limit != null) {
        byId("manual_total_limit").value = r.requested_total_device_limit;
      }

      const deviceShort = r.device_id ? String(r.device_id).slice(0, 8) + "..." : "";
      const backendLabel = r.backend_name || r.backend_id || "Backend";
      const detail = [
        (r.request_id ? "Request " + r.request_id : "Request loaded"),
        r.business_name || r.business_name_ref || "-",
        backendLabel,
        deviceShort ? ("Device " + deviceShort) : ""
      ].filter(Boolean).join(" | ");
      updateManualContextBanner({ title: "Loaded Request", detail });
      cacheManualRequest(r);
      return Boolean(
        byId("manual_request_id")?.value ||
        byId("manual_backend_id")?.value ||
        byId("manual_business_id")?.value
      );
    }

    async function applyLicenseToManualForm(r) {
      if (!r) return;
      manualRequestSnapshot = null;
      setManualContext("license", { licenseId: r.id || null });
      clearCachedManualRequest();

      if (byId("manual_business")?.options?.length <= 1) {
        await loadBusinesses(true);
      }
      if (byId("manual_business")) byId("manual_business").value = r.business_id || "";
      byId("manual_business_id").value = r.business_id || "";
      byId("manual_branch_name").value = r.branch_name || "";
      byId("manual_branch_id").value = r.branch_id || "";
      await loadBackendsCatalog(true);
      if (byId("manual_backend")) byId("manual_backend").value = r.backend_id || "";
      byId("manual_backend_id").value = r.backend_id || "";
      byId("manual_machine_id").value = r.machine_id || "";
      byId("manual_device_id").value = r.device_id || "";

      byId("manual_contact_person").value = "";
      byId("manual_contact_email").value = "";
      byId("manual_contact_phone").value = "";
      byId("manual_request_id").value = r.request_id || "";
      byId("manual_hardware_bundle").value = r.hardware_bundle || "";
      byId("manual_quoted_price").value = r.quoted_price ?? "";

      const deviceShort = r.device_id ? String(r.device_id).slice(0, 8) + "..." : "";
      const backendLabel = r.backend_id || "Backend";
      const detail = [
        (r.license_id ? "License " + r.license_id : "License loaded"),
        r.business_name || "-",
        backendLabel,
        deviceShort ? ("Device " + deviceShort) : ""
      ].filter(Boolean).join(" | ");
      updateManualContextBanner({ title: "Loaded License", detail });
    }

    function updateManualDerived() {
      const issueTypeRaw = byId("manual_issue_type")?.value || "";
      if (!issueTypeRaw) {
        byId("manual_base_limit").value = "";
        byId("manual_total_limit").value = "";
        byId("manual_change_reason").value = "";
        byId("manual_plan").disabled = false;
        return;
      }
      const issueType = issueTypeRaw;
      const plan = byId("manual_plan")?.value || "Starter";
      const base = manualBaseLimit(plan);
      const extra = Number(byId("manual_extra_devices")?.value || 0);
      let total = base + (Number.isFinite(extra) ? extra : 0);
      if (manualRequestSnapshot && manualContext.source === "request") {
        const requestedTotal = Number(manualRequestSnapshot.requested_total_device_limit);
        const currentTotal = Number(manualRequestSnapshot.current_total_device_limit);
        if (Number.isFinite(requestedTotal)) {
          total = requestedTotal;
        } else if (issueType === "device_addon" && Number.isFinite(currentTotal)) {
          total = currentTotal + (Number.isFinite(extra) ? extra : 0);
        } else if (issueType === "renewal" && Number.isFinite(currentTotal)) {
          total = currentTotal;
        }
      }
      byId("manual_base_limit").value = base;
      byId("manual_total_limit").value = total;
      byId("manual_change_reason").value = manualChangeReason(issueType);
      const lockCore = manualContext.source !== "license";
      byId("manual_plan").disabled = lockCore || issueType === "device_addon";
    }

    function clearManualForm() {
      manualRequestSnapshot = null;
      manualFallbackLicense = null;
      setManualContext(null);
      clearCachedManualRequest();
      setManualFallbackStatus("");
      if (byId("manual_business")) byId("manual_business").value = "";
      if (byId("manual_backend")) byId("manual_backend").value = "";
      byId("manual_business_id").value = "";
      byId("manual_branch_name").value = "";
      byId("manual_branch_id").value = "";
      byId("manual_backend_id").value = "";
      byId("manual_machine_id").value = "";
      byId("manual_device_id").value = "";
      if (byId("manual_issue_type")) byId("manual_issue_type").value = "";
      if (byId("manual_plan")) byId("manual_plan").value = "Starter";
      byId("manual_base_limit").value = "";
      byId("manual_extra_devices").value = 0;
      byId("manual_total_limit").value = "";
      byId("manual_issued_at").value = "";
      byId("manual_expires").value = "";
      byId("manual_status_select").value = "active";
      byId("manual_prev_license").value = "";
      byId("manual_license_version").value = "";
      byId("manual_change_reason").value = "";
      byId("manual_request_id").value = "";
      byId("manual_hardware_bundle").value = "";
      byId("manual_quoted_price").value = "";
      byId("manual_contact_person").value = "";
      byId("manual_contact_email").value = "";
      byId("manual_contact_phone").value = "";
      updateManualDerived();
    }

    function showManualSection() {
      const target = "/jpmax-admin/automax-pos/licenses";
      if (window.location.pathname !== target) {
        window.history.pushState({}, "", target);
      }
      setActiveNav();
      showSection();
    }

    async function refreshAll() {
      const token = localStorage.getItem(tokenKey);
      if (!token) {
        return setToast("Please login to load admin data.", "var(--warn)");
      }
      await Promise.allSettled([
        loadSummary(true),
        loadPayments(true),
        loadRequests(true),
        loadLicenses(true),
        loadActivations(true),
        loadDemos(true),
        loadBackends(true),
        loadBusinesses(true),
        loadBackendsCatalog(true),
        loadManualLicenses(true),
        loadSyncMonitor(true),
        loadPlatformSettings(true)
      ]);
      if (isSuperAdmin()) {
        await loadAdminUsers(true);
      }
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
          openModal("payment_modal");
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
          const canApprove = String(r.payment_status || "").toUpperCase() === "PAID";
          byId("detail_approve").disabled = !canApprove;
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
            { label: "Payment Status", value: r.payment_status || "-" },
            { label: "Payment Reference", value: r.payment_reference || "-" },
            { label: "Paid Amount", value: r.paid_amount != null ? "K" + r.paid_amount : "-" },
            { label: "Notes", value: r.notes || "-" },
            { label: "Machine ID", value: r.machine_id },
            { label: "Device ID", value: r.device_id || "-" },
            { label: "Backend Name", value: r.backend_name || "-" },
            { label: "Backend ID", value: r.backend_id, warn: !r.backend_id },
            { label: "Branch", value: r.branch_name || "-" },
            { label: "Business ID", value: r.business_id, warn: !r.business_id },
            { label: "Branch ID", value: r.branch_id, warn: !r.branch_id },
            { label: "Requested At", value: r.requested_at }
          ]);
        }
        if (btn.dataset.action === "load") {
          const r = requestMap.get(String(id));
          if (!r) return;
          const ok = await applyRequestToManualForm(r);
          if (ok) {
            showManualSection();
            setToast("Request loaded into License Manager.", "var(--good)");
          } else {
            setToast("Failed to load request into License Manager.", "var(--bad)");
          }
        }
      });

      byId("payments_body").addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const id = btn.dataset.id;
        if (btn.dataset.action === "view-payment") {
          const res = await fetch("/api/admin/payments/" + id, { headers: authHeaders() });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return setToast(data?.message || data?.error || "Failed to load payment.", "var(--bad)");
          const r = data.row || {};
          renderDetails("Payment Transaction", [
            { label: "TXN ID", value: r.txn_id },
            { label: "Amount", value: r.amount != null ? "K" + r.amount : "-" },
            { label: "Phone", value: r.payer_phone || "-" },
            { label: "Match Status", value: r.match_status || "-" },
            { label: "Matched Request", value: r.matched_request_id || "-" },
            { label: "Source", value: r.source_type || "-" },
            { label: "Source Email", value: r.source_email || "-" },
            { label: "Sender Email", value: r.sender_email || "-" },
            { label: "Imported At", value: r.imported_at },
            { label: "Notes", value: r.notes || "-" },
            { label: "Raw Subject", value: r.raw_subject || "-" },
            { label: "Sanitized SMS", value: r.sanitized_body || "-" },
            ...(r.allow_raw ? [{ label: "Raw Body", value: r.raw_body || "-" }] : [])
          ]);
        }
        if (btn.dataset.action === "rematch") {
          const res = await fetch("/api/admin/payments/" + id + "/rematch", {
            method: "POST",
            headers: authHeaders()
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return setToast(data?.message || data?.error || "Rematch failed.", "var(--bad)");
          setToast("Rematch complete.", "var(--good)");
          await loadPayments();
          await loadRequests();
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
        if (btn.dataset.action === "replace") {
          const res = await fetch("/api/admin/licenses/" + id + "/replace", { method: "POST", headers: authHeaders() });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return setToast(data?.message || data?.error || "Replace failed.", "var(--bad)");
          }
          setToast("License replaced.", "var(--good)");
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
            { label: "Key ID", value: r.key_id || r.license_key_id || "jpmax-license-key-2026-01" },
            { label: "Issued By", value: issuedByDisplay(r) },
            { label: "Issued At", value: r.issued_at },
            { label: "Approved By", value: r.approved_by_display || "—" },
            { label: "Approved At", value: r.approved_at || "—" },
            { label: "Revoked By", value: r.revoked_by_display || "—" },
            { label: "Revoked At", value: r.revoked_at || "—" },
            { label: "Reissued By", value: r.reissued_by_display || "—" },
            { label: "Reissued At", value: r.reissued_at || "—" },
            { label: "Backend ID", value: r.backend_id, warn: !r.backend_id },
            { label: "Business ID", value: r.business_id, warn: !r.business_id },
            { label: "Branch ID", value: r.branch_id, warn: !r.branch_id },
            { label: "Machine ID", value: r.machine_id },
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
          await applyLicenseToManualForm(r);
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
          if (r.total_device_limit != null || r.device_limit != null) {
            byId("manual_total_limit").value = r.total_device_limit ?? r.device_limit ?? "";
          }
          setToast("Loaded license into form.", "var(--good)");
        }
      });
    }

    function bindPaymentModal() {
      byId("pay_cancel").addEventListener("click", () => {
        closeModal("payment_modal");
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
        closeModal("payment_modal");
        await loadRequests();
      });
    }

    async function init() {
      setActiveNav();
      showSection();
      bindTableActions();
      bindPaymentModal();
      updateAdminNavVisibility();
      setManualContext(null);
      if (window.location.pathname.endsWith("/automax-pos/licenses")) {
        await restoreManualRequestFromStorage();
      }

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
        togglePassword("admin_pass", "admin_toggle_pass");
      });
      byId("admin_user_toggle_pass")?.addEventListener("click", () => {
        togglePassword("admin_user_password", "admin_user_toggle_pass");
      });
      byId("admin_user_toggle_pass2")?.addEventListener("click", () => {
        togglePassword("admin_user_password2", "admin_user_toggle_pass2");
      });
      byId("admin_user_password")?.addEventListener("input", updateAdminUserPasswordMatch);
      byId("admin_user_password2")?.addEventListener("input", updateAdminUserPasswordMatch);
      byId("admin_users_role_filter")?.addEventListener("change", renderAdminUsers);
      byId("admin_users_status_filter")?.addEventListener("change", renderAdminUsers);
      byId("requests_refresh").addEventListener("click", loadRequests);
      byId("licenses_refresh").addEventListener("click", loadLicenses);
      byId("activations_refresh").addEventListener("click", loadActivations);
      byId("demos_refresh").addEventListener("click", loadDemos);
      byId("backends_refresh").addEventListener("click", loadBackends);
      byId("businesses_refresh").addEventListener("click", loadBusinesses);
      byId("payments_refresh").addEventListener("click", loadPayments);
      byId("payments_status_filter").addEventListener("change", loadPayments);
      byId("payments_range").addEventListener("change", () => {
        applyPaymentsRange(byId("payments_range")?.value || "today");
        loadPayments();
      });

      byId("admin_users_body")?.addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        if (!isSuperAdmin()) return setToast("SUPER_ADMIN only.", "var(--warn)");
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const user = adminUsersMap.get(String(id));
        if (!user) return;
        if (action === "edit") {
          fillAdminUserForm(user);
          return;
        }
        if (action === "reset") {
          activeResetUserId = id;
          byId("admin_reset_status").textContent = "";
          byId("admin_reset_password").value = "";
          byId("admin_reset_password2").value = "";
          openModal("admin_reset_modal");
          return;
        }
        if (action === "revoke") {
          const res = await fetch("/api/admin/users/" + id + "/revoke", { method: "POST", headers: authHeaders() });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return setToast(data?.message || data?.error || "Deactivate failed.", "var(--bad)");
          setToast("User deactivated.", "var(--warn)");
          await loadAdminUsers();
          return;
        }
        if (action === "activate") {
          const res = await fetch("/api/admin/users/" + id + "/activate", { method: "POST", headers: authHeaders() });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return setToast(data?.message || data?.error || "Activate failed.", "var(--bad)");
          setToast("User activated.", "var(--good)");
          await loadAdminUsers();
          return;
        }
        if (action === "delete") {
          if (!window.confirm("Delete this admin user?")) return;
          const res = await fetch("/api/admin/users/" + id, { method: "DELETE", headers: authHeaders() });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return setToast(data?.message || data?.error || "Delete failed.", "var(--bad)");
          setToast("User deleted.", "var(--warn)");
          await loadAdminUsers();
        }
      });
      byId("payments_search").addEventListener("input", () => {
        clearTimeout(window.__payTimer);
        window.__payTimer = setTimeout(loadPayments, 300);
      });
      byId("admin_reset_toggle")?.addEventListener("click", () => {
        togglePassword("admin_reset_password", "admin_reset_toggle");
      });
      byId("admin_reset_toggle2")?.addEventListener("click", () => {
        togglePassword("admin_reset_password2", "admin_reset_toggle2");
      });
      byId("admin_reset_cancel")?.addEventListener("click", () => {
        closeModal("admin_reset_modal");
      });
      byId("admin_reset_modal")?.addEventListener("click", (e) => {
        if (e.target && e.target.id === "admin_reset_modal") closeModal("admin_reset_modal");
      });
      byId("admin_reset_confirm")?.addEventListener("click", async () => {
        if (!activeResetUserId) return;
        const pw = byId("admin_reset_password").value;
        const pw2 = byId("admin_reset_password2").value;
        const status = byId("admin_reset_status");
        if (!pw || pw.length < 6) {
          status.textContent = "Password must be at least 6 characters.";
          return;
        }
        if (pw !== pw2) {
          status.textContent = "Passwords do not match.";
          return;
        }
        status.textContent = "Resetting...";
        const res = await fetch("/api/admin/users/" + activeResetUserId + "/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ password: pw })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          status.textContent = data?.message || data?.error || "Reset failed.";
          return;
        }
        setToast("Password reset.", "var(--good)");
        byId("admin_reset_password").value = "";
        byId("admin_reset_password2").value = "";
        byId("admin_reset_status").textContent = "";
        closeModal("admin_reset_modal");
      });
      byId("sync_refresh").addEventListener("click", loadSyncMonitor);
      byId("settings_save").addEventListener("click", savePlatformSettings);
      byId("admin_users_refresh")?.addEventListener("click", loadAdminUsers);
      byId("admin_user_clear")?.addEventListener("click", clearAdminUserForm);
      byId("admin_user_save")?.addEventListener("click", async () => {
        if (!isSuperAdmin()) return setToast("SUPER_ADMIN only.", "var(--warn)");
        const fullName = byId("admin_user_full_name").value.trim();
        const username = byId("admin_user_username").value.trim();
        const email = byId("admin_user_email").value.trim().toLowerCase();
        const role = byId("admin_user_role").value;
        const isActive = byId("admin_user_active").value === "true";
        const pass = byId("admin_user_password").value;
        const pass2 = byId("admin_user_password2").value;
        if (!fullName || !username || !email || !role) {
          byId("admin_user_status").textContent = "Full name, username, email, and role are required.";
          return;
        }
        if (!editingAdminUserId) {
          if (!pass || pass.length < 6) {
            byId("admin_user_status").textContent = "Password must be at least 6 characters.";
            return;
          }
          if (pass !== pass2) {
            byId("admin_user_status").textContent = "Passwords do not match.";
            return;
          }
        }
        if (editingAdminUserId) {
          const res = await fetch("/api/admin/users/" + editingAdminUserId, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ full_name: fullName, username, email, role, is_active: isActive })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            byId("admin_user_status").textContent = data?.message || data?.error || "Update failed.";
            return;
          }
          setToast("User updated.", "var(--good)");
          clearAdminUserForm();
          await loadAdminUsers();
          return;
        }

        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ full_name: fullName, username, email, password: pass, role, is_active: isActive })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          byId("admin_user_status").textContent = data?.message || data?.error || "Create failed.";
          return;
        }
        setToast("User created.", "var(--good)");
        clearAdminUserForm();
        await loadAdminUsers();
      });
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
        if (!manualContext.source) return setToast("Load a license request first.", "var(--warn)");
        if (manualContext.source === "request" && !requestId) return setToast("Request ID missing. Reload request.", "var(--warn)");
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
        if (!issueType) return setToast("Select an issue type.", "var(--warn)");
        const res = await fetch("/api/admin/licenses/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return setToast(data.error || "Failed to create license.", "var(--bad)");
        }
        setToast(manualContext.source === "license" ? "License updated." : "License issued.", "var(--good)");
        await loadManualLicenses();
      });
      byId("manual_export_request").addEventListener("click", () => {
        if (!manualRequestSnapshot) {
          return setManualFallbackStatus("Load a request first.", "var(--warn)");
        }
        const payload = buildManualRequestExport();
        const fileName = "license_request_" + (payload?.request_id || manualRequestSnapshot.id || "request") + ".json";
        downloadJson(payload, fileName);
        setManualFallbackStatus("Request payload exported.", "var(--good)");
      });
      byId("manual_upload_btn").addEventListener("click", () => {
        if (!isLicensingAdmin()) {
          return setManualFallbackStatus("Internal tools only.", "var(--warn)");
        }
        byId("manual_license_upload").click();
      });
      byId("manual_license_upload").addEventListener("change", async (e) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          manualFallbackLicense = JSON.parse(text);
          const licenseId =
            manualFallbackLicense?.license_id ||
            manualFallbackLicense?.license?.license_id ||
            manualFallbackLicense?.payload?.license_id ||
            "";
          setManualFallbackStatus(
            "Signed license loaded" + (licenseId ? " (" + licenseId + ")." : "."),
            "var(--good)"
          );
        } catch (err) {
          manualFallbackLicense = null;
          setManualFallbackStatus("Invalid license JSON file.", "var(--bad)");
        } finally {
          e.target.value = "";
        }
      });
      byId("manual_attach_license").addEventListener("click", async () => {
        if (!manualRequestSnapshot) {
          return setManualFallbackStatus("Load a request first.", "var(--warn)");
        }
        if (!manualFallbackLicense) {
          return setManualFallbackStatus("Upload a signed license JSON first.", "var(--warn)");
        }
        if (!isLicensingAdmin()) {
          return setManualFallbackStatus("Internal tools only.", "var(--warn)");
        }
        const reqRowId = manualRequestSnapshot.id;
        if (!reqRowId) {
          return setManualFallbackStatus("Missing request row id.", "var(--bad)");
        }
        setManualFallbackStatus("Validating license...", "var(--muted)");
        const resp = await fetch("/api/admin/license-requests/" + reqRowId + "/attach-license", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ license: manualFallbackLicense })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          setManualFallbackStatus(data?.message || data?.error || "Attach failed.", "var(--bad)");
          return;
        }
        setManualFallbackStatus("License attached. Backend can pull the license.", "var(--good)");
        await loadRequests();
        await loadManualLicenses();
      });
      byId("manual_clear").addEventListener("click", clearManualForm);
      byId("manual_issue_type").addEventListener("change", updateManualDerived);
      byId("manual_plan").addEventListener("change", updateManualDerived);
      byId("manual_extra_devices").addEventListener("input", updateManualDerived);
      byId("manual_business").addEventListener("change", loadBackendsCatalog);
      byId("request_search").addEventListener("input", () => {
        clearTimeout(window.__reqTimer);
        window.__reqTimer = setTimeout(loadRequests, 300);
      });
      byId("detail_close").addEventListener("click", () => {
        closeModal("detail_modal");
      });
      byId("detail_modal").addEventListener("click", (e) => {
        if (e.target && e.target.id === "detail_modal") closeModal("detail_modal");
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
        closeModal("detail_modal");
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
        closeModal("detail_modal");
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
          setActiveNav();
          showSection();
          applyPaymentsRange(byId("payments_range")?.value || "today");
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
