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

  // Keep SafeBite's own Supabase project alive (free projects pause after 7 days
  // idle). Piggybacks on this always-on Render service. Reuses the same
  // credentials the mobile client uses, already present in backend/.env as
  // EXPO_PUBLIC_PROJECT_URL / EXPO_PUBLIC_PUBLIC_ANON_KEY.
  const supabaseUrl = process.env.EXPO_PUBLIC_PROJECT_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_PUBLIC_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    const pingSupabase = () => {
      fetch(`${supabaseUrl}/rest/v1/Users?select=id&limit=1`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      })
        .then((r) => console.log(`SafeBite Supabase keep-alive: ${r.status}`))
        .catch((e) => console.warn("SafeBite Supabase keep-alive failed:", e.message));
    };
    pingSupabase(); // once on boot
    setInterval(pingSupabase, 3 * 24 * 60 * 60 * 1000); // every 3 days
  }

  // Keep the Wildex Supabase project alive too (free projects pause after 7 days
  // idle). Piggybacks on this always-on Render service. Once every 3 days is
  // plenty — well inside the 7-day window. Set these env vars:
  //   WILDEX_SUPABASE_URL       https://YOUR-REF.supabase.co
  //   WILDEX_SUPABASE_ANON_KEY  the anon public key (safe; RLS protects data)
  const wildexUrl = process.env.WILDEX_SUPABASE_URL;
  const wildexKey = process.env.WILDEX_SUPABASE_ANON_KEY;
  if (wildexUrl && wildexKey) {
    const pingWildex = () => {
      fetch(`${wildexUrl}/rest/v1/profiles?select=id&limit=1`, {
        headers: { apikey: wildexKey, Authorization: `Bearer ${wildexKey}` },
      })
        .then((r) => console.log(`Wildex Supabase keep-alive: ${r.status}`))
        .catch((e) => console.warn("Wildex keep-alive failed:", e.message));
    };
    pingWildex(); // once on boot
    setInterval(pingWildex, 3 * 24 * 60 * 60 * 1000); // every 3 days
  }
});
