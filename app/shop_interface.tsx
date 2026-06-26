import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  addShopProduct,
  deleteShopProduct,
  getShopProducts,
  ShopProduct,
  updateShopProduct,
} from "@/services/shopProducts";

const SOON_DAYS = 7;

const daysToExpiry = (expiry: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(expiry);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
};

const expiryMeta = (expiry: string | null) => {
  if (!expiry) return { color: "#6b7280", bg: "#f3f4f6", label: "No expiry" };
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

const EMPTY_FORM = {
  name: "",
  price: "",
  stock_count: "",
  rating: "",
  expiry: "",
  image_url: "",
};

const ShopInterface: React.FC = () => {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await getShopProducts();
    setProducts(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const stats = useMemo(() => {
    const outOfStock = products.filter((i) => i.stock_count === 0).length;
    const expiringSoon = products.filter((i) => {
      if (!i.expiry) return false;
      const d = daysToExpiry(i.expiry);
      return d >= 0 && d <= SOON_DAYS;
    }).length;
    return { total: products.length, outOfStock, expiringSoon };
  }, [products]);

  const filtered = useMemo(
    () => products.filter((i) => i.name.toLowerCase().includes(query.trim().toLowerCase())),
    [products, query]
  );

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setModal(true);
  };

  const openEdit = (p: ShopProduct) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: String(p.price),
      stock_count: String(p.stock_count),
      rating: p.rating ? String(p.rating) : "",
      expiry: p.expiry ?? "",
      image_url: p.image_url ?? "",
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Name required", "Please enter a product name.");
      return;
    }
    if (form.expiry && !/^\d{4}-\d{2}-\d{2}$/.test(form.expiry.trim())) {
      Alert.alert("Invalid date", "Use the format YYYY-MM-DD for expiry, or leave it blank.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      price: parseFloat(form.price) || 0,
      stock_count: parseInt(form.stock_count) || 0,
      rating: Math.min(5, parseFloat(form.rating) || 0),
      expiry: form.expiry.trim() || null,
      image_url: form.image_url.trim() || null,
    };
    setSaving(true);
    const { error } = editingId
      ? await updateShopProduct(editingId, payload)
      : await addShopProduct(payload);
    setSaving(false);
    if (error) {
      Alert.alert(
        "Couldn't save",
        typeof error === "string" ? error : error?.message ?? "Please try again."
      );
      return;
    }
    setModal(false);
    await load();
  };

  const handleDelete = (p: ShopProduct) => {
    Alert.alert("Delete product", `Remove "${p.name}" from your shop?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await deleteShopProduct(p.id);
          if (error) {
            Alert.alert("Couldn't delete", error?.message ?? "Please try again.");
            return;
          }
          setProducts((prev) => prev.filter((x) => x.id !== p.id));
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 90 }}>
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

        {products.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 50, paddingHorizontal: 20 }}>
            <Ionicons name="cube-outline" size={48} color="#d1d5db" />
            <Text style={{ color: "#6b7280", fontSize: 15, fontWeight: "600", marginTop: 12 }}>
              No products yet
            </Text>
            <Text style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", marginTop: 4 }}>
              Tap the + button to add your first product to the shop.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((item) => {
              const stock = stockMeta(item.stock_count);
              const exp = expiryMeta(item.expiry);
              return (
                <View style={styles.card} key={item.id}>
                  <Image
                    source={{
                      uri:
                        item.image_url ||
                        "https://placehold.co/200x110?text=No+Image&font=roboto",
                    }}
                    style={styles.image}
                  />
                  <Text style={styles.title} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>Rs {item.price}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text style={styles.rating}>{(item.rating || 0).toFixed(1)}</Text>
                    </View>
                  </View>
                  <View style={[styles.badge, { backgroundColor: stock.bg }]}>
                    <Text style={[styles.badgeText, { color: stock.color }]}>{stock.label}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: exp.bg, marginTop: 5 }]}>
                    <Text style={[styles.badgeText, { color: exp.color }]}>{exp.label}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
                      <Ionicons name="create-outline" size={18} color="#15803d" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                      <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {products.length > 0 && filtered.length === 0 && (
          <Text style={{ textAlign: "center", color: "#9ca3af", marginTop: 30 }}>
            No products match "{query}".
          </Text>
        )}
      </ScrollView>

      {/* Floating add button */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add / edit modal */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingId ? "Edit Product" : "Add Product"}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Field label="Name *">
                <TextInput
                  value={form.name}
                  onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder="e.g. Lays"
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                />
              </Field>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Price (Rs)">
                    <TextInput
                      value={form.price}
                      onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Stock">
                    <TextInput
                      value={form.stock_count}
                      onChangeText={(v) => setForm((f) => ({ ...f, stock_count: v }))}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </Field>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Field label="Rating (0-5)">
                    <TextInput
                      value={form.rating}
                      onChangeText={(v) => setForm((f) => ({ ...f, rating: v }))}
                      placeholder="0"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Expiry">
                    <TextInput
                      value={form.expiry}
                      onChangeText={(v) => setForm((f) => ({ ...f, expiry: v }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9ca3af"
                      style={styles.input}
                    />
                  </Field>
                </View>
              </View>
              <Field label="Image URL (optional)">
                <TextInput
                  value={form.image_url}
                  onChangeText={(v) => setForm((f) => ({ ...f, image_url: v }))}
                  placeholder="https://…"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </Field>
            </ScrollView>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
              <TouchableOpacity onPress={() => setModal(false)} style={{ paddingHorizontal: 16, paddingVertical: 11 }}>
                <Text style={{ color: "#6b7280", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: "#15803d",
                  borderRadius: 10,
                  paddingHorizontal: 20,
                  paddingVertical: 11,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {saving ? "Saving…" : editingId ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 5 }}>
      {label}
    </Text>
    {children}
  </View>
);

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
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    marginTop: 8,
    gap: 6,
  },
  actionBtn: {
    padding: 6,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#15803d",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
});

export default ShopInterface;
