const express = require("express");
const { pool } = require("../db/pool");
const { parsePaymentEmail } = require("../services/paymentEmailImporter");
const { matchPaymentTransaction } = require("../services/paymentMatchService");

const router = express.Router();

function normalizeAmount(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

router.post("/airtel-sms", async (req, res) => {
  try {
    const expectedKey = String(process.env.PAYMENT_INGEST_API_KEY || "").trim();
    const apiKey = String(req.body?.api_key || req.headers["x-api-key"] || "").trim();
    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const source = String(req.body?.source || "").trim();
    const sender = String(req.body?.sender || "").trim();
    const message = String(req.body?.message || "").trim();
    const receivedAt = String(req.body?.received_at || "").trim();
    const deviceId = String(req.body?.device_id || "").trim();

    if (!message) {
      return res.status(400).json({ ok: false, error: "MESSAGE_REQUIRED" });
    }

    const parsed = parsePaymentEmail(source || "Airtel SMS", message);
    if (!parsed.isCandidate) {
      return res.json({ ok: true, result: "ignored" });
    }

    const txnId = parsed.txnId || null;
    const amount = normalizeAmount(parsed.amount);
    const payerPhone = parsed.payerPhone || null;

    const rawPayload = {
      source,
      sender,
      message,
      received_at: receivedAt,
      device_id: deviceId
    };

    if (txnId) {
      const existing = await pool.query(
        `SELECT id FROM payment_transactions WHERE txn_id=$1 LIMIT 1`,
        [txnId]
      );
      if (existing.rows.length) {
        return res.json({ ok: true, result: "duplicate", txn_id: txnId });
      }
    }

    const recordTxnId = txnId || `INVALID-${Date.now()}`;
    await pool.query(
      `INSERT INTO payment_transactions (
         txn_id,
         source_type,
         source_email,
         sender_email,
         payer_phone,
         amount,
         raw_subject,
         raw_body,
         match_status,
         notes
       ) VALUES ($1,'airtel_sms_direct',$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (txn_id) DO NOTHING`,
      [
        recordTxnId,
        source || null,
        sender || null,
        payerPhone,
        amount,
        "SMS",
        message,
        txnId ? "unmatched" : "invalid",
        JSON.stringify(rawPayload)
      ]
    );

    if (!txnId) {
      return res.json({ ok: true, result: "invalid" });
    }

    const txnRow = await pool.query(
      `SELECT * FROM payment_transactions WHERE txn_id=$1 LIMIT 1`,
      [recordTxnId]
    );
    const txn = txnRow.rows[0] || null;
    if (!txn) {
      return res.json({ ok: true, result: "imported" });
    }

    const match = await matchPaymentTransaction(txn);
    if (match.ok) {
      return res.json({ ok: true, result: "matched", matched_request_id: match.matched_request_id });
    }
    return res.json({ ok: true, result: "unmatched", reason: match.reason });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("PAYMENT SMS INGEST ERROR:", err?.message || err);
    return res.status(500).json({ ok: false, error: "SERVER_ERROR" });
  }
});

module.exports = router;
