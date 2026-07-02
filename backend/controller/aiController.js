const Groq = require("groq-sdk");
require("dotenv").config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY3 || "",
});

const askAI = async (productData, userProfile) => {
  const medications = userProfile.medications?.length
    ? userProfile.medications.join(", ")
    : "None";
  const prompt = `
User profile:
- Allergies: ${userProfile.allergies.join(", ")}
- Conditions: ${userProfile.conditions.join(", ")}
- Medications: ${medications}

Product data:
${JSON.stringify(productData, null, 2)}


Summarize if this product is safe or risky for the user. Be brief but clear, and limit your response to a maximum of 70 words. If the user takes medications, mention any relevant food-drug interactions found in the product. Do not explain your reasoning. Only give the conclusion and, if necessary, a short suggestion or advice. Do NOT include markdown, code blocks, or bullet points.should have a heading "Overview from your data" in bold.

As a second paragraph, write a general overview of the product that a 15-year-old can understand, using no more than 50 words.should have a heading "General Overview" in bold.

You may only use italic or bold styling that is compatible with React Native <Text> components. No other formatting is allowed.
`;

  const result = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content: "You are a health AI assistant for analyzing food products.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return result.choices[0].message.content;
};

const consultAi = async (userProfile, filteredProductList) => {
  const prompt = `
  The user has the following constraints:
- Allergies: ${userProfile.allergies.join(", ")}
- Medications: ${userProfile.conditions.join(", ")}
- Dietary Restrictions: ${userProfile.dietary.join(", ")}

Here is a list of food product data fetched from OpenFoodFacts. Each item is an object with a product ID and its metadata.

${JSON.stringify(filteredProductList)}

Select and return only the IDs of products that are perfectly compatible with all the user's health details. Products should also be considered healthy. If fewer than 1 healthy products exist, return only perfectly compatible ones, even if not healthy.
Do not include any other text, explanations, or formatting. Only return the JSON array of product IDs.No markdown, code blocks, or bullet points. No additional text is allowed.

Output: A plain JSON array of product IDs, e.g.:
["1234567890123", "9876543210987", ...]
  `;

  const result = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are a JSON-only assistant. Output ONLY a valid JSON array of strings. Do NOT include extra text, markdown, explanations, or code blocks. Do not include trailing commas. Only a single valid array must be returned.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  const response = result.choices[0].message.content;

  // Extract JSON array using regex
  try {
    const match = response.match(/\[.*?\]/s);
    if (!match) throw new Error("AI response did not contain a JSON array");
    return JSON.parse(match[0]);
  } catch (err) {
    console.error("❌ Failed to parse AI response:");
    console.error("RAW:", response);
    throw err;
  }
};

// Extract the first JSON array or object from a model response that may include
// stray prose or ```json fences.
const extractJson = (text, kind) => {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const pattern = kind === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = cleaned.match(pattern);
  if (!match) throw new Error("AI response did not contain valid JSON");
  return JSON.parse(match[0]);
};

const profileConstraints = (userProfile) => {
  const allergies = (userProfile.allergies || []).filter((a) => a && a !== "None");
  const conditions = (userProfile.conditions || []).filter((c) => c && c !== "None");
  const dietary = (userProfile.dietary || []).filter((d) => d && d !== "None");
  const medications = (userProfile.medications || []).filter((m) => m && m !== "None");
  return `
HARD SAFETY RULES for this user — never violate:
- Allergies (must NOT appear in any recipe): ${allergies.length ? allergies.join(", ") : "none"}
- Dietary restrictions (must respect): ${dietary.length ? dietary.join(", ") : "none"}
- Medical conditions (keep recipes appropriate, e.g. low sugar for diabetes, low sodium for hypertension): ${conditions.length ? conditions.join(", ") : "none"}
- Medications (avoid foods that interact, e.g. no grapefruit with statins, no leafy greens with warfarin): ${medications.length ? medications.join(", ") : "none"}`;
};

const generateRecipes = async (ingredients, userProfile) => {
  const prompt = `The user has these ingredients on hand:
${ingredients.join(", ")}
${profileConstraints(userProfile)}

Suggest 3 simple, healthy recipes that use mostly these ingredients and are SAFE for this user's health profile.

Return ONLY a JSON array, no other text, in exactly this shape:
[
  {
    "name": "Recipe name",
    "description": "One short sentence",
    "prepTime": 10,
    "cookTime": 20,
    "servings": 2,
    "difficulty": "easy",
    "calories": 450,
    "protein": 25,
    "carbs": 45,
    "fat": 18,
    "ingredients": ["ingredient with amount"],
    "instructions": ["Step 1", "Step 2"],
    "usesYourIngredients": ["ingredient"],
    "needToBuy": ["ingredient"],
    "safeFor": "Short note on why this fits the user's allergies/conditions",
    "tags": ["quick"]
  }
]

Rules: max 6 instruction steps, short strings, accurate calorie/macro estimates, no markdown, no extra text.`;

  const result = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are a careful nutrition-aware chef. You output ONLY valid JSON. You never suggest any ingredient the user is allergic to or that conflicts with their medications or diet.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 2000,
  });
  return extractJson(result.choices[0].message.content, "array");
};

