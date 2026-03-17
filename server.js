const dotenv = require("dotenv");

dotenv.config({ override: true });

const app = require("./src/app");
const { PORT } = require("./src/config/env");
const { startPaymentEmailImporter } = require("./src/services/paymentEmailImporter");

const port = Number(PORT) || 3001;
const host = "0.0.0.0";

async function start() {
  if (String(process.env.AUTO_RUN_MIGRATIONS || "").toLowerCase() === "true") {
    const { runMigrations } = require("./scripts/run-migrations");
    try {
      await runMigrations({ closePool: false });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[STARTUP] migrations failed:", err && err.message ? err.message : err);
      process.exit(1);
    }
  }
  app.listen(port, host, () => {
    console.log(`AutoMaxPOS Cloud API running on ${host}:${port}`);
    try {
      const watcherEnabled = String(process.env.ENABLE_IMAP_WATCHER || "").toLowerCase() === "true";
      if (watcherEnabled) {
        console.log("[PAYMENT_IMPORT] IMAP watcher enabled");
      } else {
        console.log("[PAYMENT_IMPORT] IMAP watcher skipped");
      }
      startPaymentEmailImporter();
    } catch (err) {
      console.error("[PAYMENT_IMPORT] startup failed:", err?.message || err);
    }
  });
}

start();
