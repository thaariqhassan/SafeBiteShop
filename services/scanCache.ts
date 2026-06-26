import AsyncStorage from "@react-native-async-storage/async-storage";
import { MedicationWarning } from "@/constants/medicationInteractions";

const CACHE_KEY = "safebite_scan_cache_v1";
const MAX_ENTRIES = 50;

export interface CacheEntry {
  id: string;
  product: any;
  summary: string | null;
  medicationWarnings: MedicationWarning[];
  profileName: string;
  cachedAt: number;
}

const readCache = async (): Promise<CacheEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeCache = async (entries: CacheEntry[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {
    // storage full — drop oldest half and retry
    try {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify(entries.slice(0, Math.floor(MAX_ENTRIES / 2)))
      );
    } catch {}
  }
};

export const getCachedProduct = async (id: string): Promise<CacheEntry | null> => {
  const entries = await readCache();
  return entries.find((e) => e.id === id) ?? null;
};

export const cacheProduct = async (entry: CacheEntry): Promise<void> => {
  const entries = await readCache();
  const updated = [entry, ...entries.filter((e) => e.id !== entry.id)].slice(
    0,
    MAX_ENTRIES
  );
  await writeCache(updated);
};

export const updateCachedSummary = async (
  id: string,
  summary: string | null,
  medicationWarnings: MedicationWarning[],
  profileName: string
): Promise<void> => {
  const entries = await readCache();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], summary, medicationWarnings, profileName };
    await writeCache(entries);
  }
};

export const getAllCachedProducts = async (): Promise<CacheEntry[]> => readCache();
