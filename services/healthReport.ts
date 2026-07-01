import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { getLogsSince, NutritionLogEntry } from "@/services/nutritionLog";
import { getActiveProfile } from "@/services/familyProfile";
import { getNutritionLimits, NutritionLimit } from "@/constants/nutritionLimits";
import { MedicationWarning } from "@/constants/medicationInteractions";

const REPORT_DAYS = 7;

const esc = (s: string): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const dayKey = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
};

interface Totals {
  calories: number;
  sugar: number;
  fat: number;
  salt: number;
  protein: number;
}

const emptyTotals = (): Totals => ({ calories: 0, sugar: 0, fat: 0, salt: 0, protein: 0 });

const addNutrients = (t: Totals, l: NutritionLogEntry): Totals => ({
  calories: t.calories + l.calories,
  sugar: t.sugar + l.sugar,
  fat: t.fat + l.fat,
  salt: t.salt + l.salt,
  protein: t.protein + l.protein,
});

const limitRow = (label: string, value: number, limit: number, unit: string): string => {
  const over = value > limit;
  return `<tr>
    <td>${esc(label)}</td>
    <td style="text-align:right">${value.toFixed(1)} ${esc(unit)}</td>
    <td style="text-align:right;color:#9ca3af">${limit} ${esc(unit)}</td>
    <td style="text-align:center;color:${over ? "#dc2626" : "#16a34a"};font-weight:700">
      ${over ? "Over" : "OK"}
    </td>
  </tr>`;
};

