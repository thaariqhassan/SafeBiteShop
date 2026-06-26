import { View, Text, TouchableOpacity, Image } from "react-native";
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
import { getActiveProfile } from "@/app/services/familyProfile";

const index = () => {
  const router = useRouter();
  const [activeProfileName, setActiveProfileName] = useState<string>("");
  const [isProfileSelf, setIsProfileSelf] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getActiveProfile().then((p) => {
        setActiveProfileName(p.name);
        setIsProfileSelf(p.isSelf);
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
          height: "56%",
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          className="w-[270px] h-[280px] rounded-lg flex items-center justify-center"
          onPress={() => router.push("/scan")}
        >
          <Animated.View
            style={[
              {
                justifyContent: "center",
                alignItems: "center",
              },
              animatedStyle,
            ]}
            // className="flex flex-row"
          >
            <Image
              source={qr2}
              className="w-[280px] h-[294px] rounded-3xl"
              // resizeMethod="resize"
              resizeMode="cover"
            />
            {/* <Text
              className="text-gray-900 mr-1"
              style={{ fontSize: 22, fontWeight: "bold" }}
            >
              Tap to scan
            </Text> 
            <Ionicons name="scan-circle-outline" size={30} />*/}
          </Animated.View>
        </TouchableOpacity>
      </LinearGradient>
      <View className="flex-1 w-full h-full mb-10 px-5">
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
      </View>
    </>
  );
};

export default index;
