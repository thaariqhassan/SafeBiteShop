// Maps each allergy label to the ingredient keywords that should trigger it, so
// e.g. a "Nuts" allergy is flagged by "almond" or "peanut", not only the literal
// word "nuts". Used for the deterministic safety check on scanned labels.
export const ALLERGEN_KEYWORDS: Record<string, string[]> = {
  Nuts: ["nut", "almond", "cashew", "hazelnut", "walnut", "pecan", "pistachio", "macadamia", "peanut"],
  Peanuts: ["peanut", "groundnut", "arachis"],
  Dairy: ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "lactose", "whey", "casein"],
  Shellfish: ["shrimp", "prawn", "crab", "lobster", "crayfish", "oyster", "clam", "mussel", "scallop", "squid"],
  Gluten: ["gluten", "wheat", "barley", "rye", "malt", "spelt"],
  Soy: ["soy", "soya", "soybean", "tofu", "edamame"],
  Eggs: ["egg", "albumin", "mayonnaise"],
  Wheat: ["wheat", "flour"],
  Sesame: ["sesame", "tahini"],
  Fish: ["fish", "cod", "tuna", "salmon", "haddock", "anchovy", "sardine", "mackerel"],
};

export interface AllergenHit {
  allergy: string;
  matched: string[];
}

// Returns the user's allergies that appear in the given label text.
export const matchAllergens = (
  text: string,
  allergies: string[]
): AllergenHit[] => {
  const lower = (text || "").toLowerCase();
  const hits: AllergenHit[] = [];
  for (const allergy of allergies || []) {
    if (!allergy || allergy === "None") continue;
    const keywords = ALLERGEN_KEYWORDS[allergy] || [allergy];
    const matched = keywords.filter((kw) => lower.includes(kw.toLowerCase()));
    if (matched.length > 0) hits.push({ allergy, matched: [...new Set(matched)] });
  }
  return hits;
};
