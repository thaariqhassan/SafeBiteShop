import { getActiveProfile } from "./familyProfile";

const BASE_URL = "https://safebite-28tg.onrender.com";

export type Verdict = "safe" | "caution" | "avoid";

export interface MenuDish {
  dish: string;
  verdict: Verdict;
  reason: string;
  concerns: string[];
}

// Sends a menu photo + the active profile to the backend and returns each dish
// rated safe / caution / avoid for that profile.
export const scanMenu = async (
  imageDataUrl: string
): Promise<{ dishes: MenuDish[]; profileName: string; error?: string }> => {
  try {
    const profile = await getActiveProfile();
    const res = await fetch(`${BASE_URL}/api/scan-menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: imageDataUrl,
        userProfile: {
          allergies: profile.allergies,
          conditions: profile.medical_conditions,
          dietary: profile.dietary_restrictions,
          medications: profile.medications,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.dishes)) {
      return { dishes: [], profileName: profile.name, error: data.error || "Couldn't read menu" };
    }
    const dishes: MenuDish[] = data.dishes.map((d: any) => ({
      dish: d.dish ?? "Dish",
      verdict: (["safe", "caution", "avoid"].includes(d.verdict) ? d.verdict : "caution") as Verdict,
      reason: d.reason ?? "",
      concerns: Array.isArray(d.concerns) ? d.concerns : [],
    }));
    return { dishes, profileName: profile.name };
  } catch (error) {
    console.error("Menu scan request failed:", error);
    return { dishes: [], profileName: "You", error: "Network error. Check your connection." };
  }
};
