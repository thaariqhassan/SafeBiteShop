import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

const ACTIVE_PROFILE_KEY = "safebite_active_profile_id";

export interface FamilyMember {
  id: string;
  owner_id: string;
  name: string;
  allergies: string[];
  medical_conditions: string[];
  dietary_restrictions: string[];
  medications: string[];
  age_group: string;
  allergy_severity: string;
}

export interface ActiveProfile {
  name: string;
  allergies: string[];
  medical_conditions: string[];
  dietary_restrictions: string[];
  medications: string[];
  isSelf: boolean;
  familyMemberId: string | null;
}

export const getFamilyMembers = async (): Promise<FamilyMember[]> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) return [];
  const { data } = await supabase
    .from("family_members")
    .select("*")
    .eq("owner_id", user.user.id)
    .order("created_at", { ascending: true });
  return data ?? [];
};

export const addFamilyMember = async (
  member: Omit<FamilyMember, "id" | "owner_id">
): Promise<{ error: any }> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) return { error: "Not authenticated" };
  const { error } = await supabase.from("family_members").insert({
    owner_id: user.user.id,
    ...member,
  });
  return { error };
};

export const deleteFamilyMember = async (id: string): Promise<{ error: any }> => {
  const activeId = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
  if (activeId === id) await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
  const { error } = await supabase.from("family_members").delete().eq("id", id);
  return { error };
};

export const setActiveProfileId = async (id: string | null): Promise<void> => {
  if (id === null) {
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
  } else {
    await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, id);
  }
};

export const getActiveProfileId = async (): Promise<string | null> =>
  AsyncStorage.getItem(ACTIVE_PROFILE_KEY);

export const getActiveProfile = async (): Promise<ActiveProfile> => {
  const activeId = await getActiveProfileId();
  const { data: authUser } = await supabase.auth.getUser();

  if (activeId) {
    const { data } = await supabase
      .from("family_members")
      .select("*")
      .eq("id", activeId)
      .single();
    if (data) {
      return {
        name: data.name,
        allergies: data.allergies ?? [],
        medical_conditions: data.medical_conditions ?? [],
        dietary_restrictions: data.dietary_restrictions ?? [],
        medications: data.medications ?? [],
        isSelf: false,
        familyMemberId: activeId,
      };
    }
    // stale ID — fall through to self
    await AsyncStorage.removeItem(ACTIVE_PROFILE_KEY);
  }

  const [custRes, userRes] = await Promise.all([
    supabase.from("Customerdetails").select("*").eq("id", authUser?.user?.id).single(),
    supabase.from("Users").select("username").eq("id", authUser?.user?.id).single(),
  ]);

  return {
    name: userRes.data?.username ?? "You",
    allergies: custRes.data?.allergies ?? [],
    medical_conditions: custRes.data?.medical_conditions ?? [],
    dietary_restrictions: custRes.data?.dietary_restrictions ?? [],
    medications: custRes.data?.medications ?? [],
    isSelf: true,
    familyMemberId: null,
  };
};
