const dotenv = require("dotenv");

dotenv.config({ override: true });

const app = require("./src/app");
const { PORT } = require("./src/config/env");

const port = Number(PORT) || 3001;
const host = "0.0.0.0";

app.listen(port, host, () => {
  console.log(`AutoMaxPOS Cloud API running on ${host}:${port}`);
});
