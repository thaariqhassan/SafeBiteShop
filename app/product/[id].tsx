import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import handleSummary, { SummaryResult } from "../services/summary";
import { MedicationWarning } from "@/constants/medicationInteractions";
import { logNutrition } from "../services/nutritionLog";
import { cacheProduct, getCachedProduct, updateCachedSummary } from "../services/scanCache";

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

  const navigation = useNavigation();
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

  return (
    <>
      {loading ? (
        <View className="w-screen h-screen flex items-center justify-center">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : notFound ? (
        <View className="w-screen h-screen flex items-center justify-center">
          <Text>Product not found</Text>
        </View>
      ) : (
        <View className="w-screen h-screen p-4 bg-white ">
          <ScrollView
            className="flex-1 text-xl px-1 space-y-5"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
          >
            <View
              style={{ width: 360, height: 260 }}
              className="mb-4 relative items-center justify-center"
            >
              {imgLoading && (
                <ActivityIndicator
                  size="small"
                  color="#555"
                  style={{
                    position: "absolute",
                    zIndex: 1,
                    alignSelf: "center",
                    top: "45%",
                  }}
                />
              )}
              <Image
                source={{
                  uri:
                    imgUri ||
                    "https://placehold.co/360x260?text=No+Image&font=roboto",
                }}
                style={{ width: 370, height: 260, backgroundColor: "#f0f0f0" }}
                resizeMode="contain"
                onLoadStart={() => setImgLoading(true)}
                onLoadEnd={() => setImgLoading(false)}
                onError={() => {
                  setImgLoading(false);
                }}
                className="rounded-lg border border-gray-300 shadow-md ml-2"
                alt="Product Image"
              />
            </View>
            <View className="flex flex-row mb-1">
              <Text className="text-2xl font-bold ">
                {productData.product_name || "Unknown Product"}
              </Text>
            </View>
            {fromCache && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#fefce8",
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginBottom: 6,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ fontSize: 12, color: "#92400e" }}>
                  📦 Viewing cached version · No internet connection
                </Text>
              </View>
            )}
            {/* Nutrition Grade + Nova */}
            <Text className="text-md text-gray-700  mb-2">
              🧪 Nutrition Grade:{" "}
              <Text className="font-semibold uppercase">
                {productData.nutriscore_grade || "N/A"}
              </Text>
            </Text>
            <Text className="text-md text-gray-700 mb-2">
              🔬 Processing:{" "}
              <Text className="font-semibold">
                Nova {productData.nova_group || "N/A"}
              </Text>
            </Text>
            {/* Allergens */}
            <Text className="text-md font-semibold text-red-600 mb-3">
              ⚠️ Allergens:
              <Text className="text-md text-gray-700 ">
                {productData.allergens || "None listed"}
              </Text>
            </Text>
            {/* Additives */}
            <Text className="text-md font-semibold text-yellow-700 mb-3">
              🧬 Additives:
              <Text className="text-md text-gray-700 ">
                {productData.additives_tags?.length
                  ? productData.additives_tags
                      .map((tag: any) => tag.replace("en:", ""))
                      .join(", ")
                  : "None listed"}
              </Text>
            </Text>
            {/* Ingredients */}
            <Text className="text-md font-semibold text-green-700 mb-1">
              🥗 Ingredients:
            </Text>
            <Text className="text-md text-gray-700 mb-3">
              {productData.ingredients_text || "Not available"}
            </Text>
            {/* Nutritional Info */}
            <Text className="text-md font-semibold text-purple-700 mb-1">
              📊 Nutritional Info (per 100g):
            </Text>
            <View className="pl-2">
              <Text className="text-gray-700">
                Calories:{" "}
                {productData.nutriments?.["energy-kcal_100g"] || "N/A"} kcal
              </Text>
              <Text className="text-gray-700">
                Sugar: {productData.nutriments?.["sugars_100g"] || "N/A"} g
              </Text>
              <Text className="text-gray-700">
                Fat: {productData.nutriments?.["fat_100g"] || "N/A"} g
              </Text>
              <Text className="text-gray-700">
                Salt: {productData.nutriments?.["salt_100g"] || "N/A"} g
              </Text>
              <Text className="text-gray-700">
                Protein: {productData.nutriments?.["proteins_100g"] || "N/A"} g
              </Text>
            </View>
            {/* Labels */}
            <Text className="text-md font-semibold text-blue-700 mt-4 mb-1">
              🏷️ Labels:
            </Text>
            <Text className="text-gray-700">
              {productData.labels_tags?.length
                ? productData.labels_tags
                    .map((tag: any) => tag.replace("en:", ""))
                    .join(", ")
                : "None"}
            </Text>
            {/* Expiry Date */}
            <Text className="text-md font-semibold text-orange-600 mt-4 mb-1">
              ⏳ Expiry Date:
            </Text>
            <Text className="text-gray-700">
              {productData.expiration_date || "Not available"}
            </Text>
            {medicationWarnings.length > 0 && (
              <View
                style={{
                  backgroundColor: "#fff1f2",
                  borderLeftWidth: 4,
                  borderLeftColor: "#dc2626",
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 16,
                }}
              >
                <Text
                  style={{ color: "#991b1b", fontWeight: "bold", fontSize: 15, marginBottom: 8 }}
                >
                  💊 Medication Interaction Detected
                </Text>
                {medicationWarnings.map((w, i) => (
                  <View key={i} style={{ marginBottom: 10 }}>
                    <Text style={{ color: "#dc2626", fontWeight: "600", fontSize: 13 }}>
                      {w.medication}
                    </Text>
                    <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                      Contains: {w.triggeredBy.join(", ")}
                    </Text>
                    <Text style={{ color: "#374151", fontSize: 12, marginTop: 2 }}>
                      {w.reason}
                    </Text>
                  </View>
                ))}
                <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 4 }}>
                  Consult your doctor or pharmacist before consuming this product.
                </Text>
              </View>
            )}
            {profileName ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#f0fdf4",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginTop: 12,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ fontSize: 12, color: "#166534" }}>
                  👤 Scanning for: <Text style={{ fontWeight: "700" }}>{profileName}</Text>
                </Text>
              </View>
            ) : null}
            <View className="mt-5">
              <Text className="text-lg font-semibold text-gray-800 mb-2">
                AI Summary
              </Text>
              {summaryLoading ? (
                <View>
                  <ActivityIndicator size="large" color="#15803d" />
                </View>
              ) : (
                <Text className="text-gray-700">
                  {summaryData || "No summary available for this product."}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: logged ? "#d1fae5" : "#0284c7",
                padding: 12,
                borderRadius: 10,
                marginTop: 12,
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
                  }
                );
                setLogLoading(false);
                if (!error) setLogged(true);
              }}
            >
              <Text
                style={{
                  color: logged ? "#15803d" : "#ffffff",
                  textAlign: "center",
                  fontWeight: "600",
                  fontSize: 16,
                }}
              >
                {logLoading ? "Logging…" : logged ? "✓ Added to Food Diary" : "Add to Food Diary"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className=" bg-green-600 p-3 rounded-lg mb-20 mt-4"
              onPress={() => navigation.goBack()}
            >
              <Text className="text-white text-center text-lg font-semibold ">
                Go Back
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </>
  );
};

export default ProductSummary;
