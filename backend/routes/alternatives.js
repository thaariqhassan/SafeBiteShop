const express = require("express");
const fs = require("fs");

const router = express.Router();

const products = JSON.parse(fs.readFileSync("products.json", "utf8"));

const GRADE_RANK = { a: 1, b: 2, c: 3, d: 4, e: 5 };
const gradeRank = (g) => GRADE_RANK[(g || "").toLowerCase()] || 6;

// Map each allergy label to the ingredient keywords that should trigger it, so
// e.g. a "Nuts" allergy correctly excludes products containing "almond" or
// "peanut" rather than only the literal word "nuts".
const ALLERGEN_KEYWORDS = {
  nuts: ["nut", "almond", "cashew", "hazelnut", "walnut", "pecan", "pistachio", "macadamia", "peanut"],
  peanuts: ["peanut", "groundnut", "arachis"],
  dairy: ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "lactose", "whey", "casein"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "crayfish", "oyster", "clam", "mussel", "scallop", "squid"],
  gluten: ["gluten", "wheat", "barley", "rye", "malt", "spelt"],
  wheat: ["wheat", "flour"],
  soy: ["soy", "soya", "soybean", "tofu", "edamame"],
  eggs: ["egg", "albumin", "mayonnaise"],
  sesame: ["sesame", "tahini"],
  fish: ["fish", "cod", "tuna", "salmon", "haddock", "anchovy", "sardine", "mackerel"],
};

// products.json carries no allergen/category tags, so safety is checked from
// nutriments + ingredients_text (same approach as the recommendation filter).
const isSafeForProfile = (product, userProfile) => {
  const conditions = (userProfile.conditions || []).map((c) =>
    c.toLowerCase().trim()
  );
  const allergies = (userProfile.allergies || [])
    .map((a) => a.toLowerCase().trim())
    .filter((a) => a && a !== "none");
  const text = (product.ingredients_text || "").toLowerCase();
  const n = product.nutriments || {};

  // Allergen keyword guard (uses synonyms so "Nuts" catches "almond", "peanut"…)
  for (const allergy of allergies) {
    const keywords = ALLERGEN_KEYWORDS[allergy] || [allergy];
    if (keywords.some((kw) => text.includes(kw))) return false;
  }

  for (const condition of conditions) {
    if (condition === "diabetes" && (n.sugars_100g > 5 || n.carbohydrates_100g > 20)) return false;
    if (condition === "hypertension" && (n.salt_100g > 0.3 || n.sodium_100g > 0.12)) return false;
    if (condition === "high cholesterol" && n["saturated-fat_100g"] > 2) return false;
    if (condition === "celiac disease" && /gluten|wheat|barley|rye/.test(text)) return false;
    if (condition === "lactose intolerance" && /milk|lactose|cheese|butter/.test(text)) return false;
    if (condition === "heart disease" && n.salt_100g > 0.3) return false;
    if (condition === "kidney disease" && n.proteins_100g > 10) return false;
  }
  return true;
};

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
