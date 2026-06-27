import "dotenv/config";

export default ({ config }) => ({
  ...config,
  name: "SafeBite",
  slug: "safeBite",
  version: "2.0.1",
  orientation: "portrait",
  icon: "./assets/images/logos.png",
  scheme: "safebite",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.ajaykd021.safeBite",
    infoPlist: {
      NSCameraUsageDescription: "This app uses the camera to scan barcodes.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/logos.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    permissions: ["CAMERA"],
    package: "com.ajaykd021.safeBite",
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/logos.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/logos.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    [
      "expo-notifications",
      {
        color: "#dc2626",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  assetBundlePatterns: ["**/*"],
  extra: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    "eas": {
        "projectId": "cdcbe9db-330b-4f53-ad53-9eadab97935c"
      }
  },
});
