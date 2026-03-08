const { query } = require("../db/pool");

async function health(req, res) {
  let dbOk = false;
  let dbName = null;
  try {
    await query("SELECT 1");
    const dbRes = await query("SELECT current_database() AS db");
    dbName = dbRes.rows?.[0]?.db || null;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  res.json({
    ok: true,
    service: "AutoMaxPOS Cloud",
    status: "OK",
    time: new Date().toISOString(),
    db_ok: dbOk,
    db_name: dbName
  });
}

module.exports = { health };
