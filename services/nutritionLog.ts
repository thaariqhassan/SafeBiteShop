import { supabase } from "@/lib/supabase";
import { MedicationWarning } from "@/constants/medicationInteractions";

export interface NutritionLogEntry {
  id: string;
  product_name: string;
  barcode: string;
  calories: number;
  sugar: number;
  fat: number;
  salt: number;
  protein: number;
  scanned_at: string;
  // Medication interactions detected for the active profile at the moment this
  // food was logged. null/absent for entries logged before the feature (or
  // before the med_flags column was added).
  med_flags?: MedicationWarning[] | null;
}

export const logNutrition = async (
  productName: string,
  barcode: string,
  nutrients: { calories: number; sugar: number; fat: number; salt: number; protein: number },
  medFlags?: MedicationWarning[]
): Promise<{ error: any }> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) return { error: "Not authenticated" };

  const base = {
    user_id: user.user.id,
    product_name: productName,
    barcode,
    calories: nutrients.calories || 0,
    sugar: nutrients.sugar || 0,
    fat: nutrients.fat || 0,
    salt: nutrients.salt || 0,
    protein: nutrients.protein || 0,
  };
  const hasFlags = medFlags && medFlags.length > 0;

  const { error } = await supabase
    .from("nutrition_logs")
    .insert(hasFlags ? { ...base, med_flags: medFlags } : base);

  // Gracefully degrade if the med_flags column hasn't been migrated yet — the
  // food still gets logged, just without the interaction flags.
  if (error && hasFlags) {
    const { error: retryError } = await supabase.from("nutrition_logs").insert(base);
    return { error: retryError };
  }
  return { error };
};

export const getTodayLogs = async (): Promise<NutritionLogEntry[]> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("nutrition_logs")
    .select("*")
    .eq("user_id", user.user.id)
    .gte("scanned_at", today.toISOString())
    .order("scanned_at", { ascending: false });
  return data ?? [];
};

// Logs since the start of the day `days - 1` days ago (e.g. days = 7 → today
// plus the previous 6 days). Used by the exported health report.
export const getLogsSince = async (days: number): Promise<NutritionLogEntry[]> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) return [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  const { data } = await supabase
    .from("nutrition_logs")
    .select("*")
    .eq("user_id", user.user.id)
    .gte("scanned_at", start.toISOString())
    .order("scanned_at", { ascending: false });
  return data ?? [];
};

export const deleteLog = async (logId: string): Promise<{ error: any }> => {
  const { error } = await supabase.from("nutrition_logs").delete().eq("id", logId);
  return { error };
};
