const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const summaryRoute = require("./routes/summary");
const recommendationRoute = require("./routes/recommendation");
const recipesRoute = require("./routes/recipes");
const alternativesRoute = require("./routes/alternatives");
const scanLabelRoute = require("./routes/scanLabel");
const scanMenuRoute = require("./routes/scanMenu");
const copilotRoute = require("./routes/copilot");

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
// Raised limit so base64 label photos (a few hundred KB) aren't rejected.
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("Welcome to the backend server of SafeBite!");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/summary", summaryRoute);
app.use("/api/recommendation", recommendationRoute);
app.use("/api/recipes", recipesRoute);
app.use("/api/alternatives", alternativesRoute);
app.use("/api/scan-label", scanLabelRoute);
app.use("/api/scan-menu", scanMenuRoute);
app.use("/api/copilot", copilotRoute);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);

  // Keep Render free tier alive — ping /health every 14 minutes
  const baseUrl = process.env.RENDER_EXTERNAL_URL;
  if (baseUrl) {
    setInterval(() => {
      fetch(`${baseUrl}/health`)
        .then(() => console.log("Keep-alive ping OK"))
        .catch((e) => console.warn("Keep-alive ping failed:", e.message));
    }, 14 * 60 * 1000);
  }
});
