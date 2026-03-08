const { pool } = require("../db/pool");
const { v4: uuidv4 } = require("uuid");

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function processSalesBatch(backend, sales) {
  const client = await pool.connect();
  const results = [];
  try {
    await client.query("BEGIN");

    for (const s of sales) {
      const receiptNo = s && s.receipt_no ? String(s.receipt_no) : "";
      const clientSaleId = String(s.client_sale_id || "").trim();
      if (!clientSaleId) {
        const err = new Error("client_sale_id required");
        err.code = "CONFLICT";
        throw err;
      }

      const existing = await client.query(
        `SELECT id, total_amount
         FROM sales
         WHERE client_sale_id = $1 AND business_id = $2 AND branch_id = $3`,
        [clientSaleId, backend.business_id, backend.branch_id]
      );

      if (existing.rows.length) {
        const prev = existing.rows[0];
        const incomingTotal = safeNumber(s.total_amount || s.total || 0);
        if (safeNumber(prev.total_amount) !== incomingTotal) {
          const err = new Error("client_sale_id conflict: totals differ");
          err.code = "CONFLICT";
          throw err;
        }
        results.push({ client_sale_id: clientSaleId, status: "SYNCED" });
        continue;
      }

      const saleId = uuidv4();
      try {
        await client.query(
          `INSERT INTO sales (
            id, business_id, branch_id, backend_id, client_sale_id,
            receipt_no, cashier_name, customer_name,
            subtotal, discount_amount, tax_amount, total_amount,
            paid_amount, change_amount, payment_method, created_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
          )`,
          [
            saleId,
            backend.business_id,
            backend.branch_id,
            backend.id,
            clientSaleId,
            s.receipt_no || null,
            s.cashier_name || null,
            s.customer_name || null,
            safeNumber(s.subtotal),
            safeNumber(s.discount_amount),
            safeNumber(s.tax_amount),
            safeNumber(s.total_amount || s.total),
            safeNumber(s.paid_amount),
            safeNumber(s.change_amount),
            s.payment_method || null,
            s.created_at ? new Date(s.created_at) : new Date()
          ]
        );
      } catch (err) {
        console.error("[CLOUD] sale insert failed", {
          receipt_no: receiptNo,
          client_sale_id: clientSaleId,
          error: err && err.message ? err.message : String(err),
          stack: err && err.stack ? err.stack : undefined
        });
        throw err;
      }

      const items = Array.isArray(s.items) ? s.items : [];
      for (const it of items) {
        const itemId = String(it.sale_item_id || "").trim() || uuidv4();
        const rawProductId = it.product_id;
        const productId = isUuid(rawProductId)
          ? rawProductId
          : null;
        try {
          await client.query(
            `INSERT INTO sale_items (
              id, sale_id, product_id, product_name, qty, unit_price, line_total
            ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              itemId,
              saleId,
              productId,
              it.product_name || null,
              safeNumber(it.qty),
              safeNumber(it.unit_price),
              safeNumber(it.line_total)
            ]
          );
        } catch (err) {
          console.error("[CLOUD] sale item insert failed", {
            receipt_no: receiptNo,
            client_sale_id: clientSaleId,
            error: err && err.message ? err.message : String(err),
            stack: err && err.stack ? err.stack : undefined
          });
          throw err;
        }
      }

      results.push({ client_sale_id: clientSaleId, status: "SYNCED" });
      console.log(`[CLOUD] sale stored receipt=${receiptNo || clientSaleId}`);
    }

    await client.query("COMMIT");
    return results;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { processSalesBatch };
