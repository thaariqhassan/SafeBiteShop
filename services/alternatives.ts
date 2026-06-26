import { getActiveProfile } from "./familyProfile";

const BASE_URL = "https://safebite-28tg.onrender.com";

export interface AlternativeProduct {
  id: string;
  name: string;
  nutriscore_grade: string;
  image: string | null;
}

// Given a scanned product, fetch healthier, profile-safe alternatives and
// resolve their images from OpenFoodFacts so they can be shown as cards.
export const getHealthierAlternatives = async (product: {
  id: string;
  product_name?: string;
  ingredients_text?: string;
  nutriscore_grade?: string;
  nutriments?: any;
}): Promise<AlternativeProduct[]> => {
  try {
    const profile = await getActiveProfile();
    const res = await fetch(`${BASE_URL}/api/alternatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product,
        userProfile: {
          allergies: profile.allergies,
          conditions: profile.medical_conditions,
          dietary: profile.dietary_restrictions,
        },
      }),
    });
    const data = await res.json();
    const list: any[] = Array.isArray(data.alternatives) ? data.alternatives : [];

    const withImages = await Promise.all(
      list.map(async (alt) => {
        let image: string | null = null;
        try {
          const r = await fetch(
            `https://world.openfoodfacts.org/api/v2/product/${alt.id}?fields=image_url`
          );
          const d = await r.json();
          image = d?.product?.image_url || null;
        } catch {
          // image is optional
        }
        return {
          id: alt.id,
          name: alt.name || "Product",
          nutriscore_grade: alt.nutriscore_grade || "?",
          image,
        };
      })
    );
    return withImages;
  } catch (error) {
    console.error("Error fetching alternatives:", error);
    return [];
  }
};
