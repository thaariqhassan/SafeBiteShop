import { getActiveProfile } from "./familyProfile";
import {
  checkMedicationInteractions,
  MedicationWarning,
} from "@/constants/medicationInteractions";

const BASE_URL = "https://safebite-28tg.onrender.com";

export interface Recipe {
  name: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
  instructions: string[];
  usesYourIngredients: string[];
  needToBuy: string[];
  safeFor: string;
  tags: string[];
  medicationWarnings: MedicationWarning[];
}

export interface MealPlanMeal {
  type: string;
  name: string;
  description: string;
  calories: number;
  mainIngredients: string[];
}
export interface MealPlanDay {
  day: number;
  meals: MealPlanMeal[];
}
export interface MealPlan {
  mealPlan: MealPlanDay[];
  shoppingList: string[];
}

const buildProfilePayload = (profile: Awaited<ReturnType<typeof getActiveProfile>>) => ({
  allergies: profile.allergies,
  conditions: profile.medical_conditions,
  dietary: profile.dietary_restrictions,
  medications: profile.medications,
});

export const generateRecipes = async (
  ingredients: string[]
): Promise<{ recipes: Recipe[]; profileName: string; error?: string }> => {
  try {
    const profile = await getActiveProfile();
    const res = await fetch(`${BASE_URL}/api/recipes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients, userProfile: buildProfilePayload(profile) }),
    });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.recipes)) {
      return { recipes: [], profileName: profile.name, error: data.error || "No recipes" };
    }
    // Defence in depth: independently flag medication interactions on the
    // ingredients the AI returned, rather than trusting the model alone.
    const recipes: Recipe[] = data.recipes.map((r: any) => ({
      name: r.name ?? "Recipe",
      description: r.description ?? "",
      prepTime: Number(r.prepTime) || 0,
      cookTime: Number(r.cookTime) || 0,
      servings: Number(r.servings) || 2,
      difficulty: r.difficulty ?? "easy",
      calories: Number(r.calories) || 0,
      protein: Number(r.protein) || 0,
      carbs: Number(r.carbs) || 0,
      fat: Number(r.fat) || 0,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
      instructions: Array.isArray(r.instructions) ? r.instructions : [],
      usesYourIngredients: Array.isArray(r.usesYourIngredients) ? r.usesYourIngredients : [],
      needToBuy: Array.isArray(r.needToBuy) ? r.needToBuy : [],
      safeFor: r.safeFor ?? "",
      tags: Array.isArray(r.tags) ? r.tags : [],
      medicationWarnings: checkMedicationInteractions(
        (Array.isArray(r.ingredients) ? r.ingredients.join(", ") : ""),
        profile.medications
      ),
    }));
    return { recipes, profileName: profile.name };
  } catch (error) {
    console.error("Error generating recipes:", error);
    return { recipes: [], profileName: "You", error: "Network error" };
  }
};

export const generateMealPlan = async (
  ingredients: string[] = []
): Promise<{ plan: MealPlan | null; error?: string }> => {
  try {
    const profile = await getActiveProfile();
    const res = await fetch(`${BASE_URL}/api/recipes/mealplan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients, userProfile: buildProfilePayload(profile), days: 7 }),
    });
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.mealPlan)) {
      return { plan: null, error: data.error || "No meal plan" };
    }
    return {
      plan: { mealPlan: data.mealPlan, shoppingList: data.shoppingList ?? [] },
    };
  } catch (error) {
    console.error("Error generating meal plan:", error);
    return { plan: null, error: "Network error" };
  }
};
