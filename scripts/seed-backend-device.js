const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { pool } = require("../src/db/pool");

function id() {
  return crypto.randomUUID();
}

async function main() {
  const client = await pool.connect();
  const apiKey = `amx_${crypto.randomBytes(24).toString("hex")}`;
  const apiKeyHash = await bcrypt.hash(apiKey, 10);

  const businessId = id();
  const branchId = id();
  const backendId = id();

  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO businesses (id, name) VALUES ($1, $2)",
      [businessId, "AutoMax Demo Business"]
    );
    await client.query(
      "INSERT INTO branches (id, business_id, name) VALUES ($1, $2, $3)",
      [branchId, businessId, "Main Branch"]
    );
    await client.query(
      `INSERT INTO backend_devices (id, business_id, branch_id, api_key_hash, is_active)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [backendId, businessId, branchId, apiKeyHash]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  console.log("Seeded backend device:");
  console.log({
    business_id: businessId,
    branch_id: branchId,
    backend_id: backendId,
    api_key: apiKey
  });
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
