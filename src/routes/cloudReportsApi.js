const express = require("express");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const { pool } = require("../db/pool");
const authUser = require("../middleware/authUser");

const router = express.Router();

function scopeFilters(req) {
  const role = req.user?.role || null;
  let businessId = req.query.business_id || null;
  let branchId = req.query.branch_id || null;
  if (role === "BUSINESS_OWNER" || role === "AUDITOR" || role === "BRANCH_MANAGER") {
    businessId = req.user?.business_id || null;
  }
  if (role === "BRANCH_MANAGER") {
    branchId = req.user?.branch_id || null;
  }
  return { businessId, branchId };
}

function parseReportDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function parseRange(req) {
  const start = parseReportDate(req.query.start_date);
  const end = parseReportDate(req.query.end_date);
  if (start && end) return { start, end };
  return null;
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d || "");
  }
}

function addSectionTitle(doc, title) {
  doc.moveDown(0.6);
  doc.fontSize(13).fillColor("#111").text(title, { underline: true });
  doc.moveDown(0.3);
}

function addKeyValue(doc, label, value) {
  doc.fontSize(10).fillColor("#333").text(`${label}: ${value}`);
}

function addListTable(doc, headers, rows) {
  if (!rows.length) {
    doc.fontSize(10).fillColor("#666").text("No data.");
    return;
  }
  doc.fontSize(10).fillColor("#333").text(headers.join(" | "));
  doc.moveDown(0.2);
  rows.forEach((r) => {
    doc.fontSize(9).fillColor("#333").text(r.join(" | "));
  });
}

