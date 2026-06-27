import "./global.css";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { registerForNotifications } from "@/services/notifications";

export default function RootLayout() {
  useEffect(() => {
    // Warm up Render backend on app start to avoid cold-start delay on first scan
    fetch("https://safebite-28tg.onrender.com/health").catch(() => {});
    // Ask for notification permission up front so recall alerts can reach the user
    registerForNotifications();
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
        <Stack.Screen
          name="privacy"
          options={{
            headerTitle: "Privacy Policy",
            headerStyle: { backgroundColor: "#004d00" },
            headerTintColor: "#ffffff",
            animation: "fade",
            animationDuration: 500,
          }}
        />
        <Stack.Screen
          name="edit-health"
          options={{
            headerTitle: "Edit Health Profile",
            headerStyle: { backgroundColor: "#004d00" },
            headerTintColor: "#ffffff",
            animation: "fade",
            animationDuration: 500,
          }}
        />
        <Stack.Screen
          name="label-scan"
          options={{
            headerTitle: "Scan Label",
            headerStyle: { backgroundColor: "#004d00" },
            headerTintColor: "#ffffff",
            animation: "fade",
            animationDuration: 500,
          }}
        />
        <Stack.Screen
          name="menu-scan"
          options={{
            headerTitle: "Scan Menu",
            headerStyle: { backgroundColor: "#004d00" },
            headerTintColor: "#ffffff",
            animation: "fade",
            animationDuration: 500,
          }}
        />
        <Stack.Screen
          name="copilot"
          options={{
            headerTitle: "SafeBite Co-pilot",
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
