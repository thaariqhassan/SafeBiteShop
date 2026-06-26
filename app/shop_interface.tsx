import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import itemImage from "../components/itemImg";

interface ShopItem {
  name: string;
  key: string;
  price: number;
  imgsrc: string;
  stock_count: number;
  rating: number;
  expiry: string;
}

const items: ShopItem[] = [
  { name: "Lays", key: "lays", price: 20, imgsrc: itemImage[0], stock_count: 0, rating: 4.8, expiry: "2026-06-20" },
  { name: "Pepsi", key: "pepsi", price: 60, imgsrc: itemImage[1], stock_count: 20, rating: 4.0, expiry: "2026-12-27" },
  { name: "Elite Maida", key: "elite_maida", price: 100, imgsrc: itemImage[2], stock_count: 4, rating: 4.5, expiry: "2026-07-01" },
  { name: "Boost", key: "boost", price: 70, imgsrc: itemImage[3], stock_count: 20, rating: 4.8, expiry: "2026-09-25" },
  { name: "Milma curd", key: "milma_curd", price: 35, imgsrc: itemImage[4], stock_count: 10, rating: 4.8, expiry: "2026-06-30" },
  { name: "Good Day", key: "goodday", price: 20, imgsrc: itemImage[5], stock_count: 10, rating: 4.8, expiry: "2026-11-01" },
];

const SOON_DAYS = 7;

// Days from today until the expiry date (negative = already expired).
const daysToExpiry = (expiry: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(expiry);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

const expiryMeta = (expiry: string) => {
  const d = daysToExpiry(expiry);
  if (d < 0) return { color: "#dc2626", bg: "#fee2e2", label: "Expired" };
  if (d <= SOON_DAYS)
    return { color: "#b45309", bg: "#fef3c7", label: d === 0 ? "Expires today" : `Expires in ${d}d` };
  return { color: "#15803d", bg: "#dcfce7", label: `Exp ${expiry.slice(5)}` };
};

const stockMeta = (stock: number) => {
  if (stock === 0) return { color: "#dc2626", bg: "#fee2e2", label: "Out of stock" };
  if (stock <= 5) return { color: "#b45309", bg: "#fef3c7", label: `Low · ${stock} left` };
  return { color: "#15803d", bg: "#dcfce7", label: `${stock} in stock` };
};

const StatPill = ({ value, label, color }: { value: number; label: string; color: string }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const ShopInterface: React.FC = () => {
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const outOfStock = items.filter((i) => i.stock_count === 0).length;
    const expiringSoon = items.filter((i) => {
      const d = daysToExpiry(i.expiry);
      return d >= 0 && d <= SOON_DAYS;
    }).length;
    return { total: items.length, outOfStock, expiringSoon };
  }, []);

  const filtered = useMemo(
    () => items.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase())),
    [query]
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      contentContainerStyle={{ padding: 14, paddingBottom: 60 }}
    >
      {/* Stats header */}
      <View style={styles.statsCard}>
        <StatPill value={stats.total} label="Products" color="#111827" />
        <View style={styles.divider} />
        <StatPill value={stats.outOfStock} label="Out of stock" color="#dc2626" />
        <View style={styles.divider} />
        <StatPill value={stats.expiringSoon} label="Expiring soon" color="#b45309" />
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search products"
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Ionicons name="close-circle" size={18} color="#9ca3af" onPress={() => setQuery("")} />
        )}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {filtered.map((item) => {
          const stock = stockMeta(item.stock_count);
          const exp = expiryMeta(item.expiry);
          return (
            <View style={styles.card} key={item.key}>
              <Image source={{ uri: item.imgsrc }} style={styles.image} />
              <Text style={styles.title} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>Rs {item.price}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: stock.bg }]}>
                <Text style={[styles.badgeText, { color: stock.color }]}>{stock.label}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: exp.bg, marginTop: 5 }]}>
                <Text style={[styles.badgeText, { color: exp.color }]}>{exp.label}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {filtered.length === 0 && (
        <Text style={{ textAlign: "center", color: "#9ca3af", marginTop: 30 }}>
          No products match "{query}".
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  divider: { width: 1, height: 28, backgroundColor: "#f3f4f6" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: "#111827" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: "48.5%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  image: { width: "100%", height: 110, resizeMode: "contain", borderRadius: 8, marginBottom: 8 },
  title: { fontSize: 15, fontWeight: "700", color: "#111827", alignSelf: "flex-start" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginVertical: 6,
  },
  price: { fontSize: 14, fontWeight: "700", color: "#15803d" },
  ratingRow: { flexDirection: "row", alignItems: "center" },
  rating: { fontSize: 12, color: "#6b7280", marginLeft: 3, fontWeight: "600" },
  badge: { width: "100%", paddingVertical: 4, borderRadius: 8, alignItems: "center" },
  badgeText: { fontSize: 11, fontWeight: "700" },
});

export default ShopInterface;
