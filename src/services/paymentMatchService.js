const { pool } = require("../db/pool");

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function endsWithDigits(full, suffix) {
  if (!full || !suffix) return false;
  return full.endsWith(suffix) || full.slice(-9) === suffix.slice(-9);
}

async function applyMatch({ txnId, requestId, amount, payerPhone }) {
  await pool.query(
    `UPDATE payment_transactions
     SET matched_request_id=$2,
         match_status='matched',
         processed_at=NOW()
     WHERE txn_id=$1`,
    [txnId, requestId]
  );

  await pool.query(
    `UPDATE license_requests
     SET payment_method='airtel_get_cash',
         payment_status='paid',
         payment_reference=$2,
         payer_phone=$3,
         paid_amount=$4,
         payment_source='macrodroid_email',
         payment_confirmed_at=NOW(),
         payment_notes=COALESCE(payment_notes, 'Imported automatically from MacroDroid-forwarded Airtel SMS email')
     WHERE id=$1`,
    [requestId, txnId, payerPhone || null, amount != null ? Number(amount) : null]
  );
}

async function markUnmatched(txnId, notes) {
  await pool.query(
    `UPDATE payment_transactions
     SET match_status='unmatched',
         processed_at=NOW(),
         notes=$2
     WHERE txn_id=$1`,
    [txnId, notes || null]
  );
}

async function matchPaymentTransaction(txn) {
  if (!txn?.txn_id) return { ok: false, reason: "MISSING_TXN_ID" };
  const amount = txn.amount != null ? Number(txn.amount) : null;
  const payerPhone = normalizePhone(txn.payer_phone);

  if (!Number.isFinite(amount)) {
    await markUnmatched(txn.txn_id, "Missing amount");
    return { ok: false, reason: "MISSING_AMOUNT" };
  }

  const baseRows = await pool.query(
    `SELECT id, request_id, phone, payer_phone, payment_status, amount_expected, created_at
     FROM license_requests
     WHERE COALESCE(payment_status,'pending_payment') IN ('pending_payment','payment_under_review')
       AND amount_expected = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [amount]
  );
  const rows = baseRows.rows || [];

  let candidates = rows;
  if (payerPhone) {
    candidates = rows.filter((r) => endsWithDigits(normalizePhone(r.payer_phone), payerPhone));
    if (candidates.length === 1) {
      await applyMatch({ txnId: txn.txn_id, requestId: candidates[0].id, amount, payerPhone });
      return { ok: true, matched_request_id: candidates[0].id };
    }
  }

  if (rows.length === 1) {
    await applyMatch({ txnId: txn.txn_id, requestId: rows[0].id, amount, payerPhone });
    return { ok: true, matched_request_id: rows[0].id };
  }

  if (!payerPhone && rows.length > 0) {
    const byContact = rows.filter((r) => endsWithDigits(normalizePhone(r.phone), normalizePhone(txn.payer_phone)));
    if (byContact.length === 1) {
      await applyMatch({ txnId: txn.txn_id, requestId: byContact[0].id, amount, payerPhone });
      return { ok: true, matched_request_id: byContact[0].id };
    }
  }

  if (rows.length > 1) {
    await markUnmatched(txn.txn_id, "Ambiguous amount match");
    return { ok: false, reason: "AMBIGUOUS_MATCH" };
  }

  await markUnmatched(txn.txn_id, "No matching request");
  return { ok: false, reason: "NO_MATCH" };
}

module.exports = {
  matchPaymentTransaction
};
