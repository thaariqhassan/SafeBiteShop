import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  addFamilyMember,
  deleteFamilyMember,
  FamilyMember,
  getActiveProfileId,
  getFamilyMembers,
  setActiveProfileId,
} from "./_services/familyProfile";
import {
  commonAllergies,
  commonMedications,
  dietaryRestrictions,
  medicalConditions,
} from "@/constants/const";

const AGE_GROUPS = ["0-12", "13-19", "20-35", "36-50", "51+"];

const EMPTY_FORM = {
  name: "",
  allergies: [] as string[],
  medical_conditions: [] as string[],
  dietary_restrictions: [] as string[],
  medications: [] as string[],
  age_group: "",
  allergy_severity: "",
};

const ChipGroup = ({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
    {options
      .filter((o) => o !== "None")
      .map((o) => (
        <TouchableOpacity
          key={o}
          onPress={() => onToggle(o)}
          style={{
            backgroundColor: selected.includes(o) ? "#00C897" : "#e5e7eb",
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: selected.includes(o) ? "#fff" : "#374151",
            }}
          >
            {o}
          </Text>
        </TouchableOpacity>
      ))}
  </View>
);

const family = () => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [activeId, setLocalActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadData = useCallback(async () => {
    const [m, aid] = await Promise.all([getFamilyMembers(), getActiveProfileId()]);
    setMembers(m);
    setLocalActiveId(aid);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const toggleChip = (field: keyof typeof EMPTY_FORM, val: string) => {
    const arr = form[field] as string[];
    setForm((f) => ({
      ...f,
      [field]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
    }));
  };

  const handleSwitch = async (id: string | null) => {
    await setActiveProfileId(id);
    setLocalActiveId(id);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("Remove member", `Remove ${name} from family profiles?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteFamilyMember(id);
          setMembers((m) => m.filter((x) => x.id !== id));
          if (activeId === id) setLocalActiveId(null);
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { error } = await addFamilyMember({
      name: form.name.trim(),
      allergies: form.allergies,
      medical_conditions: form.medical_conditions,
      dietary_restrictions: form.dietary_restrictions,
      medications: form.medications,
      age_group: form.age_group,
      allergy_severity: form.allergy_severity,
    });
    if (!error) {
      await loadData();
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
    }
    setSaving(false);
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
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
    >
      <Text style={sectionLabel}>My Account</Text>
      <View style={card}>
        <View style={row}>
          <View style={row}>
            <Ionicons name="person-circle-outline" size={26} color="#15803d" />
            <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginLeft: 8 }}>
              My Profile
            </Text>
          </View>
          {activeId === null ? (
            <View style={activeBadge}>
              <Text style={activeBadgeText}>Active</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={() => handleSwitch(null)} style={switchBtn}>
              <Text style={switchBtnText}>Use This</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={{ ...sectionLabel, marginTop: 20 }}>
        Family Members ({members.length})
      </Text>

      {members.map((m) => (
        <View key={m.id} style={{ ...card, marginBottom: 10 }}>
          <View style={row}>
            <View style={row}>
              <Ionicons name="people-outline" size={22} color="#15803d" />
              <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginLeft: 8 }}>
                {m.name}
              </Text>
              {m.age_group ? (
                <Text style={{ color: "#9ca3af", fontSize: 12, marginLeft: 4 }}>
                  ({m.age_group})
                </Text>
              ) : null}
            </View>
            <View style={row}>
              {activeId === m.id ? (
                <View style={activeBadge}>
                  <Text style={activeBadgeText}>Active</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => handleSwitch(m.id)} style={switchBtn}>
                  <Text style={switchBtnText}>Switch</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => handleDelete(m.id, m.name)}
                style={{ marginLeft: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>

          {((m.allergies?.length ?? 0) + (m.medical_conditions?.length ?? 0)) > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
              {[...(m.allergies ?? []), ...(m.medical_conditions ?? [])]
                .slice(0, 5)
                .map((tag) => (
                  <View
                    key={tag}
                    style={{
                      backgroundColor: "#dcfce7",
                      borderRadius: 99,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#166534" }}>{tag}</Text>
                  </View>
                ))}
              {((m.allergies?.length ?? 0) + (m.medical_conditions?.length ?? 0)) > 5 && (
                <View
                  style={{
                    backgroundColor: "#f3f4f6",
                    borderRadius: 99,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#6b7280" }}>
                    +
                    {(m.allergies?.length ?? 0) +
                      (m.medical_conditions?.length ?? 0) -
                      5}{" "}
                    more
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity
        onPress={() => setShowForm((s) => !s)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1.5,
          borderColor: "#16a34a",
          borderStyle: "dashed",
          borderRadius: 12,
          padding: 12,
          marginTop: 4,
        }}
      >
        <Ionicons
          name={showForm ? "remove-circle-outline" : "add-circle-outline"}
          size={20}
          color="#16a34a"
        />
        <Text style={{ color: "#16a34a", fontWeight: "600", marginLeft: 6 }}>
          {showForm ? "Cancel" : "Add Family Member"}
        </Text>
      </TouchableOpacity>

      {showForm && (
        <View style={{ ...card, marginTop: 12 }}>
          <Text style={formLabel}>Name *</Text>
          <TextInput
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. Mum, John, Baby"
            placeholderTextColor="#9ca3af"
            style={{
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 8,
              padding: 10,
              fontSize: 14,
              color: "#111827",
              marginBottom: 14,
            }}
          />

          <Text style={formLabel}>Allergies</Text>
          <ChipGroup
            options={commonAllergies}
            selected={form.allergies}
            onToggle={(v) => toggleChip("allergies", v)}
          />

          <Text style={{ ...formLabel, marginTop: 14 }}>Medical Conditions</Text>
          <ChipGroup
            options={medicalConditions}
            selected={form.medical_conditions}
            onToggle={(v) => toggleChip("medical_conditions", v)}
          />

          <Text style={{ ...formLabel, marginTop: 14 }}>Dietary Restrictions</Text>
          <ChipGroup
            options={dietaryRestrictions}
            selected={form.dietary_restrictions}
            onToggle={(v) => toggleChip("dietary_restrictions", v)}
          />

          <Text style={{ ...formLabel, marginTop: 14 }}>Medications</Text>
          <ChipGroup
            options={commonMedications}
            selected={form.medications}
            onToggle={(v) => toggleChip("medications", v)}
          />

          <Text style={{ ...formLabel, marginTop: 14 }}>Age Group</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {AGE_GROUPS.map((ag) => (
              <TouchableOpacity
                key={ag}
                onPress={() =>
                  setForm((f) => ({ ...f, age_group: f.age_group === ag ? "" : ag }))
                }
                style={{
                  backgroundColor: form.age_group === ag ? "#00C897" : "#e5e7eb",
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: form.age_group === ag ? "#fff" : "#374151",
                  }}
                >
                  {ag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !form.name.trim()}
            style={{
              backgroundColor:
                saving || !form.name.trim() ? "#86efac" : "#15803d",
              borderRadius: 10,
              padding: 12,
              marginTop: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
              {saving ? "Saving…" : "Save Member"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const card = {
  backgroundColor: "#ffffff",
  borderRadius: 12,
  padding: 14,
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 3,
  elevation: 1,
};

const row = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
};

const activeBadge = {
  backgroundColor: "#dcfce7",
  borderRadius: 99,
  paddingHorizontal: 10,
  paddingVertical: 4,
};

const activeBadgeText = {
  color: "#15803d",
  fontWeight: "600" as const,
  fontSize: 12,
};

const switchBtn = {
  backgroundColor: "#004d00",
  borderRadius: 99,
  paddingHorizontal: 12,
  paddingVertical: 4,
};

const switchBtnText = {
  color: "#ffffff",
  fontWeight: "600" as const,
  fontSize: 12,
};

const sectionLabel = {
  fontWeight: "700" as const,
  color: "#374151",
  fontSize: 12,
  marginBottom: 8,
  textTransform: "uppercase" as const,
  letterSpacing: 0.5,
};

const formLabel = {
  fontWeight: "600" as const,
  color: "#374151",
  fontSize: 13,
  marginBottom: 8,
};

export default family;
