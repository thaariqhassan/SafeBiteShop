import { View, Text, TouchableOpacity, Image, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import qr from "@/assets/images/qr.jpg";
import qr1 from "@/assets/images/logo2.png";
import qr2 from "@/assets/images/logo3.png";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import Recommendation from "@/components/recomentation";
import { getActiveProfile } from "@/services/familyProfile";
import { getAllCachedProducts } from "@/services/scanCache";
import { getDailyTip } from "@/services/healthTip";

interface RecentScan {
  id: string;
  name: string;
  image: string | null;
}

const index = () => {
  const router = useRouter();
  const [activeProfileName, setActiveProfileName] = useState<string>("");
  const [isProfileSelf, setIsProfileSelf] = useState(true);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [tip, setTip] = useState<string>("");
  const [scanMode, setScanMode] = useState<"product" | "menu">("product");

  useFocusEffect(
    useCallback(() => {
      getActiveProfile().then((p) => {
        setActiveProfileName(p.name);
        setIsProfileSelf(p.isSelf);
      });
      getDailyTip().then(setTip);
      getAllCachedProducts().then((entries) => {
        setRecentScans(
          entries.slice(0, 10).map((e) => {
            const prod = e.product || {};
            return {
              id: e.id,
              name: prod.product_name || "Scanned product",
              image:
                prod.image_url ||
                prod?.selected_images?.front?.display?.en ||
                prod?.selected_images?.front?.display?.fr ||
                null,
            };
          })
        );
      });
    }, [])
  );

  const offset = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: offset.value }],
    };
  });
  useEffect(() => {
    offset.value = withRepeat(
      withTiming(1.1, { duration: 1000 }), // animate to 1.2 scale
      -1, // repeat forever
      true, // reverse on every cycle
    );
  }, []);
  return (
    <>
      <LinearGradient
        colors={["#004d00", "#00cc00", "#0000"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          height: "50%",
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Scan mode toggle */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "rgba(255,255,255,0.18)",
            borderRadius: 30,
            padding: 4,
            marginBottom: 14,
          }}
        >
          {(["product", "menu"] as const).map((m) => {
            const active = scanMode === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setScanMode(m)}
                activeOpacity={1}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  borderRadius: 24,
                  backgroundColor: active ? "#ffffff" : "transparent",
                }}
              >
                <Ionicons
                  name={m === "product" ? "barcode-outline" : "restaurant-outline"}
                  size={16}
                  color={active ? "#15803d" : "#ffffff"}
                />
                <Text
                  style={{
                    marginLeft: 6,
                    fontWeight: "700",
                    fontSize: 13,
                    color: active ? "#15803d" : "#ffffff",
                  }}
                >
                  {m === "product" ? "Product" : "Menu"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          className="w-[250px] h-[250px] rounded-lg flex items-center justify-center"
          onPress={() => router.push(scanMode === "menu" ? "/menu-scan" : "/scan")}
        >
          <Animated.View
            style={[
              {
                justifyContent: "center",
                alignItems: "center",
              },
              animatedStyle,
            ]}
          >
            <Image
              source={qr2}
              className="w-[230px] h-[240px] rounded-3xl"
              resizeMode="cover"
            />
          </Animated.View>
        </TouchableOpacity>
        <Text style={{ color: "#000000", fontWeight: "700", fontSize: 17, marginTop: 10 }}>
          {scanMode === "menu" ? "Tap to scan a menu" : "Tap to scan a product"}
        </Text>
      </LinearGradient>
      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.push("/family")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isProfileSelf ? "#f0fdf4" : "#fefce8",
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            alignSelf: "flex-start",
            marginBottom: 10,
            marginTop: 4,
          }}
        >
          <Ionicons
            name={isProfileSelf ? "person-outline" : "people-outline"}
            size={14}
            color={isProfileSelf ? "#15803d" : "#92400e"}
          />
          <Text
            style={{
              fontSize: 12,
              color: isProfileSelf ? "#15803d" : "#92400e",
              marginLeft: 5,
              fontWeight: "600",
            }}
          >
            {isProfileSelf ? "My Profile" : activeProfileName} · Switch
          </Text>
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900 mb-4">
          Recommended Products for You
        </Text>
        <Recommendation />

        {recentScans.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <Text className="text-2xl font-bold text-gray-900 mb-3">
              Recently Scanned
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recentScans.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: "/product/[id]",
                      params: { id: item.id },
                    })
                  }
                  style={{ width: 120, marginRight: 12 }}
                >
                  <Image
                    source={{
                      uri:
                        item.image ||
                        "https://placehold.co/120x120?text=No+Image&font=roboto",
                    }}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 10,
                      backgroundColor: "#e5e7eb",
                    }}
                    resizeMode="contain"
                  />
                  <Text
                    numberOfLines={2}
                    style={{ fontSize: 13, color: "#111827", marginTop: 4, fontWeight: "600" }}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {tip ? (
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#ecfdf5",
              borderWidth: 1,
              borderColor: "#a7f3d0",
              borderRadius: 14,
              padding: 14,
              marginTop: 20,
            }}
          >
            <Ionicons name="bulb" size={20} color="#15803d" style={{ marginRight: 10, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: "#166534", fontSize: 13, marginBottom: 2 }}>
                Tip for you
              </Text>
              <Text style={{ color: "#166534", fontSize: 13, lineHeight: 18 }}>{tip}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
};

export default index;
