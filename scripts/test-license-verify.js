const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ override: true });

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local not found. Run npm run rotate-key first.");
  }
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    env[key] = val;
  }
  return env;
}

function getJson(host, port, path, headers) {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line global-require
    const http = require("http");
    const req = http.request(
      {
        host,
        port,
        path,
        method: "GET",
        headers
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk.toString("utf-8")));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const env = loadEnvLocal();
  const port = Number(process.env.PORT || 3001);
  const result = await getJson(
    "127.0.0.1",
    port,
    "/api/cloud/license/current",
    {
      "Authorization": `Bearer ${env.TEST_API_KEY}`,
      "X-Backend-Id": env.TEST_BACKEND_ID,
      "X-Business-Id": env.TEST_BUSINESS_ID,
      "X-Branch-Id": env.TEST_BRANCH_ID
    }
  );

  console.log(`status: ${result.status}`);
  console.log(result.body);
}

main().catch((err) => {
  console.error("License verify test failed:", err.message || err);
  process.exit(1);
});
