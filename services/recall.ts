import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAllCachedProducts } from "@/services/scanCache";
import { ActiveProfile, getActiveProfile } from "@/services/familyProfile";
import { ALLERGEN_KEYWORDS } from "@/constants/allergenKeywords";
import { sendLocalNotification } from "@/services/notifications";

// openFDA Food Enforcement (recall) API — free, no key required.
const OPENFDA_URL =
  "https://api.fda.gov/food/enforcement.json?sort=recall_initiation_date:desc&limit=50";

const SEEN_KEY = "safebite_recall_seen_v1"; // recall ids we've already pushed
const ACTIVE_KEY = "safebite_recall_active_v1"; // alerts to show in the home banner
const PENDING_DEMO_KEY = "safebite_recall_demo_v1"; // queued demo recall

export interface RecallAlert {
  id: string;
  productName: string; // the scanned product that matched
  recallProduct: string; // recall product description
  reason: string; // reason_for_recall
  firm: string; // recalling_firm
  date: string; // recall_initiation_date (YYYYMMDD)
  classification: string; // "Class I" (most serious) … "Class III"
  allergyHit: string | null; // which of the profile's allergies the reason mentions
  profileName: string; // profile the alert applies to
  source: "openFDA" | "demo";
}

// ---- small helpers ---------------------------------------------------------

const STOP = new Set([
  "with", "from", "plus", "value", "brand", "brands", "foods", "food",
  "organic", "natural", "original", "classic", "flavor", "flavour",
  "snack", "snacks", "pack", "size", "count", "ounce", "gram", "grams",
]);

// Significant words (>= 5 chars, not generic) used to match a scanned product
// against a recall's free-text description.
const significantTokens = (s: string): string[] =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 5 && !STOP.has(t));

// Which of the profile's allergies does this recall reason mention?
const allergyRelevance = (reason: string, allergies: string[]): string | null => {
  const lower = (reason || "").toLowerCase();
  for (const allergy of allergies || []) {
    if (!allergy || allergy === "None") continue;
    const keywords = ALLERGEN_KEYWORDS[allergy] || [allergy];
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return allergy;
  }
  return null;
};

const productLabel = (product: any): string =>
  [product?.product_name, product?.brands].filter(Boolean).join(" ");

// ---- persistence -----------------------------------------------------------

const getSeen = async (): Promise<Set<string>> => {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

const addSeen = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const seen = await getSeen();
  ids.forEach((id) => seen.add(id));
  // keep the set bounded
  const trimmed = Array.from(seen).slice(-200);
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
};

export const getActiveAlerts = async (): Promise<RecallAlert[]> => {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setActiveAlerts = async (alerts: RecallAlert[]): Promise<void> => {
  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(alerts));
};

export const dismissAlert = async (id: string): Promise<void> => {
  const active = await getActiveAlerts();
  await setActiveAlerts(active.filter((a) => a.id !== id));
};

// ---- recall sourcing -------------------------------------------------------

const fetchRecentRecalls = async (): Promise<any[]> => {
  try {
    const res = await fetch(OPENFDA_URL);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.results) ? json.results : [];
  } catch {
    // Offline or API down — recall checks are best-effort.
    return [];
  }
};

// Build an alert by matching one scanned product against the recall feed.
const matchProductToRecalls = (
  product: any,
  productId: string,
  recalls: any[],
  allergies: string[],
  profileName: string
): RecallAlert | null => {
  const tokens = significantTokens(productLabel(product));
  if (tokens.length === 0) return null;

  for (const r of recalls) {
    const desc = (r.product_description || "").toLowerCase();
    if (!tokens.some((t) => desc.includes(t))) continue;
    return {
      id: `${r.recall_number || r.event_id || "rc"}::${productId}`,
      productName: product?.product_name || "A product you scanned",
      recallProduct: r.product_description || "",
      reason: r.reason_for_recall || "Safety recall",
      firm: r.recalling_firm || "Unknown manufacturer",
      date: r.recall_initiation_date || "",
      classification: r.classification || "",
      allergyHit: allergyRelevance(r.reason_for_recall || "", allergies),
      profileName,
      source: "openFDA",
    };
  }
  return null;
};

// ---- demo trigger ----------------------------------------------------------

// Queue a realistic recall against the most recently scanned product so the
// alert flow can be demoed reliably without waiting on a live FDA recall.
export const triggerDemoRecall = async (): Promise<boolean> => {
  const profile = await getActiveProfile();
  const products = await getAllCachedProducts();
  const latest = products[0];

  const allergy =
    (profile.allergies || []).find((a) => a && a !== "None") || "Peanuts";
  const keyword = (ALLERGEN_KEYWORDS[allergy] || [allergy])[0];

  const demo: RecallAlert = {
    id: `demo::${Date.now()}`,
    productName: latest?.product?.product_name || "Brand X Cookies",
    recallProduct: latest?.product?.product_name || "Brand X Cookies",
    reason: `Undeclared ${keyword} — product may contain ${keyword} not listed on the label`,
    firm: latest?.product?.brands || "Demo Foods Inc.",
    date: "",
    classification: "Class I",
    allergyHit: allergy,
    profileName: profile.name,
    source: "demo",
  };
  try {
    await AsyncStorage.setItem(PENDING_DEMO_KEY, JSON.stringify(demo));
    return true;
  } catch {
    return false;
  }
};

const popPendingDemo = async (): Promise<RecallAlert[]> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_DEMO_KEY);
    if (!raw) return [];
    await AsyncStorage.removeItem(PENDING_DEMO_KEY);
    return [JSON.parse(raw)];
  } catch {
    return [];
  }
};

// ---- orchestration ---------------------------------------------------------

const notificationBody = (a: RecallAlert): string => {
  const base = `${a.productName} was recalled — ${a.reason}.`;
  if (a.allergyHit) {
    const who = a.profileName ? ` ${a.profileName} is` : " You're";
    return `${base}${who} ${a.allergyHit.toLowerCase()}-sensitive. Don't eat it.`;
  }
  return `${base} Check before eating.`;
};

// Cross-references scanned products against current recalls, fires a push for
// any new match, and persists it for the home banner. Returns the new alerts.
export const runRecallScan = async (): Promise<RecallAlert[]> => {
  const profile = await getActiveProfile();
  const products = await getAllCachedProducts();

  const demoAlerts = await popPendingDemo();

  let realAlerts: RecallAlert[] = [];
  if (products.length > 0) {
    const recalls = await fetchRecentRecalls();
    if (recalls.length > 0) {
      realAlerts = products
        .map((e) =>
          matchProductToRecalls(
            e.product,
            e.id,
            recalls,
            profile.allergies,
            profile.name
          )
        )
        .filter((a): a is RecallAlert => a !== null);
    }
  }

  const candidates = [...demoAlerts, ...realAlerts];
  if (candidates.length === 0) return [];

  // Only surface/push recalls we haven't already alerted on.
  const seen = await getSeen();
  const fresh: RecallAlert[] = [];
  const byId = new Set<string>();
  for (const a of candidates) {
    if (seen.has(a.id) || byId.has(a.id)) continue;
    byId.add(a.id);
    fresh.push(a);
  }
  if (fresh.length === 0) return [];

  await addSeen(fresh.map((a) => a.id));

  // Persist for the home banner (newest first, keep the list bounded).
  const active = await getActiveAlerts();
  await setActiveAlerts([...fresh, ...active].slice(0, 10));

  // Fire one push per fresh recall.
  for (const a of fresh) {
    await sendLocalNotification("⚠️ Food Recall Alert", notificationBody(a), {
      type: "recall",
      id: a.id,
    });
  }

  return fresh;
};
