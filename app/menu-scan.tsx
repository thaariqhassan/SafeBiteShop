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
import { MenuDish, scanMenu, Verdict } from "@/services/menuScan";

type Phase = "idle" | "processing" | "result";

const VERDICT = {
  safe: { bg: "#dcfce7", color: "#166534", icon: "checkmark-circle" as const, label: "Safe", order: 0 },
  caution: { bg: "#fef3c7", color: "#92400e", icon: "warning" as const, label: "Caution", order: 1 },
  avoid: { bg: "#fee2e2", color: "#991b1b", icon: "close-circle" as const, label: "Avoid", order: 2 },
};

const MenuScan = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("Reading the menu…");
  const [error, setError] = useState("");
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [profileName, setProfileName] = useState("");

  const reset = () => {
    setError("");
    setDishes([]);
    setPhase("idle");
  };

  const pickFrom = async (source: "camera" | "library") => {
    setError("");
    try {
      const perm =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow access to scan a menu.");
        return;
      }
      const opts = { quality: 0.5, base64: true } as const;
      const res =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.length) return;
      await analyze(res.assets[0]);
    } catch (e: any) {
      console.error("Menu pick error:", e);
      setError(e?.message ? `Error: ${e.message}` : "Couldn't open the camera. Please try again.");
    }
  };

  const analyze = async (asset: ImagePicker.ImagePickerAsset) => {
    setPhase("processing");
    try {
      setStatus("Preparing image…");
      let base64: string | null = asset.base64 ?? null;
      try {
        const rendered = await ImageManipulator.manipulate(asset.uri)
          .resize({ width: 1280 })
          .renderAsync();
        const out = await rendered.saveAsync({
          compress: 0.6,
          format: SaveFormat.JPEG,
          base64: true,
        });
        if (out.base64) base64 = out.base64;
      } catch (manipErr) {
        console.warn("Menu image resize failed, using original:", manipErr);
      }
      if (!base64) throw new Error("Could not read the selected image");

      setStatus("Checking dishes against your profile…");
      const { dishes: d, profileName: pn, error: e } = await scanMenu(
        `data:image/jpeg;base64,${base64}`
      );
      if (e && d.length === 0) {
        setError(e);
        setPhase("idle");
        return;
      }
      // Sort worst-first so risky dishes are seen immediately.
      d.sort((a, b) => VERDICT[b.verdict].order - VERDICT[a.verdict].order);
      setDishes(d);
      setProfileName(pn);
      setPhase("result");
    } catch (e: any) {
      console.error("Menu analyze error:", e);
      setError(e?.message ? `Error: ${e.message}` : "Something went wrong reading the menu.");
      setPhase("idle");
    }
  };

  if (phase === "processing") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={{ color: "#374151", fontSize: 14, marginTop: 14 }}>{status}</Text>
      </View>
    );
  }

  if (phase === "result") {
    const counts = {
      safe: dishes.filter((d) => d.verdict === "safe").length,
      caution: dishes.filter((d) => d.verdict === "caution").length,
      avoid: dishes.filter((d) => d.verdict === "avoid").length,
    };
    return (
      <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={styles.h1}>Menu check</Text>
        <Text style={{ color: "#9ca3af", fontSize: 12, marginBottom: 12 }}>
          🍽️ For {profileName} · {dishes.length} dishes read
        </Text>

        <View style={styles.summaryRow}>
          <Summary n={counts.safe} label="Safe" v="safe" />
          <Summary n={counts.caution} label="Caution" v="caution" />
          <Summary n={counts.avoid} label="Avoid" v="avoid" />
        </View>

        {dishes.length === 0 ? (
          <Text style={{ color: "#9ca3af", textAlign: "center", marginTop: 30 }}>
            Couldn't read any dishes. Try a clearer, closer photo of the menu.
          </Text>
        ) : (
          dishes.map((d, i) => {
            const v = VERDICT[d.verdict];
            return (
              <View key={`${d.dish}-${i}`} style={[styles.card, { borderLeftColor: v.color, borderLeftWidth: 4 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={styles.dish} numberOfLines={2}>{d.dish}</Text>
                  <View style={[styles.badge, { backgroundColor: v.bg }]}>
                    <Ionicons name={v.icon} size={13} color={v.color} />
                    <Text style={{ color: v.color, fontSize: 11, fontWeight: "700", marginLeft: 3 }}>
                      {v.label}
                    </Text>
                  </View>
                </View>
                {d.reason ? (
                  <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>{d.reason}</Text>
                ) : null}
                {d.concerns.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                    {d.concerns.map((c) => (
                      <View key={c} style={{ backgroundColor: "#f3f4f6", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, color: "#4b5563" }}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 8, marginBottom: 12, textAlign: "center" }}>
          AI estimate from the menu text — confirm with staff for severe allergies.
        </Text>

        <TouchableOpacity onPress={reset} style={styles.secondaryBtn}>
          <Ionicons name="camera" size={18} color="#15803d" />
          <Text style={[styles.secondaryBtnText, { marginLeft: 6 }]}>Scan Another Menu</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Idle
  return (
    <View style={styles.idle}>
      <View style={styles.illus}>
        <Ionicons name="restaurant-outline" size={56} color="#15803d" />
      </View>
      <Text style={styles.idleTitle}>Eat out safely</Text>
      <Text style={styles.idleSub}>
        Photograph a restaurant menu and we'll flag which dishes are safe,
        risky, or best avoided for your health profile.
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

const Summary = ({ n, label, v }: { n: number; label: string; v: Verdict }) => (
  <View style={[styles.summaryPill, { backgroundColor: VERDICT[v].bg }]}>
    <Text style={{ color: VERDICT[v].color, fontWeight: "800", fontSize: 18 }}>{n}</Text>
    <Text style={{ color: VERDICT[v].color, fontSize: 11, fontWeight: "600" }}>{label}</Text>
  </View>
);

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
  h1: { fontSize: 20, fontWeight: "800", color: "#111827" },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  summaryPill: { flex: 1, alignItems: "center", borderRadius: 12, paddingVertical: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  dish: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 },
  badge: { flexDirection: "row", alignItems: "center", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
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

export default MenuScan;
