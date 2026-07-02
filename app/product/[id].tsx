import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import handleSummary, { SummaryResult } from "@/services/summary";
import { MedicationWarning } from "@/constants/medicationInteractions";
import { logNutrition } from "@/services/nutritionLog";
import { cacheProduct, getCachedProduct, updateCachedSummary } from "@/services/scanCache";
import { AlternativeProduct, getHealthierAlternatives } from "@/services/alternatives";
import { speak, stopSpeaking } from "@/services/speech";
import { getReadAloudEnabled } from "@/services/settings";
import SafetyVerdict from "@/components/SafetyVerdict";

export interface ProductData {
  product_name: string;
  ingredients: string;
  allergens: string;
  additives: string[];
  nutritional_info: {
    sugar: string;
    fat: string;
    salt: string;
    calories: string;
    proteins: string;
  };
  labels: string[];
  nova_score: number;
  nutrition_grade: string;
}

// ---- presentational helpers ------------------------------------------------

const Card = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) => (
  <View
    style={[
      {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      },
      style,
    ]}
  >
    {children}
  </View>
);

const SectionHeader = ({
  icon,
  color = "#15803d",
  title,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  title: string;
  right?: React.ReactNode;
}) => (
  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
    <Ionicons name={icon} size={18} color={color} />
    <Text
      style={{ fontSize: 15, fontWeight: "700", color: "#111827", marginLeft: 8, flex: 1 }}
    >
      {title}
    </Text>
    {right}
  </View>
);

const Badge = ({ label, bg, color }: { label: string; bg: string; color: string }) => (
  <View
    style={{
      backgroundColor: bg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 8,
      marginBottom: 6,
    }}
  >
    <Text style={{ color, fontWeight: "700", fontSize: 12 }}>{label}</Text>
  </View>
);

const NUTRI_COLORS: Record<string, string> = {
  a: "#15803d",
  b: "#65a30d",
  c: "#ca8a04",
  d: "#ea580c",
  e: "#dc2626",
};

