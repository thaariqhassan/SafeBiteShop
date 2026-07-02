// Shared deterministic safety + health-scoring rules for the local products.json
// catalogue. products.json carries only { id, product_name, ingredients_text,
// nutriments, nutriscore_grade } — no allergens_tags / labels_tags — so every
// check here works from ingredients_text keywords and per-100g nutriments.
// Used by /api/recommendation and /api/alternatives.

const GRADE_RANK = { a: 1, b: 2, c: 3, d: 4, e: 5 };
const gradeRank = (g) => GRADE_RANK[(g || "").toLowerCase()] || 6;

// Map each allergy label (see constants/const.ts commonAllergies) to the
// ingredient keywords that should trigger it, so e.g. a "Nuts" allergy
// correctly excludes products containing "almond" or "peanut".
// products.json mixes English, French, German, Spanish and Italian ingredient
// text, so each list carries the common foreign words too ("amande" = almond).
// Over-matching (e.g. "lait" also hits "laitue"/lettuce) is deliberate:
// for allergies a false exclusion is far cheaper than a false recommendation.
const ALLERGEN_KEYWORDS = {
  nuts: [
    "nut", "almond", "cashew", "hazelnut", "walnut", "pecan", "pistachio", "macadamia", "peanut",
    "amande", "noisette", "noix", "cajou", "pistache", "arachid", "cacahu",
    "mandel", "mandorl", "nocciol", "almendra", "avellana", "nuez", "nueces", "nuss", "orzech", "orzeszk",
  ],
  peanuts: ["peanut", "groundnut", "arachis", "arachid", "cacahu", "erdnuss"],
  dairy: [
    "milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "lactose", "whey", "casein",
    "lait", "fromage", "beurre", "crème", "creme", "yaourt",
    "milch", "käse", "sahne", "leche", "queso", "latte", "formaggio", "burro", "panna",
    "mleko", "mlecz", "serwatk", "masło", "śmietan", "lben", "kefir",
  ],
  shellfish: [
    "shrimp", "prawn", "crab", "lobster", "crayfish", "oyster", "clam", "mussel", "scallop", "squid",
    "crevette", "crabe", "homard", "garnele", "camarón", "camaron", "gamba",
  ],
  gluten: [
    "gluten", "wheat", "barley", "rye", "malt", "spelt",
    "blé", "orge", "seigle", "weizen", "gerste", "roggen", "trigo", "cebada",
    "frumento", "grano", "orzo", "segale", "pszen", "żyto", "jęczmie",
  ],
  wheat: ["wheat", "flour", "blé", "weizen", "trigo", "farine", "frumento", "pszen"],
  soy: ["soy", "soya", "soybean", "tofu", "edamame", "soja"],
  eggs: ["egg", "albumin", "mayonnaise", "œuf", "oeuf", "huevo", "uova", "uovo", "eigelb", "jaja"],
  sesame: ["sesame", "tahini", "sésame", "sesam", "sésamo"],
  fish: [
    "fish", "cod", "tuna", "salmon", "haddock", "anchovy", "sardine", "mackerel",
    "poisson", "thon", "saumon", "fisch", "lachs", "atún", "atun", "pescado",
  ],
};

const MEAT_KEYWORDS = [
  "chicken", "beef", "pork", "lamb", "mutton", "turkey", "duck", "bacon",
  "ham", "sausage", "salami", "pepperoni", "chorizo", "veal", "meat",
  "gelatin", "gelatine", "lard",
  "poulet", "bœuf", "boeuf", "porc", "jambon", "viande", "agneau", "dinde", "canard", "gélatine",
  "huhn", "hähnchen", "schwein", "rind", "pollo", "cerdo", "carne", "jamón", "jamon",
];
const SEAFOOD_KEYWORDS = [
  "fish", "tuna", "salmon", "cod", "anchovy", "sardine", "mackerel", "haddock",
  "shrimp", "prawn", "crab", "lobster", "squid", "oyster", "mussel", "clam", "scallop",
  "poisson", "thon", "saumon", "crevette", "fisch", "lachs", "atún", "atun", "pescado",
];
const DAIRY_KEYWORDS = ALLERGEN_KEYWORDS.dairy;
const EGG_KEYWORDS = ["egg", "albumin"];
const GLUTEN_KEYWORDS = ALLERGEN_KEYWORDS.gluten;
const PORK_ALCOHOL_KEYWORDS = [
  "pork", "bacon", "ham", "lard", "gelatin", "gelatine",
  "alcohol", "wine", "beer", "rum", "brandy",
];

