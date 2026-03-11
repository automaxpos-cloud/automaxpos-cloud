const crypto = require("crypto");
const { query } = require("../db/pool");

const PLAN_LIMITS = {
  STARTER: 1,
  STANDARD: 3,
  BUSINESS: 5,
  ENTERPRISE: 0
};

const LEGACY_PLAN_MAP = {
  BASIC: "STARTER",
  STARTER: "STARTER",
  STANDARD: "STANDARD",
  PREMIUM: "BUSINESS",
  BUSINESS: "BUSINESS",
  PRO: "ENTERPRISE",
  ENTERPRISE: "ENTERPRISE",
  UNLIMITED: "ENTERPRISE"
};

const DEFAULT_FEATURES = {
  sync: true,
  reports: true,
  multi_user: true
};

function derivePlanKeyFromLimit(limit) {
  const n = Number(limit);
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "ENTERPRISE";
  if (n <= 1) return "STARTER";
  if (n <= 3) return "STANDARD";
  if (n <= 5) return "BUSINESS";
  return "ENTERPRISE";
}

function normalizePlanKey(plan, deviceLimit) {
  const raw = String(plan || "").trim().toUpperCase();
  const derived = derivePlanKeyFromLimit(deviceLimit);
  if (raw && LEGACY_PLAN_MAP[raw]) return derived || LEGACY_PLAN_MAP[raw];
  if (raw) return raw;
  return derived || "BUSINESS";
}

function planKeyToLabel(key) {
  switch (key) {
    case "STARTER":
      return "Starter";
    case "STANDARD":
      return "Standard";
    case "BUSINESS":
      return "Business";
    case "ENTERPRISE":
      return "Enterprise";
    default:
      return "Business";
  }
}

function normalizePlan(plan, deviceLimit) {
  return planKeyToLabel(normalizePlanKey(plan, deviceLimit));
}

function coerceInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getDeviceLimit(plan, override) {
  const planKey = normalizePlanKey(plan, override);
  const planLimit = PLAN_LIMITS[planKey] != null ? PLAN_LIMITS[planKey] : PLAN_LIMITS.BUSINESS;
  const overrideNum = coerceInt(override);
  if (overrideNum != null && overrideNum >= 0) return overrideNum;
  return planLimit;
}

