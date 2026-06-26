import { getActiveProfile } from "./familyProfile";

const handleRecommendation = async () => {
  try {
    const profile = await getActiveProfile();

    const res = await fetch(
      "https://safebite-28tg.onrender.com/api/recommendation",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userProfile: {
            allergies: profile.allergies,
            conditions: profile.medical_conditions,
            dietary: profile.dietary_restrictions,
          },
        }),
      }
    );
    const result = await res.json();
    return result;
  } catch (error) {
    console.error("Error handling recommendation:", error);
    return {};
  }
};

export default handleRecommendation;
