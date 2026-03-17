const nodemailer = require("nodemailer");

let cachedTransport = null;
let cachedConfig = null;
let verified = false;

function buildConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const from = String(process.env.SMTP_FROM || "").trim();
  const secure = port === 465;
  const requireTLS = port === 587;
  return { host, port, user, pass, from, secure, requireTLS };
}

function isEmailConfigured() {
  const cfg = buildConfig();
  return !!(cfg.host && cfg.port && cfg.user && cfg.pass && (cfg.from || cfg.user));
}

function getTransport() {
  const cfg = buildConfig();
  if (
    cachedTransport &&
    cachedConfig &&
    cachedConfig.host === cfg.host &&
    cachedConfig.port === cfg.port &&
    cachedConfig.user === cfg.user &&
    cachedConfig.pass === cfg.pass &&
    cachedConfig.from === cfg.from
  ) {
    return { transport: cachedTransport, config: cachedConfig };
  }

  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: cfg.requireTLS,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
  cachedTransport = transport;
  cachedConfig = cfg;
  verified = false;
  return { transport, config: cfg };
}

async function verifyTransport() {
  const { transport, config } = getTransport();
  if (!config.host || !config.port) {
    throw new Error("SMTP_CONFIG_MISSING");
  }
  if (verified) return;
  console.log("[NOTIFY] smtp verify start", {
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTLS
  });
  try {
    await transport.verify();
    verified = true;
    console.log("[NOTIFY] smtp verify ok", {
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: config.requireTLS
    });
  } catch (err) {
    verified = false;
    console.warn("[NOTIFY] smtp verify failed", err?.message || err);
    throw err;
  }
}

async function sendEmail({ to, subject, html, text }) {
  const { transport, config } = getTransport();
  const from = String(config.from || config.user || "").trim();
  if (!from) {
    throw new Error("SMTP_FROM_MISSING");
  }
  await verifyTransport();
  return transport.sendMail({
    from,
    to,
    subject,
    text,
    html
  });
}

module.exports = { isEmailConfigured, sendEmail };
