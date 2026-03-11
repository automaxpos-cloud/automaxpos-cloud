const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { NODE_ENV, APP_BASE_URL } = require("./config/env");

const healthRoutes = require("./routes/health");
const cloudRoutes = require("./routes/cloud");
const authRoutes = require("./routes/auth");
const dashboardPage = require("./routes/dashboardPage");
const dashboardApi = require("./routes/dashboardApi");
const cloudDashboardApi = require("./routes/cloudDashboardApi");
const cloudReportsApi = require("./routes/cloudReportsApi");
const cloudInventoryApi = require("./routes/cloudInventoryApi");
const cloudUsersApi = require("./routes/cloudUsers");
const licenseAdminApi = require("./routes/licenseAdmin");
const adminApi = require("./routes/adminApi");
const setupWizard = require("./routes/setupWizard");
const adminPage = require("./routes/adminPage");
const publicApi = require("./routes/publicApi");

const app = express();

if (NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: APP_BASE_URL ? [APP_BASE_URL] : "*",
    credentials: true
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "AutoMaxPOS Cloud",
    message: "API is running"
  });
});

app.use("/health", healthRoutes);
app.use("/api/cloud/auth", authRoutes);
app.use("/api/cloud", cloudRoutes);
app.use("/api/cloud/dashboard", cloudDashboardApi);
app.use("/api/cloud/reports", cloudReportsApi);
app.use("/api/cloud/inventory", cloudInventoryApi);
app.use("/api/cloud/users", cloudUsersApi);
app.use("/api/cloud/licenses", licenseAdminApi);
app.use("/api/admin", adminApi);
app.use("/api/public", publicApi);
if (NODE_ENV !== "production") {
  app.use("/api/cloud/setup", setupWizard);
  app.use("/setup", setupWizard);
}
app.use("/dashboard", dashboardPage);
app.use("/login", dashboardPage);
app.use("/api/dashboard", dashboardApi);
app.use("/admin", adminPage);

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Route not found" });
});

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error("API ERROR:", err);
  res.status(500).json({ ok: false, error: "SERVER_ERROR", message: "Unexpected server error" });
});

module.exports = app;
