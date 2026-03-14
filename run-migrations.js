const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("render.com")
    ? { rejectUnauthorized: false }
    : false,
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log("[MIGRATE] Starting migrations...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT now()
      )
    `);

    const migrationsDir = path.join(__dirname, "migrations");

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const check = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename=$1",
        [file]
      );

      if (check.rowCount > 0) {
        console.log(`[MIGRATE] skip ${file}`);
        continue;
      }

      console.log(`[MIGRATE] applying ${file}`);

      const sql = fs.readFileSync(
        path.join(migrationsDir, file),
        "utf8"
      );

      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations(filename) VALUES($1)",
        [file]
      );
      await client.query("COMMIT");

      console.log(`[MIGRATE] done ${file}`);
    }

    console.log("[MIGRATE] All migrations completed.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[MIGRATE] ERROR:", err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

if (require.main === module) {
  runMigrations().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runMigrations };