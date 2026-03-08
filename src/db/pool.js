const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config({ override: true });
const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD
} = require("../config/env");

const hasExplicitDb =
  Boolean(DB_NAME) && Boolean(DB_USER);

const connectionConfig = hasExplicitDb
  ? {
      host: DB_HOST,
      port: Number(DB_PORT || 5432),
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD
    }
  : (DATABASE_URL ? { connectionString: DATABASE_URL } : {});

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
