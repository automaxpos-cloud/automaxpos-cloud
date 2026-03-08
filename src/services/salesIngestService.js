const { pool } = require("../db/pool");
const { v4: uuidv4 } = require("uuid");
const { findIdempotency, insertIdempotency } = require("./idempotencyService");

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function ingestSale(backend, payload) {
  const client = await pool.connect();
  const { idempotency_key, sale } = payload;
  const localSaleUuid =
    sale?.local_sale_uuid ||
    sale?.localSaleUuid ||
    sale?.client_sale_id ||
    null;

  if (!idempotency_key) {
    const err = new Error("idempotency_key required");
    err.code = "BAD_REQUEST";
    throw err;
  }
  if (!localSaleUuid) {
    const err = new Error("local_sale_uuid required");
    err.code = "BAD_REQUEST";
    throw err;
  }

  try {
    await client.query("BEGIN");

    const existingKey = await findIdempotency(client, idempotency_key);
    if (existingKey) {
      await client.query("COMMIT");
      return { ok: true, already_processed: true };
    }

    const existingSale = await client.query(
      `SELECT id FROM synced_sales
       WHERE local_sale_uuid = $1 AND business_id = $2 AND branch_id = $3`,
      [localSaleUuid, backend.business_id, backend.branch_id]
    );

    if (existingSale.rows.length) {
      await insertIdempotency(client, idempotency_key, "sales_sync");
      await client.query("COMMIT");
      return { ok: true, already_exists: true };
    }

    const saleId = uuidv4();
    await client.query(
      `INSERT INTO synced_sales (
        id, business_id, branch_id, backend_id,
        receipt_no, local_sale_uuid,
        subtotal, discount, tax, total,
        payment_method, cashier_name,
        local_created_at, raw_payload_json
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
      )`,
      [
        saleId,
        backend.business_id,
        backend.branch_id,
        backend.id,
        sale?.receipt_no || null,
        String(localSaleUuid),
        safeNumber(sale?.subtotal),
        safeNumber(sale?.discount),
        safeNumber(sale?.tax),
        safeNumber(sale?.total),
        sale?.payment_method || null,
        sale?.cashier_name || null,
        sale?.created_at ? new Date(sale.created_at) : new Date(),
        JSON.stringify(sale || {})
      ]
    );

    const items = Array.isArray(sale?.items) ? sale.items : [];
    for (const it of items) {
      await client.query(
        `INSERT INTO synced_sale_items (
          id, synced_sale_id, product_id, sku, barcode,
          product_name, variant_name, unit_price, qty, weight_qty,
          line_total, product_type
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        )`,
        [
          uuidv4(),
          saleId,
          it.product_id != null ? String(it.product_id) : null,
          it.sku || null,
          it.barcode || null,
          it.product_name || null,
          it.variant_name || null,
          safeNumber(it.unit_price),
          safeNumber(it.qty),
          it.weight_qty != null ? safeNumber(it.weight_qty) : null,
          safeNumber(it.line_total),
          it.product_type || null
        ]
      );
    }

    await insertIdempotency(client, idempotency_key, "sales_sync");
    await client.query("COMMIT");
    return { ok: true, stored: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { ingestSale };