const generateMealPlan = async (ingredients, userProfile, days = 7) => {
  const prompt = `Create a ${days}-day meal plan (breakfast, lunch, dinner per day) that is SAFE for this user's health profile.
Prefer using these ingredients the user already has: ${ingredients.length ? ingredients.join(", ") : "any common healthy ingredients"}.
${profileConstraints(userProfile)}

Return ONLY a JSON object, no other text, in exactly this shape:
{
  "mealPlan": [
    {
      "day": 1,
      "meals": [
        { "type": "breakfast", "name": "Meal name", "description": "Brief", "calories": 350, "mainIngredients": ["a", "b"] }
      ]
    }
  ],
  "shoppingList": ["items the user likely needs to buy"]
}

Rules: exactly ${days} days, 3 meals each, short strings, accurate calorie estimates, no markdown, no extra text.`;

  const result = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are a careful nutrition-aware meal planner. You output ONLY valid JSON and never include foods that conflict with the user's allergies, diet, conditions, or medications.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 3000,
  });
  return extractJson(result.choices[0].message.content, "object");
};

// Single fast call that re-ranks pre-filtered, pre-scored candidates for the
// user's profile. Purely a nice-to-have on top of the deterministic ranking —
// callers must fall back to their own order if this throws or times out.
const rerankRecommendations = async (userProfile, candidates) => {
  const prompt = `User health profile:
- Allergies: ${(userProfile.allergies || []).join(", ") || "none"}
- Medical conditions: ${(userProfile.conditions || []).join(", ") || "none"}
- Dietary restrictions: ${(userProfile.dietary || []).join(", ") || "none"}

Candidate food products (already filtered as safe for this user):
${JSON.stringify(candidates)}

Pick the 10 products that best suit this user's health profile, healthiest and most relevant first. Use only IDs from the list above.
Return ONLY a JSON array of product ID strings, no other text.`;

  const result = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.2,
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content:
          "You are a JSON-only assistant. Output ONLY a valid JSON array of strings — no markdown, no explanations.",
      },
      { role: "user", content: prompt },
    ],
  });
  return extractJson(result.choices[0].message.content, "array");
};

// Reads a food-label photo with a vision model and extracts structured product
// data, so products without a barcode (or missing from OpenFoodFacts) can still
// be analysed by the normal safety pipeline.
const analyzeLabelImage = async (imageDataUrl) => {
  const result = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 0.2,
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content:
          "You read food packaging labels from images and output ONLY valid JSON. Never invent ingredients you cannot see.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Read this food product label and return ONLY this JSON (no markdown, no commentary):
{
  "product_name": "best-guess product name, or 'Unknown Product'",
  "ingredients_text": "the full ingredients list exactly as written",
  "allergens": "allergens stated on the label (e.g. from 'Contains:' / 'May contain:'), or empty string",
  "additives_tags": ["E-numbers or named additives if listed"],
  "nutriments": {
    "energy-kcal_100g": number or null,
    "sugars_100g": number or null,
    "fat_100g": number or null,
    "salt_100g": number or null,
    "proteins_100g": number or null
  }
}
Extract per-100g nutrition values only if a nutrition table is visible. If the image is not a readable food label, return {"error":"unreadable"}.`,
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });
  return extractJson(result.choices[0].message.content, "object");
};

// Reads a restaurant menu photo and rates each dish for the diner's profile.
const analyzeMenuImage = async (imageDataUrl, userProfile = {}) => {
  const allergies = (userProfile.allergies || []).filter((a) => a && a !== "None");
  const conditions = (userProfile.conditions || []).filter((c) => c && c !== "None");
  const dietary = (userProfile.dietary || []).filter((d) => d && d !== "None");
  const medications = (userProfile.medications || []).filter((m) => m && m !== "None");

  const prompt = `This is a photo of a restaurant menu. The diner has these health constraints:
- Allergies (must avoid): ${allergies.length ? allergies.join(", ") : "none"}
- Dietary restrictions: ${dietary.length ? dietary.join(", ") : "none"}
- Medical conditions: ${conditions.length ? conditions.join(", ") : "none"}
- Medications (watch for food interactions): ${medications.length ? medications.join(", ") : "none"}

Identify the dishes on the menu. For each dish judge it for THIS diner based on its likely ingredients:
- "avoid": likely contains an allergen they're allergic to, breaks a dietary restriction, or strongly conflicts with a condition/medication.
- "caution": possibly risky or depends on preparation.
- "safe": very likely fine for them.

Return ONLY a JSON array (max 14 dishes, most relevant first), no markdown:
[
  { "dish": "dish name", "verdict": "safe|caution|avoid", "reason": "one short sentence", "concerns": ["short flag", ...] }
]
If the image is not a readable menu, return [].`;

  const result = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    temperature: 0.2,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content:
          "You read restaurant menus from images and rate dishes for a diner's health profile. Output ONLY valid JSON. Be cautious: if unsure whether a dish contains an allergen, use 'caution', never 'safe'.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });
  return extractJson(result.choices[0].message.content, "array");
};

module.exports = {
  askAI,
  consultAi,
  rerankRecommendations,
  generateRecipes,
  generateMealPlan,
  analyzeLabelImage,
  analyzeMenuImage,
};
