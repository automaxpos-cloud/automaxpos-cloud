const crypto = require("crypto");
const { query } = require("../db/pool");

const PLAN_LIMITS = {
  STARTER: 1,
  STANDARD: 3,
  BUSINESS: 5,
  ENTERPRISE: 10
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

const BUILTIN_PUBLIC_KEYS = {
  "jpmax-license-key-2026-01": [
    "-----BEGIN PUBLIC KEY-----",
    "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2TDiRbHDHq/Ldum/gR0v",
    "C8AyYMObhTsYzDwXNroXCzJw30fmF9JEaC7EEq+puQMKnXtWTwn2Woo2hDEp6eyC",
    "UdyMFtyqygrWCvAidfJAIDoStqeY9yMyflAftmyvKPdDAngv7qZVxHVUQHo+uh2r",
    "uV4lZEagJFLsKaefNJ9VgI38nPqymKpyIIDJFnSqLx9rT5CuWcmkumWZBwRL526S",
    "MlOYSK0j9emD835x+2uWJUcsrwJ94MLMYJm+/eY2yokR6U9ys0bdrqJSaUW4LD0e",
    "cvnhOJO4vsaNxazjXhfjZkZfzf74UafnlVnZ8Jh66xrajQjvz1lFZHC+tOAoCOpO",
    "xQIDAQAB",
    "-----END PUBLIC KEY-----"
  ].join("\n")
};

function derivePlanKeyFromLimit(limit) {
  const n = Number(limit);
  if (!Number.isFinite(n)) return "";
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

function getBaseLimit(plan) {
  const planKey = normalizePlanKey(plan);
  const planLimit = PLAN_LIMITS[planKey] != null ? PLAN_LIMITS[planKey] : PLAN_LIMITS.BUSINESS;
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
    const fs = require("fs");
    return fs.readFileSync(path, "utf8");
  }

  throw new Error("LICENSE_PRIVATE_KEY_MISSING");
}

function getPublicKeyPem() {
  const rawPem = process.env.LICENSE_PUBLIC_KEY_PEM || "";
  const b64 = process.env.LICENSE_PUBLIC_KEY_B64 || "";
  const path = process.env.LICENSE_PUBLIC_KEY_PATH || "";

  if (rawPem) {
    return rawPem.includes("\\n") ? rawPem.replace(/\\n/g, "\n") : rawPem;
  }

  if (b64) {
    return Buffer.from(b64, "base64").toString("utf8");
  }

  if (path) {
    const fs = require("fs");
    return fs.readFileSync(path, "utf8");
  }

  try {
    const privateKey = getPrivateKeyPem();
    const keyObj = crypto.createPrivateKey(privateKey);
    const pubObj = crypto.createPublicKey(keyObj);
    return pubObj.export({ type: "spki", format: "pem" });
  } catch (err) {
    throw new Error("LICENSE_PUBLIC_KEY_MISSING");
  }
}

function sanitizeKeyId(keyId) {
  return String(keyId || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

function tryLoadPemFromValue(raw) {
  if (!raw) return null;
  const text = String(raw || "").trim();
  if (!text) return null;
  if (text.includes("BEGIN")) {
    return text.includes("\\n") ? text.replace(/\\n/g, "\n") : text;
  }
  try {
    const maybePem = Buffer.from(text, "base64").toString("utf8");
    if (maybePem.includes("BEGIN")) return maybePem;
  } catch (_) {}
  try {
    const fs = require("fs");
    if (fs.existsSync(text)) return fs.readFileSync(text, "utf8");
  } catch (_) {}
  return null;
}

function getPublicKeyPemForKeyId(keyId) {
  const tried = [];
  const normalized = sanitizeKeyId(keyId);
  const mapRaw = process.env.LICENSE_PUBLIC_KEYS_JSON || process.env.LICENSE_PUBLIC_KEYS || "";
  if (mapRaw) {
    try {
      const map = JSON.parse(mapRaw);
      if (map && typeof map === "object") {
        if (keyId && map[keyId]) {
          const pem = tryLoadPemFromValue(map[keyId]);
          if (pem) return { pem, source: "map:" + keyId, tried };
          tried.push("map:" + keyId);
        }
        if (normalized && map[normalized]) {
          const pem = tryLoadPemFromValue(map[normalized]);
          if (pem) return { pem, source: "map:" + normalized, tried };
          tried.push("map:" + normalized);
        }
      }
    } catch (_) {
      tried.push("map:parse_error");
    }
  }
  if (normalized) {
    const envKeys = [
      "LICENSE_PUBLIC_KEY_PEM_" + normalized,
      "LICENSE_PUBLIC_KEY_" + normalized,
      "LICENSE_PUBLIC_KEY_B64_" + normalized,
      "LICENSE_PUBLIC_KEY_PATH_" + normalized
    ];
    for (const envKey of envKeys) {
      const pem = tryLoadPemFromValue(process.env[envKey] || "");
      if (pem) return { pem, source: "env:" + envKey, tried };
      tried.push("env:" + envKey);
    }
  }
  if (keyId && BUILTIN_PUBLIC_KEYS[keyId]) {
    return { pem: BUILTIN_PUBLIC_KEYS[keyId], source: "builtin:" + keyId, tried };
  }
  try {
    const pem = getPublicKeyPem();
    return { pem, source: "default", tried };
  } catch (err) {
    return { pem: null, source: "default", tried, error: err?.message || "LICENSE_PUBLIC_KEY_MISSING" };
  }
}

let backendLicensesColumnsCache = null;
async function getBackendLicensesColumns() {
  if (backendLicensesColumnsCache) return backendLicensesColumnsCache;
  const res = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema='public'
       AND table_name='backend_licenses'`
  );
  backendLicensesColumnsCache = new Set(res.rows.map((r) => r.column_name));
  return backendLicensesColumnsCache;
}

function buildBackendLicenseUpsert(cols, data) {
  const columns = [];
  const placeholders = [];
  const values = [];
  const updates = [];
  const add = (col, value, opts = {}) => {
    if (!cols.has(col)) return;
    columns.push(col);
    if (opts.raw) {
      placeholders.push(opts.raw);
    } else {
      values.push(value);
      placeholders.push(`$${values.length}`);
    }
    if (opts.update) {
      updates.push(opts.update);
    } else if (!opts.skipUpdate) {
      updates.push(`${col} = EXCLUDED.${col}`);
    }
  };

  add("business_id", data.business_id);
  add("branch_id", data.branch_id);
  add("backend_id", data.backend_id);
  add("machine_id", data.machine_id);
  add("license_id", data.license_id);
  add("plan", data.plan);
  add("device_limit", data.device_limit);
  add("issued_at", data.issued_at);
  add("expires_at", data.expires_at);
  add("grace_ends_at", data.grace_ends_at);
  add("features_json", data.features_json);
  add("payload_b64", data.payload_b64);
  add("sig_b64", data.sig_b64);
  add("status", data.status);
  add("plan_name", data.plan_name);
  add("base_device_limit", data.base_device_limit);
  add("extra_device_count", data.extra_device_count);
  add("total_device_limit", data.total_device_limit);
  add("license_version", data.license_version);
  add("previous_license_id", data.previous_license_id);
  add("change_reason", data.change_reason);
  add("license_status", data.license_status);
  add("request_id", data.request_id);
  add("hardware_bundle", data.hardware_bundle);
  add("quoted_price", data.quoted_price);

  add("issued_by_admin_id", data.issued_by_admin_id, {
    update: "issued_by_admin_id = COALESCE(EXCLUDED.issued_by_admin_id, backend_licenses.issued_by_admin_id)"
  });
  add("issued_by_name", data.issued_by_name, {
    update: "issued_by_name = COALESCE(EXCLUDED.issued_by_name, backend_licenses.issued_by_name)"
  });
  add("issued_by_email", data.issued_by_email, {
    update: "issued_by_email = COALESCE(EXCLUDED.issued_by_email, backend_licenses.issued_by_email)"
  });
  add("approved_by_admin_id", data.approved_by_admin_id, {
    update: "approved_by_admin_id = COALESCE(EXCLUDED.approved_by_admin_id, backend_licenses.approved_by_admin_id)"
  });
  add("approved_at", data.approved_at, {
    update: "approved_at = COALESCE(EXCLUDED.approved_at, backend_licenses.approved_at)"
  });
  add("updated_by_admin_id", data.updated_by_admin_id, {
    update: "updated_by_admin_id = COALESCE(EXCLUDED.updated_by_admin_id, backend_licenses.updated_by_admin_id)"
  });
  add("reissued_by_admin_id", data.reissued_by_admin_id, {
    update: "reissued_by_admin_id = COALESCE(EXCLUDED.reissued_by_admin_id, backend_licenses.reissued_by_admin_id)"
  });
  add("reissued_at", data.reissued_at, {
    update: "reissued_at = COALESCE(EXCLUDED.reissued_at, backend_licenses.reissued_at)"
  });

  if (cols.has("updated_at")) {
    columns.push("updated_at");
    placeholders.push("NOW()");
    updates.push("updated_at = NOW()");
  }

  if (!columns.includes("backend_id")) {
    throw new Error("BACKEND_LICENSES_BACKEND_ID_MISSING");
  }

  return {
    text: `
      INSERT INTO backend_licenses (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
      ON CONFLICT (backend_id) DO UPDATE SET
        ${updates.join(", ")}
    `,
    values
  };
}

function signPayload(payload) {
  const payloadJson = JSON.stringify(payload);
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
  requestId,
  businessId,
  businessName,
  branchId,
  backendId,
  planName,
  planCode,
  baseDeviceLimit,
  extraDeviceCount,
  totalDeviceLimit,
  issuedAtIso,
  expiresAtIso,
  graceEndsAtIso,
  features,
  machineId,
  licenseVersion,
  previousLicenseId,
  changeReason,
  licenseStatus
}) {
  const keyId = process.env.LICENSE_KEY_ID || "jpmax-license-key-2026-01";
  return {
    schema_version: 1,
    license_id: licenseId,
    key_id: keyId,
    request_id: requestId || null,
    issued_by: "JP_MAX_ADMIN",
    issued_at: issuedAtIso,
    expires_at: expiresAtIso,
    grace_ends_at: graceEndsAtIso,
    business_id: businessId || null,
    business: {
      business_id: businessId || null,
      business_name: businessName || null
    },
    backend_id: backendId || null,
    machine_id: machineId || null,
    backend: {
      backend_id: backendId || null,
      machine_id: machineId || null,
      branch_id: branchId || null
    },
    plan: {
      plan_code: planCode || null,
      plan_name: planName,
      device_limit: totalDeviceLimit,
      used_devices: 0,
      request_type: changeReason || "new_license"
    },
    device_limit: totalDeviceLimit,
    features: features || {
      cloud_sync: true,
      inventory: true,
      reports: true,
      returns: true,
      multi_device: true
    }
  };
}

function verifyPayloadSignature(payloadJson, sigB64) {
  return verifyPayloadSignatureDetailed(payloadJson, sigB64).ok;
}

function verifyPayloadSignatureDetailed(payloadJson, sigB64, keyId) {
  if (!payloadJson || !sigB64) {
    return { ok: false, reason: "MISSING_INPUT", key_id: keyId || null, source: null, tried: [] };
  }
  try {
    const payloadBytes = Buffer.from(payloadJson, "utf8");
    const sigBytes = Buffer.from(sigB64, "base64");
    const pub = getPublicKeyPemForKeyId(keyId);
    if (!pub?.pem) {
      return { ok: false, reason: pub?.error || "PUBLIC_KEY_MISSING", key_id: keyId || null, source: pub?.source || null, tried: pub?.tried || [] };
    }
    const ok = crypto.verify("RSA-SHA256", payloadBytes, pub.pem, sigBytes);
    return { ok, reason: ok ? null : "INVALID_SIGNATURE", key_id: keyId || null, source: pub.source || null, tried: pub.tried || [] };
  } catch (_err) {
    return { ok: false, reason: "INVALID_SIGNATURE", key_id: keyId || null, source: null, tried: [] };
  }
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

function buildLicenseOrderExpr(cols, backendIdParamIndex) {
  const parts = [];
  if (backendIdParamIndex) {
    parts.push(`CASE WHEN bl.backend_id = $${backendIdParamIndex} THEN 0 ELSE 1 END`);
  }
  const approvedExpr = cols.has("approved_at") ? "bl.approved_at" : "NULL";
  const updatedExpr = cols.has("updated_at") ? "bl.updated_at" : "NULL";
  parts.push(`COALESCE(${approvedExpr}, ${updatedExpr}, bl.issued_at) DESC NULLS LAST`);
  return parts.join(", ");
}

function buildLicenseStatusExpr(cols) {
  if (cols.has("license_status")) {
    return "COALESCE(bl.license_status, bl.status)";
  }
  return "bl.status";
}

async function getBackendLicenseForPull({ backendId, businessId, branchId, machineId, backendName, deviceId } = {}) {
  const cols = await getBackendLicensesColumns();
  const statusExpr = buildLicenseStatusExpr(cols);
  const params = [];
  const where = [];
  let backendIdParamIndex = null;

  if (businessId) {
    params.push(businessId);
    where.push(`bl.business_id = $${params.length}`);
  }
  if (branchId) {
    params.push(branchId);
    where.push(`bl.branch_id = $${params.length}`);
  }

  const idParts = [];
  if (backendId) {
    params.push(backendId);
    backendIdParamIndex = params.length;
    idParts.push(`bl.backend_id = $${backendIdParamIndex}`);
  }
  if (machineId) {
    params.push(machineId);
    idParts.push(`(bl.machine_id IS NOT NULL AND bl.machine_id = $${params.length})`);
  }
  if (idParts.length) {
    where.push(`(${idParts.join(" OR ")})`);
  }
  if (!where.length) return null;

  const orderBy = buildLicenseOrderExpr(cols, backendIdParamIndex);
  const activeWhere = `UPPER(${statusExpr}) = 'ACTIVE'`;

  const baseSql = `SELECT * FROM backend_licenses bl WHERE ${where.join(" AND ")}`;
  const activeRes = await query(
    `${baseSql} AND ${activeWhere} ORDER BY ${orderBy} LIMIT 1`,
    params
  );
  if (activeRes.rows.length) return activeRes.rows[0];

  const anyRes = await query(
    `${baseSql} ORDER BY ${orderBy} LIMIT 1`,
    params
  );
  if (anyRes.rows.length) return anyRes.rows[0];

  if (!deviceId && !backendName) return null;

  const fallbackParams = [];
  const fallbackWhere = [];
  if (businessId) {
    fallbackParams.push(businessId);
    fallbackWhere.push(`bl.business_id = $${fallbackParams.length}`);
  }
  if (branchId) {
    fallbackParams.push(branchId);
    fallbackWhere.push(`bl.branch_id = $${fallbackParams.length}`);
  }
  let fallbackBackendIdIndex = null;
  if (backendId) {
    fallbackParams.push(backendId);
    fallbackBackendIdIndex = fallbackParams.length;
  }
  const fallbackMatch = [];
  if (deviceId) {
    fallbackParams.push(deviceId);
    fallbackMatch.push(`bd.installation_id = $${fallbackParams.length}`);
  }
  if (backendName) {
    fallbackParams.push(backendName);
    fallbackMatch.push(`bd.backend_name = $${fallbackParams.length}`);
  }
  fallbackWhere.push(`(${fallbackMatch.join(" OR ")})`);

  const fallbackOrder = buildLicenseOrderExpr(cols, fallbackBackendIdIndex);
  const fallbackBaseSql = `
    SELECT bl.* 
    FROM backend_licenses bl 
    LEFT JOIN backend_devices bd ON bd.id = bl.backend_id
    WHERE ${fallbackWhere.join(" AND ")}
  `;
  const fallbackActive = await query(
    `${fallbackBaseSql} AND ${activeWhere} ORDER BY ${fallbackOrder} LIMIT 1`,
    fallbackParams
  );
  if (fallbackActive.rows.length) return fallbackActive.rows[0];

  const fallbackAny = await query(
    `${fallbackBaseSql} ORDER BY ${fallbackOrder} LIMIT 1`,
    fallbackParams
  );
  return fallbackAny.rows[0] || null;
}

async function issueBackendLicense({
  backendId,
  issueType,
  planName,
  extraDeviceCount,
  baseDeviceLimit,
  issuedAtOverride,
  expiresAtOverride,
  licenseStatus,
  hardwareBundle,
  quotedPrice,
  requestId,
  plan,
  deviceLimitOverride,
  issuedBy,
  approvedBy,
  updatedBy,
  reissuedBy
}) {
  const backendRes = await query(
    `SELECT bd.id, bd.business_id, bd.branch_id, bd.machine_id, b.name AS business_name
     FROM backend_devices bd
     LEFT JOIN businesses b ON b.id = bd.business_id
     WHERE bd.id = $1`,
    [backendId]
  );
  if (!backendRes.rows.length) {
    throw new Error("BACKEND_NOT_FOUND");
  }
  const backend = backendRes.rows[0];
  const businessName = backend.business_name || null;
  const existing = await getBackendLicense(backendId);
  const type = String(issueType || "").toLowerCase() || "new_license";

  const currentPlanName = existing?.plan_name || existing?.plan || "Business";
  const currentBase = Number(existing?.base_device_limit ?? getBaseLimit(currentPlanName));
  const currentExtra = Number(existing?.extra_device_count ?? 0);
  const currentTotal = Number(existing?.total_device_limit ?? existing?.device_limit ?? (currentBase + currentExtra));
  const currentIssued = existing?.issued_at ? new Date(existing.issued_at) : new Date();
  const currentExpires = existing?.expires_at ? new Date(existing.expires_at) : addYears(currentIssued, 3);

  let nextPlanName = String(planName || plan || currentPlanName);
  let nextBase = baseDeviceLimit != null ? Number(baseDeviceLimit) : (deviceLimitOverride != null ? Number(deviceLimitOverride) : getBaseLimit(nextPlanName));
  let nextExtra = Number.isFinite(Number(extraDeviceCount)) ? Number(extraDeviceCount) : 0;
  let nextIssuedAt = issuedAtOverride ? new Date(issuedAtOverride) : new Date();
  let nextExpiresAt = currentExpires;
  let changeReason = "initial_issue";

  if (type === "new_license") {
    changeReason = "initial_issue";
    nextExpiresAt = expiresAtOverride ? new Date(expiresAtOverride) : addYears(nextIssuedAt, 3);
  } else if (type === "device_addon") {
    changeReason = "device_addon";
    nextPlanName = currentPlanName;
    nextBase = currentBase;
    nextExtra = currentExtra + nextExtra;
    nextIssuedAt = currentIssued;
    nextExpiresAt = currentExpires;
  } else if (type === "renewal") {
    changeReason = "renewal";
    nextPlanName = currentPlanName;
    nextBase = currentBase;
    nextExtra = currentExtra;
    nextIssuedAt = issuedAtOverride ? new Date(issuedAtOverride) : new Date();
    nextExpiresAt = addYears(nextIssuedAt, 3);
  } else if (type === "upgrade") {
    changeReason = "plan_upgrade";
    nextPlanName = String(planName || plan || currentPlanName);
    nextBase = baseDeviceLimit != null ? Number(baseDeviceLimit) : getBaseLimit(nextPlanName);
    nextExtra = currentExtra;
    nextIssuedAt = currentIssued;
    nextExpiresAt = currentExpires;
  } else if (type === "correction") {
    changeReason = "correction";
    nextPlanName = String(planName || plan || currentPlanName);
    nextBase = baseDeviceLimit != null ? Number(baseDeviceLimit) : currentBase;
    nextExtra = Number.isFinite(Number(extraDeviceCount)) ? Number(extraDeviceCount) : currentExtra;
    nextIssuedAt = currentIssued;
    nextExpiresAt = expiresAtOverride ? new Date(expiresAtOverride) : currentExpires;
  }

  const totalDeviceLimit = Number(nextBase) + Number(nextExtra || 0);
  const graceEndsAt = new Date(nextExpiresAt.getTime() + 30 * 86400 * 1000);
  const licenseVersion = Number(existing?.license_version || 0) + 1;
  const previousLicenseId = existing?.license_id || null;
  const licenseId = generateLicenseId();

  const issuedAtSec = Math.floor(nextIssuedAt.getTime() / 1000);
  const expiresAtSec = Math.floor(nextExpiresAt.getTime() / 1000);
  const graceEndsAtSec = Math.floor(graceEndsAt.getTime() / 1000);
  const issuedAtDate = new Date(issuedAtSec * 1000);
  const expiresAtDate = new Date(expiresAtSec * 1000);
  const graceEndsAtDate = new Date(graceEndsAtSec * 1000);

  const payload = buildLicensePayload({
    licenseId,
    requestId: requestId || null,
    businessId: backend.business_id,
    businessName,
    branchId: backend.branch_id,
    backendId: backend.id,
    planName: normalizePlan(nextPlanName, totalDeviceLimit),
    planCode: normalizePlanKey(nextPlanName, totalDeviceLimit),
    baseDeviceLimit: nextBase,
    extraDeviceCount: nextExtra,
    totalDeviceLimit,
    issuedAtIso: new Date(issuedAtSec * 1000).toISOString(),
    expiresAtIso: new Date(expiresAtSec * 1000).toISOString(),
    graceEndsAtIso: new Date(graceEndsAtSec * 1000).toISOString(),
    features: {
      cloud_sync: true,
      inventory: true,
      reports: true,
      returns: true,
      multi_device: true
    },
    machineId: backend.machine_id || null,
    licenseVersion,
    previousLicenseId,
    changeReason,
    licenseStatus: licenseStatus || "active"
  });

  const signed = signPayload(payload);

  const issuerId = issuedBy?.user_id || issuedBy?.id || null;
  const issuerName = issuedBy?.full_name || issuedBy?.username || null;
  const issuerEmail = issuedBy?.email || null;
  const approvedId = approvedBy?.user_id || approvedBy?.id || null;
  const updatedId = updatedBy?.user_id || updatedBy?.id || issuerId || null;
  const reissuedId = reissuedBy?.user_id || reissuedBy?.id || null;

  const cols = await getBackendLicensesColumns();
  const upsert = buildBackendLicenseUpsert(cols, {
    business_id: backend.business_id,
    branch_id: backend.branch_id,
    backend_id: backend.id,
    machine_id: backend.machine_id || null,
    license_id: licenseId,
    plan: normalizePlan(nextPlanName, totalDeviceLimit),
    device_limit: totalDeviceLimit,
    issued_at: issuedAtDate,
    expires_at: expiresAtDate,
    grace_ends_at: graceEndsAtDate,
    features_json: JSON.stringify(DEFAULT_FEATURES),
    payload_b64: signed.payload_b64,
    sig_b64: signed.sig_b64,
    status: "ACTIVE",
    plan_name: normalizePlan(nextPlanName, totalDeviceLimit),
    base_device_limit: nextBase,
    extra_device_count: nextExtra,
    total_device_limit: totalDeviceLimit,
    license_version: licenseVersion,
    previous_license_id: previousLicenseId,
    change_reason: changeReason,
    license_status: licenseStatus || "active",
    request_id: requestId || null,
    hardware_bundle: hardwareBundle || null,
    quoted_price: quotedPrice != null ? Number(quotedPrice) : null,
    issued_by_admin_id: issuerId,
    issued_by_name: issuerName,
    issued_by_email: issuerEmail,
    approved_by_admin_id: approvedId,
    approved_at: approvedId ? new Date() : null,
    updated_by_admin_id: updatedId,
    reissued_by_admin_id: reissuedId,
    reissued_at: reissuedId ? new Date() : null
  });
  await query(upsert.text, upsert.values);

  return {
    license_id: licenseId,
    plan_name: normalizePlan(nextPlanName, totalDeviceLimit),
    base_device_limit: nextBase,
    extra_device_count: nextExtra,
    total_device_limit: totalDeviceLimit,
    issued_at: issuedAtSec,
    expiry_date: expiresAtSec,
    grace_ends_at: graceEndsAtSec,
    payload_b64: signed.payload_b64,
    sig_b64: signed.sig_b64,
    payload,
    signature: { algorithm: "RSA-SHA256", key_id: process.env.LICENSE_KEY_ID || "jpmax-license-key-2026-01", value: signed.sig_b64 },
    backend_id: backend.id,
    business_id: backend.business_id,
    branch_id: backend.branch_id,
    machine_id: backend.machine_id || null,
    license_version: licenseVersion,
    previous_license_id: previousLicenseId,
    change_reason: changeReason,
    license_status: licenseStatus || "active",
    status: "ACTIVE",
    issued_by_admin_id: issuerId,
    issued_by_name: issuerName,
    issued_by_email: issuerEmail,
    approved_by_admin_id: approvedId,
    approved_at: approvedId ? new Date().toISOString() : null,
    updated_by_admin_id: updatedId,
    reissued_by_admin_id: reissuedId,
    reissued_at: reissuedId ? new Date().toISOString() : null
  };
}

module.exports = {
  PLAN_LIMITS,
  normalizePlan,
  getBackendLicense,
  getBackendLicenseForPull,
  issueBackendLicense,
  verifyPayloadSignature,
  verifyPayloadSignatureDetailed
};