const NutriScoreBadge = ({ grade }: { grade?: string }) => {
  const g = (grade || "").toLowerCase();
  const color = NUTRI_COLORS[g] || "#6b7280";
  return (
    <View
      style={{
        backgroundColor: color,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 8,
        marginBottom: 6,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>
        Nutri-Score {grade ? grade.toUpperCase() : "N/A"}
      </Text>
    </View>
  );
};

const NutrientStat = ({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit: string;
}) => (
  <View style={{ width: "33.33%", paddingVertical: 8 }}>
    <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>
      {value}
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#9ca3af" }}> {unit}</Text>
    </Text>
    <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{label}</Text>
  </View>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={{ fontSize: 12, fontWeight: "700", color: "#6b7280", marginBottom: 2 }}>
      {label}
    </Text>
    <Text style={{ fontSize: 13, color: "#374151", lineHeight: 18 }}>{value}</Text>
  </View>
);

const cleanTags = (tags?: string[]): string =>
  tags && tags.length ? tags.map((t) => t.replace("en:", "")).join(", ") : "";

// ---- screen ----------------------------------------------------------------

const ProductSummary = () => {
  const { id } = useLocalSearchParams();
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState<boolean>(true);
  const [summData, setSummData] = useState<ProductData>();
  const [summaryData, setSummaryData] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [medicationWarnings, setMedicationWarnings] = useState<MedicationWarning[]>([]);
  const [profileName, setProfileName] = useState<string>("");
  const [fromCache, setFromCache] = useState(false);
  const [logged, setLogged] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const [altLoading, setAltLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [readAloud, setReadAloud] = useState(false);

  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    getReadAloudEnabled().then(setReadAloud);
    // Stop any narration when leaving the screen.
    return () => stopSpeaking();
  }, []);

  const autoSpoken = useRef(false);

  // Compose the spoken safety verdict — product, allergens, medication
  // interactions, then the AI summary — for low-vision / hands-busy users.
  const buildVerdict = (): string => {
    const parts: string[] = [];
    parts.push(productData?.product_name || "Unknown product");
    if (productData?.allergens) parts.push(`Allergens: ${productData.allergens}.`);
    if (medicationWarnings.length > 0) {
      parts.push("Warning: medication interaction detected.");
      medicationWarnings.forEach((w) => parts.push(`${w.medication}. ${w.reason}.`));
    }
    if (summaryData) parts.push(summaryData);
    return parts.join(". ");
  };

  const startVerdict = () => {
    speak(buildVerdict(), {
      onStart: () => setSpeaking(true),
      onDone: () => setSpeaking(false),
    });
  };

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    startVerdict();
  };

  // When read-aloud is enabled, automatically narrate the verdict once the AI
  // summary is ready (only once per product view).
  useEffect(() => {
    if (!readAloud || summaryLoading || autoSpoken.current) return;
    if (summaryData || medicationWarnings.length > 0) {
      autoSpoken.current = true;
      startVerdict();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readAloud, summaryLoading, summaryData, medicationWarnings]);

  // Open Sage focused on this specific product.
  const askSageAboutThis = () => {
    stopSpeaking();
    const bits: string[] = [`Product: ${productData?.product_name || "Unknown"}.`];
    if (productData?.allergens) bits.push(`Allergens listed: ${productData.allergens}.`);
    if (productData?.ingredients_text)
      bits.push(`Ingredients: ${String(productData.ingredients_text).slice(0, 300)}.`);
    if (productData?.nutriscore_grade)
      bits.push(`Nutri-Score: ${String(productData.nutriscore_grade).toUpperCase()}.`);
    if (medicationWarnings.length > 0)
      bits.push(
        `Flagged medication interactions: ${medicationWarnings
          .map((w) => w.medication)
          .join(", ")}.`
      );
    router.push({
      pathname: "/copilot",
      params: {
        seed: "Is this product safe for me?",
        productContext: bits.join(" "),
      },
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      const applyProduct = (p: any) => {
        setProductData(p);
        setSummData({
          product_name: p?.product_name || "Unknown Product",
          ingredients: p?.ingredients_text || "Not available",
          allergens: p?.allergens || "None listed",
          additives: p?.additives_tags || [],
          nutritional_info: {
            sugar: p?.nutriments?.sugars_100g || "N/A",
            fat: p?.nutriments?.fat_100g || "N/A",
            salt: p?.nutriments?.salt_100g || "N/A",
            calories: p?.nutriments?.energy_kcal_100g || "N/A",
            proteins: p?.nutriments?.proteins_100g || "N/A",
          },
          labels: p?.labels_tags || [],
          nova_score: p?.nova_group || 0,
          nutrition_grade: p?.nutrition_grades || "N/A",
        });
        setImgUri(
          p?.selected_images?.front?.display?.fr ??
            p?.selected_images?.front?.display?.en ??
            (p?.selected_images?.front?.display?.default ||
              p?.image_url ||
              "https://placehold.co/360x260?text=No+Image&font=roboto"),
        );
        navigation.setOptions({ title: p?.product_name || "Product Info" });
      };

      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${id}.json`,
        );
        const data = await res.json();
        if (data.status === 1) {
          applyProduct(data.product);
          // save raw product to cache (summary saved separately after AI call)
          await cacheProduct({
            id: String(id),
            product: data.product,
            summary: null,
            medicationWarnings: [],
            profileName: "",
            cachedAt: Date.now(),
          });
        } else {
          setNotFound(true);
        }
      } catch {
        // network failure — try local cache
        const cached = await getCachedProduct(String(id));
        if (cached) {
          applyProduct(cached.product);
          setSummaryData(cached.summary);
          setMedicationWarnings(cached.medicationWarnings);
          setProfileName(cached.profileName);
          setFromCache(true);
          setSummaryLoading(false);
        } else {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    const fetchSummary = async () => {
      if (fromCache || !summData) return;
      setSummaryLoading(true);
      const result = await handleSummary(summData);
      setSummaryData(result.summary);
      setMedicationWarnings(result.medicationWarnings);
      setProfileName(result.profileName);
      // persist summary so the next offline visit has it
      await updateCachedSummary(
        String(id),
        result.summary,
        result.medicationWarnings,
        result.profileName
      );
      setSummaryLoading(false);
    };
    fetchSummary();
  }, [summData, fromCache]);

  // Suggest healthier swaps only when the scanned product isn't already great
  // (Nutri-Score C or worse, or highly processed).
  useEffect(() => {
    if (!productData || fromCache) return;
    const grade = (productData.nutriscore_grade || "").toLowerCase();
    const risky = ["c", "d", "e"].includes(grade) || (productData.nova_group || 0) >= 4;
    if (!risky) return;

    let cancelled = false;
    setAltLoading(true);
    getHealthierAlternatives({
      id: String(id),
      product_name: productData.product_name,
      ingredients_text: productData.ingredients_text,
      nutriscore_grade: productData.nutriscore_grade,
      nutriments: productData.nutriments,
    }).then((alts) => {
      if (!cancelled) {
        setAlternatives(alts);
        setAltLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [productData, fromCache]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f3f4f6",
        }}
      >
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={{ color: "#6b7280", marginTop: 12 }}>Loading product…</Text>
      </View>
    );
  }

  if (notFound) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
          backgroundColor: "#f3f4f6",
        }}
      >
        <Ionicons name="search-outline" size={48} color="#9ca3af" />
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937", marginTop: 12 }}>
          Product not found
        </Text>
        <Text style={{ color: "#6b7280", textAlign: "center", marginTop: 6, marginBottom: 20 }}>
          This barcode isn't in our database — but you can read its label instead.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/label-scan")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#15803d",
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 30,
          }}
        >
          <Ionicons name="document-text-outline" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", marginLeft: 8 }}>
            Snap the label instead
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nutr = productData.nutriments || {};
  const additives = cleanTags(productData.additives_tags);
  const labels = cleanTags(productData.labels_tags);

  return (
    <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Hero card */}
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <View
            style={{
              height: 220,
              backgroundColor: "#f9fafb",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {imgLoading && (
              <ActivityIndicator
                size="small"
                color="#15803d"
                style={{ position: "absolute", zIndex: 1 }}
              />
            )}
            <Image
              source={{
                uri: imgUri || "https://placehold.co/360x260?text=No+Image&font=roboto",
              }}
              style={{ width: "100%", height: 220 }}
              resizeMode="contain"
              onLoadStart={() => setImgLoading(true)}
              onLoadEnd={() => setImgLoading(false)}
              onError={() => setImgLoading(false)}
            />
          </View>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827" }}>
              {productData.product_name || "Unknown Product"}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
              <NutriScoreBadge grade={productData.nutriscore_grade} />
              <Badge
                label={`NOVA ${productData.nova_group || "?"}`}
                bg="#ede9fe"
                color="#6d28d9"
              />
              {productData.nutrition_grades ? (
                <Badge
                  label={`Grade ${String(productData.nutrition_grades).toUpperCase()}`}
                  bg="#dbeafe"
                  color="#1d4ed8"
                />
              ) : null}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
              {fromCache ? (
                <Badge label="📦 Offline cached" bg="#fef9c3" color="#92400e" />
              ) : null}
              {profileName ? (
                <Badge label={`For ${profileName}`} bg="#dcfce7" color="#166534" />
              ) : null}
            </View>
          </View>
        </Card>

        {/* Instant profile verdict — deterministic, no AI wait */}
        <SafetyVerdict product={productData} />

        {/* Medication interaction — surfaced near the top for safety */}
        {medicationWarnings.length > 0 && (
          <Card
            style={{
              backgroundColor: "#fff1f2",
              borderLeftWidth: 5,
              borderLeftColor: "#dc2626",
            }}
          >
            <SectionHeader
              icon="medkit"
              color="#dc2626"
              title="Medication interaction detected"
            />
            {medicationWarnings.map((w, i) => (
              <View key={i} style={{ marginBottom: 10 }}>
                <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 14 }}>
                  {w.medication}
                </Text>
                <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                  Contains: {w.triggeredBy.join(", ")}
                </Text>
                <Text style={{ color: "#374151", fontSize: 13, marginTop: 2, lineHeight: 18 }}>
                  {w.reason}
                </Text>
              </View>
            ))}
            <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>
              Consult your doctor or pharmacist before consuming this product.
            </Text>
          </Card>
        )}

        {/* AI Safety Summary */}
        <Card>
          <SectionHeader
            icon="sparkles"
            title="AI Safety Summary"
            right={
              readAloud && !summaryLoading && (summaryData || medicationWarnings.length > 0) ? (
                <TouchableOpacity
                  onPress={toggleSpeak}
                  accessibilityRole="button"
                  accessibilityLabel={
                    speaking ? "Stop reading the verdict aloud" : "Read the verdict aloud"
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: speaking ? "#fee2e2" : "#dcfce7",
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 20,
                  }}
                >
                  <Ionicons
                    name={speaking ? "stop" : "volume-high"}
                    size={16}
                    color={speaking ? "#dc2626" : "#15803d"}
                  />
                  <Text
                    style={{
                      marginLeft: 6,
                      fontSize: 13,
                      fontWeight: "700",
                      color: speaking ? "#dc2626" : "#15803d",
                    }}
                  >
                    {speaking ? "Stop" : "Listen"}
                  </Text>
                </TouchableOpacity>
              ) : undefined
            }
          />
          {summaryLoading ? (
            <ActivityIndicator size="small" color="#15803d" style={{ alignSelf: "flex-start" }} />
          ) : (
            <Text style={{ color: "#374151", fontSize: 14, lineHeight: 21 }}>
              {summaryData || "No summary available for this product."}
            </Text>
          )}
        </Card>

        {/* Ask Sage about this product */}
        <TouchableOpacity
          onPress={askSageAboutThis}
          activeOpacity={0.85}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#15803d",
            paddingVertical: 13,
            borderRadius: 14,
            marginBottom: 14,
          }}
        >
          <Ionicons name="sparkles" size={18} color="#ffffff" />
          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15, marginLeft: 8 }}>
            Ask Sage about this
          </Text>
        </TouchableOpacity>

        {/* Allergens */}
        <Card>
          <SectionHeader icon="warning" color="#dc2626" title="Allergens" />
          <Text style={{ color: "#374151", fontSize: 14, lineHeight: 20 }}>
            {productData.allergens || "None listed"}
          </Text>
        </Card>

        {/* Nutrition */}
        <Card>
          <SectionHeader icon="nutrition" color="#7c3aed" title="Nutrition (per 100g)" />
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            <NutrientStat label="Calories" value={nutr["energy-kcal_100g"] ?? "—"} unit="kcal" />
            <NutrientStat label="Sugar" value={nutr["sugars_100g"] ?? "—"} unit="g" />
            <NutrientStat label="Fat" value={nutr["fat_100g"] ?? "—"} unit="g" />
            <NutrientStat label="Salt" value={nutr["salt_100g"] ?? "—"} unit="g" />
            <NutrientStat label="Protein" value={nutr["proteins_100g"] ?? "—"} unit="g" />
          </View>
        </Card>

        {/* Ingredients */}
        <Card>
          <SectionHeader icon="leaf" title="Ingredients" />
          <Text style={{ color: "#374151", fontSize: 14, lineHeight: 20 }}>
            {productData.ingredients_text || "Not available"}
          </Text>
        </Card>

        {/* More details */}
        <Card>
          <SectionHeader icon="information-circle" color="#0891b2" title="More details" />
          <DetailRow label="Additives" value={additives || "None listed"} />
          <DetailRow label="Labels" value={labels || "None"} />
          <DetailRow label="Expiry date" value={productData.expiration_date || "Not available"} />
        </Card>

        {/* Healthier picks */}
        {(altLoading || alternatives.length > 0) && (
          <Card>
            <SectionHeader icon="trending-up" title="Healthier picks for you" />
            <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 10, marginTop: -4 }}>
              Safer for your profile and better rated than this product.
            </Text>
            {altLoading ? (
              <ActivityIndicator size="small" color="#15803d" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {alternatives.map((alt) => (
                  <TouchableOpacity
                    key={alt.id}
                    onPress={() =>
                      router.push({ pathname: "/product/[id]", params: { id: alt.id } })
                    }
                    style={{ width: 130, marginRight: 12 }}
                  >
                    <Image
                      source={{
                        uri:
                          alt.image ||
                          "https://placehold.co/130x110?text=No+Image&font=roboto",
                      }}
                      style={{
                        width: 130,
                        height: 110,
                        borderRadius: 10,
                        backgroundColor: "#f3f4f6",
                      }}
                      resizeMode="contain"
                    />
                    <Text
                      numberOfLines={2}
                      style={{ fontSize: 12, color: "#111827", marginTop: 5, fontWeight: "600" }}
                    >
                      {alt.name}
                    </Text>
                    <View
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: "#dcfce7",
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        marginTop: 3,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: "#166534", fontWeight: "700" }}>
                        Nutri-Score {alt.nutriscore_grade.toUpperCase()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Card>
        )}

        {/* Add to diary */}
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: logged ? "#dcfce7" : "#0284c7",
            paddingVertical: 14,
            borderRadius: 14,
            marginTop: 2,
            opacity: logLoading ? 0.6 : 1,
          }}
          disabled={logged || logLoading}
          onPress={async () => {
            setLogLoading(true);
            const { error } = await logNutrition(
              productData?.product_name || "Unknown Product",
              String(id),
              {
                calories: parseFloat(productData?.nutriments?.["energy-kcal_100g"]) || 0,
                sugar: parseFloat(productData?.nutriments?.["sugars_100g"]) || 0,
                fat: parseFloat(productData?.nutriments?.["fat_100g"]) || 0,
                salt: parseFloat(productData?.nutriments?.["salt_100g"]) || 0,
                protein: parseFloat(productData?.nutriments?.["proteins_100g"]) || 0,
              },
              medicationWarnings
            );
            setLogLoading(false);
            if (!error) {
              setLogged(true);
              // Cross-link: if this food interacts with the profile's
              // medications, remind the user right when they log it.
              if (medicationWarnings.length > 0) {
                const w = medicationWarnings[0];
                Alert.alert(
                  "💊 Added — medication heads-up",
                  `You logged "${productData?.product_name || "this food"}", which can interact with ${w.medication}` +
                    (medicationWarnings.length > 1
                      ? ` and ${medicationWarnings.length - 1} other medication${
                          medicationWarnings.length > 2 ? "s" : ""
                        }`
                      : "") +
                    `.\n\nContains: ${w.triggeredBy.join(", ")}.\n${w.reason}\n\nConsult your doctor or pharmacist before consuming.`
                );
              }
            } else {
              Alert.alert(
                "Couldn't add to diary",
                typeof error === "string"
                  ? error
                  : (error as any)?.message ?? "Please try again."
              );
            }
          }}
        >
          <Ionicons
            name={logged ? "checkmark-circle" : "add-circle-outline"}
            size={20}
            color={logged ? "#15803d" : "#ffffff"}
          />
          <Text
            style={{
              color: logged ? "#15803d" : "#ffffff",
              fontWeight: "700",
              fontSize: 15,
              marginLeft: 8,
            }}
          >
            {logLoading ? "Logging…" : logged ? "Added to Food Diary" : "Add to Food Diary"}
          </Text>
        </TouchableOpacity>

        {/* Back */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#15803d",
            paddingVertical: 14,
            borderRadius: 14,
            marginTop: 10,
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ProductSummary;
