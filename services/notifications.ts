import { Platform } from "react-native";
import Constants from "expo-constants";

// Expo Go (since SDK 53) removed expo-notifications push support — importing it
// there triggers an auto-registration side-effect that crashes the app. So we
// lazy-require the module and skip it entirely in Expo Go. Notifications work in
// development builds, preview APKs, and production.
const isExpoGo = Constants.executionEnvironment === "storeClient";

const RECALL_CHANNEL = "recalls";

let registered = false;
let handlerSet = false;

// Loads expo-notifications only outside Expo Go. Returns null in Expo Go.
const loadNotifications = (): any => {
  if (isExpoGo) return null;
  try {
    const Notifications = require("expo-notifications");
    if (!handlerSet) {
      // Show recall alerts as a heads-up banner even when foregrounded.
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerSet = true;
    }
    return Notifications;
  } catch {
    return null;
  }
};

// Ask for notification permission once and set up the high-importance Android
// channel used for recall alerts. Returns true if we're allowed to notify.
export const registerForNotifications = async (): Promise<boolean> => {
  const Notifications = loadNotifications();
  if (!Notifications) return false;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(RECALL_CHANNEL, {
        name: "Recall Alerts",
        description: "Urgent food recall warnings for products you've scanned",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#dc2626",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    registered = status === "granted";
    return registered;
  } catch {
    return false;
  }
};

// Fire an immediate local notification. No-ops silently in Expo Go or if
// permission was denied.
export const sendLocalNotification = async (
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> => {
  const Notifications = loadNotifications();
  if (!Notifications) return;
  try {
    if (!registered) {
      const ok = await registerForNotifications();
      if (!ok) return;
    }
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      // Immediate on iOS; routed through the high-importance channel on Android.
      trigger:
        Platform.OS === "android"
          ? ({ channelId: RECALL_CHANNEL, seconds: 1 } as any)
          : null,
    });
  } catch {
    // Notifications are best-effort — never block the app on them.
  }
};
