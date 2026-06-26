import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import RecipeCard from "@/components/RecipeCard";
import {
  generateMealPlan,
  generateRecipes,
  MealPlan,
  Recipe,
} from "@/services/recipes";

const recipes = () => {
  const [input, setInput] = useState("");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [recipeList, setRecipeList] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState<"recipes" | "plan" | null>(null);
  const [error, setError] = useState("");

  const addIngredient = () => {
    const v = input.trim();
    if (!v) return;
    if (!ingredients.some((i) => i.toLowerCase() === v.toLowerCase())) {
      setIngredients((prev) => [...prev, v]);
    }
    setInput("");
  };

  const removeIngredient = (v: string) =>
    setIngredients((prev) => prev.filter((i) => i !== v));

  const onRecipes = async () => {
    if (ingredients.length === 0) {
      setError("Add at least one ingredient first.");
      return;
    }
    setError("");
    setMealPlan(null);
    setLoading("recipes");
    const { recipes: r, error: e } = await generateRecipes(ingredients);
    if (e) setError(e);
    setRecipeList(r);
    setLoading(null);
  };

  const onMealPlan = async () => {
    setError("");
    setRecipeList([]);
    setLoading("plan");
    const { plan, error: e } = await generateMealPlan(ingredients);
    if (e) setError(e);
    setMealPlan(plan);
    setLoading(null);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 20, fontWeight: "bold", color: "#111827" }}>
        Recipe Suggestions
      </Text>
      <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 2, marginBottom: 14 }}>
        Add what you have — we'll suggest recipes that are safe for your health
        profile.
      </Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addIngredient}
          placeholder="e.g. chicken, rice, broccoli"
          placeholderTextColor="#9ca3af"
          returnKeyType="done"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: "#111827",
            backgroundColor: "#fff",
          }}
        />
        <TouchableOpacity
          onPress={addIngredient}
          style={{
            backgroundColor: "#15803d",
            borderRadius: 10,
            paddingHorizontal: 16,
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {ingredients.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {ingredients.map((ing) => (
            <TouchableOpacity
              key={ing}
              onPress={() => removeIngredient(ing)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#dcfce7",
                borderRadius: 99,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: "#166534", fontSize: 13, fontWeight: "600" }}>{ing}</Text>
              <Ionicons name="close-circle" size={15} color="#166534" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <TouchableOpacity
          onPress={onRecipes}
          disabled={loading !== null}
          style={{
            flex: 1,
            backgroundColor: "#15803d",
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {loading === "recipes" ? "Cooking…" : "Suggest Recipes"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMealPlan}
          disabled={loading !== null}
          style={{
            flex: 1,
            backgroundColor: "#004d00",
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {loading === "plan" ? "Planning…" : "7-Day Meal Plan"}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <Text style={{ color: "#dc2626", fontSize: 13, marginTop: 12 }}>{error}</Text>
      ) : null}

      {loading && (
        <View style={{ alignItems: "center", marginTop: 30 }}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>
            Asking the AI chef… (first call can take a few seconds)
          </Text>
        </View>
      )}

      {!loading && recipeList.length > 0 && (
        <View style={{ marginTop: 20 }}>
          {recipeList.map((r, i) => (
            <RecipeCard key={`${r.name}-${i}`} recipe={r} />
          ))}
        </View>
      )}

      {!loading && mealPlan && (
        <View style={{ marginTop: 20 }}>
          {mealPlan.mealPlan.map((day) => (
            <View
              key={day.day}
              style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                elevation: 1,
              }}
            >
              <Text style={{ fontWeight: "700", color: "#15803d", marginBottom: 8 }}>
                Day {day.day}
              </Text>
              {day.meals.map((meal, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text style={{ fontWeight: "600", color: "#111827", fontSize: 13 }}>
                    {meal.type ? meal.type[0].toUpperCase() + meal.type.slice(1) : "Meal"}: {meal.name}
                    <Text style={{ color: "#9ca3af", fontWeight: "400" }}>
                      {"  "}· {meal.calories} kcal
                    </Text>
                  </Text>
                  <Text style={{ color: "#6b7280", fontSize: 12 }}>{meal.description}</Text>
                </View>
              ))}
            </View>
          ))}
          {mealPlan.shoppingList.length > 0 && (
            <View
              style={{
                backgroundColor: "#fffbeb",
                borderRadius: 12,
                padding: 14,
                marginTop: 4,
              }}
            >
              <Text style={{ fontWeight: "700", color: "#92400e", marginBottom: 6 }}>
                🛒 Shopping List
              </Text>
              {mealPlan.shoppingList.map((item, i) => (
                <Text key={i} style={{ color: "#78350f", fontSize: 13 }}>
                  • {item}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

export default recipes;
