const { query } = require("../db/pool");
const { CLOUD_BASE_URL } = require("../config/env");
const { isEmailConfigured, sendEmail } = require("./emailService");
const { isSmsEnabled, sendSms } = require("./smsService");

const LICENSE_REVIEW_ROLES = new Set(["SUPER_ADMIN", "SUPERADMIN", "ADMIN"]);

async function getCloudUsersColumns() {
  const res = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='cloud_users'`
  );
  return new Set(res.rows.map((r) => r.column_name));
}

async function getLicenseReviewRecipients() {
  const cols = await getCloudUsersColumns();
  const hasEmail = cols.has("email");
  const hasActive = cols.has("is_active");
  const hasRevoked = cols.has("revoked_at");
  const emailExpr = hasEmail ? "email" : "NULL";
  const activeExpr = hasActive ? "COALESCE(is_active, TRUE) = TRUE" : "TRUE";
  const revokedExpr = hasRevoked ? "revoked_at IS NULL" : "TRUE";

  const rows = await query(
    `
    SELECT id, username, full_name, ${emailExpr} AS email, role
    FROM cloud_users
    WHERE ${activeExpr}
      AND ${revokedExpr}
      AND UPPER(role) IN ('SUPER_ADMIN','SUPERADMIN','ADMIN')
    `
  );
  return (rows.rows || []).filter((r) => r.email);
}

function buildAdminLink() {
  const base = String(CLOUD_BASE_URL || "https://automaxpos-cloud.onrender.com").replace(/\/$/, "");
  return `${base}/jpmax-admin/automax-pos/requests`;
}

async function createAdminNotification({ title, message, payload }) {
  try {
    const res = await query(
      `INSERT INTO admin_notifications (notification_type, title, message, payload_json)
       VALUES ($1,$2,$3,$4)
       RETURNING id`,
      ["LICENSE_REQUEST", title, message, payload ? JSON.stringify(payload) : null]
    );
    return res.rows[0]?.id || null;
  } catch (err) {
    console.warn("[NOTIFY] failed to create admin notification:", err?.message || err);
    return null;
  }
}

async function logDelivery({ notificationId, channel, recipient, status, errorMessage }) {
  try {
    await query(
      `INSERT INTO notification_deliveries (notification_id, channel, recipient, status, error_message, sent_at)
       VALUES ($1,$2,$3,$4,$5,${status === "SENT" ? "NOW()" : "NULL"})`,
      [
        notificationId,
        channel,
        recipient,
        status,
        errorMessage || null
      ]
    );
  } catch (err) {
    console.warn("[NOTIFY] failed to log delivery:", err?.message || err);
  }
}

async function createDeliveryRows(notificationId, recipients) {
  if (!notificationId) return;
  if (!recipients.length) return;
  const values = [];
  const placeholders = [];
  let idx = 1;
  for (const recipient of recipients) {
    placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, NOW())`);
    values.push(notificationId, "email", recipient, "PENDING");
  }
  try {
    await query(
      `INSERT INTO notification_deliveries (notification_id, channel, recipient, status, created_at)
       VALUES ${placeholders.join(", ")}`,
      values
    );
  } catch (err) {
    console.warn("[NOTIFY] failed to insert delivery rows:", err?.message || err);
  }
}

function summarizeRequest(req) {
  return {
    request_id: req.request_id || null,
    business_name: req.business_name || null,
    backend_id: req.backend_id || null,
    backend_name: req.backend_name || null,
    machine_id: req.machine_id || null,
    requested_plan: req.requested_plan || null,
    request_type: req.request_type || null,
    requested_total_device_limit: req.requested_total_device_limit || null,
    created_at: req.created_at || new Date().toISOString()
  };
}

