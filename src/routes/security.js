"use strict";

const express = require("express");
const { rateLimit } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/tamper", rateLimit({ windowMs: 60_000, max: 120 }), async (req, res) => {
  try {
    const payload = req.body || {};
    // eslint-disable-next-line no-console
    console.warn("[SECURITY]", {
      event: "TAMPER_DETECTED",
      backend_id: payload.backend_id || null,
      file: payload.file,
      expected_hash: payload.expected_hash,
      actual_hash: payload.actual_hash,
      time: payload.time || new Date().toISOString()
    });
    return res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[SECURITY] tamper error", err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
