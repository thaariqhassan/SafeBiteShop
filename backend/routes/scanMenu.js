const express = require("express");
const { analyzeMenuImage } = require("../controller/aiController");

const router = express.Router();

// POST /api/scan-menu  -> rate menu dishes for the diner's health profile
router.post("/", async (req, res) => {
  try {
    const { image, userProfile } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Missing image" });
    }
    const dishes = await analyzeMenuImage(image, userProfile || {});
    res.json({ dishes: Array.isArray(dishes) ? dishes : [] });
  } catch (error) {
    console.error("Menu scan error:", error.message);
    res.status(500).json({ error: "Failed to read menu" });
  }
});

module.exports = router;
