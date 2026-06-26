import handleRecommendation from "@/services/recommendation";
import { getActiveProfile } from "@/services/familyProfile";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, TouchableOpacity } from "react-native";
import { View, Text, ActivityIndicator, Image } from "react-native";

// On-device cache so the home screen loads instantly and does not re-hit the
// backend (and OpenFoodFacts) on every visit. Keyed by the active profile so
// switching family members shows the right list. Refreshed after TTL.
const CACHE_PREFIX = "safebite_reco_v1_";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const Recommendation = () => {
  const [productDetails, setProductDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const fetchProductDetails = async (ids: string[]) => {
      const details = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(
              `https://world.openfoodfacts.org/api/v2/product/${id}`,
            );
            const data = await res.json();
            if (data.status === 1) {
              return {
                id,
                name: data.product.product_name || "No Name",
                image: data.product.image_url || null,
              };
            }
          } catch (err) {
            console.error(`Failed fetching product ${id}`, err);
          }
          return null;
        }),
      );
      return details.filter(Boolean);
    };

    const load = async () => {
      setLoading(true);
      const profile = await getActiveProfile();
      const cacheKey =
        CACHE_PREFIX + (profile.familyMemberId ?? "self");

      // 1. Serve from cache immediately if fresh.
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw) {
          const cached = JSON.parse(raw);
          if (
            cached.cachedAt &&
            Date.now() - cached.cachedAt < CACHE_TTL_MS &&
            Array.isArray(cached.details)
          ) {
            if (!cancelled) {
              setProductDetails(cached.details);
              setLoading(false);
            }
            return;
          }
        }
      } catch {
        // ignore corrupt cache and fall through to network
      }

      // 2. Otherwise fetch recommendation IDs + product details, then cache.
      const result = await handleRecommendation();
      const ids: string[] = result.finalProductIds || result.productIds || [];
      const details = await fetchProductDetails(ids);
      if (cancelled) return;
      setProductDetails(details);
      setLoading(false);
      try {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ cachedAt: Date.now(), details }),
        );
      } catch {
        // best-effort cache; ignore storage errors
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={{ padding: 5 }}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={"#004d00"} size="large" />
        </View>
      ) : (
        <FlatList
          data={productDetails}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 0 }}
          className=""
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/product/[id]",
                  params: { id: item.id },
                })
              }
            >
              <View style={{ width: 190 }} className="mr-4 flex ">
                {item.image && (
                  <Image
                    source={{ uri: item.image }}
                    style={{ width: 180, height: 220, borderRadius: 8 }}
                    resizeMode="cover"
                    className="bg-gray-300 rounded-lg"
                  />
                )}
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: 16,
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                  numberOfLines={2}
                  className="truncate"
                >
                  {item.name}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default Recommendation;
