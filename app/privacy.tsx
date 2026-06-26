import React from "react";
import { ScrollView, Text, View } from "react-native";

const P = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ fontSize: 14, color: "#374151", lineHeight: 21, marginBottom: 12 }}>
    {children}
  </Text>
);

const H = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 8, marginBottom: 6 }}>
    {children}
  </Text>
);

const privacy = () => {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#ffffff" }}
      contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
    >
      <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 }}>
        Privacy Policy
      </Text>
      <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 16 }}>
        SafeBite — last updated 2026
      </Text>

      <P>
        SafeBite helps you understand whether a food product is safe for your
        personal health profile. This policy explains what we collect, why, and
        who we share it with.
      </P>

      <H>What we collect</H>
      <P>
        • Account details: your username and email address.{"\n"}
        • Health profile: the allergies, medical conditions, dietary
        restrictions, and medications you choose to add (including any family
        member profiles you create).{"\n"}
        • Activity: products you scan, your food diary entries, and saved
        preferences.
      </P>

      <H>How we use it</H>
      <P>
        Your health profile and scanned product data are used to personalise the
        safety analysis, recommendations, recipes, and nutrition tracking shown
        in the app. We do not use your data for advertising and we never sell it.
      </P>

      <H>Who we share it with</H>
      <P>
        • Supabase — secure authentication and database storage of your account
        and profile data.{"\n"}
        • Groq — when you request an AI summary, recommendation, or recipe, the
        relevant product data and your (non-identifying) health constraints are
        sent to generate a response.{"\n"}
        • Open Food Facts — used to look up product information by barcode.
      </P>

      <H>Data retention & control</H>
      <P>
        Your data is kept while your account is active. You can remove family
        profiles at any time, and you can request deletion of your account and
        associated data by contacting us. Logging out clears your session on the
        device.
      </P>

      <H>Medical disclaimer</H>
      <P>
        SafeBite provides informational guidance only and is not a substitute for
        professional medical advice. Always confirm with a doctor or pharmacist,
        especially regarding allergies and medication–food interactions.
      </P>

      <H>Contact</H>
      <P>
        Questions about this policy or your data? Reach out through the support
        link in the app and we'll be happy to help.
      </P>
    </ScrollView>
  );
};

export default privacy;
