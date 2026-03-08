const { query } = require("../db/pool");

async function upsertProducts(backend, products) {
  let upserted = 0;
  for (const p of products) {
    await query(
      `INSERT INTO products (
        product_id, business_id, branch_id, name, sku, barcode,
        price, cost_price, stock, stock_revision, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (product_id, business_id, branch_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        sku = EXCLUDED.sku,
        barcode = EXCLUDED.barcode,
        price = EXCLUDED.price,
        cost_price = EXCLUDED.cost_price,
        stock = EXCLUDED.stock,
        stock_revision = EXCLUDED.stock_revision,
        updated_at = EXCLUDED.updated_at
      WHERE EXCLUDED.updated_at > products.updated_at
         OR EXCLUDED.stock_revision > products.stock_revision`,
      [
        p.product_id,
        backend.business_id,
        backend.branch_id,
        p.name || null,
        p.sku || null,
        p.barcode || null,
        p.price || 0,
        p.cost_price || 0,
        p.stock || 0,
        p.stock_revision || 0,
        p.updated_at ? new Date(p.updated_at) : new Date()
      ]
    );
    upserted += 1;
  }
  return { upserted };
}

async function getChanges(backend, sinceRevision) {
  const res = await query(
    `SELECT product_id, name, sku, barcode, price, cost_price, stock, stock_revision, updated_at
     FROM products
     WHERE business_id = $1 AND branch_id = $2 AND stock_revision > $3
     ORDER BY stock_revision ASC`,
    [backend.business_id, backend.branch_id, sinceRevision]
  );

  const latest = res.rows.reduce((max, r) => Math.max(max, Number(r.stock_revision || 0)), sinceRevision);
  return { latest_revision: latest, products: res.rows };
}

module.exports = { upsertProducts, getChanges };
