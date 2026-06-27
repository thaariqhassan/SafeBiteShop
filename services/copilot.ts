import { getActiveProfile } from "./familyProfile";
import { getAllCachedProducts } from "./scanCache";

const BASE_URL = "https://safebite-28tg.onrender.com";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Sends the running conversation plus the active profile and a digest of
// recently scanned products to the Gemini-backed co-pilot endpoint. An optional
// productContext focuses Sage on a specific product the user opened.
export const askCopilot = async (
  messages: ChatMessage[],
  productContext?: string
): Promise<{ reply: string; error?: string }> => {
  try {
    const profile = await getActiveProfile();
    const cached = await getAllCachedProducts();

    const recentScans = cached.slice(0, 15).map((e) => {
      const p = e.product || {};
      const note =
        e.medicationWarnings && e.medicationWarnings.length
          ? "flagged for a medication interaction"
          : undefined;
      return { name: p.product_name || "Scanned product", note };
    });

    const res = await fetch(`${BASE_URL}/api/copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        userProfile: {
          name: profile.name,
          allergies: profile.allergies,
          conditions: profile.medical_conditions,
          medications: profile.medications,
          dietary: profile.dietary_restrictions,
        },
        recentScans,
        productContext: productContext || "",
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.reply) {
      return { reply: "", error: data.error || "No response from the co-pilot" };
    }
    return { reply: data.reply };
  } catch (error) {
    console.error("Co-pilot request failed:", error);
    return { reply: "", error: "Network error — check your connection." };
  }
};
