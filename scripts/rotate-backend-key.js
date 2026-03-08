const crypto = require("crypto");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const { pool } = require("../src/db/pool");

function maskKey(key) {
  if (!key) return "";
  return key.slice(-6);
}

async function main() {
  const client = await pool.connect();
  const apiKey = `amx_${crypto.randomBytes(24).toString("hex")}`;
  const apiKeyHash = await bcrypt.hash(apiKey, 10);

  try {
    await client.query("BEGIN");
    const res = await client.query(
      "SELECT id, business_id, branch_id FROM backend_devices WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1"
    );

    if (!res.rows.length) {
      throw new Error("No active backend_devices found to rotate");
    }

    const row = res.rows[0];
    await client.query(
      "UPDATE backend_devices SET api_key_hash = $1 WHERE id = $2",
      [apiKeyHash, row.id]
    );

    await client.query("COMMIT");

    const envPath = path.join(__dirname, "..", ".env.local");
    const envLines = [
      `TEST_API_KEY=${apiKey}`,
      `TEST_BACKEND_ID=${row.id}`,
      `TEST_BUSINESS_ID=${row.business_id}`,
      `TEST_BRANCH_ID=${row.branch_id}`
    ];
    fs.writeFileSync(envPath, envLines.join("\n") + "\n", { encoding: "utf-8" });

    console.log("Rotated backend device API key.");
    console.log(`backend_id: ${row.id}`);
    console.log(`business_id: ${row.business_id}`);
    console.log(`branch_id: ${row.branch_id}`);
    console.log(`api_key_last6: ${maskKey(apiKey)}`);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error("Rotate failed:", err.message || err);
    process.exit(1);
  })
  .finally(() => pool.end());