function addYears(date, years) {
  const d = new Date(date.getTime());
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function getPrivateKeyPem() {
  const rawPem = process.env.LICENSE_PRIVATE_KEY_PEM || "";
  const b64 = process.env.LICENSE_PRIVATE_KEY_B64 || "";
  const path = process.env.LICENSE_PRIVATE_KEY_PATH || "";

  if (rawPem) {
    return rawPem.includes("\\n") ? rawPem.replace(/\\n/g, "\n") : rawPem;
  }

  if (b64) {
    return Buffer.from(b64, "base64").toString("utf8");
  }

  if (path) {
    // eslint-disable-next-line global-require
    const fs = require("fs");
    return fs.readFileSync(path, "utf8");
  }

  throw new Error("LICENSE_PRIVATE_KEY_MISSING");
}

function stableStringify(payload) {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

function signPayload(payload) {
  const payloadJson = stableStringify(payload);
  const payloadBytes = Buffer.from(payloadJson, "utf8");
  const sig = crypto.sign("RSA-SHA256", payloadBytes, getPrivateKeyPem());
  return {
    payloadJson,
    payload_b64: payloadBytes.toString("base64"),
    sig_b64: sig.toString("base64")
  };
}

function buildLicensePayload({
  licenseId,
  businessId,
  branchId,
  backendId,
  plan,
  deviceLimit,
  issuedAtSec,
  expiresAtSec,
  graceEndsAtSec,
  features,
  machineId
}) {
  return {
    license_id: licenseId,
    product: "AutoMax POS",
    business_id: businessId,
    branch_id: branchId,
    backend_id: backendId,
    plan,
    device_limit: deviceLimit,
    issued_at: issuedAtSec,
    expires_at: expiresAtSec,
    grace_ends_at: graceEndsAtSec,
    features: features || DEFAULT_FEATURES,
    machine_id: machineId || null
  };
}

function generateLicenseId() {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `AMX-${year}-${suffix}`;
}

async function getBackendLicense(backendId) {
  const res = await query(
    `SELECT *
     FROM backend_licenses
     WHERE backend_id = $1
     LIMIT 1`,
    [backendId]
  );
  return res.rows[0] || null;
}

async function issueBackendLicense({ backendId, plan, deviceLimitOverride }) {
  const backendRes = await query(
    `SELECT id, business_id, branch_id, machine_id
     FROM backend_devices
     WHERE id = $1`,
    [backendId]
  );
  if (!backendRes.rows.length) {
    throw new Error("BACKEND_NOT_FOUND");
  }
  const backend = backendRes.rows[0];
  const normalizedPlan = normalizePlan(plan, deviceLimitOverride);
  const deviceLimit = getDeviceLimit(normalizedPlan, deviceLimitOverride);

  const now = new Date();
  const issuedAt = now;
  const expiresAt = addYears(now, 2);
  const graceEndsAt = new Date(expiresAt.getTime() + 30 * 86400 * 1000);

  const issuedAtSec = Math.floor(issuedAt.getTime() / 1000);
  const expiresAtSec = Math.floor(expiresAt.getTime() / 1000);
  const graceEndsAtSec = Math.floor(graceEndsAt.getTime() / 1000);

  const existing = await getBackendLicense(backendId);
  const licenseId = existing?.license_id || generateLicenseId();

  const payload = buildLicensePayload({
    licenseId,
    businessId: backend.business_id,
    branchId: backend.branch_id,
    backendId: backend.id,
    plan: normalizedPlan,
    deviceLimit,
    issuedAtSec,
    expiresAtSec,
    graceEndsAtSec,
    features: DEFAULT_FEATURES,
    machineId: backend.machine_id || null
  });

  const signed = signPayload(payload);

  await query(
    `
      INSERT INTO backend_licenses (
        business_id,
        branch_id,
        backend_id,
        machine_id,
        license_id,
        plan,
        device_limit,
        issued_at,
        expires_at,
        grace_ends_at,
        features_json,
        payload_b64,
        sig_b64,
        status,
        updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        to_timestamp($8),
        to_timestamp($9),
        to_timestamp($10),
        $11,$12,$13,'ACTIVE',NOW()
      )
      ON CONFLICT (backend_id) DO UPDATE SET
        machine_id = EXCLUDED.machine_id,
        license_id = EXCLUDED.license_id,
        plan = EXCLUDED.plan,
        device_limit = EXCLUDED.device_limit,
        issued_at = EXCLUDED.issued_at,
        expires_at = EXCLUDED.expires_at,
        grace_ends_at = EXCLUDED.grace_ends_at,
        features_json = EXCLUDED.features_json,
        payload_b64 = EXCLUDED.payload_b64,
        sig_b64 = EXCLUDED.sig_b64,
        status = EXCLUDED.status,
        updated_at = NOW()
    `,
    [
      backend.business_id,
      backend.branch_id,
      backend.id,
      backend.machine_id || null,
      licenseId,
      normalizedPlan,
      deviceLimit,
      issuedAtSec,
      expiresAtSec,
      graceEndsAtSec,
      JSON.stringify(DEFAULT_FEATURES),
      signed.payload_b64,
      signed.sig_b64
    ]
  );

  return {
    license_id: licenseId,
    plan: normalizedPlan,
    device_limit: deviceLimit,
    issued_at: issuedAtSec,
    expires_at: expiresAtSec,
    grace_ends_at: graceEndsAtSec,
    payload_b64: signed.payload_b64,
    sig_b64: signed.sig_b64,
    backend_id: backend.id,
    business_id: backend.business_id,
    branch_id: backend.branch_id,
    machine_id: backend.machine_id || null
  };
}

module.exports = {
  PLAN_LIMITS,
  normalizePlan,
  getBackendLicense,
  issueBackendLicense
};
