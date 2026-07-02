const express = require("express");
const fs = require("fs");
const { gradeRank, isSafeForProfile } = require("../utils/profileSafety");

const router = express.Router();

const products = JSON.parse(fs.readFileSync("products.json", "utf8"));

// Token overlap with the scanned product's name/ingredients, for relevance.
const tokenize = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

// POST /api/alternatives  -> healthier, profile-safe products for a scanned item
router.post("/", (req, res) => {
  try {
    const { product = {}, userProfile = {} } = req.body;
    const scannedGrade = gradeRank(product.nutriscore_grade);
    const refTokens = new Set([
      ...tokenize(product.product_name),
      ...tokenize(product.ingredients_text),
    ]);

    const ranked = products
      .filter((p) => p.id && p.id !== product.id)
      .filter((p) => gradeRank(p.nutriscore_grade) < scannedGrade) // strictly healthier
      .filter((p) => isSafeForProfile(p, userProfile))
      .map((p) => {
        const tokens = new Set([
          ...tokenize(p.product_name),
          ...tokenize(p.ingredients_text),
        ]);
        let overlap = 0;
        for (const t of tokens) if (refTokens.has(t)) overlap++;
        const n = p.nutriments || {};
        return {
          id: p.id,
          name: p.product_name,
          nutriscore_grade: p.nutriscore_grade,
          relevance: overlap,
          badness: (n.sugars_100g || 0) + (n.salt_100g || 0) * 10 + (n.fat_100g || 0),
        };
      })
      .sort((a, b) => {
        if (b.relevance !== a.relevance) return b.relevance - a.relevance;
        if (gradeRank(a.nutriscore_grade) !== gradeRank(b.nutriscore_grade))
          return gradeRank(a.nutriscore_grade) - gradeRank(b.nutriscore_grade);
        return a.badness - b.badness;
      })
      .slice(0, 5);

    res.json({ alternatives: ranked });
  } catch (error) {
    console.error("Error finding alternatives:", error.message);
    res.status(500).json({ error: "Failed to find alternatives" });
  }
});

module.exports = router;
