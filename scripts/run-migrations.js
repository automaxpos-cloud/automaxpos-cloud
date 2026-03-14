const fs = require("fs");
const path = require("path");
const { pool } = require("../src/db/pool");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

async function ensureMigrationsTable(client) {
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT NOW())"
  );
}

async function runMigrations(options = {}) {
  const closePool = options.closePool !== false;
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const appliedRows = await client.query("SELECT filename FROM schema_migrations");
    const applied = new Set(appliedRows.rows.map((r) => r.filename));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.toLowerCase().endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log("[MIGRATE] skip", file);
        continue;
      }
      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(fullPath, "utf-8");
      console.log("[MIGRATE] applying", file);
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
    }
    console.log("[MIGRATE] done");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("[MIGRATE] failed:", err && err.message ? err.message : err);
    throw err;
  } finally {
    client.release();
    if (closePool) {
      await pool.end();
    }
  }
}

async function main() {
  try {
    await runMigrations({ closePool: true });
  } catch {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { runMigrations };
