const express = require("express");
const { pool } = require("../db/pool");
const { parsePaymentEmail } = require("../services/paymentEmailImporter");
const { matchPaymentTransaction } = require("../services/paymentMatchService");

const router = express.Router();

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeAmount(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseAirtelSms(message) {
  const raw = String(message || "").trim();
  if (!raw) return { ok: false, error: "EMPTY_MESSAGE" };
  const lowered = raw.toLowerCase();
  const likely = lowered.includes("airtel") || lowered.includes("tid") || lowered.includes("txn") || lowered.includes("received");
  if (!likely) return { ok: false, error: "NOT_AIRTEL_SMS" };

  const txnMatch =
    raw.match(/(?:TID|TXN|TRANSACTION\s*ID|REFERENCE|REF)\s*[:#-]?\s*([A-Z0-9.\-]+)/i);
  const txnId = txnMatch ? String(txnMatch[1]).trim() : null;

  const amountMatch = raw.match(/(?:ZMW|K)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const amount = amountMatch ? normalizeAmount(amountMatch[1]) : null;

  const fromMatch = raw.match(/from\s+([0-9+]{7,15})/i);
  const phoneMatch = fromMatch || raw.match(/(?:\+?26)?0?\d{9,12}/);
  const payerPhone = phoneMatch ? normalizePhone(phoneMatch[1] || phoneMatch[0]) : null;

  return {
    ok: true,
    txnId,
    amount,
    payerPhone,
    raw
  };
}

router.get("/airtel-sms/health", (req, res) => {
  return res.json({ ok: true, route: "/api/payments/airtel-sms", version: "v1" });
});

router.post("/airtel-sms", async (req, res) => {
  try {
    const expectedKey = String(process.env.PAYMENT_INGEST_API_KEY || "").trim();
    const apiKey = String(req.body?.api_key || req.headers["x-api-key"] || "").trim();
    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED" });
    }

    const source = String(req.body?.source || "").trim();
    const provider = String(req.body?.provider || "").trim().toLowerCase();
    const sender = String(req.body?.sender || "").trim();
    const message = String(req.body?.message || "").trim();
    const receivedAt = String(req.body?.received_at || "").trim();
    const deviceId = String(req.body?.device_id || "").trim();

    // eslint-disable-next-line no-console
    console.log("[PAYMENT_SMS] request_received provider=%s source=%s", provider || "-", source || "-");
    // eslint-disable-next-line no-console
    console.log("[PAYMENT_SMS] body_keys=%s", Object.keys(req.body || {}).join(","));

    if (!message) {
      return res.status(400).json({ ok: false, error: "MESSAGE_REQUIRED" });
    }

    if (provider && provider !== "airtel") {
      return res.status(400).json({ ok: false, error: "UNSUPPORTED_PROVIDER" });
    }

    const parsed = parseAirtelSms(message);
    if (!parsed.ok) {
      // eslint-disable-next-line no-console
      console.log("[PAYMENT_SMS] parse_failed error=%s", parsed.error);
      return res.status(400).json({ ok: false, error: "PARSE_FAILED", message: parsed.error });
    }

    const txnId = parsed.txnId || null;
    const amount = normalizeAmount(parsed.amount);
    const payerPhone = parsed.payerPhone || null;

    // eslint-disable-next-line no-console
    console.log("[PAYMENT_SMS] parse_result txn_id=%s amount=%s phone=%s", txnId || "-", amount ?? "-", payerPhone || "-");

    const rawPayload = {
      source,
      provider,
      sender,
      message,
      received_at: receivedAt,
      device_id: deviceId
    };

    if (!txnId) {
      return res.status(400).json({ ok: false, error: "MISSING_TXN_ID" });
    }

    const existing = await pool.query(
      `SELECT id FROM payment_transactions WHERE txn_id=$1 LIMIT 1`,
      [txnId]
    );
    // eslint-disable-next-line no-console
    console.log("[PAYMENT_SMS] duplicate_check existing=%s", existing.rows.length ? "yes" : "no");
    if (existing.rows.length) {
      return res.json({ ok: true, result: "duplicate", txn_id: txnId });
    }

    const recordTxnId = txnId;
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
        "unmatched",
        JSON.stringify(rawPayload)
      ]
    );

    // eslint-disable-next-line no-console
    console.log("[PAYMENT_SMS] insert_success txn_id=%s", recordTxnId);

    const txnRow = await pool.query(
      `SELECT * FROM payment_transactions WHERE txn_id=$1 LIMIT 1`,
      [recordTxnId]
    );
    const txn = txnRow.rows[0] || null;
    if (!txn) {
      return res.json({ ok: true, result: "imported", txn_id: recordTxnId });
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
