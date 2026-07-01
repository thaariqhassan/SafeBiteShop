import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getActiveProfile } from "@/services/familyProfile";
import {
  clearMedReminder,
  foodsToAvoid,
  formatReminderTime,
  getMedReminders,
  MedReminder,
  pruneMedReminders,
  setMedReminder,
} from "@/services/medReminder";
import { sendMedNotification } from "@/services/notifications";

// Preset dose times — avoids pulling in a native date-time picker dependency
// while keeping the flow one-tap for a demo.
const TIME_PRESETS: { label: string; hour: number; minute: number }[] = [
  { label: "Morning", hour: 8, minute: 0 },
  { label: "Noon", hour: 13, minute: 0 },
  { label: "Evening", hour: 18, minute: 0 },
  { label: "Night", hour: 21, minute: 0 },
];

const DEFAULT_PRESET = TIME_PRESETS[0];

const MedReminders = () => {
  const [medications, setMedications] = useState<string[]>([]);
  const [profileName, setProfileName] = useState("");
  const [reminders, setReminders] = useState<Record<string, MedReminder>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const profile = await getActiveProfile();
    const meds = (profile.medications || []).filter((m) => m && m !== "None");
    await pruneMedReminders(meds);
    const map = await getMedReminders();
    setProfileName(profile.name);
    setMedications(meds);
    setReminders(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = async (medication: string, on: boolean) => {
    setBusy(medication);
    if (on) {
      const ok = await setMedReminder(
        medication,
        DEFAULT_PRESET.hour,
        DEFAULT_PRESET.minute
      );
      if (!ok) {
        Alert.alert(
          "Couldn't set reminder",
          "Enable notifications for SafeBite in your system settings, then try again. (Reminders don't work in Expo Go — use a dev/preview build.)"
        );
      }
    } else {
      await clearMedReminder(medication);
    }
    setReminders(await getMedReminders());
    setBusy(null);
  };

  const changeTime = async (
    medication: string,
    hour: number,
    minute: number
  ) => {
    setBusy(medication);
    await setMedReminder(medication, hour, minute);
    setReminders(await getMedReminders());
    setBusy(null);
  };

  const sendTest = async (medication: string) => {
    const foods = foodsToAvoid(medication);
    const body =
      foods.length > 0
        ? `Time to take your ${medication}. Avoid ${foods
            .slice(0, 5)
            .join(", ")} within a few hours of your dose.`
        : `Time to take your ${medication}.`;
    await sendMedNotification("💊 Medication Reminder", body, {
      type: "med-reminder-test",
      medication,
    });
    Alert.alert(
      "Test sent",
      "If notifications are enabled, a sample reminder should appear shortly."
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
    >
      <View
        style={{
          backgroundColor: "#004d00",
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
          Dose reminders for {profileName || "you"}
        </Text>
        <Text style={{ color: "#d1fae5", fontSize: 13, marginTop: 6, lineHeight: 18 }}>
          Get a daily nudge to take each medication — and a heads-up about the
          foods to avoid around your dose.
        </Text>
      </View>

      {medications.length === 0 ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 24,
            alignItems: "center",
          }}
        >
          <Ionicons name="medkit-outline" size={32} color="#9ca3af" />
          <Text style={{ color: "#6b7280", fontSize: 14, marginTop: 8, textAlign: "center" }}>
            No medications on this profile yet.
          </Text>
          <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4, textAlign: "center" }}>
            Add them under Edit Health Profile to set reminders.
          </Text>
        </View>
      ) : (
        medications.map((med) => {
          const reminder = reminders[med];
          const enabled = !!reminder;
          const foods = foodsToAvoid(med);
          const isBusy = busy === med;
          return (
            <View
              key={med}
              style={{
                backgroundColor: "#fff",
                borderRadius: 14,
                padding: 14,
                marginBottom: 12,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="medical-outline"
                  size={20}
                  color="#15803d"
                  style={{ width: 28 }}
                />
                <Text
                  style={{ flex: 1, fontSize: 15, fontWeight: "700", color: "#111827" }}
                >
                  {med}
                </Text>
                {isBusy ? (
                  <ActivityIndicator size="small" color="#15803d" style={{ marginRight: 6 }} />
                ) : null}
                <Switch
                  value={enabled}
                  onValueChange={(v) => toggle(med, v)}
                  trackColor={{ false: "#d1d5db", true: "#86efac" }}
                  thumbColor={enabled ? "#15803d" : "#f4f3f4"}
                />
              </View>

              {foods.length > 0 ? (
                <View
                  style={{
                    backgroundColor: "#fff7ed",
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 10,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#9a3412", fontWeight: "600" }}>
                    ⚠️ Avoid around your dose
                  </Text>
                  <Text style={{ fontSize: 12, color: "#b45309", marginTop: 3, lineHeight: 17 }}>
                    {foods.join(", ")}
                  </Text>
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                  No known food interactions — a simple dose reminder.
                </Text>
              )}

              {enabled && (
                <View style={{ marginTop: 12 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#6b7280",
                      marginBottom: 6,
                    }}
                  >
                    REMINDER TIME · {formatReminderTime(reminder.hour, reminder.minute)}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {TIME_PRESETS.map((p) => {
                      const active =
                        reminder.hour === p.hour && reminder.minute === p.minute;
                      return (
                        <TouchableOpacity
                          key={p.label}
                          disabled={isBusy}
                          onPress={() => changeTime(med, p.hour, p.minute)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 99,
                            backgroundColor: active ? "#15803d" : "#f3f4f6",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: active ? "#fff" : "#374151",
                            }}
                          >
                            {p.label} · {formatReminderTime(p.hour, p.minute)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    onPress={() => sendTest(med)}
                    style={{ marginTop: 12, alignSelf: "flex-start" }}
                  >
                    <Text style={{ color: "#15803d", fontSize: 13, fontWeight: "600" }}>
                      Send a test reminder now
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}

      <Text
        style={{
          fontSize: 11,
          color: "#9ca3af",
          textAlign: "center",
          marginTop: 8,
          lineHeight: 16,
        }}
      >
        Reminders repeat daily on this device. Food-timing warnings are general
        guidance — always follow your doctor or pharmacist&apos;s instructions.
      </Text>
    </ScrollView>
  );
};

export default MedReminders;
