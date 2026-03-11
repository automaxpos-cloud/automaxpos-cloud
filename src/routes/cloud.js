const express = require("express");
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

function maskSecret(value) {
  if (!value) return "(missing)";
  if (value.length <= 6) return "***";
  return `${value.slice(0, 4)}***${value.slice(-2)}`;
}

function adminOrLocalSetup(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    return adminJwt(req, res, next);
  }

  const primarySecret = String(req.headers["x-backend-secret"] || "").trim();
  const legacySecret = String(req.headers["x-onboarding-secret"] || req.headers["x-automax-secret"] || "").trim();
  const expectedSecret = String(
    process.env.BACKEND_REGISTRATION_SECRET || process.env.CLOUD_ONBOARDING_SECRET || ""
  ).trim();

  if (!expectedSecret) {
    // eslint-disable-next-line no-console
    console.log("[HOSTED_REGISTER] missing BACKEND_REGISTRATION_SECRET env");
    return res.status(500).json({
      ok: false,
      message: "Server missing BACKEND_REGISTRATION_SECRET",
      code: "SERVER_MISSING_CONFIG"
    });
  }

  const provided = primarySecret || legacySecret;
  if (!provided) {
    // eslint-disable-next-line no-console
    console.log("[HOSTED_REGISTER] missing auth header (x-backend-secret)");
    return res.status(401).json({
      ok: false,
      message: "Missing auth header",
      code: "MISSING_AUTH_HEADER"
    });
  }

  if (provided !== expectedSecret) {
    // eslint-disable-next-line no-console
    console.log("[HOSTED_REGISTER] invalid secret provided=%s expected=%s",
      maskSecret(provided), maskSecret(expectedSecret)
    );
    return res.status(401).json({ ok: false, message: "Unauthorized", code: "UNAUTHORIZED" });
  }

  if (!primarySecret && legacySecret) {
    // eslint-disable-next-line no-console
    console.log("[HOSTED_REGISTER] using deprecated header (x-onboarding-secret/x-automax-secret)");
  }

  return next();
}

// Registration (admin auth or local setup)
router.post("/businesses", adminJwt, registrationController.createBusiness);
router.post("/branches", adminJwt, registrationController.createBranch);
router.post("/backends/register", adminOrLocalSetup, registrationController.registerBackend);

router.post("/backend/heartbeat", auth, backendController.heartbeat);
router.get("/license/current", auth, licenseController.current);
router.post("/sales/sync", auth, salesController.syncSales);
router.post("/returns/sync", auth, returnsController.syncReturns);
router.post("/inventory/snapshot", auth, inventorySnapshotController.syncSnapshot);
router.post("/registers/activity", auth, registerActivityController.upsertRegisterActivity);
router.post("/products/sync", auth, productController.syncProducts);
router.get("/products/changes", auth, productController.getProductChanges);
router.post("/stock-movements/sync", auth, stockController.syncStockMovements);

module.exports = router;
