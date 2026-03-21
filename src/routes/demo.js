"use strict";

const express = require("express");
const { rateLimit } = require("../middleware/rateLimiter");
const demoService = require("../services/demoService");

const router = express.Router();

router.get("/status", rateLimit({ windowMs: 60_000, max: 120 }), async (req, res) => {
  const fingerprint_hash = String(req.query.fingerprint_hash || "").trim();
  if (!fingerprint_hash) {
    return res.status(400).json({ ok: false, error: "MISSING_FINGERPRINT" });
  }
  try {
    const row = await demoService.getOrCreateDemo(
      fingerprint_hash,
      String(req.query.hostname || ""),
      String(req.query.platform || "")
    );
    return res.json({
      ok: true,
      fingerprint_hash: row.fingerprint_hash,
      first_activated_at: row.first_activated_at,
      expires_at: row.expires_at,
      sales_count: row.sales_count,
      max_sales: row.max_sales,
      status: row.status
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[DEMO] status error", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "demo_status_failed" });
  }
});

router.post("/sale", rateLimit({ windowMs: 60_000, max: 300 }), async (req, res) => {
  const fingerprint_hash = String(req.body?.fingerprint_hash || "").trim();
  const increment = Number(req.body?.increment || 1);
  if (!fingerprint_hash) {
    return res.status(400).json({ ok: false, error: "MISSING_FINGERPRINT" });
  }
  try {
    const row = await demoService.recordSale(fingerprint_hash, increment);
    if (!row) {
      return res.status(404).json({ ok: false, error: "DEMO_NOT_FOUND" });
    }
    return res.json({
      ok: true,
      fingerprint_hash: row.fingerprint_hash,
      first_activated_at: row.first_activated_at,
      expires_at: row.expires_at,
      sales_count: row.sales_count,
      max_sales: row.max_sales,
      status: row.status
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[DEMO] sale error", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR", message: err?.message || "demo_sale_failed" });
  }
});

module.exports = router;
