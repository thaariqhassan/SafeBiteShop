import { useState, useEffect, useCallback } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { CameraView, Camera } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { hapticSuccess } from "@/lib/feedback";

const FRAME_SIZE = 260;

// Corner bracket for the viewfinder frame.
const Corner = ({ position }: { position: "tl" | "tr" | "bl" | "br" }) => (
  <View
    style={[
      styles.corner,
      position === "tl" && { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
      position === "tr" && { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
      position === "bl" && { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
      position === "br" && { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
    ]}
  />
);

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  const requestPermission = async (openSettingsIfBlocked = false) => {
    const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
    if (status !== "granted" && !canAskAgain && openSettingsIfBlocked) {
      // Denied permanently — the system prompt won't show again, so send the
      // user to app settings instead.
      Linking.openSettings().catch(() => {});
    }
  };

  useEffect(() => {
    requestPermission();
  }, []);

  // Re-arm the scanner every time the user comes back from a product page so
  // the camera is never stuck on a stale "already scanned" state.
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      return () => setTorch(false);
    }, [])
  );

  const handleBarcodeScanned = ({ data }: { type: string; data: string }) => {
    setScanned(true);
    hapticSuccess();
    router.push({
      pathname: "/product/[id]",
      params: { id: data },
    });
  };

  if (hasPermission === null || hasPermission === false) {
    const denied = hasPermission === false;
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name={denied ? "videocam-off-outline" : "videocam-outline"} size={48} color="#9ca3af" />
        <Text style={styles.permissionTitle}>
          {denied ? "Camera access needed" : "Requesting camera access…"}
        </Text>
        <Text style={styles.permissionBody}>
          {denied
            ? "SafeBite uses the camera to scan product barcodes. Enable camera access to continue."
            : "Please allow camera access so you can scan barcodes."}
        </Text>
        {denied && (
          <TouchableOpacity style={styles.permissionBtn} onPress={() => requestPermission(true)}>
            <Ionicons name="camera-outline" size={18} color="#fff" />
            <Text style={styles.permissionBtnText}>Enable camera</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: [
            "qr",
            "code128",
            "code39",
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "pdf417",
            "itf14",
            "codabar",
          ],
        }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Dimmed overlay with a clear viewfinder window */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.dim} />
        <View style={{ flexDirection: "row" }}>
          <View style={styles.dimSide} />
          <View style={styles.frame}>
            <Corner position="tl" />
            <Corner position="tr" />
            <Corner position="bl" />
            <Corner position="br" />
          </View>
          <View style={styles.dimSide} />
        </View>
        <View style={[styles.dim, { justifyContent: "flex-start" }]}>
          <Text style={styles.hint}>
            {scanned ? "Opening product…" : "Line up the barcode inside the frame"}
          </Text>
        </View>
      </View>

      {/* Top bar: close + torch */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.roundBtn}
          onPress={() => router.back()}
          accessibilityLabel="Close scanner"
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roundBtn, torch && { backgroundColor: "#fde047" }]}
          onPress={() => setTorch((t) => !t)}
          accessibilityLabel={torch ? "Turn flashlight off" : "Turn flashlight on"}
        >
          <Ionicons name={torch ? "flash" : "flash-outline"} size={20} color={torch ? "#111827" : "#fff"} />
        </TouchableOpacity>
      </View>

      {scanned && (
        <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.labelBtnText}>Scan again</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.labelBtn}
        onPress={() => router.push("/label-scan")}
      >
        <Ionicons name="document-text-outline" size={18} color="#fff" />
        <Text style={styles.labelBtnText}>No barcode? Snap the label</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
  },
  dimSide: {
    flex: 1,
    height: FRAME_SIZE,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },
  corner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: "#4ade80",
    borderRadius: 2,
  },
  hint: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 18,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 4,
  },
  topBar: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  rescanBtn: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0369a1",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
    elevation: 4,
  },
  labelBtn: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#15803d",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
    elevation: 4,
  },
  labelBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 36,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 14,
  },
  permissionBody: {
    color: "#6b7280",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  permissionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#15803d",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 20,
    gap: 8,
  },
  permissionBtnText: { color: "#fff", fontWeight: "700" },
});