router.get("/daily-summary.pdf", authUser, async (req, res) => {
  try {
    const { businessId, branchId } = scopeFilters(req);
    if (!businessId) {
      return res.status(400).json({ ok: false, message: "business_id required", code: "BAD_REQUEST" });
    }

    const reportDate = parseReportDate(req.query.date) || null;
    const dateExpr = reportDate ? "$3::date" : "CURRENT_DATE";

    const businessRow = await pool.query("SELECT name FROM businesses WHERE id = $1", [businessId]);
    const branchRow = branchId
      ? await pool.query("SELECT name FROM branches WHERE id = $1", [branchId])
      : null;

    const salesToday = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS gross_sales, COUNT(*) AS transactions
       FROM synced_sales
       WHERE COALESCE(local_created_at, synced_at)::date = ${dateExpr}
         AND business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      reportDate ? [businessId, branchId, reportDate] : [businessId, branchId]
    );

    const returnsToday = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS returns_total, COUNT(*) AS returns_count
       FROM synced_returns
       WHERE COALESCE(local_created_at, synced_at)::date = ${dateExpr}
         AND business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      reportDate ? [businessId, branchId, reportDate] : [businessId, branchId]
    );

    const salesMonth = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS gross_sales
       FROM synced_sales
       WHERE date_trunc('month', COALESCE(local_created_at, synced_at)) = date_trunc('month', ${dateExpr})
         AND business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      reportDate ? [businessId, branchId, reportDate] : [businessId, branchId]
    );
    const returnsMonth = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS returns_total
       FROM synced_returns
       WHERE date_trunc('month', COALESCE(local_created_at, synced_at)) = date_trunc('month', ${dateExpr})
         AND business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      reportDate ? [businessId, branchId, reportDate] : [businessId, branchId]
    );

    const cashiers = await pool.query(
      `SELECT COALESCE(cashier_name,'Unknown') AS cashier_name,
              COUNT(*) AS transactions,
              COALESCE(SUM(total),0) AS total
       FROM synced_sales
       WHERE COALESCE(local_created_at, synced_at)::date = ${dateExpr}
         AND business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)
       GROUP BY cashier_name
       ORDER BY transactions DESC
       LIMIT 10`,
      reportDate ? [businessId, branchId, reportDate] : [businessId, branchId]
    );

    const recentSales = await pool.query(
      `SELECT receipt_no,
              COALESCE(local_created_at, synced_at) AS created_at,
              total,
              cashier_name
       FROM synced_sales
       WHERE COALESCE(local_created_at, synced_at)::date = ${dateExpr}
         AND business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)
       ORDER BY COALESCE(local_created_at, synced_at) DESC
       LIMIT 10`,
      reportDate ? [businessId, branchId, reportDate] : [businessId, branchId]
    );

    const backends = await pool.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN last_seen_at >= NOW() - INTERVAL '10 minutes' THEN 1 ELSE 0 END) AS online,
              MAX(last_seen_at) AS last_seen
       FROM backend_devices
       WHERE business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId]
    );

    const lowStockSnapshot = await pool.query(
      `SELECT payload_json
       FROM inventory_snapshots
       WHERE business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)
       ORDER BY snapshot_time DESC
       LIMIT 1`,
      [businessId, branchId]
    );

    let lowStockRows = [];
    if (lowStockSnapshot.rows.length && lowStockSnapshot.rows[0].payload_json) {
      try {
        const payload = JSON.parse(lowStockSnapshot.rows[0].payload_json);
        const products = Array.isArray(payload?.snapshot?.products)
          ? payload.snapshot.products
          : [];
        lowStockRows = products
          .map((row) => ({
            product_name: row.product_name || row.product || null,
            stock: Number(row.stock || 0),
            reorder_level: Number(row.reorder_level || 0)
          }))
          .filter((row) => Number(row.stock) <= Number(row.reorder_level || 0))
          .sort((a, b) => Number(a.stock) - Number(b.stock))
          .slice(0, 15);
      } catch {
        lowStockRows = [];
      }
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="automax-daily-summary-${reportDate || "today"}.pdf"`
    );

    const doc = new PDFDocument({ margin: 36, size: "A4" });
    doc.pipe(res);

    doc.fontSize(18).fillColor("#0f1728").text("AutoMax", { align: "left" });
    doc.fontSize(14).text("Daily Summary Report", { align: "left" });
    doc.moveDown(0.5);

    const bizName = businessRow.rows[0]?.name || businessId;
    const branchName = branchRow && branchRow.rows[0] ? branchRow.rows[0].name : "All";
    addKeyValue(doc, "Business", bizName);
    addKeyValue(doc, "Branch", branchName);
    addKeyValue(doc, "Report Date", reportDate || new Date().toISOString().slice(0, 10));
    addKeyValue(doc, "Generated At", formatDate(new Date()));

    addSectionTitle(doc, "Sales Summary");
    const grossToday = Number(salesToday.rows[0]?.gross_sales || 0);
    const returnsTodayTotal = Number(returnsToday.rows[0]?.returns_total || 0);
    const netToday = grossToday - returnsTodayTotal;
    const grossMonth = Number(salesMonth.rows[0]?.gross_sales || 0);
    const returnsMonthTotal = Number(returnsMonth.rows[0]?.returns_total || 0);
    const netMonth = grossMonth - returnsMonthTotal;

    addKeyValue(doc, "Gross Sales Today", grossToday.toFixed(2));
    addKeyValue(doc, "Returns Today", returnsTodayTotal.toFixed(2));
    addKeyValue(doc, "Net Sales Today", netToday.toFixed(2));
    addKeyValue(doc, "Transactions", Number(salesToday.rows[0]?.transactions || 0));
    addKeyValue(doc, "Gross Sales This Month", grossMonth.toFixed(2));
    addKeyValue(doc, "Returns This Month", returnsMonthTotal.toFixed(2));
    addKeyValue(doc, "Net Sales This Month", netMonth.toFixed(2));

    addSectionTitle(doc, "Cashier Activity");
    addListTable(
      doc,
      ["Cashier", "Transactions", "Total"],
      (cashiers.rows || []).map((r) => [
        r.cashier_name || "Unknown",
        String(r.transactions || 0),
        Number(r.total || 0).toFixed(2)
      ])
    );

    addSectionTitle(doc, "Low Stock Alerts");
    addListTable(
      doc,
      ["Product", "Stock", "Reorder"],
      (lowStockRows || []).map((r) => [
        r.product_name || "-",
        String(r.stock || 0),
        String(r.reorder_level || 0)
      ])
    );

    addSectionTitle(doc, "Recent Synced Sales");
    addListTable(
      doc,
      ["Receipt", "Total", "Cashier", "Created"],
      (recentSales.rows || []).map((r) => [
        r.receipt_no || "-",
        Number(r.total || 0).toFixed(2),
        r.cashier_name || "-",
        formatDate(r.created_at)
      ])
    );

    addSectionTitle(doc, "Backend / Sync Summary");
    addKeyValue(doc, "Active Backends (online)", Number(backends.rows[0]?.online || 0));
    addKeyValue(doc, "Total Backends", Number(backends.rows[0]?.total || 0));
    addKeyValue(doc, "Last Heartbeat", backends.rows[0]?.last_seen ? formatDate(backends.rows[0].last_seen) : "No heartbeat yet");

    doc.end();
  } catch (err) {
    console.error("DAILY SUMMARY PDF ERROR:", err);
    return res.status(500).json({ ok: false, message: "SERVER_ERROR", code: "SERVER_ERROR" });
  }
});

router.get("/sales-report.xlsx", authUser, async (req, res) => {
  try {
    const { businessId, branchId } = scopeFilters(req);
    if (!businessId) {
      return res.status(400).json({ ok: false, message: "business_id required", code: "BAD_REQUEST" });
    }

    const range = parseRange(req);
    const start = range?.start || new Date().toISOString().slice(0, 10);
    const end = range?.end || new Date().toISOString().slice(0, 10);

    const businessRow = await pool.query("SELECT name FROM businesses WHERE id = $1", [businessId]);
    const branchRow = branchId
      ? await pool.query("SELECT name FROM branches WHERE id = $1", [branchId])
      : null;

    const salesSummary = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS gross_sales, COUNT(*) AS transactions
       FROM synced_sales
       WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
         AND business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId, start, end]
    );

    const returnsSummary = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS returns_total, COUNT(*) AS returns_count
       FROM synced_returns
       WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
         AND business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)`,
      [businessId, branchId, start, end]
    );

    const cashierRows = await pool.query(
      `SELECT COALESCE(cashier_name,'Unknown') AS cashier_name,
              COUNT(*) AS transactions,
              COALESCE(SUM(total),0) AS total
       FROM synced_sales
       WHERE COALESCE(local_created_at, synced_at)::date BETWEEN $3::date AND $4::date
         AND business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)
       GROUP BY cashier_name
       ORDER BY transactions DESC`,
      [businessId, branchId, start, end]
    );

    const salesRows = await pool.query(
      `SELECT s.receipt_no,
              br.name AS branch_name,
              s.cashier_name,
              s.total,
              COALESCE(s.local_created_at, s.synced_at) AS created_at
       FROM synced_sales s
       LEFT JOIN branches br ON br.id = s.branch_id
       WHERE COALESCE(s.local_created_at, s.synced_at)::date BETWEEN $3::date AND $4::date
         AND s.business_id = $1
         AND ($2::uuid IS NULL OR s.branch_id = $2)
       ORDER BY COALESCE(s.local_created_at, s.synced_at) DESC
       LIMIT 500`,
      [businessId, branchId, start, end]
    );

    const returnsRows = await pool.query(
      `SELECT r.return_no,
              br.name AS branch_name,
              r.cashier_name,
              r.total,
              COALESCE(r.local_created_at, r.synced_at) AS created_at
       FROM synced_returns r
       LEFT JOIN branches br ON br.id = r.branch_id
       WHERE COALESCE(r.local_created_at, r.synced_at)::date BETWEEN $3::date AND $4::date
         AND r.business_id = $1
         AND ($2::uuid IS NULL OR r.branch_id = $2)
       ORDER BY COALESCE(r.local_created_at, r.synced_at) DESC
       LIMIT 500`,
      [businessId, branchId, start, end]
    );

    const lowStockSnapshot = await pool.query(
      `SELECT payload_json
       FROM inventory_snapshots
       WHERE business_id = $1
         AND ($2::uuid IS NULL OR branch_id = $2)
       ORDER BY snapshot_time DESC
       LIMIT 1`,
      [businessId, branchId]
    );

    let lowStockRows = [];
    if (lowStockSnapshot.rows.length && lowStockSnapshot.rows[0].payload_json) {
      try {
        const payload = JSON.parse(lowStockSnapshot.rows[0].payload_json);
        const products = Array.isArray(payload?.snapshot?.products)
          ? payload.snapshot.products
          : [];
        lowStockRows = products
          .map((row) => ({
            product_name: row.product_name || row.product || null,
            stock: Number(row.stock || 0),
            reorder_level: Number(row.reorder_level || 0)
          }))
          .filter((row) => Number(row.stock) <= Number(row.reorder_level || 0))
          .sort((a, b) => Number(a.stock) - Number(b.stock));
      } catch {
        lowStockRows = [];
      }
    }

    const gross = Number(salesSummary.rows[0].gross_sales || 0);
    const returnsTotal = Number(returnsSummary.rows[0].returns_total || 0);
    const net = gross - returnsTotal;

    const workbook = new ExcelJS.Workbook();
    const summary = workbook.addWorksheet("Summary");
    summary.columns = [
      { header: "Field", key: "field", width: 28 },
      { header: "Value", key: "value", width: 40 }
    ];
    summary.addRows([
      { field: "Business", value: businessRow.rows[0]?.name || businessId },
      { field: "Branch", value: branchRow && branchRow.rows[0] ? branchRow.rows[0].name : "All" },
      { field: "Date Range", value: `${start} to ${end}` },
      { field: "Gross Sales", value: gross },
      { field: "Returns", value: returnsTotal },
      { field: "Net Sales", value: net },
      { field: "Transactions", value: Number(salesSummary.rows[0].transactions || 0) },
      { field: "Return Count", value: Number(returnsSummary.rows[0].returns_count || 0) }
    ]);

    const cashiers = workbook.addWorksheet("Cashier Activity");
    cashiers.columns = [
      { header: "Cashier", key: "cashier", width: 26 },
      { header: "Sales Count", key: "count", width: 14 },
      { header: "Sales Total", key: "total", width: 16 }
    ];
    if (!cashierRows.rows.length) {
      cashiers.addRow({ cashier: "No sales for selected period" });
    } else {
      cashierRows.rows.forEach((r) => {
        cashiers.addRow({
          cashier: r.cashier_name || "Unknown",
          count: Number(r.transactions || 0),
          total: Number(r.total || 0)
        });
      });
    }

    const salesSheet = workbook.addWorksheet("Sales");
    salesSheet.columns = [
      { header: "Receipt", key: "receipt", width: 18 },
      { header: "Branch", key: "branch", width: 20 },
      { header: "Cashier", key: "cashier", width: 20 },
      { header: "Total", key: "total", width: 14 },
      { header: "Date", key: "created", width: 22 }
    ];
    if (!salesRows.rows.length) {
      salesSheet.addRow({ receipt: "No sales for selected period" });
    } else {
      salesRows.rows.forEach((r) => {
        salesSheet.addRow({
          receipt: r.receipt_no || "-",
          branch: r.branch_name || "-",
          cashier: r.cashier_name || "-",
          total: Number(r.total || 0),
          created: r.created_at ? formatDate(r.created_at) : "-"
        });
      });
    }

    const returnsSheet = workbook.addWorksheet("Returns");
    returnsSheet.columns = [
      { header: "Return Receipt", key: "receipt", width: 18 },
      { header: "Branch", key: "branch", width: 20 },
      { header: "Cashier", key: "cashier", width: 20 },
      { header: "Refund Total", key: "total", width: 14 },
      { header: "Date", key: "created", width: 22 }
    ];
    if (!returnsRows.rows.length) {
      returnsSheet.addRow({ receipt: "No returns for selected period" });
    } else {
      returnsRows.rows.forEach((r) => {
        returnsSheet.addRow({
          receipt: r.return_no || "-",
          branch: r.branch_name || "-",
          cashier: r.cashier_name || "-",
          total: Number(r.total || 0),
          created: r.created_at ? formatDate(r.created_at) : "-"
        });
      });
    }

    const lowStock = workbook.addWorksheet("Low Stock");
    lowStock.columns = [
      { header: "Product", key: "product", width: 26 },
      { header: "Stock", key: "stock", width: 10 },
      { header: "Reorder Level", key: "reorder", width: 14 }
    ];
    if (!lowStockRows.length) {
      lowStock.addRow({ product: "No low stock items" });
    } else {
      lowStockRows.forEach((r) => {
        lowStock.addRow({
          product: r.product_name || "-",
          stock: Number(r.stock || 0),
          reorder: Number(r.reorder_level || 0)
        });
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="automax-sales-report-${start}-to-${end}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("SALES REPORT EXCEL ERROR:", err);
    return res.status(500).json({ ok: false, message: "SERVER_ERROR", code: "SERVER_ERROR" });
  }
});

module.exports = router;