const buildHtml = (
  profile: { name: string; allergies: string[]; medical_conditions: string[]; dietary_restrictions: string[]; medications: string[] },
  limits: NutritionLimit,
  logs: NutritionLogEntry[],
  generatedOn: string
): string => {
  // Group logs by local day, newest first (logs already arrive newest-first).
  const days: { key: string; entries: NutritionLogEntry[] }[] = [];
  for (const log of logs) {
    const key = dayKey(log.scanned_at);
    let bucket = days.find((d) => d.key === key);
    if (!bucket) {
      bucket = { key, entries: [] };
      days.push(bucket);
    }
    bucket.entries.push(log);
  }

  // Collect every medication interaction flagged across the period.
  const interactions: { food: string; day: string; warning: MedicationWarning }[] = [];
  for (const log of logs) {
    if (Array.isArray(log.med_flags)) {
      for (const w of log.med_flags) {
        interactions.push({ food: log.product_name, day: dayKey(log.scanned_at), warning: w });
      }
    }
  }

  const chip = (items: string[]): string =>
    items.length
      ? items.map((i) => `<span class="chip">${esc(i)}</span>`).join(" ")
      : '<span class="muted">None recorded</span>';

  const daysHtml = days
    .map((d) => {
      const totals = d.entries.reduce(addNutrients, emptyTotals());
      const rows = d.entries
        .map((e) => {
          const flagged = Array.isArray(e.med_flags) && e.med_flags.length > 0;
          return `<tr>
            <td>${esc(e.product_name)}${
            flagged
              ? ` <span class="flag">⚠ interacts with ${esc(
                  e.med_flags!.map((w) => w.medication).join(", ")
                )}</span>`
              : ""
          }</td>
            <td style="text-align:right">${e.calories.toFixed(0)}</td>
            <td style="text-align:right">${e.sugar.toFixed(1)}</td>
            <td style="text-align:right">${e.fat.toFixed(1)}</td>
            <td style="text-align:right">${e.salt.toFixed(2)}</td>
            <td style="text-align:right">${e.protein.toFixed(1)}</td>
          </tr>`;
        })
        .join("");
      return `<div class="day">
        <h3>${esc(d.key)}</h3>
        <table class="diary">
          <thead>
            <tr><th>Food</th><th>kcal</th><th>Sugar</th><th>Fat</th><th>Salt</th><th>Protein</th></tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="totals">
              <td>Daily total</td>
              <td style="text-align:right">${totals.calories.toFixed(0)}</td>
              <td style="text-align:right">${totals.sugar.toFixed(1)}</td>
              <td style="text-align:right">${totals.fat.toFixed(1)}</td>
              <td style="text-align:right">${totals.salt.toFixed(2)}</td>
              <td style="text-align:right">${totals.protein.toFixed(1)}</td>
            </tr>
          </tbody>
        </table>
      </div>`;
    })
    .join("");

  const interactionsHtml = interactions.length
    ? interactions
        .map(
          (it) => `<div class="warn">
            <strong>${esc(it.warning.medication)}</strong> &mdash; ${esc(it.food)} <span class="muted">(${esc(it.day)})</span><br/>
            <span class="muted">Contains: ${esc(it.warning.triggeredBy.join(", "))}.</span><br/>
            ${esc(it.warning.reason)}
          </div>`
        )
        .join("")
    : '<p class="muted">No food–medication interactions were flagged in this period.</p>';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #111827; padding: 28px; font-size: 13px; }
  h1 { font-size: 22px; margin: 0; color: #15803d; }
  h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 2px solid #dcfce7; padding-bottom: 4px; color: #166534; }
  h3 { font-size: 13px; margin: 14px 0 6px; color: #374151; }
  .sub { color: #6b7280; margin: 2px 0 0; }
  .muted { color: #9ca3af; }
  .chip { display: inline-block; background: #f0fdf4; color: #166534; border-radius: 10px; padding: 2px 9px; margin: 2px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { padding: 6px 8px; font-size: 12px; border-bottom: 1px solid #f3f4f6; text-align: left; }
  th { background: #f9fafb; color: #6b7280; font-weight: 600; }
  table.limits td, table.limits th { border-bottom: 1px solid #f3f4f6; }
  tr.totals td { font-weight: 700; background: #f9fafb; border-top: 2px solid #e5e7eb; }
  .flag { color: #b91c1c; font-size: 11px; font-weight: 600; }
  .warn { background: #fff1f2; border-left: 4px solid #dc2626; padding: 8px 10px; border-radius: 6px; margin-bottom: 8px; line-height: 1.5; }
  .disclaimer { margin-top: 26px; padding: 10px 12px; background: #f9fafb; border-radius: 8px; color: #6b7280; font-size: 11px; line-height: 1.5; }
  .footer { margin-top: 14px; color: #9ca3af; font-size: 11px; }
</style></head>
<body>
  <h1>🥗 SafeBite — Health Report</h1>
  <p class="sub">For <strong>${esc(profile.name)}</strong> · Last ${REPORT_DAYS} days · Generated ${esc(generatedOn)}</p>

  <h2>Health Profile</h2>
  <p><strong>Allergies:</strong> ${chip(profile.allergies)}</p>
  <p><strong>Medical conditions:</strong> ${chip(profile.medical_conditions)}</p>
  <p><strong>Medications:</strong> ${chip(profile.medications)}</p>
  <p><strong>Dietary:</strong> ${chip(profile.dietary_restrictions)}</p>

  <h2>Personalised Daily Limits</h2>
  <table class="limits">
    <thead><tr><th>Nutrient</th><th style="text-align:right">Recommended limit</th></tr></thead>
    <tbody>
      <tr><td>Calories</td><td style="text-align:right">${limits.calories} kcal</td></tr>
      <tr><td>Sugar</td><td style="text-align:right">${limits.sugar} g</td></tr>
      <tr><td>Fat</td><td style="text-align:right">${limits.fat} g</td></tr>
      <tr><td>Salt</td><td style="text-align:right">${limits.salt} g</td></tr>
      <tr><td>Protein</td><td style="text-align:right">${limits.protein} g</td></tr>
    </tbody>
  </table>
  <p class="muted" style="margin-top:4px">Limits auto-tighten for your conditions. Food values are per 100 g of each logged product.</p>

  <h2>Food–Medication Interactions</h2>
  ${interactionsHtml}

  <h2>Food Diary (last ${REPORT_DAYS} days)</h2>
  ${days.length ? daysHtml : '<p class="muted">No foods were logged in this period.</p>'}

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report is generated by SafeBite from your self-logged food diary and
    health profile for informational purposes only. It is not medical advice and is not a substitute for
    professional diagnosis or treatment. Nutrient figures are estimates based on per-100 g product data.
    Always consult your doctor, pharmacist, or dietitian before making changes to your diet or medications.
  </div>
  <p class="footer">Generated by SafeBite · Scan Smart. Eat Safe. Live Well.</p>
</body></html>`;
};

/**
 * Builds a PDF health report from the last 7 days of the food diary and the
 * active profile, then opens the native share sheet so it can be sent to a
 * doctor or dietitian. Returns an error string if anything fails.
 */
export const exportHealthReport = async (
  generatedOn: string
): Promise<{ error: string | null }> => {
  try {
    const [profile, logs] = await Promise.all([
      getActiveProfile(),
      getLogsSince(REPORT_DAYS),
    ]);
    const limits = getNutritionLimits(profile.medical_conditions);
    const html = buildHtml(profile, limits, logs, generatedOn);

    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share your SafeBite health report",
        UTI: "com.adobe.pdf",
      });
    }
    return { error: null };
  } catch (e: any) {
    return { error: e?.message ?? "Could not generate the report." };
  }
};
