const express = require("express");
const adminJwt = require("../middleware/adminJwt");
const licenseAdminController = require("../controllers/licenseAdminController");

const router = express.Router();

router.get("/", adminJwt, licenseAdminController.list);
router.get("/current", adminJwt, licenseAdminController.current);
router.post("/issue", adminJwt, licenseAdminController.issue);

module.exports = router;
