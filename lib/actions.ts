import { supabase } from "./supabase";

export const setOnboardingDetails = async ({
  details,
}: {
  details: {
    allergies: string[];
    medical_conditions: string[];
    dietary_restrictions: string[];
    medications: string[];
    age_group: string | undefined;
    allergy_severity: string | undefined;
  };
}) => {
  const {
    allergies,
    medical_conditions,
    dietary_restrictions,
    medications,
    age_group,
    allergy_severity,
  } = details ?? {};
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError) {
    return { userError };
  }
  const takes_medicine =
    medications.filter((m) => m !== "None").length > 0;
  const { data, error } = await supabase.from("Customerdetails").insert({
    id: user.user.id,
    allergies: allergies,
    medical_conditions: medical_conditions,
    dietary_restrictions: dietary_restrictions,
    medications: medications.filter((m) => m !== "None"),
    age_group: age_group,
    allergy_severity: allergy_severity,
    takes_medicine: takes_medicine,
  });
  return { error };
};

export const updateHealthDetails = async ({
  details,
}: {
  details: {
    allergies: string[];
    medical_conditions: string[];
    dietary_restrictions: string[];
    medications: string[];
    age_group: string | undefined;
    allergy_severity: string | undefined;
  };
}) => {
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.user?.id) {
    return { error: userError ?? "Not authenticated" };
  }
  const takes_medicine =
    details.medications.filter((m) => m !== "None").length > 0;
  // upsert so it works whether or not an onboarding row already exists
  const { error } = await supabase.from("Customerdetails").upsert({
    id: user.user.id,
    allergies: details.allergies,
    medical_conditions: details.medical_conditions,
    dietary_restrictions: details.dietary_restrictions,
    medications: details.medications.filter((m) => m !== "None"),
    age_group: details.age_group,
    allergy_severity: details.allergy_severity,
    takes_medicine,
  });
  return { error };
};
