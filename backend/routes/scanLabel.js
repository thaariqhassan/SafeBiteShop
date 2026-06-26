const express = require("express");
const { analyzeLabelImage } = require("../controller/aiController");

const router = express.Router();

// POST /api/scan-label  -> read a food label photo into structured product data
router.post("/", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Missing image" });
    }
    const product = await analyzeLabelImage(image);
    res.json({ product });
  } catch (error) {
    console.error("Label scan error:", error.message);
    res.status(500).json({ error: "Failed to read label" });
  }
});

module.exports = router;
