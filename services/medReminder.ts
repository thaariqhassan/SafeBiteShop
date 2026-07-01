import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cancelScheduledNotification,
  scheduleDailyNotification,
} from "@/services/notifications";
import { MEDICATION_INTERACTIONS } from "@/constants/medicationInteractions";

// Per-medication daily dose reminders that also warn about foods to avoid
// around the dose — the food × drug interaction map turned into a proactive
// nudge. Config is device-local; the schedule itself lives in the OS.
const REMINDERS_KEY = "safebite_med_reminders_v1";

export interface MedReminder {
  medication: string;
  hour: number; // 0–23, local time
  minute: number; // 0–59
  notificationId: string; // OS scheduler id, used to cancel
}

type ReminderMap = Record<string, MedReminder>;

// Foods this medication interacts with, deduped and human-readable — the heart
// of the "avoid grapefruit within a few hours" warning.
export const foodsToAvoid = (medication: string): string[] => {
  const interaction = MEDICATION_INTERACTIONS[medication];
  if (!interaction) return [];
  return Array.from(new Set(interaction.keywords));
};

// The notification body shown at dose time. Leads with the dose, then the
// food-timing warning if this medication has known interactions.
const reminderBody = (medication: string): string => {
  const foods = foodsToAvoid(medication);
  if (foods.length === 0) {
    return `Time to take your ${medication}.`;
  }
  const list = foods.slice(0, 5).join(", ");
  const more = foods.length > 5 ? ", …" : "";
  return `Time to take your ${medication}. Avoid ${list}${more} within a few hours of your dose.`;
};

export const formatReminderTime = (hour: number, minute: number): string => {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
};

const readMap = async (): Promise<ReminderMap> => {
  try {
    const raw = await AsyncStorage.getItem(REMINDERS_KEY);
    return raw ? (JSON.parse(raw) as ReminderMap) : {};
  } catch {
    return {};
  }
};

const writeMap = async (map: ReminderMap): Promise<void> => {
  try {
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(map));
  } catch {
    // best-effort
  }
};

export const getMedReminders = async (): Promise<ReminderMap> => readMap();

// Enable (or reschedule) a daily reminder for one medication. Cancels any
// existing schedule for that medication first so times don't stack up.
// Returns false if the OS refused to schedule (e.g. permission denied).
export const setMedReminder = async (
  medication: string,
  hour: number,
  minute: number
): Promise<boolean> => {
  const map = await readMap();
  const existing = map[medication];
  if (existing?.notificationId) {
    await cancelScheduledNotification(existing.notificationId);
  }

  const id = await scheduleDailyNotification(
    hour,
    minute,
    "💊 Medication Reminder",
    reminderBody(medication),
    { type: "med-reminder", medication }
  );
  if (!id) return false;

  map[medication] = { medication, hour, minute, notificationId: id };
  await writeMap(map);
  return true;
};

// Turn off the reminder for one medication.
export const clearMedReminder = async (medication: string): Promise<void> => {
  const map = await readMap();
  const existing = map[medication];
  if (existing?.notificationId) {
    await cancelScheduledNotification(existing.notificationId);
  }
  delete map[medication];
  await writeMap(map);
};

// Drop reminders for medications no longer on the active profile (e.g. after
// the user edits their meds). Keeps the OS schedule in sync with the profile.
export const pruneMedReminders = async (
  currentMedications: string[]
): Promise<void> => {
  const map = await readMap();
  const keep = new Set(currentMedications);
  let changed = false;
  for (const med of Object.keys(map)) {
    if (!keep.has(med)) {
      if (map[med]?.notificationId) {
        await cancelScheduledNotification(map[med].notificationId);
      }
      delete map[med];
      changed = true;
    }
  }
  if (changed) await writeMap(map);
};
