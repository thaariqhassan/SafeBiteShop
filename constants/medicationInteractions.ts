export interface MedicationInteraction {
  keywords: string[];
  reason: string;
}

export const MEDICATION_INTERACTIONS: Record<string, MedicationInteraction> = {
  "Warfarin (Coumadin)": {
    keywords: ["spinach", "kale", "broccoli", "cabbage", "parsley", "cilantro", "grapefruit", "cranberry", "alcohol"],
    reason: "Vitamin K-rich leafy greens reduce Warfarin's effectiveness. Grapefruit and cranberry may increase bleeding risk.",
  },
  "Atorvastatin / Simvastatin (Statins)": {
    keywords: ["grapefruit"],
    reason: "Grapefruit raises statin blood levels significantly, increasing the risk of muscle damage (rhabdomyolysis).",
  },
  "Metformin": {
    keywords: ["alcohol"],
    reason: "Alcohol with Metformin raises the risk of lactic acidosis, a rare but serious complication.",
  },
  "Lisinopril / ACE Inhibitors": {
    keywords: ["banana", "avocado", "orange", "potato", "tomato", "salt substitute"],
    reason: "ACE Inhibitors raise potassium levels. High-potassium foods can cause dangerous potassium buildup (hyperkalemia).",
  },
  "Levothyroxine (Synthroid)": {
    keywords: ["soy", "soybeans", "flaxseed", "bran", "calcium", "high fiber"],
    reason: "Soy, high-fiber foods, and calcium reduce Levothyroxine absorption, making thyroid treatment less effective.",
  },
  "MAO Inhibitors (Phenelzine)": {
    keywords: ["aged cheese", "parmesan", "cheddar", "salami", "pepperoni", "sausage", "red wine", "beer", "soy sauce", "miso", "yeast extract", "fermented", "pickled"],
    reason: "Tyramine-rich foods with MAO Inhibitors can cause a sudden, dangerous spike in blood pressure.",
  },
  "Doxycycline / Tetracycline": {
    keywords: ["milk", "cheese", "yogurt", "dairy", "calcium", "cream"],
    reason: "Dairy and calcium bind to Tetracycline antibiotics in the gut, severely reducing their absorption.",
  },
  "Digoxin": {
    keywords: ["licorice", "bran", "psyllium"],
    reason: "Licorice can deplete potassium, increasing Digoxin toxicity risk. High-fiber foods reduce Digoxin absorption.",
  },
  "Amlodipine / Calcium Channel Blockers": {
    keywords: ["grapefruit"],
    reason: "Grapefruit raises Calcium Channel Blocker levels in the blood, intensifying effects and side effects.",
  },
  "Lithium": {
    keywords: ["alcohol", "caffeine", "coffee", "sodium", "salt"],
    reason: "Large swings in caffeine or sodium intake destabilize Lithium levels. Alcohol can trigger Lithium toxicity.",
  },
  "Prednisone / Corticosteroids": {
    keywords: ["grapefruit", "alcohol", "sodium", "salt"],
    reason: "Grapefruit and alcohol amplify Corticosteroid side effects. Salty foods worsen fluid retention and blood pressure.",
  },
  "Ibuprofen / NSAIDs": {
    keywords: ["alcohol"],
    reason: "Alcohol with NSAIDs substantially raises the risk of stomach bleeding and ulcers.",
  },
  "Aspirin": {
    keywords: ["alcohol"],
    reason: "Alcohol combined with Aspirin increases stomach irritation and the risk of gastrointestinal bleeding.",
  },
  "Ciprofloxacin / Fluoroquinolones": {
    keywords: ["milk", "dairy", "yogurt", "calcium", "cheese"],
    reason: "Dairy and calcium form insoluble complexes with Fluoroquinolones, dramatically reducing antibiotic absorption.",
  },
};

export interface MedicationWarning {
  medication: string;
  triggeredBy: string[];
  reason: string;
}

export const checkMedicationInteractions = (
  ingredientsText: string,
  medications: string[]
): MedicationWarning[] => {
  if (!ingredientsText || !medications || medications.length === 0) return [];
  const lowerIngredients = ingredientsText.toLowerCase();
  const warnings: MedicationWarning[] = [];

  for (const med of medications) {
    if (med === "None") continue;
    const interaction = MEDICATION_INTERACTIONS[med];
    if (!interaction) continue;
    const found = interaction.keywords.filter((kw) =>
      lowerIngredients.includes(kw.toLowerCase())
    );
    if (found.length > 0) {
      warnings.push({ medication: med, triggeredBy: found, reason: interaction.reason });
    }
  }
  return warnings;
};
