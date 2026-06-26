export interface NutritionLimit {
  calories: number;
  sugar: number;
  fat: number;
  salt: number;
  protein: number;
}

export const DEFAULT_DAILY_LIMITS: NutritionLimit = {
  calories: 2000,
  sugar: 50,
  fat: 70,
  salt: 6,
  protein: 50,
};

const CONDITION_OVERRIDES: Record<string, Partial<NutritionLimit>> = {
  Diabetes: { sugar: 25 },
  Hypertension: { salt: 3 },
  "Heart Disease": { salt: 3, fat: 55 },
  "Kidney Disease": { protein: 40 },
};

export const getNutritionLimits = (conditions: string[]): NutritionLimit => {
  const limits = { ...DEFAULT_DAILY_LIMITS };
  for (const condition of conditions) {
    const override = CONDITION_OVERRIDES[condition];
    if (override) Object.assign(limits, override);
  }
  return limits;
};
