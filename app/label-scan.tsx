import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LabelProduct, scanLabel } from "@/services/labelScan";
import handleSummary from "@/services/summary";
import { getActiveProfile } from "@/services/familyProfile";
import { AllergenHit, matchAllergens } from "@/constants/allergenKeywords";
import { MedicationWarning } from "@/constants/medicationInteractions";

type Phase = "camera" | "processing" | "result";

interface Result {
  product: LabelProduct;
  summary: string | null;
  medicationWarnings: MedicationWarning[];
  allergenHits: AllergenHit[];
  profileName: string;
}

const num = (v: number | null) => (v === null || v === undefined ? "N/A" : v);

const LabelScan = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<Phase>("camera");
  const [status, setStatus] = useState("Reading the label…");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const reset = () => {
    setResult(null);
    setError("");
    setPhase("camera");
  };

  const capture = async () => {
    if (!cameraRef.current) return;
    setError("");
    setPhase("processing");
    try {
      setStatus("Capturing…");
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) throw new Error("capture failed");

      // Downscale to keep upload small and within free-tier token limits.
      const rendered = await ImageManipulator.manipulate(photo.uri)
        .resize({ width: 1080 })
        .renderAsync();
      const out = await rendered.saveAsync({
        compress: 0.6,
        format: SaveFormat.JPEG,
        base64: true,
      });
      const dataUrl = `data:image/jpeg;base64,${out.base64}`;

      setStatus("Reading the label…");
      const product = await scanLabel(dataUrl);
      if ("error" in product || product.error) {
        setError(
          ("error" in product && product.error) ||
            "Couldn't read the label. Make sure the ingredients list is clear and well lit."
        );
        setPhase("camera");
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
    } catch (e) {
      setError("Something went wrong reading the label. Please try again.");
      setPhase("camera");
    }
  };

  // --- Permission states ---
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={48} color="#9ca3af" />
        <Text style={{ color: "#374151", fontSize: 15, marginTop: 12, textAlign: "center" }}>
          We need camera access to read product labels.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

  // --- Camera ---
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            Point at the ingredients list. Keep it flat, filling the frame, well lit.
          </Text>
        </View>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <TouchableOpacity style={styles.shutter} onPress={capture}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f9fafb" },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between", padding: 20 },
  tipBox: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  tipText: { color: "#fff", fontSize: 13, textAlign: "center" },
  errorBox: { backgroundColor: "rgba(220,38,38,0.9)", borderRadius: 10, padding: 10 },
  errorText: { color: "#fff", fontSize: 13, textAlign: "center" },
  shutter: {
    alignSelf: "center",
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#15803d" },
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
});

export default LabelScan;
