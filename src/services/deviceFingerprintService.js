"use strict";

const { query } = require("../db/pool");

async function resolveActiveLicenseId(backendId) {
  try {
    const res = await query(
      `SELECT license_id
       FROM backend_licenses
       WHERE backend_id = $1
         AND status = 'ACTIVE'
       ORDER BY issued_at DESC NULLS LAST
       LIMIT 1`,
      [backendId]
    );
    return res.rows[0]?.license_id || null;
  } catch (_) {
    return null;
  }
}

async function recordFingerprint({ backend_id, license_id, fingerprint_hash, hostname, platform }) {
  if (!fingerprint_hash) return { ok: false, error: "MISSING_FINGERPRINT" };
  const resolvedLicense = license_id || (backend_id ? await resolveActiveLicenseId(backend_id) : null);
  if (!resolvedLicense) return { ok: false, error: "NO_LICENSE" };

  const existing = await query(
    `SELECT id FROM device_fingerprints
     WHERE license_id = $1 AND fingerprint_hash = $2
     LIMIT 1`,
    [resolvedLicense, fingerprint_hash]
  );

  if (!existing.rows.length) {
    await query(
      `INSERT INTO device_fingerprints
       (backend_id, license_id, fingerprint_hash, hostname, platform, first_seen_at, last_seen_at)
       VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
      [backend_id || null, resolvedLicense, fingerprint_hash, hostname || null, platform || null]
    );
    // eslint-disable-next-line no-console
    console.log("[SECURITY]", {
      event: "NEW_DEVICE_DETECTED",
      license_id: resolvedLicense,
      fingerprint_hash,
      hostname,
      time: new Date().toISOString()
    });
  } else {
    await query(
      `UPDATE device_fingerprints
       SET last_seen_at = NOW(),
           hostname = COALESCE($1, hostname),
           platform = COALESCE($2, platform)
       WHERE license_id = $3 AND fingerprint_hash = $4`,
      [hostname || null, platform || null, resolvedLicense, fingerprint_hash]
    );
  }

  return { ok: true, license_id: resolvedLicense, created: !existing.rows.length };
}

module.exports = { recordFingerprint };
