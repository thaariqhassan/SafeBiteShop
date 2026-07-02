import handleRecommendation from "@/services/recommendation";
import { getActiveProfile } from "@/services/familyProfile";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  TouchableOpacity,
  View,
  Text,
  Image,
} from "react-native";

// On-device cache so the home screen loads instantly and does not re-hit the
// backend (and OpenFoodFacts) on every visit. Keyed by the active profile so
// switching family members shows the right list. Refreshed after TTL.
// v2: entries now carry nutriscore + reason from the backend.
const CACHE_PREFIX = "safebite_reco_v2_";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface RecoItem {
  id: string;
  name: string;
  nutriscore_grade?: string;
  reason?: string;
  image: string | null;
}

const NUTRISCORE_COLORS: Record<string, string> = {
  a: "#038141",
  b: "#85bb2f",
  c: "#eeb100",
  d: "#ee8100",
  e: "#e63e11",
};

// One OpenFoodFacts search request for every barcode at once (instead of one
// request per product) — returns name + image keyed by barcode.
const fetchOffDetails = async (
  ids: string[],
): Promise<Map<string, { name?: string; image: string | null }>> => {
  const map = new Map<string, { name?: string; image: string | null }>();
  if (ids.length === 0) return map;
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/search?code=${ids.join(",")}` +
        `&fields=code,product_name,image_url,image_front_small_url&page_size=${ids.length}`,
      // OFF rejects requests without a User-Agent
      { headers: { "User-Agent": "SafeBite/1.0" } },
    );
    const data = await res.json();
    for (const p of data.products || []) {
      map.set(String(p.code), {
        name: p.product_name,
        image: p.image_url || p.image_front_small_url || null,
      });
    }
  } catch (err) {
    console.error("Failed fetching product images", err);
  }
  return map;
};

const SkeletonCard = () => (
  <View
    style={{
      width: 170,
      marginRight: 14,
      borderRadius: 14,
      backgroundColor: "#f3f4f6",
      padding: 10,
    }}
  >
    <View style={{ width: "100%", height: 150, borderRadius: 10, backgroundColor: "#e5e7eb" }} />
    <View style={{ height: 14, borderRadius: 7, backgroundColor: "#e5e7eb", marginTop: 10, width: "85%" }} />
    <View style={{ height: 10, borderRadius: 5, backgroundColor: "#e5e7eb", marginTop: 8, width: "60%" }} />
  </View>
);

const Recommendation = () => {
  const [items, setItems] = useState<RecoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const profile = await getActiveProfile();
      const cacheKey = CACHE_PREFIX + (profile.familyMemberId ?? "self");

      // 1. Serve from cache immediately if fresh.
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw) {
          const cached = JSON.parse(raw);
          if (
            cached.cachedAt &&
            Date.now() - cached.cachedAt < CACHE_TTL_MS &&
            Array.isArray(cached.items) &&
            cached.items.length > 0
          ) {
            if (!cancelled) {
              setItems(cached.items);
              setLoading(false);
            }
            return;
          }
        }
      } catch {
        // ignore corrupt cache and fall through to network
      }

      // 2. Ask the backend for profile-matched products (fast, deterministic),
      //    then fill in images with a single OpenFoodFacts batch request.
      const result = await handleRecommendation();
      const ids: string[] = result.finalProductIds || result.productIds || [];
      const backendProducts: any[] = Array.isArray(result.products)
        ? result.products
        : [];
      const off = await fetchOffDetails(ids);

      const merged: RecoItem[] = ids
        .map((id) => {
          const fromBackend = backendProducts.find((p) => p.id === id);
          const fromOff = off.get(id);
          const name = fromBackend?.name || fromOff?.name;
          if (!name) return null;
          return {
            id,
            name,
            nutriscore_grade: fromBackend?.nutriscore_grade,
            reason: fromBackend?.reason,
            image: fromOff?.image ?? null,
          };
        })
        .filter(Boolean) as RecoItem[];

      if (cancelled) return;
      setItems(merged);
      setLoading(false);
      if (merged.length > 0) {
        try {
          await AsyncStorage.setItem(
            cacheKey,
            JSON.stringify({ cachedAt: Date.now(), items: merged }),
          );
        } catch {
          // best-effort cache; ignore storage errors
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flexDirection: "row", paddingVertical: 5 }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View
        style={{
          backgroundColor: "#f9fafb",
          borderRadius: 14,
          padding: 18,
          alignItems: "center",
        }}
      >
        <Ionicons name="nutrition-outline" size={26} color="#9ca3af" />
        <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 6, textAlign: "center" }}>
          No matches for this profile yet. Pull down to refresh or update your
          health details.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 5 }}
      renderItem={({ item }) => {
        const grade = (item.nutriscore_grade || "").toLowerCase();
        const gradeColor = NUTRISCORE_COLORS[grade];
        return (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/product/[id]",
                params: { id: item.id },
              })
            }
            style={{
              width: 170,
              marginRight: 14,
              borderRadius: 14,
              backgroundColor: "#ffffff",
              padding: 10,
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
          >
            <View>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={{
                    width: "100%",
                    height: 150,
                    borderRadius: 10,
                    backgroundColor: "#f3f4f6",
                  }}
                  resizeMode="contain"
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: 150,
                    borderRadius: 10,
                    backgroundColor: "#f3f4f6",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="fast-food-outline" size={34} color="#d1d5db" />
                </View>
              )}
              {gradeColor ? (
                <View
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    backgroundColor: gradeColor,
                    borderRadius: 12,
                    width: 24,
                    height: 24,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>
                    {grade.toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={2}
              style={{ marginTop: 8, fontSize: 14, fontWeight: "700", color: "#111827" }}
            >
              {item.name}
            </Text>
            {item.reason ? (
              <Text
                numberOfLines={2}
                style={{ marginTop: 3, fontSize: 11.5, color: "#15803d", fontWeight: "600" }}
              >
                {item.reason}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      }}
    />
  );
};

export default Recommendation;
