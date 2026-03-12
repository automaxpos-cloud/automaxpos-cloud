const express = require("express");

const router = express.Router();

router.get(["/", "/requests", "/licenses", "/backends"], (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>JP Max Admin Portal - AutoMax POS Control Panel</title>
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
      background: linear-gradient(180deg, var(--panel), var(--panel-2));
    }
    .brand { font-weight: 600; margin-bottom: 18px; }
    nav a {
      display: block;
      padding: 10px 12px;
      margin-bottom: 8px;
      border-radius: 8px;
      text-decoration: none;
      color: var(--text);
      border: 1px solid var(--border);
      background: #121c30;
    }
    nav a.active { background: var(--accent); }
    main { padding: 20px 28px; }
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
        <a href="/admin" id="nav-overview">Overview</a>
        <a href="/admin/requests" id="nav-requests">License Requests</a>
        <a href="/admin/licenses" id="nav-licenses">Issued Licenses</a>
        <a href="/admin/backends" id="nav-backends">Backends</a>
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
      <section id="section-overview">
        <h1>Overview</h1>
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
          <input id="request_search" placeholder="Search by request id, name, email, machine id" style="min-width:260px;" />
          <button class="btn" id="requests_refresh">Refresh</button>
          <div class="status-line" id="requests_status"></div>
        </div>
        <div id="requests_empty" class="empty hidden">No license requests found.</div>
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Business Owner</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Plan</th>
              <th>Device Limit</th>
              <th>Machine ID</th>
              <th>Backend ID</th>
              <th>Requested At</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Method</th>
              <th>Txn ID</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="requests_body"></tbody>
        </table>
      </section>

      <section id="section-licenses" class="hidden">
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
        "/admin": "nav-overview",
        "/admin/requests": "nav-requests",
        "/admin/licenses": "nav-licenses",
        "/admin/backends": "nav-backends"
      };
      Object.values(map).forEach((id) => byId(id)?.classList.remove("active"));
      const active = map[path] || "nav-overview";
      byId(active)?.classList.add("active");
    }

    function showSection() {
      const path = window.location.pathname;
      const sections = ["overview", "requests", "licenses", "backends"];
      sections.forEach((s) => byId("section-" + s)?.classList.add("hidden"));
      if (path.endsWith("/requests")) return byId("section-requests")?.classList.remove("hidden");
      if (path.endsWith("/licenses")) return byId("section-licenses")?.classList.remove("hidden");
      if (path.endsWith("/backends")) return byId("section-backends")?.classList.remove("hidden");
      byId("section-overview")?.classList.remove("hidden");
    }

    function badge(text, cls) {
      return '<span class="status ' + cls + '">' + text + "</span>";
    }

    function statusBadge(status) {
      const s = String(status || "").toUpperCase();
      if (s === "PENDING") return badge(s, "badge-pending");
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

    async function loadSummary() {
      const res = await fetch("/api/admin/summary", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setToast("Failed to load summary.", "var(--bad)");
      byId("sum_pending").textContent = data.pending_requests ?? "--";
      byId("sum_issued").textContent = data.issued_licenses ?? "--";
      byId("sum_businesses").textContent = data.active_businesses ?? "--";
      byId("sum_backends").textContent = data.active_backends ?? "--";
      byId("sum_expiring").textContent = data.expiring_soon ?? "--";
      byId("sum_revoked").textContent = data.revoked_licenses ?? "--";
    }

    async function loadRequests() {
      byId("requests_status").textContent = "Loading...";
      const q = byId("request_search")?.value.trim() || "";
      const url = "/api/admin/license-requests" + (q ? "?q=" + encodeURIComponent(q) : "");
      const res = await fetch(url, { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        byId("requests_status").textContent = "Failed to load.";
        return setToast("Failed to load requests.", "var(--bad)");
      }
      const body = byId("requests_body");
      body.innerHTML = "";
      requestMap = new Map((data.rows || []).map((r) => [String(r.id), r]));
      byId("requests_status").textContent = (data.rows || []).length + " rows";
      byId("requests_empty").classList.toggle("hidden", (data.rows || []).length > 0);
      (data.rows || []).forEach((r) => {
        const paid = String(r.payment_status || "").toUpperCase() === "PAID";
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td><button class='btn' data-copy='" + (r.request_id || r.id || "") + "'>Copy</button> " + (r.request_id || r.id || "-") + "</td>" +
          "<td>" + (r.customer_name || "-") + "</td>" +
          "<td>" + (r.email || "-") + "</td>" +
          "<td>" + (r.phone || "-") + "</td>" +
          "<td>" + (r.plan || "-") + "</td>" +
          "<td>" + (r.device_limit ?? "-") + "</td>" +
          "<td>" + (r.machine_id ? r.machine_id.slice(0, 10) + "..." : "-") + "</td>" +
          "<td>" + (r.backend_id || "-") + "</td>" +
          "<td>" + (r.requested_at ? new Date(r.requested_at).toLocaleString() : "-") + "</td>" +
          "<td>" + statusBadge(r.status) + "</td>" +
          "<td>" + paymentBadge(r.payment_status) + "</td>" +
          "<td>" + (r.payment_method || "-") + "</td>" +
          "<td>" + (r.payment_txn_id || "-") + "</td>" +
          "<td>" + (r.payment_amount ?? "-") + "</td>" +
          "<td>" +
          "<button class='btn' data-action='view' data-id='" + r.id + "'>View</button> " +
          "<button class='btn' data-action='pay' data-id='" + r.id + "'>Confirm Payment</button> " +
          "<button class='btn' data-action='issue' data-id='" + r.id + "'" + (paid ? "" : " disabled") + ">Mark Issued</button> " +
          "<button class='btn' data-action='reject' data-id='" + r.id + "'>Reject</button>" +
          "</td>";
        body.appendChild(tr);
      });
    }

    async function loadLicenses() {
      byId("licenses_status").textContent = "Loading...";
      const res = await fetch("/api/admin/licenses", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        byId("licenses_status").textContent = "Failed to load.";
        return setToast("Failed to load licenses.", "var(--bad)");
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

    async function loadBackends() {
      byId("backends_status").textContent = "Loading...";
      const res = await fetch("/api/admin/backends", { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        byId("backends_status").textContent = "Failed to load.";
        return setToast("Failed to load backends.", "var(--bad)");
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

    async function refreshAll() {
      const token = localStorage.getItem(tokenKey);
      if (!token) {
        return setToast("Please login to load admin data.", "var(--warn)");
      }
      await loadSummary();
      await loadRequests();
      await loadLicenses();
      await loadBackends();
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
          renderDetails("License Request", [
            { label: "Request ID", value: r.request_id || r.id },
            { label: "Business Owner", value: r.customer_name },
            { label: "Email", value: r.email },
            { label: "Phone", value: r.phone },
            { label: "Plan", value: r.plan },
            { label: "Device Limit", value: r.device_limit },
            { label: "Machine ID", value: r.machine_id },
            { label: "Backend ID", value: r.backend_id, warn: !r.backend_id },
            { label: "Business ID", value: r.business_id, warn: !r.business_id },
            { label: "Branch ID", value: r.branch_id, warn: !r.branch_id },
            { label: "Requested At", value: r.requested_at }
          ]);
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
      byId("request_search").addEventListener("input", () => {
        clearTimeout(window.__reqTimer);
        window.__reqTimer = setTimeout(loadRequests, 300);
      });
      byId("detail_close").addEventListener("click", () => {
        byId("detail_modal").style.display = "none";
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
