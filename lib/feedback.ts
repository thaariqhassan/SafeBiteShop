import { Alert, Platform, ToastAndroid } from "react-native";
import * as Haptics from "expo-haptics";

// Lightweight, non-blocking confirmation for actions that shouldn't interrupt
// the flow with a modal. Android gets a real toast; iOS falls back to an alert.
export const toast = (message: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
};

// Haptics are best-effort — they throw on devices/emulators without a vibrator.
export const hapticSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

export const hapticWarning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

export const hapticTap = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
