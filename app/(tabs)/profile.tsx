import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { getActiveProfile } from "@/services/familyProfile";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";

const SPONSOR_URL = "https://www.buymeacoffee.com/ajaykrishnad";

const SectionLabel = ({ children }: { children: string }) => (
  <Text
    style={{
      fontSize: 12,
      fontWeight: "700",
      color: "#6b7280",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 22,
      marginBottom: 8,
    }}
  >
    {children}
  </Text>
);

const Card = ({ children }: { children: React.ReactNode }) => (
  <View
    style={{
      backgroundColor: "#ffffff",
      borderRadius: 14,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    }}
  >
    {children}
  </View>
);

const Row = ({
  icon,
  label,
  value,
  onPress,
  color = "#111827",
  iconColor = "#15803d",
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  color?: string;
  iconColor?: string;
  last?: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={0.6}
    style={{
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderBottomWidth: last ? 0 : 1,
      borderBottomColor: "#f3f4f6",
    }}
  >
    <Ionicons name={icon} size={20} color={iconColor} style={{ width: 28 }} />
    <Text style={{ flex: 1, fontSize: 15, color, fontWeight: "500" }}>{label}</Text>
    {value ? (
      <Text style={{ fontSize: 13, color: "#9ca3af", marginRight: 6 }}>{value}</Text>
    ) : null}
    {onPress ? <Ionicons name="chevron-forward" size={18} color="#d1d5db" /> : null}
  </TouchableOpacity>
);

const Chip = ({ label }: { label: string }) => (
  <View
    style={{
      backgroundColor: "#dcfce7",
      borderRadius: 99,
      paddingHorizontal: 10,
      paddingVertical: 5,
      margin: 3,
    }}
  >
    <Text style={{ fontSize: 12, color: "#166534", fontWeight: "600" }}>{label}</Text>
  </View>
);

const ChipRow = ({ title, items }: { title: string; items?: string[] }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 4 }}>
      {title}
    </Text>
    {items && items.length > 0 ? (
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {items.map((i) => (
          <Chip key={i} label={i} />
        ))}
      </View>
    ) : (
      <Text style={{ fontSize: 13, color: "#9ca3af" }}>None added</Text>
    )}
  </View>
);

