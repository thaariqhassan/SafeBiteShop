import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Recipe } from "@/services/recipes";

const Pill = ({ text, color, bg }: { text: string; color: string; bg: string }) => (
  <View style={{ backgroundColor: bg, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
    <Text style={{ fontSize: 11, color, fontWeight: "600" }}>{text}</Text>
  </View>
);

const RecipeCard = ({ recipe }: { recipe: Recipe }) => {
  const [open, setOpen] = useState(false);

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <TouchableOpacity onPress={() => setOpen((o) => !o)} activeOpacity={0.8}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 }}>
            {recipe.name}
          </Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color="#15803d" />
        </View>
        <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{recipe.description}</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          <Pill text={`⏱ ${recipe.prepTime + recipe.cookTime} min`} color="#374151" bg="#f3f4f6" />
          <Pill text={`🔥 ${recipe.calories} kcal`} color="#9a3412" bg="#ffedd5" />
          <Pill text={`💪 ${recipe.protein}g protein`} color="#166534" bg="#dcfce7" />
          <Pill text={recipe.difficulty} color="#3730a3" bg="#e0e7ff" />
        </View>
      </TouchableOpacity>

      {recipe.safeFor ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#f0fdf4",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginTop: 10,
          }}
        >
          <Ionicons name="shield-checkmark" size={14} color="#15803d" />
          <Text style={{ fontSize: 12, color: "#166534", marginLeft: 6, flex: 1 }}>
            {recipe.safeFor}
          </Text>
        </View>
      ) : null}

      {recipe.medicationWarnings.length > 0 && (
        <View
          style={{
            backgroundColor: "#fff1f2",
            borderLeftWidth: 3,
            borderLeftColor: "#dc2626",
            borderRadius: 8,
            padding: 10,
            marginTop: 8,
          }}
        >
          <Text style={{ color: "#991b1b", fontWeight: "700", fontSize: 12 }}>
            💊 Medication caution
          </Text>
          {recipe.medicationWarnings.map((w, i) => (
            <Text key={i} style={{ color: "#b91c1c", fontSize: 11, marginTop: 2 }}>
              {w.medication}: contains {w.triggeredBy.join(", ")}
            </Text>
          ))}
        </View>
      )}

      {open && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "700", color: "#111827", fontSize: 13, marginBottom: 6 }}>
            Ingredients
          </Text>
          {recipe.ingredients.map((ing, i) => (
            <Text key={i} style={{ color: "#374151", fontSize: 13, marginBottom: 2 }}>
              • {ing}
            </Text>
          ))}

          {recipe.needToBuy.length > 0 && (
            <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 6 }}>
              🛒 Need to buy: {recipe.needToBuy.join(", ")}
            </Text>
          )}

          <Text style={{ fontWeight: "700", color: "#111827", fontSize: 13, marginTop: 12, marginBottom: 6 }}>
            Steps
          </Text>
          {recipe.instructions.map((step, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 6 }}>
              <Text style={{ color: "#15803d", fontWeight: "700", fontSize: 13, marginRight: 6 }}>
                {i + 1}.
              </Text>
              <Text style={{ color: "#374151", fontSize: 13, flex: 1 }}>{step}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default RecipeCard;
