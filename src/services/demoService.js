"use strict";

const { query } = require("../db/pool");

const DEMO_DAYS = Number(process.env.DEMO_DAYS || 7);
const MAX_SALES = Number(process.env.DEMO_MAX_SALES || 50);

function expiresAtFromNow() {
  return new Date(Date.now() + DEMO_DAYS * 86400 * 1000);
}

function normalizeStatus(record) {
  const exp = record?.expires_at ? new Date(record.expires_at) : null;
  const sales = Number(record?.sales_count || 0);
  const maxSales = Number(record?.max_sales || MAX_SALES);
  if (exp && Date.now() > exp.getTime()) return "EXPIRED";
  if (sales >= maxSales) return "EXPIRED";
  return "ACTIVE";
}

async function getOrCreateDemo(fingerprint_hash, hostname, platform) {
  const existing = await query(
    `SELECT * FROM demo_licenses WHERE fingerprint_hash = $1 LIMIT 1`,
    [fingerprint_hash]
  );
  if (existing.rows.length) {
    // eslint-disable-next-line no-console
    console.log("[SECURITY]", { event: "DEMO_REINSTALL_DETECTED", fingerprint_hash });
    const row = existing.rows[0];
    const status = normalizeStatus(row);
    if (status !== row.status) {
      await query(
        `UPDATE demo_licenses SET status=$1, updated_at=NOW() WHERE id=$2`,
        [status, row.id]
      );
      row.status = status;
    }
    return row;
  }

  const created = await query(
    `INSERT INTO demo_licenses
     (fingerprint_hash, first_activated_at, expires_at, sales_count, max_sales, status, updated_at)
     VALUES ($1, NOW(), $2, 0, $3, 'ACTIVE', NOW())
     RETURNING *`,
    [fingerprint_hash, expiresAtFromNow(), MAX_SALES]
  );
  // eslint-disable-next-line no-console
  console.log("[DEMO]", { event: "ACTIVATED", fingerprint_hash, hostname, platform });
  return created.rows[0];
}

async function recordSale(fingerprint_hash, increment = 1) {
  const res = await query(
    `UPDATE demo_licenses
     SET sales_count = sales_count + $2,
         updated_at = NOW()
     WHERE fingerprint_hash = $1
     RETURNING *`,
    [fingerprint_hash, Number(increment || 1)]
  );
  if (!res.rows.length) {
    return null;
  }
  const row = res.rows[0];
  const status = normalizeStatus(row);
  if (status !== row.status) {
    await query(`UPDATE demo_licenses SET status=$1, updated_at=NOW() WHERE id=$2`, [status, row.id]);
    row.status = status;
    // eslint-disable-next-line no-console
    console.log("[DEMO]", { event: "EXPIRED", reason: "TIME_OR_SALES", fingerprint_hash });
  } else {
    // eslint-disable-next-line no-console
    console.log("[DEMO]", { event: "SALE_RECORDED", fingerprint_hash });
  }
  return row;
}

module.exports = { getOrCreateDemo, recordSale, normalizeStatus };
