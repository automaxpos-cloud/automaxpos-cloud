const nodemailer = require("nodemailer");

function isEmailConfigured() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = String(process.env.SMTP_PORT || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const from = String(process.env.SMTP_FROM || "").trim();
  return !!(host && port && user && pass && (from || user));
}

function getTransport() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const secure = port === 465;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined
  });
}

async function sendEmail({ to, subject, html, text }) {
  const from = String(process.env.SMTP_FROM || process.env.SMTP_USER || "").trim();
  if (!from) {
    throw new Error("SMTP_FROM_MISSING");
  }
  const transport = getTransport();
  return transport.sendMail({
    from,
    to,
    subject,
    text,
    html
  });
}

module.exports = { isEmailConfigured, sendEmail };
