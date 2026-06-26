import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LabelProduct, scanLabel } from "@/services/labelScan";
import handleSummary from "@/services/summary";
import { getActiveProfile } from "@/services/familyProfile";
import { AllergenHit, matchAllergens } from "@/constants/allergenKeywords";
import { MedicationWarning } from "@/constants/medicationInteractions";

type Phase = "idle" | "processing" | "result";

interface Result {
  product: LabelProduct;
  summary: string | null;
  medicationWarnings: MedicationWarning[];
  allergenHits: AllergenHit[];
  profileName: string;
}

const num = (v: number | null) => (v === null || v === undefined ? "N/A" : v);

const LabelScan = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("Reading the label…");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const reset = () => {
    setResult(null);
    setError("");
    setPhase("idle");
  };

  const pickFrom = async (source: "camera" | "library") => {
    setError("");
    try {
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Camera needed", "Please allow camera access to scan a label.");
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Photos needed", "Please allow photo access to pick a label image.");
          return;
        }
      }

      const opts = { quality: 0.5, base64: true } as const;
      const res =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);

      if (res.canceled || !res.assets?.length) return;
      await analyze(res.assets[0]);
    } catch (e: any) {
      console.error("Label pick error:", e);
      setError(e?.message ? `Error: ${e.message}` : "Couldn't open the camera. Please try again.");
    }
  };

  const analyze = async (asset: ImagePicker.ImagePickerAsset) => {
    setPhase("processing");
    try {
      setStatus("Preparing image…");
      let base64: string | null = asset.base64 ?? null;
      // Downscale for a smaller upload / fewer tokens; fall back to original.
      try {
        const rendered = await ImageManipulator.manipulate(asset.uri)
          .resize({ width: 1080 })
          .renderAsync();
        const out = await rendered.saveAsync({
          compress: 0.6,
          format: SaveFormat.JPEG,
          base64: true,
        });
        if (out.base64) base64 = out.base64;
      } catch (manipErr) {
        console.warn("Image resize failed, using original:", manipErr);
      }
      if (!base64) throw new Error("Could not read the selected image");
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      setStatus("Reading the label…");
      const product = await scanLabel(dataUrl);
      if ("error" in product || product.error) {
        setError(
          ("error" in product && product.error) ||
            "Couldn't read the label. Make sure the ingredients list is clear and well lit."
        );
        setPhase("idle");
        return;
      }

      setStatus("Checking against your profile…");
      const profile = await getActiveProfile();
      const summData = {
        product_name: product.product_name || "Unknown Product",
        ingredients: product.ingredients_text || "Not available",
        allergens: product.allergens || "None listed",
        additives: product.additives_tags || [],
        nutritional_info: {
          sugar: String(num(product.nutriments?.sugars_100g)),
          fat: String(num(product.nutriments?.fat_100g)),
          salt: String(num(product.nutriments?.salt_100g)),
          calories: String(num(product.nutriments?.["energy-kcal_100g"])),
          proteins: String(num(product.nutriments?.proteins_100g)),
        },
        labels: [],
        nova_score: 0,
        nutrition_grade: "N/A",
      };

      const summary = await handleSummary(summData as any);
      const allergenHits = matchAllergens(
        `${product.ingredients_text} ${product.allergens}`,
        profile.allergies
      );

      setResult({
        product,
        summary: summary.summary,
        medicationWarnings: summary.medicationWarnings,
        allergenHits,
        profileName: summary.profileName,
      });
      setPhase("result");
    } catch (e: any) {
      console.error("Label analyze error:", e);
      setError(e?.message ? `Error: ${e.message}` : "Something went wrong reading the label.");
      setPhase("idle");
    }
  };

  // --- Processing ---
  if (phase === "processing") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={{ color: "#374151", fontSize: 14, marginTop: 14 }}>{status}</Text>
      </View>
    );
  }

  // --- Result ---
  if (phase === "result" && result) {
    const unsafe = result.allergenHits.length > 0;
    const caution = !unsafe && result.medicationWarnings.length > 0;
    const banner = unsafe
      ? { bg: "#fee2e2", color: "#991b1b", icon: "alert-circle" as const, title: "Not safe for you" }
      : caution
      ? { bg: "#fef3c7", color: "#92400e", icon: "warning" as const, title: "Caution" }
      : { bg: "#dcfce7", color: "#166534", icon: "checkmark-circle" as const, title: "No flagged allergens" };

    return (
      <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={[styles.banner, { backgroundColor: banner.bg }]}>
          <Ionicons name={banner.icon} size={26} color={banner.color} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ color: banner.color, fontWeight: "800", fontSize: 16 }}>{banner.title}</Text>
            {unsafe ? (
              <Text style={{ color: banner.color, fontSize: 13, marginTop: 2 }}>
                Contains {result.allergenHits.map((h) => h.allergy).join(", ")} — in your allergy list.
              </Text>
            ) : caution ? (
              <Text style={{ color: banner.color, fontSize: 13, marginTop: 2 }}>
                Possible medication interaction — see below.
              </Text>
            ) : (
              <Text style={{ color: banner.color, fontSize: 13, marginTop: 2 }}>
                Nothing from your allergy list was detected. Always double-check.
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.productName}>{result.product.product_name || "Unknown Product"}</Text>
        <Text style={{ color: "#9ca3af", fontSize: 12, marginBottom: 14 }}>
          📷 Read from label · for {result.profileName}
        </Text>

        {result.allergenHits.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚠️ Detected allergens</Text>
            {result.allergenHits.map((h) => (
              <Text key={h.allergy} style={{ color: "#b91c1c", fontSize: 13, marginTop: 2 }}>
                {h.allergy}: found "{h.matched.join(", ")}"
              </Text>
            ))}
          </View>
        )}

        {result.medicationWarnings.length > 0 && (
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#dc2626" }]}>
            <Text style={styles.cardTitle}>💊 Medication interactions</Text>
            {result.medicationWarnings.map((w, i) => (
              <View key={i} style={{ marginTop: 6 }}>
                <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 13 }}>{w.medication}</Text>
                <Text style={{ color: "#6b7280", fontSize: 12 }}>Contains: {w.triggeredBy.join(", ")}</Text>
                <Text style={{ color: "#374151", fontSize: 12, marginTop: 1 }}>{w.reason}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🥗 Ingredients</Text>
          <Text style={{ color: "#374151", fontSize: 13, lineHeight: 19 }}>
            {result.product.ingredients_text || "Not detected"}
          </Text>
          {result.product.allergens ? (
            <Text style={{ color: "#92400e", fontSize: 12, marginTop: 8 }}>
              Label allergens: {result.product.allergens}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🤖 AI Summary</Text>
          <Text style={{ color: "#374151", fontSize: 13, lineHeight: 19 }}>
            {result.summary || "No summary available."}
          </Text>
        </View>

        <TouchableOpacity onPress={reset} style={styles.primaryBtn}>
          <Ionicons name="camera" size={18} color="#fff" />
          <Text style={[styles.primaryBtnText, { marginLeft: 6 }]}>Scan Another Label</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // --- Idle (choose source) ---
  return (
    <View style={styles.idle}>
      <View style={styles.illus}>
        <Ionicons name="document-text-outline" size={56} color="#15803d" />
      </View>
      <Text style={styles.idleTitle}>Scan an ingredients label</Text>
      <Text style={styles.idleSub}>
        For products with no barcode (or not in our database). Capture the
        ingredients list clearly and well lit, then we'll check it against your
        health profile.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.primaryBtn} onPress={() => pickFrom("camera")}>
        <Ionicons name="camera" size={18} color="#fff" />
        <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Take a Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => pickFrom("library")}>
        <Ionicons name="images-outline" size={18} color="#15803d" />
        <Text style={[styles.secondaryBtnText, { marginLeft: 8 }]}>Choose from Gallery</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f9fafb" },
  idle: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: "#f9fafb" },
  illus: {
    alignSelf: "center",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  idleTitle: { fontSize: 20, fontWeight: "800", color: "#111827", textAlign: "center" },
  idleSub: { fontSize: 14, color: "#6b7280", textAlign: "center", marginTop: 8, marginBottom: 24, lineHeight: 20 },
  banner: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 16, marginBottom: 14 },
  productName: { fontSize: 20, fontWeight: "800", color: "#111827" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 6 },
  errorText: { color: "#dc2626", fontSize: 13, textAlign: "center", marginBottom: 14 },
  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#15803d",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: {
    flexDirection: "row",
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryBtnText: { color: "#15803d", fontWeight: "700", fontSize: 15 },
});

export default LabelScan;
