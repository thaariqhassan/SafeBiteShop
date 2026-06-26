import { ProductData } from "@/app/product/[id]";
import { checkMedicationInteractions, MedicationWarning } from "@/constants/medicationInteractions";
import { getActiveProfile } from "./familyProfile";

export interface SummaryResult {
  summary: string | null;
  medicationWarnings: MedicationWarning[];
  profileName: string;
}

const handleSummary = async (productData: ProductData): Promise<SummaryResult> => {
  try {
    const profile = await getActiveProfile();

    const medicationWarnings = checkMedicationInteractions(
      productData.ingredients,
      profile.medications
    );

    const res = await fetch("https://safebite-28tg.onrender.com/api/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userProfile: {
          allergies: profile.allergies,
          conditions: profile.medical_conditions,
          medications: profile.medications,
        },
        productData,
      }),
    });
    const result = await res.json();
    return {
      summary: result.summary ?? null,
      medicationWarnings,
      profileName: profile.name,
    };
  } catch (error) {
    console.error("Error handling summary:", error);
    return { summary: null, medicationWarnings: [], profileName: "You" };
  }
};

export default handleSummary;
