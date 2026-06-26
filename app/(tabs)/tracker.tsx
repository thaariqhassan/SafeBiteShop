import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import {
  deleteLog,
  getTodayLogs,
  NutritionLogEntry,
} from "../_services/nutritionLog";
import {
  getNutritionLimits,
  NutritionLimit,
} from "@/constants/nutritionLimits";

interface Totals {
  calories: number;
  sugar: number;
  fat: number;
  salt: number;
  protein: number;
}

const barColor = (pct: number) => {
  if (pct >= 1) return "#dc2626";
  if (pct >= 0.8) return "#f97316";
  if (pct >= 0.6) return "#facc15";
  return "#16a34a";
};

const NutrientBar = ({
  label,
  value,
  limit,
  unit,
}: {
  label: string;
  value: number;
  limit: number;
  unit: string;
}) => {
  const pct = Math.min(value / limit, 1);
  const color = barColor(value / limit);
  const exceeded = value > limit;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontWeight: "600", color: "#374151", fontSize: 13 }}>{label}</Text>
        <Text style={{ color: exceeded ? "#dc2626" : "#6b7280", fontSize: 13 }}>
          {value.toFixed(1)} / {limit} {unit}
          {exceeded ? "  ⚠️" : ""}
        </Text>
      </View>
      <View style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
        <View style={{ height: 8, width: `${pct * 100}%`, backgroundColor: color, borderRadius: 99 }} />
      </View>
    </View>
  );
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const today = new Date();
const dateLabel = today.toLocaleDateString([], {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const tracker = () => {
  const [logs, setLogs] = useState<NutritionLogEntry[]>([]);
  const [limits, setLimits] = useState<NutritionLimit | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [logsData, profileRes] = await Promise.all([
      getTodayLogs(),
      supabase.auth.getUser().then(({ data: u }) =>
        supabase
          .from("Customerdetails")
          .select("medical_conditions")
          .eq("id", u?.user?.id)
          .single()
      ),
    ]);
    setLogs(logsData);
    const conditions: string[] = profileRes.data?.medical_conditions ?? [];
    setLimits(getNutritionLimits(conditions));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleDelete = async (id: string) => {
    await deleteLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  };

  const totals: Totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      sugar: acc.sugar + l.sugar,
      fat: acc.fat + l.fat,
      salt: acc.salt + l.salt,
      protein: acc.protein + l.protein,
    }),
    { calories: 0, sugar: 0, fat: 0, salt: 0, protein: 0 }
  );

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
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803d" />}
    >
      <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 2 }}>{dateLabel}</Text>
      <Text style={{ fontSize: 20, fontWeight: "bold", color: "#111827", marginBottom: 16 }}>
        Today's Nutrition
      </Text>

      {limits && (
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
          <NutrientBar label="Calories" value={totals.calories} limit={limits.calories} unit="kcal" />
          <NutrientBar label="Sugar" value={totals.sugar} limit={limits.sugar} unit="g" />
          <NutrientBar label="Fat" value={totals.fat} limit={limits.fat} unit="g" />
          <NutrientBar label="Salt" value={totals.salt} limit={limits.salt} unit="g" />
          <NutrientBar label="Protein" value={totals.protein} limit={limits.protein} unit="g" />
          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            Values are per 100 g of each logged product.
          </Text>
        </View>
      )}

      <Text style={{ fontSize: 16, fontWeight: "bold", color: "#111827", marginBottom: 10 }}>
        Food Diary
      </Text>

      {logs.length === 0 ? (
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            padding: 24,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#9ca3af", fontSize: 14 }}>No items logged today.</Text>
          <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
            Scan a product and tap "Add to Food Diary".
          </Text>
        </View>
      ) : (
        logs.map((log) => (
          <View
            key={log.id}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text
                style={{ fontWeight: "600", color: "#111827", fontSize: 14, flex: 1, marginRight: 8 }}
                numberOfLines={1}
              >
                {log.product_name}
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 11 }}>{formatTime(log.scanned_at)}</Text>
            </View>
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 6 }}
            >
              {[
                { label: `🔥 ${log.calories.toFixed(0)} kcal` },
                { label: `🍬 Sugar ${log.sugar.toFixed(1)}g` },
                { label: `🧈 Fat ${log.fat.toFixed(1)}g` },
                { label: `🧂 Salt ${log.salt.toFixed(2)}g` },
                { label: `💪 Protein ${log.protein.toFixed(1)}g` },
              ].map(({ label }) => (
                <View
                  key={label}
                  style={{ backgroundColor: "#f0fdf4", borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}
                >
                  <Text style={{ fontSize: 11, color: "#166534" }}>{label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(log.id)}
              style={{ alignSelf: "flex-end", marginTop: 8 }}
            >
              <Text style={{ color: "#dc2626", fontSize: 12 }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default tracker;
