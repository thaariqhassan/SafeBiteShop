import AsyncStorage from "@react-native-async-storage/async-storage";
import { NutritionLimit } from "@/constants/nutritionLimits";

const STREAK_KEY = "safebite_health_streak_v1";
const QUALIFY_SCORE = 50; // a day "counts" for the streak at/above this score

export interface Totals {
  calories: number;
  sugar: number;
  fat: number;
  salt: number;
  protein: number;
}

export interface HealthScore {
  score: number;
  breakdown: { label: string; pct: number; over: boolean }[];
}

// "Lower is better" nutrients are penalised for exceeding their limit; protein
// is rewarded up to its target. Returns null when there is nothing logged yet.
export const computeHealthScore = (
  totals: Totals,
  limits: NutritionLimit,
  hasLogs: boolean
): HealthScore | null => {
  if (!hasLogs) return null;

  const lowerBetter = (value: number, limit: number) => {
    const ratio = limit > 0 ? value / limit : 0;
    return ratio <= 1 ? 100 : Math.max(0, Math.round(100 - (ratio - 1) * 100));
  };
  const higherBetter = (value: number, limit: number) => {
    const ratio = limit > 0 ? value / limit : 0;
    return Math.min(100, Math.round(ratio * 100));
  };

  const parts = [
    { label: "Calories", sub: lowerBetter(totals.calories, limits.calories), value: totals.calories, limit: limits.calories },
    { label: "Sugar", sub: lowerBetter(totals.sugar, limits.sugar), value: totals.sugar, limit: limits.sugar },
    { label: "Fat", sub: lowerBetter(totals.fat, limits.fat), value: totals.fat, limit: limits.fat },
    { label: "Salt", sub: lowerBetter(totals.salt, limits.salt), value: totals.salt, limit: limits.salt },
    { label: "Protein", sub: higherBetter(totals.protein, limits.protein), value: totals.protein, limit: limits.protein },
  ];

  const score = Math.round(parts.reduce((a, p) => a + p.sub, 0) / parts.length);
  return {
    score,
    breakdown: parts.map((p) => ({
      label: p.label,
      pct: Math.min(100, Math.round(p.limit > 0 ? (p.value / p.limit) * 100 : 0)),
      over: p.label !== "Protein" && p.value > p.limit,
    })),
  };
};

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// Updates the local streak based on today's score, idempotent per day.
export const updateStreak = async (score: number | null): Promise<number> => {
  try {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const raw = await AsyncStorage.getItem(STREAK_KEY);
    const state: { lastDate: string; count: number } = raw
      ? JSON.parse(raw)
      : { lastDate: "", count: 0 };

    // No qualifying day yet — just report current count.
    if (score === null || score < QUALIFY_SCORE) return state.count;

    const todayKey = dayKey(today);
    if (state.lastDate === todayKey) return state.count; // already counted today

    const next =
      state.lastDate === dayKey(yesterday) ? state.count + 1 : 1;
    const newState = { lastDate: todayKey, count: next };
    await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(newState));
    return next;
  } catch {
    return 0;
  }
};

export const getStreak = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    if (!raw) return 0;
    const state = JSON.parse(raw);
    // Streak is broken if the last qualifying day was before yesterday.
    const yesterday = new Date();
    yesterday.setDate(new Date().getDate() - 1);
    if (state.lastDate < dayKey(yesterday)) return 0;
    return state.count ?? 0;
  } catch {
    return 0;
  }
};
