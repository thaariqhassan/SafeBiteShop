import React from "react";
import { Text, View } from "react-native";
import { NutritionLogEntry } from "@/services/nutritionLog";
import { NutritionLimit } from "@/constants/nutritionLimits";

// Turns the last 7 days of diary entries into a per-day sugar & salt trend —
// so the tracker shows movement over time, not just today's snapshot.

const DAY_MS = 86400000;
const CHART_HEIGHT = 72;

interface DayBucket {
  date: Date;
  letter: string; // single-letter weekday label
  isToday: boolean;
  sugar: number;
  salt: number;
  count: number;
}

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

const buildSeries = (logs: NutritionLogEntry[], days: number): DayBucket[] => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todayKey = dayKey(start);

  const buckets: DayBucket[] = [];
  const index: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start.getTime() - i * DAY_MS);
    index[dayKey(d)] = buckets.length;
    buckets.push({
      date: d,
      letter: d.toLocaleDateString([], { weekday: "short" }).charAt(0),
      isToday: dayKey(d) === todayKey,
      sugar: 0,
      salt: 0,
      count: 0,
    });
  }

  for (const l of logs) {
    const d = new Date(l.scanned_at);
    d.setHours(0, 0, 0, 0);
    const i = index[dayKey(d)];
    if (i == null) continue;
    buckets[i].sugar += l.sugar || 0;
    buckets[i].salt += l.salt || 0;
    buckets[i].count += 1;
  }
  return buckets;
};

const barColor = (ratio: number) => {
  if (ratio >= 1) return "#dc2626";
  if (ratio >= 0.8) return "#f97316";
  if (ratio >= 0.6) return "#facc15";
  return "#16a34a";
};

// Compares the recent half of the week against the earlier half (days with
// logged food only) to describe the direction of travel.
const trendPhrase = (
  series: DayBucket[],
  pick: (d: DayBucket) => number,
  nutrient: string
): { text: string; color: string } => {
  const recent = series.slice(-3).filter((d) => d.count > 0);
  const earlier = series.slice(0, -3).filter((d) => d.count > 0);
  if (recent.length === 0 || earlier.length === 0) {
    return { text: `Keep logging to see your ${nutrient} trend.`, color: "#6b7280" };
  }
  const avg = (arr: DayBucket[]) =>
    arr.reduce((s, d) => s + pick(d), 0) / arr.length;
  const recentAvg = avg(recent);
  const earlierAvg = avg(earlier);
  const change = earlierAvg === 0 ? (recentAvg > 0 ? 1 : 0) : (recentAvg - earlierAvg) / earlierAvg;

  if (change > 0.1)
    return { text: `Your ${nutrient} is trending up ⬆️`, color: "#dc2626" };
  if (change < -0.1)
    return { text: `Your ${nutrient} is trending down ⬇️`, color: "#16a34a" };
  return { text: `Your ${nutrient} is holding steady →`, color: "#6b7280" };
};

const MiniBars = ({
  series,
  pick,
  limit,
}: {
  series: DayBucket[];
  pick: (d: DayBucket) => number;
  limit: number;
}) => {
  const maxVal = Math.max(limit, ...series.map(pick));
  const scale = maxVal > 0 ? maxVal : 1;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: CHART_HEIGHT, gap: 6 }}>
      {series.map((d, i) => {
        const val = pick(d);
        const h = Math.max(val > 0 ? 4 : 2, (val / scale) * CHART_HEIGHT);
        return (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 9, color: "#9ca3af", marginBottom: 2 }}>
              {val > 0 ? val.toFixed(val < 10 ? 1 : 0) : ""}
            </Text>
            <View
              style={{
                width: "100%",
                height: h,
                borderRadius: 4,
                backgroundColor: val > 0 ? barColor(val / limit) : "#e5e7eb",
              }}
            />
            <Text
              style={{
                fontSize: 10,
                marginTop: 4,
                color: d.isToday ? "#15803d" : "#9ca3af",
                fontWeight: d.isToday ? "700" : "400",
              }}
            >
              {d.letter}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const Section = ({
  title,
  series,
  pick,
  limit,
  unit,
  nutrient,
}: {
  title: string;
  series: DayBucket[];
  pick: (d: DayBucket) => number;
  limit: number;
  unit: string;
  nutrient: string;
}) => {
  const trend = trendPhrase(series, pick, nutrient);
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151" }}>{title}</Text>
        <Text style={{ fontSize: 11, color: "#9ca3af" }}>daily limit {limit}{unit}</Text>
      </View>
      <MiniBars series={series} pick={pick} limit={limit} />
      <Text style={{ fontSize: 12, fontWeight: "600", color: trend.color, marginTop: 8 }}>
        {trend.text}
      </Text>
    </View>
  );
};

const NutritionTrends = ({
  weekLogs,
  limits,
}: {
  weekLogs: NutritionLogEntry[];
  limits: NutritionLimit;
}) => {
  const series = buildSeries(weekLogs, 7);
  const hasAny = series.some((d) => d.count > 0);

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "bold", color: "#111827", marginBottom: 2 }}>
        7-Day Trends
      </Text>
      <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14 }}>
        Sugar & salt from your food diary over the past week.
      </Text>

      {hasAny ? (
        <>
          <Section
            title="🍬 Sugar"
            series={series}
            pick={(d) => d.sugar}
            limit={limits.sugar}
            unit="g"
            nutrient="sugar"
          />
          <View style={{ height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 }} />
          <Section
            title="🧂 Salt"
            series={series}
            pick={(d) => d.salt}
            limit={limits.salt}
            unit="g"
            nutrient="salt"
          />
        </>
      ) : (
        <Text style={{ fontSize: 13, color: "#9ca3af", paddingVertical: 8 }}>
          Log food across a few days and your sugar & salt trends will appear here.
        </Text>
      )}
    </View>
  );
};

export default NutritionTrends;
