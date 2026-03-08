const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const auth = require("../middleware/authMiddleware");
const backendController = require("../controllers/backendController");
const licenseController = require("../controllers/licenseController");
const salesController = require("../controllers/salesSyncController");
const returnsController = require("../controllers/returnsSyncController");
const productController = require("../controllers/productSyncController");
const stockController = require("../controllers/stockSyncController");
const registrationController = require("../controllers/registrationController");
const adminJwt = require("../middleware/adminJwt");
const inventorySnapshotController = require("../controllers/inventorySnapshotController");
const registerActivityController = require("../controllers/registerActivityController");

const router = express.Router();

function isLocalRequest(req) {
  const ip = req.ip || req.connection?.remoteAddress || "";
  return ip.includes("127.0.0.1") || ip === "::1" || ip.includes("::ffff:127.0.0.1");
}

function loadSetupLink() {
  const appdata = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const linkFile = path.join(appdata, "AutoMaxPOS", "cloud_setup.json");
  try {
    if (fs.existsSync(linkFile)) {
      return JSON.parse(fs.readFileSync(linkFile, "utf-8"));
    }
  } catch {}
  return null;
}

function adminOrLocalSetup(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    return adminJwt(req, res, next);
  }

  if (!isLocalRequest(req)) {
    return res.status(401).json({ ok: false, message: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const link = loadSetupLink();
  const { business_id, branch_id } = req.body || {};
  if (!link || !link.business_id || !link.branch_id) {
    return res.status(403).json({ ok: false, message: "Setup not completed", code: "SETUP_REQUIRED" });
  }
  if (String(link.business_id) !== String(business_id) || String(link.branch_id) !== String(branch_id)) {
    return res.status(403).json({ ok: false, message: "Setup mismatch", code: "SETUP_MISMATCH" });
  }

  return next();
}

// Registration (admin auth or local setup)
router.post("/businesses", adminJwt, registrationController.createBusiness);
router.post("/branches", adminJwt, registrationController.createBranch);
router.post("/backends/register", adminOrLocalSetup, registrationController.registerBackend);

router.post("/backend/heartbeat", auth, backendController.heartbeat);
router.post("/license/verify", auth, licenseController.verify);
router.post("/sales/sync", auth, salesController.syncSales);
router.post("/returns/sync", auth, returnsController.syncReturns);
router.post("/inventory/snapshot", auth, inventorySnapshotController.syncSnapshot);
router.post("/registers/activity", auth, registerActivityController.upsertRegisterActivity);
router.post("/products/sync", auth, productController.syncProducts);
router.get("/products/changes", auth, productController.getProductChanges);
router.post("/stock-movements/sync", auth, stockController.syncStockMovements);

module.exports = router;