const textOf = (product) =>
  `${product.product_name || ""} ${product.ingredients_text || ""}`.toLowerCase();

const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

const clean = (list) =>
  (list || [])
    .map((x) => String(x).toLowerCase().trim())
    .filter((x) => x && x !== "none");

// -> name of the first allergy the product violates, or null.
const violatesAllergy = (product, allergies) => {
  const text = textOf(product);
  for (const allergy of clean(allergies)) {
    const keywords = ALLERGEN_KEYWORDS[allergy] || [allergy];
    if (keywords.some((kw) => text.includes(kw))) return allergy;
  }
  return null;
};

// -> name of the first dietary restriction the product breaks, or null.
// Labels come from constants/const.ts dietaryRestrictions.
const violatesDietary = (product, dietary) => {
  const text = textOf(product);
  const n = product.nutriments || {};
  const hasAny = (kws) => kws.some((kw) => text.includes(kw));

  for (const diet of clean(dietary)) {
    switch (diet) {
      case "vegan":
        if (hasAny([...MEAT_KEYWORDS, ...SEAFOOD_KEYWORDS, ...DAIRY_KEYWORDS, ...EGG_KEYWORDS, "honey"])) return diet;
        break;
      case "vegetarian":
        if (hasAny([...MEAT_KEYWORDS, ...SEAFOOD_KEYWORDS])) return diet;
        break;
      case "pescatarian":
        if (hasAny(MEAT_KEYWORDS)) return diet;
        break;
      case "keto":
        if (num(n.carbohydrates_100g) > 10) return diet;
        break;
      case "low carb":
        if (num(n.carbohydrates_100g) > 15) return diet;
        break;
      case "low sodium":
        if (num(n.salt_100g) > 0.3 || num(n.sodium_100g) > 0.12) return diet;
        break;
      case "low sugar":
        if (num(n.sugars_100g) > 5) return diet;
        break;
      case "gluten-free":
        if (hasAny(GLUTEN_KEYWORDS)) return diet;
        break;
      case "lactose-free":
        if (hasAny(DAIRY_KEYWORDS)) return diet;
        break;
      case "halal":
      case "kosher":
        if (hasAny(PORK_ALCOHOL_KEYWORDS)) return diet;
        if (diet === "kosher" && hasAny(ALLERGEN_KEYWORDS.shellfish)) return diet;
        break;
      case "paleo":
        if (hasAny(["wheat", "oat", "barley", "rye", "rice", "corn", ...DAIRY_KEYWORDS, "soy", "lentil", "bean"])) return diet;
        break;
      // "Intermittent Fasting" restricts *when* to eat, not what — no product filter.
      default:
        break;
    }
  }
  return null;
};

