import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { matchAllergens } from "@/constants/allergenKeywords";
import { getConditionConflicts } from "@/constants/profileConflicts";
import { getActiveProfile } from "@/services/familyProfile";
import { hapticSuccess, hapticWarning } from "@/lib/feedback";

type Level = "danger" | "caution" | "safe";

interface Verdict {
  level: Level;
  title: string;
  detail: string;
}

const STYLES: Record<
  Level,
  { bg: string; border: string; text: string; sub: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  danger: { bg: "#fef2f2", border: "#dc2626", text: "#b91c1c", sub: "#7f1d1d", icon: "close-circle" },
  caution: { bg: "#fffbeb", border: "#d97706", text: "#b45309", sub: "#78350f", icon: "alert-circle" },
  safe: { bg: "#f0fdf4", border: "#16a34a", text: "#15803d", sub: "#166534", icon: "checkmark-circle" },
};

// Instant, deterministic "is this safe for ME?" banner. Computed on-device
// from the active profile the moment product data is available — it never
// waits for the AI summary. The AI summary below adds nuance; this answers
// the headline question immediately (and offline).
const SafetyVerdict = ({ product }: { product: any }) => {
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!product) return;

    getActiveProfile().then((profile) => {
      if (cancelled) return;
      const who = profile.isSelf ? "your" : `${profile.name}'s`;

      const text = `${product.product_name || ""} ${product.ingredients_text || ""} ${
        product.allergens || ""
      } ${product.allergens_from_ingredients || ""}`;
      const hits = matchAllergens(text, profile.allergies);
      if (hits.length > 0) {
        hapticWarning();
        setVerdict({
          level: "danger",
          title: `Avoid — matches ${who} ${hits.map((h) => h.allergy).join(", ")} allergy`,
          detail: `Found in this product: ${[...new Set(hits.flatMap((h) => h.matched))].join(", ")}`,
        });
        return;
      }

      const conflicts = getConditionConflicts(product, profile.medical_conditions);
      if (conflicts.length > 0) {
        setVerdict({
          level: "caution",
          title: `Caution with ${who} ${conflicts.map((c) => c.condition).join(", ")}`,
          detail: conflicts.map((c) => c.reason).join(" · "),
        });
        return;
      }

      hapticSuccess();
      setVerdict({
        level: "safe",
        title: "No conflicts with " + who + " profile",
        detail: "Checked against saved allergies and medical conditions",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [product]);

  if (!verdict) return null;
  const s = STYLES[verdict.level];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: s.bg,
        borderLeftWidth: 5,
        borderLeftColor: s.border,
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
      }}
      accessibilityRole="alert"
      accessibilityLabel={`${verdict.title}. ${verdict.detail}`}
    >
      <Ionicons name={s.icon} size={30} color={s.border} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ color: s.text, fontWeight: "800", fontSize: 15 }}>{verdict.title}</Text>
        <Text style={{ color: s.sub, fontSize: 12, marginTop: 2, lineHeight: 17 }}>
          {verdict.detail}
        </Text>
      </View>
    </View>
  );
};

export default SafetyVerdict;
