const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT || "3001";
const DATABASE_URL = process.env.DATABASE_URL || "";
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || "5432";
const DB_NAME = process.env.DB_NAME || "";
const DB_USER = process.env.DB_USER || "";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const JWT_SECRET = process.env.JWT_SECRET || "";
const CLOUD_API_KEY = process.env.CLOUD_API_KEY || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const OWNER_EMAIL = process.env.OWNER_EMAIL || "";
const OWNER_PASSWORD_HASH = process.env.OWNER_PASSWORD_HASH || "";
const APP_BASE_URL = process.env.APP_BASE_URL || "";

module.exports = {
  NODE_ENV,
  PORT,
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  JWT_SECRET,
  CLOUD_API_KEY,
  SESSION_SECRET,
  OWNER_EMAIL,
  OWNER_PASSWORD_HASH,
  APP_BASE_URL
};