// -> name of the first medical condition the product conflicts with, or null.
// Note: OpenFoodFacts nutriment keys use hyphens ("saturated-fat_100g").
const violatesCondition = (product, conditions) => {
  const text = textOf(product);
  const n = product.nutriments || {};
  const hasAny = (kws) => kws.some((kw) => text.includes(kw));

  for (const condition of clean(conditions)) {
    switch (condition) {
      case "diabetes":
        if (num(n.sugars_100g) > 5 || num(n.carbohydrates_100g) > 20) return condition;
        break;
      case "hypertension":
        if (num(n.salt_100g) > 0.3 || num(n.sodium_100g) > 0.12) return condition;
        break;
      case "high cholesterol":
        if (num(n["saturated-fat_100g"]) > 2 || num(n["trans-fat_100g"]) > 0.1) return condition;
        break;
      case "celiac disease":
        if (hasAny(GLUTEN_KEYWORDS)) return condition;
        break;
      case "lactose intolerance":
        if (hasAny(DAIRY_KEYWORDS)) return condition;
        break;
      case "irritable bowel syndrome (ibs)":
        if (/onion|garlic|sorbitol|xylitol|mannitol/.test(text)) return condition;
        break;
      case "gout":
        if (/red meat|beef|pork|organ meat|liver|beer|anchov|sardine/.test(text)) return condition;
        break;
      case "kidney disease":
        if (num(n.proteins_100g) > 10 || num(n.potassium_100g) > 0.3) return condition;
        break;
      case "heart disease":
        if (num(n.salt_100g) > 0.3 || num(n.cholesterol_100g) > 0.1 || num(n["saturated-fat_100g"]) > 3) return condition;
        break;
      case "thyroid disorder":
        if (/soy|broccoli|cabbage|kale/.test(text)) return condition;
        break;
      case "food sensitivities (general)":
        if (/artificial|preservative|colouring|coloring/.test(text)) return condition;
        break;
      default:
        break;
    }
  }
  return null;
};

const isSafeForProfile = (product, userProfile = {}) =>
  !violatesAllergy(product, userProfile.allergies) &&
  !violatesDietary(product, userProfile.dietary || userProfile.dietary_restrictions) &&
  !violatesCondition(product, userProfile.conditions || userProfile.medical_conditions);

// Health score used to rank already-safe products. Higher = healthier for this
// profile. Condition-relevant nutrients are penalised harder.
const healthScore = (product, userProfile = {}) => {
  const n = product.nutriments || {};
  const conditions = clean(userProfile.conditions || userProfile.medical_conditions);
  const has = (c) => conditions.includes(c);

  let score = 0;
  score += { a: 8, b: 5, c: 2, d: -2, e: -6 }[(product.nutriscore_grade || "").toLowerCase()] ?? 0;

  score -= Math.min(num(n.sugars_100g), 40) * (has("diabetes") ? 0.5 : 0.2);
  score -= Math.min(num(n.salt_100g) * 10, 30) * (has("hypertension") || has("heart disease") ? 0.5 : 0.25);
  score -= Math.min(num(n["saturated-fat_100g"]), 20) * (has("high cholesterol") || has("heart disease") ? 0.6 : 0.3);
  score += Math.min(num(n.proteins_100g), 25) * (has("kidney disease") ? 0 : 0.15);
  score += Math.min(num(n.fiber_100g), 15) * 0.3;

  const nova = num(n["nova-group"]);
  if (nova >= 4) score -= 3;
  else if (nova === 3) score -= 1;

  return score;
};

// Short human line for the recommendation card, e.g. "Nutri-Score A · low sugar".
const buildReason = (product, userProfile = {}) => {
  const n = product.nutriments || {};
  const conditions = clean(userProfile.conditions || userProfile.medical_conditions);
  const has = (c) => conditions.includes(c);
  const grade = (product.nutriscore_grade || "").toLowerCase();
  const parts = [];

  if (grade === "a" || grade === "b") parts.push(`Nutri-Score ${grade.toUpperCase()}`);
  if (num(n.sugars_100g) <= 5) parts.push(has("diabetes") ? "diabetes-friendly sugar" : "low sugar");
  if (num(n.salt_100g) <= 0.3) parts.push(has("hypertension") || has("heart disease") ? "low salt for your BP" : "low salt");
  if (num(n.proteins_100g) >= 8 && !has("kidney disease")) parts.push("high protein");
  if (num(n.fiber_100g) >= 3) parts.push("high fibre");

  return parts.slice(0, 3).join(" · ") || "Fits your health profile";
};

module.exports = {
  ALLERGEN_KEYWORDS,
  gradeRank,
  violatesAllergy,
  violatesDietary,
  violatesCondition,
  isSafeForProfile,
  healthScore,
  buildReason,
};
