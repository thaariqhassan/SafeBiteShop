import { getActiveProfile } from "./familyProfile";
import { MEDICATION_INTERACTIONS } from "@/constants/medicationInteractions";

// Short, actionable advice per medication (derived from the interaction map).
const MED_TIPS: Record<string, string> = {
  "Warfarin (Coumadin)": "keep leafy greens (spinach, kale) consistent and skip grapefruit.",
  "Atorvastatin / Simvastatin (Statins)": "avoid grapefruit — it spikes statin levels.",
  Metformin: "go easy on alcohol today.",
  "Lisinopril / ACE Inhibitors": "watch high-potassium foods like banana & potato.",
  "Levothyroxine (Synthroid)": "take your dose away from soy, calcium & high-fibre foods.",
  "MAO Inhibitors (Phenelzine)": "avoid aged cheese, cured meats & fermented foods.",
  "Doxycycline / Tetracycline": "space dairy & calcium a couple hours from your dose.",
  Digoxin: "avoid licorice and very high-fibre foods near your dose.",
  "Amlodipine / Calcium Channel Blockers": "skip grapefruit today.",
  Lithium: "keep caffeine and salt intake steady.",
  "Prednisone / Corticosteroids": "limit salty foods and alcohol.",
  "Ibuprofen / NSAIDs": "avoid alcohol to protect your stomach.",
  Aspirin: "avoid alcohol to reduce stomach irritation.",
  "Ciprofloxacin / Fluoroquinolones": "space dairy & calcium from your dose.",
};

const CONDITION_TIPS: Record<string, string> = {
  Diabetes: "Diabetes tip: aim to stay under ~25g of added sugar today.",
  Hypertension: "Blood-pressure tip: keep salt under ~3g and skip extra-salty snacks.",
  "High Cholesterol": "Cholesterol tip: limit saturated & fried foods today.",
  "Heart Disease": "Heart tip: go low on salt and saturated fat today.",
  "Kidney Disease": "Kidney tip: keep protein and potassium moderate today.",
  "Celiac Disease": "Celiac tip: scan packaged foods — hidden gluten is common.",
  "Lactose Intolerance": "Lactose tip: check labels for milk, whey & casein.",
  Gout: "Gout tip: go easy on red meat and alcohol today.",
  "Thyroid Disorder": "Thyroid tip: don't overdo soy and raw cruciferous veg.",
};

const GENERIC_TIPS = [
  "Scan before you snack — small swaps add up over a week.",
  "Aim for 5 portions of fruit & veg today.",
  "Choose water over sugary drinks when you can.",
  "Check the Nutri-Score before buying — A/B beats D/E.",
];

const shortMedName = (med: string) =>
  med.split("(")[0].split("/")[0].trim();

// Builds a list of tips relevant to the active profile and rotates daily so it
// feels fresh without any backend call.
export const getDailyTip = async (): Promise<string> => {
  const p = await getActiveProfile();
  const tips: string[] = [];

  for (const med of p.medications || []) {
    if (med === "None") continue;
    if (MEDICATION_INTERACTIONS[med]) {
      tips.push(`You take ${shortMedName(med)} — ${MED_TIPS[med] ?? "check labels for known interactions."}`);
    }
  }

  for (const c of p.medical_conditions || []) {
    if (CONDITION_TIPS[c]) tips.push(CONDITION_TIPS[c]);
  }

  const realAllergies = (p.allergies || []).filter((a) => a && a !== "None");
  if (realAllergies.length > 0) {
    tips.push(
      `Scan before trying new packaged foods — we'll flag your ${realAllergies[0]} allergy.`
    );
  }

  if (tips.length === 0) tips.push(...GENERIC_TIPS);

  const dayIndex = Math.floor(Date.now() / 86_400_000);
  return tips[dayIndex % tips.length];
};
