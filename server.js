const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* Health check */
app.get("/health", (req, res) => {
  res.json({
    service: "AutoMaxPOS Cloud",
    status: "OK",
    time: new Date()
  });
});

/* Backend heartbeat */
app.post("/api/cloud/backend/heartbeat", (req, res) => {

  console.log("Backend heartbeat received");

  res.json({
    ok: true,
    message: "Backend heartbeat received"
  });

});

/* License verification */
app.post("/api/cloud/license/verify", (req, res) => {

  const { license_key } = req.body;

  if (!license_key) {
    return res.status(400).json({
      ok: false,
      message: "License key missing"
    });
  }

  res.json({
    ok: true,
    valid: true,
    plan: "PRO"
  });

});

/* Sales sync */
app.post("/api/cloud/sales/sync", (req, res) => {

  const sales = req.body.sales || [];

  console.log("Sales received:", sales.length);

  res.json({
    ok: true,
    synced_sales: sales.length
  });

});

app.listen(PORT, () => {

  console.log("AutoMaxPOS Cloud running on port", PORT);

});
