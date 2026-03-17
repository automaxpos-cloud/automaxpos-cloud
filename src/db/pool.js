const dotenv = require("dotenv");
const { Pool } = require("pg");

// Avoid overriding production env vars (Render), but allow local .env in dev
dotenv.config({ override: process.env.NODE_ENV !== "production" });
const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD
} = require("../config/env");

const hasDbUrl = Boolean(DATABASE_URL);
const hasExplicitDb =
  Boolean(DB_NAME) && Boolean(DB_USER) && Boolean(DB_PASSWORD);

const connectionConfig = hasDbUrl
  ? { connectionString: DATABASE_URL }
  : (hasExplicitDb
    ? {
        host: DB_HOST,
        port: Number(DB_PORT || 5432),
        database: DB_NAME,
        user: DB_USER,
        password: DB_PASSWORD
      }
    : {});

const pool = new Pool({
  ...connectionConfig,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query
};