const profile = () => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [cust, setCust] = useState<any>(null);
  const [users, setUsers] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeProfileName, setActiveProfileName] = useState<string>("");
  const [isProfileSelf, setIsProfileSelf] = useState(true);

  // Change-password modal
  const [pwModal, setPwModal] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    getActiveProfile().then((p) => {
      setActiveProfileName(p.name);
      setIsProfileSelf(p.isSelf);
    });
  }, []);

  useEffect(() => {
    const fetchD = async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      const [shopRes, custRes, usersRes] = await Promise.all([
        supabase.from("Shopkeepers").select("*").eq("id", u?.user?.id).single(),
        supabase.from("Customerdetails").select("*").eq("id", u?.user?.id).single(),
        supabase.from("Users").select("*").eq("id", u?.user?.id).single(),
      ]);
      setUser(u);
      setShop(shopRes.data);
      setCust(custRes.data);
      setUsers(usersRes.data);
      setLoading(false);
    };
    fetchD();
  }, []);

  const isShopkeeper = users?.isShopkeeper;

  const changePassword = async () => {
    if (newPw.length < 6) {
      Alert.alert("Weak password", "Use at least 6 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert("Passwords don't match", "Please re-enter to confirm.");
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) {
      Alert.alert("Couldn't update password", error.message);
      return;
    }
    setPwModal(false);
    setNewPw("");
    setConfirmPw("");
    Alert.alert("Done", "Your password has been updated.");
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message:
          "Check out SafeBite — scan any food and instantly see if it's safe for your allergies, conditions & medications. 🥗",
      });
    } catch {
      // user dismissed the share sheet
    }
  };

  const openSponsor = () =>
    Linking.openURL(SPONSOR_URL).catch(() =>
      Alert.alert("Couldn't open link", "Please try again later.")
    );

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
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
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >
      {/* Header */}
      <Card>
        <View style={{ alignItems: "center", padding: 20 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: "#dcfce7",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <Ionicons name="person" size={36} color="#15803d" />
          </View>
          <Text style={{ fontSize: 19, fontWeight: "700", color: "#111827" }}>
            {users?.username || "SafeBite User"}
          </Text>
          <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {user?.user?.email}
          </Text>
        </View>
      </Card>

      {/* Family switcher */}
      <View style={{ marginTop: 12 }}>
        <Card>
          <Row
            icon={isProfileSelf ? "person-outline" : "people-outline"}
            iconColor={isProfileSelf ? "#15803d" : "#92400e"}
            label={`Scanning as: ${activeProfileName || "You"}`}
            value="Manage"
            onPress={() => router.push("/family")}
            last
          />
        </Card>
      </View>

      {/* Health profile */}
      <SectionLabel>Health Profile</SectionLabel>
      <Card>
        <View style={{ padding: 14 }}>
          <ChipRow title="Allergies" items={cust?.allergies} />
          <ChipRow title="Medical Conditions" items={cust?.medical_conditions} />
          <ChipRow title="Dietary Restrictions" items={cust?.dietary_restrictions} />
          <ChipRow title="Medications" items={cust?.medications} />
        </View>
      </Card>

      {/* Account */}
      <SectionLabel>Account</SectionLabel>
      <Card>
        <Row
          icon="key-outline"
          label="Change Password"
          onPress={() => setPwModal(true)}
          last
        />
      </Card>

      {/* Support */}
      <SectionLabel>Support SafeBite</SectionLabel>
      <Card>
        <Row
          icon="cafe-outline"
          iconColor="#d97706"
          label="Buy us a coffee"
          onPress={openSponsor}
        />
        <Row
          icon="share-social-outline"
          label="Share SafeBite"
          onPress={shareApp}
          last
        />
      </Card>

      {/* About */}
      <SectionLabel>About</SectionLabel>
      <Card>
        <Row
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          onPress={() => router.push("/privacy")}
        />
        <Row
          icon="information-circle-outline"
          label="Version"
          value={Constants.expoConfig?.version || "1.0.0"}
          last
        />
      </Card>

      {/* Shop (shopkeepers only) */}
      {isShopkeeper && (
        <>
          <SectionLabel>Shop</SectionLabel>
          <Card>
            <View style={{ padding: 14 }}>
              <Text style={{ fontWeight: "700", color: "#111827", fontSize: 15 }}>
                {shop?.businessName}
              </Text>
              <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>
                {shop?.businessType} · {shop?.businessAddress}
              </Text>
            </View>
            <Row
              icon="storefront-outline"
              label="Go to Shop Interface"
              onPress={() => router.push("/shop_interface")}
              last
            />
          </Card>
        </>
      )}

      {/* Logout */}
      <TouchableOpacity
        onPress={logout}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fee2e2",
          borderRadius: 12,
          paddingVertical: 14,
          marginTop: 24,
        }}
      >
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={{ color: "#dc2626", fontWeight: "700", fontSize: 15, marginLeft: 8 }}>
          Log Out
        </Text>
      </TouchableOpacity>

      <Text style={{ textAlign: "center", color: "#9ca3af", fontSize: 11, marginTop: 14 }}>
        SafeBite · Eat safely for your body
      </Text>

      {/* Change password modal */}
      <Modal visible={pwModal} transparent animationType="fade" onRequestClose={() => setPwModal(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 14 }}>
              Change Password
            </Text>
            <TextInput
              value={newPw}
              onChangeText={setNewPw}
              placeholder="New password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              style={inputStyle}
            />
            <TextInput
              value={confirmPw}
              onChangeText={setConfirmPw}
              placeholder="Confirm new password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              style={inputStyle}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  setPwModal(false);
                  setNewPw("");
                  setConfirmPw("");
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{ color: "#6b7280", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={changePassword}
                disabled={pwSaving}
                style={{
                  backgroundColor: "#15803d",
                  borderRadius: 10,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  opacity: pwSaving ? 0.7 : 1,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {pwSaving ? "Saving…" : "Update"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const inputStyle = {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  color: "#111827",
  marginBottom: 10,
};

export default profile;
