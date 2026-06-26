import { ProductData } from "../product/[id]";
import { supabase } from "@/lib/supabase";
import { checkMedicationInteractions, MedicationWarning } from "@/constants/medicationInteractions";

export interface SummaryResult {
  summary: string | null;
  medicationWarnings: MedicationWarning[];
}

const handleSummary = async (productData: ProductData): Promise<SummaryResult> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("Customerdetails")
      .select()
      .eq("id", user?.user?.id);

    const allergies = data?.[0]?.allergies ?? [];
    const conditions = data?.[0]?.medical_conditions ?? [];
    const medications: string[] = data?.[0]?.medications ?? [];

    const medicationWarnings = checkMedicationInteractions(
      productData.ingredients,
      medications
    );

    const res = await fetch("https://safebite-28tg.onrender.com/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userProfile: { allergies, conditions, medications },
        productData,
      }),
    });
    const result = await res.json();
    return { summary: result.summary ?? null, medicationWarnings };
  } catch (error) {
    console.error("Error handling summary:", error);
    return { summary: null, medicationWarnings: [] };
  }
};

export default handleSummary;
