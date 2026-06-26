import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { updateHealthDetails } from "@/lib/actions";
import {
  commonAllergies,
  commonMedications,
  dietaryRestrictions,
  medicalConditions,
} from "@/constants/const";

const AGE_GROUPS = ["0-12", "13-19", "20-35", "36-50", "51+"];
const SEVERITY = ["Mild", "Moderate", "Severe"];

const Chip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      backgroundColor: selected ? "#15803d" : "#e5e7eb",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
      margin: 4,
    }}
  >
    <Text style={{ fontSize: 13, color: selected ? "#ffffff" : "#1f2937", fontWeight: "500" }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const Group = ({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) => (
  <View style={{ marginBottom: 18 }}>
    <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
      {title}
    </Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {options
        .filter((o) => o !== "None")
        .map((o) => (
          <Chip key={o} label={o} selected={selected.includes(o)} onPress={() => onToggle(o)} />
        ))}
    </View>
  </View>
);

const SingleGroup = ({
  title,
  options,
  value,
  onSelect,
}: {
  title: string;
  options: string[];
  value: string | undefined;
  onSelect: (v: string) => void;
}) => (
  <View style={{ marginBottom: 18 }}>
    <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
      {title}
    </Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {options.map((o) => (
        <Chip
          key={o}
          label={o}
          selected={value === o}
          onPress={() => onSelect(value === o ? "" : o)}
        />
      ))}
    </View>
  </View>
);

const editHealth = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [diet, setDiet] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [ageGroup, setAgeGroup] = useState<string | undefined>();
  const [severity, setSeverity] = useState<string | undefined>();

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("Customerdetails")
        .select("*")
        .eq("id", u?.user?.id)
        .single();
      if (data) {
        setAllergies(data.allergies ?? []);
        setConditions(data.medical_conditions ?? []);
        setDiet(data.dietary_restrictions ?? []);
        setMedications(data.medications ?? []);
        setAgeGroup(data.age_group ?? undefined);
        setSeverity(data.allergy_severity ?? undefined);
      }
      setLoading(false);
    };
    load();
  }, []);

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<string[]>>) => (val: string) =>
      setter((prev) =>
        prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
      );

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateHealthDetails({
      details: {
        allergies,
        medical_conditions: conditions,
        dietary_restrictions: diet,
        medications,
        age_group: ageGroup,
        allergy_severity: severity,
      },
    });
    setSaving(false);
    if (error) {
      Alert.alert(
        "Couldn't save",
        typeof error === "string" ? error : (error as any)?.message ?? "Please try again."
      );
      return;
    }
    Alert.alert("Saved", "Your health profile has been updated.");
    router.back();
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
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <Text style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
        Update your allergies, conditions, diet and medications. This drives the
        safety checks, recommendations and recipes across the app.
      </Text>

      <Group title="Allergies" options={commonAllergies} selected={allergies} onToggle={toggle(setAllergies)} />
      {allergies.length > 0 && (
        <SingleGroup title="Allergy Severity" options={SEVERITY} value={severity} onSelect={setSeverity} />
      )}
      <Group title="Medical Conditions" options={medicalConditions} selected={conditions} onToggle={toggle(setConditions)} />
      <Group title="Dietary Restrictions" options={dietaryRestrictions} selected={diet} onToggle={toggle(setDiet)} />
      <Group title="Medications" options={commonMedications} selected={medications} onToggle={toggle(setMedications)} />
      <SingleGroup title="Age Group" options={AGE_GROUPS} value={ageGroup} onSelect={setAgeGroup} />

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        style={{
          backgroundColor: "#15803d",
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: "center",
          marginTop: 8,
          opacity: saving ? 0.7 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
          {saving ? "Saving…" : "Save Changes"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default editHealth;
