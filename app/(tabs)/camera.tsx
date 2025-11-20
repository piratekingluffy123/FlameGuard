import { Ionicons } from "@expo/vector-icons";
import messaging from '@react-native-firebase/messaging';
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { supabase } from '../../services/supabase';

const { width } = Dimensions.get("window");

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);
  const [scannedUrl, setScannedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

  const storeFCMToken = async (token) => {
    if (!token) return;

    const { data, error } = await supabase
      .from('deviceTokens')
      .upsert(
        { fcmToken: token },
        { onConflict: ['fcmToken'] } // <- uses fcmToken as unique key
      )
      .select(); // optional: returns the inserted/updated row
    if (error) console.log('Error storing FCM token:', error);
    else console.log('FCM token stored:', token);
  };

  // Request notification permission and get FCM token
  useEffect(() => {
    const initializeFCM = async () => {
      try {
        // Request notification permission
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        setHasNotificationPermission(enabled);

        if (enabled) {
          const token = await messaging().getToken();
          setFcmToken(token);
          console.log('FCM Token:', token);

          // Store token in Supabase
          await storeFCMToken(token);
        } else {
          console.log('Notification permission denied');
        }

        // Handle foreground messages
        const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
          console.log('Foreground FCM message:', remoteMessage);
          Alert.alert(
            remoteMessage.notification?.title || 'Fire Alert',
            remoteMessage.notification?.body || 'Fire detected!',
            [{ text: 'OK' }]
          );
        });

        // Handle background/quit state messages
        messaging().setBackgroundMessageHandler(async remoteMessage => {
          console.log('Background FCM message:', remoteMessage);
        });

        // Handle notification when app is opened from quit state
        messaging().getInitialNotification().then(remoteMessage => {
          if (remoteMessage) {
            console.log('Initial notification:', remoteMessage);
          }
        });

        return unsubscribeForeground;
      } catch (error) {
        console.log('Error initializing FCM:', error);
      }
    };

    initializeFCM();
  }, []);

  // Function to send FCM token to your Python server
  const sendFCMTokenToServer = async (serverUrl, token) => {
    if (!token) {
      console.log('No FCM token available');
      return;
    }

    try {
      // Extract base URL without path
      const baseUrl = serverUrl.split('/').slice(0, 3).join('/');
      const endpoint = `${baseUrl}/register-device`;

      const payload = {
        fcm_token: token,
        device_type: Platform.OS,
        device_model: Platform.OS === 'ios' ? 'iOS' : 'Android',
        timestamp: new Date().toISOString()
      };

      console.log('Sending FCM token to:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('✅ FCM token sent successfully to server');
        const responseData = await response.json();
        console.log('Server response:', responseData);
      } else {
        console.log('❌ Failed to send FCM token:', response.status);
        const errorText = await response.text();
        console.log('Error response:', errorText);
      }
    } catch (error) {
      console.log('❌ Error sending FCM token:', error);
    }
  };

  // Handle QR code scan
  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;

    setScanned(true);
    console.log("📷 QR Code scanned:", data);

    // Validate URL
    if (data.startsWith("http://") || data.startsWith("https://")) {
      setScannedUrl(data);

      // Send FCM token when QR code is scanned
      if (fcmToken) {
        sendFCMTokenToServer(data, fcmToken);
      } else {
        console.log('FCM token not available yet');
      }
    } else {
      Alert.alert(
        "Invalid QR Code",
        "Please scan a valid Flame Guard QR code",
        [
          {
            text: "Scan Again",
            onPress: () => setScanned(false),
          },
        ]
      );
    }
  };

  // Manually send FCM token (optional - for testing)
  const handleManualSendToken = () => {
    if (scannedUrl && fcmToken) {
      sendFCMTokenToServer(scannedUrl, fcmToken);
    } else {
      Alert.alert(
        "Cannot Send Token",
        scannedUrl ? "FCM token not available" : "No server URL available"
      );
    }
  };

  // Reset and scan again
  const handleScanAgain = () => {
    setScanned(false);
    setStreamUrl(null);
    setScannedUrl(null);
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
        {/* Header with FCM status */}
        <View style={styles.liveHeader}>
          <View>
            <Text style={styles.liveHeaderText}>🔥 Flame Guard Live</Text>
            <Text style={styles.fcmStatus}>
              {fcmToken ? '🔔 FCM: Connected' : '🔕 FCM: Disconnected'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.liveScanAgainBtn}
            onPress={handleScanAgain}
          >
            <Ionicons name="qr-code-outline" size={24} color="#f97316" />
          </TouchableOpacity>
        </View>

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

  // Calculate stats
  const activeCount = scannedUrl ? 1 : 0;

  return (
    <View style={styles.container}>
      {/* Stats Header with FCM Info */}
      <View style={[styles.statsContainer, { paddingTop: 60 }]}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="videocam" size={20} color="#4A90E2" />
          </View>
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active Camera</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: fcmToken ? "#E7F8F3" : "#f3f4f6" }]}>
            <Ionicons name="notifications" size={20} color={fcmToken ? "#10B981" : "#666"} />
          </View>
          <Text style={[styles.statNumber, { color: fcmToken ? "#10B981" : "#666" }]}>
            {fcmToken ? "ON" : "OFF"}
          </Text>
          <Text style={styles.statLabel}>FCM</Text>
        </View>
      </View>

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

          {/* FCM Token Status */}
          <View style={styles.tokenStatus}>
            <Ionicons
              name={fcmToken ? "checkmark-circle" : "warning"}
              size={16}
              color={fcmToken ? "#10B981" : "#f97316"}
            />
            <Text style={[styles.tokenStatusText, { color: fcmToken ? "#10B981" : "#f97316" }]}>
              {fcmToken ? 'FCM token ready' : 'FCM token not available'}
            </Text>
          </View>

          {fcmToken && (
            <TouchableOpacity
              style={[styles.secondaryButton, { marginBottom: 8 }]}
              onPress={handleManualSendToken}
            >
              <Text style={styles.secondaryButtonText}>Resend FCM Token</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => {
              setIsLoading(true);
              setStreamUrl(scannedUrl);
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
  fcmStatus: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  tokenStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  tokenStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
  },
});