import { supabase } from "@/lib/supabase";

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
}

export const logNutrition = async (
  productName: string,
  barcode: string,
  nutrients: { calories: number; sugar: number; fat: number; salt: number; protein: number }
): Promise<{ error: any }> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) return { error: "Not authenticated" };
  const { error } = await supabase.from("nutrition_logs").insert({
    user_id: user.user.id,
    product_name: productName,
    barcode,
    calories: nutrients.calories || 0,
    sugar: nutrients.sugar || 0,
    fat: nutrients.fat || 0,
    salt: nutrients.salt || 0,
    protein: nutrients.protein || 0,
  });
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

export const deleteLog = async (logId: string): Promise<{ error: any }> => {
  const { error } = await supabase.from("nutrition_logs").delete().eq("id", logId);
  return { error };
};
