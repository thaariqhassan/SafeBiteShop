import AsyncStorage from "@react-native-async-storage/async-storage";

// User-toggleable app preferences (device-local).
const READ_ALOUD_KEY = "safebite_read_aloud_enabled_v1";

// Read-aloud is OFF by default — the user opts in from the Profile screen.
export const getReadAloudEnabled = async (): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(READ_ALOUD_KEY)) === "true";
  } catch {
    return false;
  }
};

export const setReadAloudEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(READ_ALOUD_KEY, enabled ? "true" : "false");
  } catch {}
};
