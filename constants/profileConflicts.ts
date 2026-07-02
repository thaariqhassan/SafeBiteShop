// Deterministic medical-condition checks against an OpenFoodFacts product,
// mirroring the thresholds used by the backend recommendation filter
// (backend/utils/profileSafety.js). Used for the instant on-device verdict
// banner — no network or AI call needed.

export interface ConditionConflict {
  condition: string;
  reason: string;
}

const GLUTEN_RE = /gluten|wheat|barley|rye|malt|spelt|blé|weizen|trigo|orge|seigle/i;
const DAIRY_RE = /milk|lactose|cheese|butter|cream|whey|casein|lait|milch|leche|fromage|beurre/i;

const num = (v: any): number => (typeof v === "number" && isFinite(v) ? v : 0);

export const getConditionConflicts = (
  product: any,
  conditions: string[]
): ConditionConflict[] => {
  const n = product?.nutriments || {};
  const text = `${product?.product_name || ""} ${product?.ingredients_text || ""} ${
    product?.allergens || ""
  }`.toLowerCase();
  const out: ConditionConflict[] = [];

  for (const raw of conditions || []) {
    const c = raw.toLowerCase().trim();
    if (!c || c === "none") continue;

    if (c === "diabetes" && (num(n.sugars_100g) > 5 || num(n.carbohydrates_100g) > 20)) {
      out.push({
        condition: raw,
        reason:
          num(n.sugars_100g) > 5
            ? `${n.sugars_100g}g sugar per 100g`
            : `${n.carbohydrates_100g}g carbs per 100g`,
      });
    }
    if (c === "hypertension" && (num(n.salt_100g) > 0.3 || num(n.sodium_100g) > 0.12)) {
      out.push({ condition: raw, reason: `high salt (${n.salt_100g ?? n.sodium_100g}g per 100g)` });
    }
    if (c === "high cholesterol" && num(n["saturated-fat_100g"]) > 2) {
      out.push({ condition: raw, reason: `${n["saturated-fat_100g"]}g saturated fat per 100g` });
    }
    if (c === "celiac disease" && GLUTEN_RE.test(text)) {
      out.push({ condition: raw, reason: "may contain gluten" });
    }
    if (c === "lactose intolerance" && DAIRY_RE.test(text)) {
      out.push({ condition: raw, reason: "contains dairy/lactose" });
    }
    if (c === "heart disease" && (num(n.salt_100g) > 0.3 || num(n["saturated-fat_100g"]) > 3)) {
      out.push({ condition: raw, reason: "high salt or saturated fat" });
    }
    if (c === "kidney disease" && num(n.proteins_100g) > 10) {
      out.push({ condition: raw, reason: `${n.proteins_100g}g protein per 100g` });
    }
  }
  return out;
};
