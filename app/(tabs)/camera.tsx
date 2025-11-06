import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

const { width } = Dimensions.get("window");

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null); // This now means "we are connected"
  const [scannedUrl, setScannedUrl] = useState(null); // This holds the URL *after* scan
  const [isLoading, setIsLoading] = useState(false);

  // Handle QR code scan
  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;

    setScanned(true); // Stop the scanner
    console.log("📷 QR Code scanned:", data);

    // Validate URL
    if (data.startsWith("http://") || data.startsWith("https://")) {
      // Don't connect yet, just save the scanned URL
      setScannedUrl(data);
    } else {
      Alert.alert(
        "Invalid QR Code",
        "Please scan a valid Flame Guard QR code",
        [
          {
            text: "Scan Again",
            onPress: () => setScanned(false), // Just reset the scanner
          },
        ]
      );
    }
  };

  // Reset and scan again
  const handleScanAgain = () => {
    setScanned(false);
    setStreamUrl(null);
    setScannedUrl(null); // Also reset the scanned URL
    setIsLoading(false);
  };

  // Check camera permission
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>📷 Camera Permission Required</Text>
        <Text style={styles.permissionSubtext}>
          We need camera access to scan the QR code from your Flame Guard system
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show video stream after QR scan
  if (streamUrl) {
    return (
      <View style={styles.container}>
        {/* ✨ --- THIS IS THE NEW, CLEAN HEADER --- ✨ */}
        <View style={styles.liveHeader}>
          <Text style={styles.liveHeaderText}>🔥 Flame Guard Live</Text>
          <TouchableOpacity
            style={styles.liveScanAgainBtn}
            onPress={handleScanAgain}
          >
            <Ionicons name="qr-code-outline" size={24} color="#f97316" />
          </TouchableOpacity>
        </View>
        {/* ✨ --- END OF NEW HEADER --- ✨ */}

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>Connecting to stream...</Text>
          </View>
        )}

        <WebView
          source={{
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body {
                    background: #000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    overflow: hidden;
                  }
                  img {
                    max-width: 100%;
                    max-height: 100vh;
                    object-fit: contain;
                    display: block;
                  }
                  .error {
                    color: #fff;
                    text-align: center;
                    padding: 20px;
                    font-family: sans-serif;
                  }
                </style>
              </head>
              <body>
                <img id="stream" src="${streamUrl}" onerror="document.body.innerHTML='<div class=error>⚠️ Cannot connect to stream<br><br>Check if Python server is running</div>'">
              </body>
              </html>
            `,
            baseUrl: streamUrl,
          }}
          style={styles.webview}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("WebView error:", nativeEvent);
            setIsLoading(false);
            Alert.alert(
              "Connection Error",
              "Could not connect to the stream. Please check:\n\n• Your device is on the same network\n• The Python server is running\n• Try scanning the QR code again",
              [
                {
                  text: "Scan Again",
                  onPress: handleScanAgain,
                },
              ]
            );
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          bounces={false}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
        />
      </View>
    );
  }

  // --- Show QR scanner ---

  // Calculate stats based on whether we have a scanned URL
  const activeCount = scannedUrl ? 1 : 0;
  const alertCount = 0; // Hardcoded as per your request

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={[styles.statsContainer, { paddingTop: 60 }]}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="videocam" size={20} color="#4A90E2" />
          </View>
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active Camera</Text>
        </View>

        <View style={[styles.statCard]}>
          <View
            style={[
              styles.statIconContainer,
              { backgroundColor: "#f3f4f6" },
            ]}
          >
            <Ionicons name="flame" size={20} color={"#666"} />
          </View>
          <Text style={[styles.statNumber]}>{alertCount}</Text>
          <Text style={styles.statLabel}>Fire Alerts</Text>
        </View>

        <View style={styles.statCard}>
          <View
            style={[
              styles.statIconContainer,
              { backgroundColor: "#E7F8F3" },
            ]}
          >
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          </View>
          <Text style={styles.statNumber}>OK</Text>
          <Text style={styles.statLabel}>System Health</Text>
        </View>
      </View>
      {/* End of header */}

      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanBox}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        {/* Hide instructions if a code is scanned */}
        {!scannedUrl && (
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Point camera at QR code from Python terminal
            </Text>
          </View>
        )}
      </CameraView>

      {/* Show this overlay AFTER a successful scan */}
      {scannedUrl && (
        <View style={styles.connectOverlay}>
          <Text style={styles.connectTitle}>✅ QR Code Scanned!</Text>
          <Text style={styles.connectUrl} numberOfLines={1}>{scannedUrl}</Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => {
              setIsLoading(true);
              setStreamUrl(scannedUrl); // This triggers the screen change
            }}
          >
            <Text style={styles.connectButtonText}>Connect to Stream</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.scanAgainButton}
            onPress={() => {
              setScanned(false);
              setScannedUrl(null);
            }}
          >
            <Text style={styles.scanAgainButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ✨ MERGED STYLES
const styles = StyleSheet.create({
  // Original Styles
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  permissionSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  button: {
    backgroundColor: "#f97316",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanBox: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#f97316",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  instructionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 999,
    alignItems: "center",
  },
  loadingText: {
    color: "#f97316",
    fontSize: 16,
    marginTop: 10,
    fontWeight: "bold",
  },

  // --- NEW STYLES FROM DESIGN ---
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff", // Use white background
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
    textAlign: "center",
  },

  // --- NEW STYLES FOR CONNECT OVERLAY ---
  connectOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: "center",
  },
  connectTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  connectUrl: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  connectButton: {
    backgroundColor: "#f97316",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  scanAgainButton: {
    marginTop: 12,
  },
  scanAgainButtonText: {
    fontSize: 14,
    color: "#f97316",
    fontWeight: "500",
  },

  // ✨ --- STYLES FOR THE NEW LIVE HEADER --- ✨
  liveHeader: {
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  liveHeaderText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  liveScanAgainBtn: {
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderRadius: 8,
  },
});