const express = require("express");
const { generateRecipes, generateMealPlan } = require("../controller/aiController");

const router = express.Router();

// POST /api/recipes  -> health-safe recipes from the user's ingredients
router.post("/", async (req, res) => {
  try {
    const { ingredients, userProfile } = req.body;
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: "Provide at least one ingredient" });
    }
    const recipes = await generateRecipes(ingredients, userProfile || {});
    res.json({ recipes });
  } catch (error) {
    console.error("Error generating recipes:", error.message);
    res.status(500).json({ error: "Failed to generate recipes" });
  }
});

// POST /api/recipes/mealplan  -> N-day profile-safe meal plan
router.post("/mealplan", async (req, res) => {
  try {
    const { ingredients = [], userProfile, days = 7 } = req.body;
    const plan = await generateMealPlan(ingredients, userProfile || {}, days);
    res.json(plan);
  } catch (error) {
    console.error("Error generating meal plan:", error.message);
    res.status(500).json({ error: "Failed to generate meal plan" });
  }
});

module.exports = router;
