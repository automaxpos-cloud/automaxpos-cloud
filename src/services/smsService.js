function isSmsEnabled() {
  return String(process.env.ENABLE_LICENSE_SMS_ALERTS || "").trim().toLowerCase() === "true";
}

async function sendSms(_payload) {
  return { ok: false, error: "SMS_NOT_CONFIGURED" };
}

module.exports = { isSmsEnabled, sendSms };
