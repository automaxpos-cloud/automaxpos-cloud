const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const { pool } = require("../db/pool");
const { matchPaymentTransaction } = require("./paymentMatchService");
const crypto = require("crypto");

function mask(value) {
  if (!value) return "(missing)";
  if (value.length <= 6) return "***";
  return `${value.slice(0, 4)}***${value.slice(-2)}`;
}

function normalizeAmount(value) {
  if (!value) return null;
  const num = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function parsePaymentEmail(subject, text) {
  const raw = `${subject || ""}\n${text || ""}`.trim();
  const lowered = raw.toLowerCase();
  const isCandidate =
    lowered.includes("airtel") ||
    lowered.includes("get cash") ||
    lowered.includes("agent") ||
    lowered.includes("txn") ||
    lowered.includes("transaction");

  if (!isCandidate) {
    return { isCandidate: false };
  }

  const txnMatch = raw.match(/(?:TXN|TRANSACTION)\s*(?:ID)?\s*[:#-]?\s*([A-Z0-9]{6,})/i)
    || raw.match(/Reference\s*[:#-]?\s*([A-Z0-9]{6,})/i);
  const txnId = txnMatch ? String(txnMatch[1]).trim() : null;

  const amountMatch = raw.match(/(?:ZMW|K)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const amount = amountMatch ? normalizeAmount(amountMatch[1]) : null;

  const phoneMatch = raw.match(/(?:\+?26)?0\\d{9,12}/);
  const payerPhone = phoneMatch ? normalizePhone(phoneMatch[0]) : null;

  return {
    isCandidate: true,
    txnId,
    amount,
    payerPhone
  };
}

async function recordTransaction({
  txnId,
  amount,
  payerPhone,
  subject,
  body,
  sourceEmail,
  senderEmail,
  messageId,
  matchStatus,
  notes
}) {
  await pool.query(
    `INSERT INTO payment_transactions (
       txn_id,
       source_type,
       source_email,
       sender_email,
       source_email_message_id,
       payer_phone,
       amount,
       raw_subject,
       raw_body,
       match_status,
       notes
     ) VALUES ($1,'airtel_sms_email',$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (txn_id) DO NOTHING`,
    [txnId, sourceEmail, senderEmail, messageId, payerPhone || null, amount, subject || "", body || "", matchStatus, notes || null]
  );
}

async function alreadyProcessed(messageId, txnId) {
  if (messageId) {
    const res = await pool.query(
      `SELECT id FROM payment_transactions WHERE source_email_message_id = $1 LIMIT 1`,
      [messageId]
    );
    if (res.rows.length) return true;
  }
  if (txnId) {
    const res = await pool.query(
      `SELECT id FROM payment_transactions WHERE txn_id = $1 LIMIT 1`,
      [txnId]
    );
    if (res.rows.length) return true;
  }
  return false;
}

async function pollMailbox() {
  const enabled = String(process.env.PAYMENT_EMAIL_ENABLED || "").toLowerCase() === "true";
  if (!enabled) return;

  const host = process.env.PAYMENT_EMAIL_IMAP_HOST || "imap.gmail.com";
  const port = Number(process.env.PAYMENT_EMAIL_IMAP_PORT || 993);
  const user = process.env.PAYMENT_EMAIL_USER || "";
  const pass = process.env.PAYMENT_EMAIL_PASSWORD || "";
  const sourceEmail = process.env.PAYMENT_EMAIL_USER || "";

  if (!user || !pass) {
    // eslint-disable-next-line no-console
    console.warn("[PAYMENT_IMPORT] missing email credentials user=%s pass=%s", mask(user), mask(pass));
    return;
  }

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass }
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search({ seen: false });
      if (!uids.length) {
        return;
      }
      for await (const msg of client.fetch(uids, { envelope: true, source: true, uid: true })) {
        const messageId = msg.envelope?.messageId || null;
        const raw = msg.source ? msg.source.toString("utf8") : "";
        const parsed = await simpleParser(raw);
        const subject = parsed.subject || "";
        const body = parsed.text || parsed.html || raw || "";
        const senderEmail = parsed.from?.text || parsed.from?.value?.[0]?.address || "";

        const parsedTxn = parsePaymentEmail(subject, body);
        if (!parsedTxn.isCandidate) {
          await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
          continue;
        }

        let txnId = parsedTxn.txnId;
        if (!txnId) {
          txnId = `INVALID-${(messageId || crypto.randomBytes(4).toString("hex")).replace(/\\s/g, "")}`;
        }

        if (await alreadyProcessed(messageId, parsedTxn.txnId || txnId)) {
          // eslint-disable-next-line no-console
          console.log("[PAYMENT_IMPORT] duplicate message skipped", messageId || txnId);
          await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
          continue;
        }

        const matchStatus = parsedTxn.txnId ? "unmatched" : "invalid";
        await recordTransaction({
          txnId,
          amount: parsedTxn.amount,
          payerPhone: parsedTxn.payerPhone,
          subject,
          body,
          sourceEmail,
          senderEmail,
          messageId,
          matchStatus,
          notes: parsedTxn.txnId ? null : "Missing txn_id"
        });

        if (parsedTxn.txnId) {
          const res = await pool.query(
            `SELECT * FROM payment_transactions WHERE txn_id=$1 LIMIT 1`,
            [txnId]
          );
          const txn = res.rows[0] || null;
          if (txn) {
            const match = await matchPaymentTransaction(txn);
            if (match.ok) {
              // eslint-disable-next-line no-console
              console.log("[PAYMENT_IMPORT] matched request", match.matched_request_id, "txn", txnId);
            } else {
              // eslint-disable-next-line no-console
              console.log("[PAYMENT_IMPORT] no match", match.reason, "txn", txnId);
            }
          }
        }

        await client.messageFlagsAdd(msg.uid, ["\\Seen"]);
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[PAYMENT_IMPORT] mailbox error", err?.message || err);
  } finally {
    await client.logout().catch(() => {});
  }
}

let pollTimer = null;
let inFlight = false;

function startPaymentEmailImporter() {
  const enabled = String(process.env.PAYMENT_EMAIL_ENABLED || "").toLowerCase() === "true";
  if (!enabled) {
    // eslint-disable-next-line no-console
    console.log("[PAYMENT_IMPORT] disabled");
    return;
  }
  const minutes = Number(process.env.PAYMENT_EMAIL_POLL_MINUTES || 3);
  const intervalMs = Math.max(1, minutes) * 60 * 1000;

  const run = async () => {
    if (inFlight) return;
    inFlight = true;
    // eslint-disable-next-line no-console
    console.log("[PAYMENT_IMPORT] mailbox poll start");
    try {
      await pollMailbox();
    } finally {
      inFlight = false;
    }
  };

  run();
  pollTimer = setInterval(run, intervalMs);
}

module.exports = {
  startPaymentEmailImporter,
  parsePaymentEmail
};
