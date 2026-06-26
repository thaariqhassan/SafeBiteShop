import "./global.css";
import { Stack } from "expo-router";
import { useEffect } from "react";

export default function RootLayout() {
  useEffect(() => {
    // Warm up Render backend on app start to avoid cold-start delay on first scan
    fetch("https://safebite-28tg.onrender.com/health").catch(() => {});
  }, []);

  return (
    <>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            animation: "fade",
            animationDuration: 500,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            animation: "fade",
            animationDuration: 500,
          }}
        />
        <Stack.Screen
          name="scan/index"
          options={{
            headerTitle: "Scanner",
            headerStyle: {
              backgroundColor: "#004d00",
            },
            headerTintColor: "#ffffff",
            animation: "fade",
            animationDuration: 500,
          }}
        />
        <Stack.Screen
          name="product/[id]"
          options={{
            headerTitle: "Product Info",
            headerStyle: {
              backgroundColor: "#004d00",
            },
            headerTintColor: "#ffffff",
            animation: "fade",
            animationDuration: 500,
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            animation: "fade",
            animationDuration: 500,
          }}
        />
        <Stack.Screen
          name="shop_interface"
          options={{
            headerTitle: "Shop Interface",
            headerStyle: {
              backgroundColor: "#004d00",
            },
            headerTintColor: "#ffffff",
            animation: "fade",
            animationDuration: 500,
          }}
        />
        <Stack.Screen
          name="family"
          options={{
            headerTitle: "Family Profiles",
            headerStyle: { backgroundColor: "#004d00" },
            headerTintColor: "#ffffff",
            animation: "fade",
            animationDuration: 500,
          }}
        />
      </Stack>
    </>
  );
}