function buildEmailContent(req, adminLink) {
  const planLine = req.requested_plan || req.request_type || "-";
  const deviceLine = req.requested_total_device_limit != null ? String(req.requested_total_device_limit) : "-";
  const title = `New License Request: ${req.business_name || "Business"}`;
  const text = [
    `A new license request was submitted.`,
    ``,
    `Business: ${req.business_name || "-"}`,
    `Backend: ${req.backend_name || req.backend_id || "-"}`,
    `Machine ID: ${req.machine_id || "-"}`,
    `Requested Plan: ${planLine}`,
    `Requested Devices: ${deviceLine}`,
    `Requested At: ${req.created_at || ""}`,
    ``,
    `Open Admin Control Center: ${adminLink}`
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.4;">
      <h3 style="margin:0 0 8px;">New License Request</h3>
      <p>A new license request was submitted.</p>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:4px 10px 4px 0;"><strong>Business</strong></td><td>${req.business_name || "-"}</td></tr>
        <tr><td style="padding:4px 10px 4px 0;"><strong>Backend</strong></td><td>${req.backend_name || req.backend_id || "-"}</td></tr>
        <tr><td style="padding:4px 10px 4px 0;"><strong>Machine ID</strong></td><td>${req.machine_id || "-"}</td></tr>
        <tr><td style="padding:4px 10px 4px 0;"><strong>Requested Plan</strong></td><td>${planLine}</td></tr>
        <tr><td style="padding:4px 10px 4px 0;"><strong>Requested Devices</strong></td><td>${deviceLine}</td></tr>
        <tr><td style="padding:4px 10px 4px 0;"><strong>Requested At</strong></td><td>${req.created_at || ""}</td></tr>
      </table>
      <p style="margin-top:12px;">
        <a href="${adminLink}" target="_blank" rel="noopener">Open Admin Control Center</a>
      </p>
    </div>
  `;
  return { title, text, html };
}

async function sendEmailAlerts({ notificationId, request }) {
  const recipients = await getLicenseReviewRecipients();
  const fallback = String(process.env.LICENSE_ALERT_EMAIL || "").trim();
  if (fallback) recipients.push({ email: fallback });

  const emails = Array.from(
    new Set(recipients.map((r) => String(r.email || "").trim().toLowerCase()).filter(Boolean))
  );

  if (!emails.length) return;
  await createDeliveryRows(notificationId, emails);
  if (!isEmailConfigured()) {
    for (const email of emails) {
      await logDelivery({
        notificationId,
        channel: "email",
        recipient: email,
        status: "FAILED",
        errorMessage: "SMTP_NOT_CONFIGURED"
      });
    }
    return;
  }

  const adminLink = buildAdminLink();
  const content = buildEmailContent(request, adminLink);
  for (const email of emails) {
    try {
      console.log("[NOTIFY] email send start", email);
      await sendEmail({
        to: email,
        subject: content.title,
        text: content.text,
        html: content.html
      });
      await logDelivery({
        notificationId,
        channel: "email",
        recipient: email,
        status: "SENT"
      });
      console.log("[NOTIFY] email sent", email);
    } catch (err) {
      await logDelivery({
        notificationId,
        channel: "email",
        recipient: email,
        status: "FAILED",
        errorMessage: err?.message || "EMAIL_SEND_FAILED"
      });
      console.warn("[NOTIFY] email failed", email, err?.message || err);
    }
  }
}

async function sendSmsAlerts({ notificationId, request }) {
  if (!isSmsEnabled()) return;
  const msg = `New license request: ${request.business_name || "Business"} (${request.requested_plan || ""})`;
  try {
    const result = await sendSms({ message: msg });
    if (!result?.ok) {
      await logDelivery({
        notificationId,
        channel: "sms",
        recipient: "admins",
        status: "FAILED",
        errorMessage: result?.error || "SMS_FAILED"
      });
    }
  } catch (err) {
    await logDelivery({
      notificationId,
      channel: "sms",
      recipient: "admins",
      status: "FAILED",
      errorMessage: err?.message || "SMS_FAILED"
    });
  }
}

async function sendWhatsAppHook({ notificationId }) {
  await logDelivery({
    notificationId,
    channel: "whatsapp",
    recipient: "admins",
    status: "SKIPPED",
    errorMessage: "WHATSAPP_NOT_CONFIGURED"
  });
}

async function notifyLicenseRequestCreated(request) {
  const payload = summarizeRequest(request);
  const title = `License request: ${payload.business_name || "Business"}`;
  const message = `Requested plan: ${payload.requested_plan || "-"} | Devices: ${payload.requested_total_device_limit ?? "-"}`;
  const notificationId = await createAdminNotification({ title, message, payload });
  if (notificationId) {
    console.log("[NOTIFY] admin notification saved", notificationId);
  }

  await sendEmailAlerts({ notificationId, request: payload });
  await sendSmsAlerts({ notificationId, request: payload });
  await sendWhatsAppHook({ notificationId, request: payload });
}

module.exports = {
  notifyLicenseRequestCreated
};
