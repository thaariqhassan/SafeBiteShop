const express = require("express");
const { consultCopilot } = require("../controller/copilotController");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { messages, userProfile, recentScans } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing chat messages" });
    }

    const reply = await consultCopilot(
      messages,
      userProfile || {},
      recentScans || []
    );
    res.json({ reply });
  } catch (error) {
    console.error("Co-pilot error:", error.message);
    res.status(500).json({ error: "Failed to get a response from the co-pilot" });
  }
});

module.exports = router;
