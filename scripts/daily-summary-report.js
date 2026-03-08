const fs = require("fs");
const path = require("path");
const { pool } = require("../src/db/pool");

function getArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  const businessId = getArg("business_id") || getArg("business-id");
  const branchId = getArg("branch_id") || getArg("branch-id") || null;
  const date = getArg("date") || todayIso();
  const out = getArg("out");

  if (!businessId) {
    console.error("Missing --business_id. Example: node scripts/daily-summary-report.js --business_id=UUID");
    process.exit(1);
  }

  const summaryRes = await pool.query(
    `SELECT COALESCE(SUM(total),0) AS gross_sales, COUNT(*) AS transactions
     FROM synced_sales
     WHERE business_id = $1
       AND ($2::uuid IS NULL OR branch_id = $2)
       AND COALESCE(local_created_at, synced_at)::date = $3::date`,
    [businessId, branchId, date]
  );
  const returnsRes = await pool.query(
    `SELECT COALESCE(SUM(total),0) AS returns_total, COUNT(*) AS returns_count
     FROM synced_returns
     WHERE business_id = $1
       AND ($2::uuid IS NULL OR branch_id = $2)
       AND COALESCE(local_created_at, synced_at)::date = $3::date`,
    [businessId, branchId, date]
  );
  const cashiersRes = await pool.query(
    `SELECT COALESCE(cashier_name,'Unknown') AS cashier_name,
            COUNT(*) AS transactions,
            COALESCE(SUM(total),0) AS total
     FROM synced_sales
     WHERE business_id = $1
       AND ($2::uuid IS NULL OR branch_id = $2)
       AND COALESCE(local_created_at, synced_at)::date = $3::date
     GROUP BY cashier_name
     ORDER BY transactions DESC`,
    [businessId, branchId, date]
  );
  const recentSalesRes = await pool.query(
    `SELECT receipt_no, total, cashier_name, COALESCE(local_created_at, synced_at) AS created_at
     FROM synced_sales
     WHERE business_id = $1
       AND ($2::uuid IS NULL OR branch_id = $2)
       AND COALESCE(local_created_at, synced_at)::date = $3::date
     ORDER BY COALESCE(local_created_at, synced_at) DESC
     LIMIT 10`,
    [businessId, branchId, date]
  );
  const recentReturnsRes = await pool.query(
    `SELECT return_no, total, cashier_name, COALESCE(local_created_at, synced_at) AS created_at
     FROM synced_returns
     WHERE business_id = $1
       AND ($2::uuid IS NULL OR branch_id = $2)
       AND COALESCE(local_created_at, synced_at)::date = $3::date
     ORDER BY COALESCE(local_created_at, synced_at) DESC
     LIMIT 10`,
    [businessId, branchId, date]
  );

  const grossSales = Number(summaryRes.rows[0]?.gross_sales || 0);
  const returnsTotal = Number(returnsRes.rows[0]?.returns_total || 0);
  const netSales = grossSales - returnsTotal;
  const report = {
    business_id: businessId,
    branch_id: branchId,
    date,
    generated_at: new Date().toISOString(),
    gross_sales: grossSales,
    returns_total: returnsTotal,
    net_sales: netSales,
    transactions: Number(summaryRes.rows[0]?.transactions || 0),
    returns_count: Number(returnsRes.rows[0]?.returns_count || 0),
    cashiers: cashiersRes.rows || [],
    recent_sales: recentSalesRes.rows || [],
    recent_returns: recentReturnsRes.rows || []
  };

  if (out) {
    const outPath = path.resolve(out);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log("Report written to", outPath);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Daily report failed:", err.message || err);
  process.exit(1);
});
