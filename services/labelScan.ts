const BASE_URL = "https://safebite-28tg.onrender.com";

export interface LabelProduct {
  product_name: string;
  ingredients_text: string;
  allergens: string;
  additives_tags: string[];
  nutriments: {
    "energy-kcal_100g": number | null;
    sugars_100g: number | null;
    fat_100g: number | null;
    salt_100g: number | null;
    proteins_100g: number | null;
  };
  error?: string;
}

// Sends a base64 data-URL photo of a label to the backend vision endpoint and
// returns the extracted product data (or { error } if unreadable).
export const scanLabel = async (
  imageDataUrl: string
): Promise<LabelProduct | { error: string }> => {
  try {
    const res = await fetch(`${BASE_URL}/api/scan-label`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageDataUrl }),
    });
    const data = await res.json();
    if (!res.ok || !data.product) {
      return { error: data.error || "Couldn't read the label. Try again." };
    }
    return data.product;
  } catch (error) {
    console.error("Label scan request failed:", error);
    return { error: "Network error. Check your connection and try again." };
  }
};
