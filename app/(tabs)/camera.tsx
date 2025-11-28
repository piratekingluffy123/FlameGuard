import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { supabase } from '../../services/supabase';

const { width } = Dimensions.get("window");

// AsyncStorage keys
const STORAGE_KEYS = {
  CAMERAS: 'savedCameras', // Array of camera objects
};

interface Camera {
  id: string;
  name: string;
  url: string;
  cctvId: string | null;
}

type ViewMode = 'list' | 'scanner' | 'stream';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [editingCameraId, setEditingCameraId] = useState<string | null>(null);

  // Store FCM token with CCTV ID in Supabase
  const storeFCMTokenWithCCTV = async (token: string, cctvIdentifier: string) => {
    if (!token || !cctvIdentifier) return;

    try {
      await supabase
        .from('deviceTokens')
        .upsert(
          { 
            fcmToken: token,
            cctvId: cctvIdentifier 
          },
          { onConflict: 'fcmToken' }
        )
        .select();
    } catch (err) {
      console.log('Exception storing token:', err);
    }
  };

  // Initialize FCM
  useEffect(() => {
    const initializeFCM = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          const token = await messaging().getToken();
          setFcmToken(token);
          console.log('FCM Token:', token);
        }

        const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
          Alert.alert(
            remoteMessage.notification?.title || 'Fire Alert',
            remoteMessage.notification?.body || 'Fire detected!',
            [{ text: 'OK' }]
          );
        });

        messaging().setBackgroundMessageHandler(async remoteMessage => {
          console.log('Background FCM message:', remoteMessage);
        });

        return unsubscribeForeground;
      } catch (error) {
        console.log('Error initializing FCM:', error);
      }
    };

    initializeFCM();
  }, []);

  // Load saved cameras on app start
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const savedCameras = await AsyncStorage.getItem(STORAGE_KEYS.CAMERAS);
        if (savedCameras) {
          setCameras(JSON.parse(savedCameras));
        }
      } catch (e) {
        console.log("Error loading cameras:", e);
      }
    };

    loadCameras();
  }, []);

  // Save cameras to storage whenever they change
  const saveCameras = async (newCameras: Camera[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CAMERAS, JSON.stringify(newCameras));
      setCameras(newCameras);
    } catch (e) {
      console.log("Error saving cameras:", e);
    }
  };

  // Send FCM token to server
  const sendFCMTokenToServer = async (serverUrl: string, token: string | null) => {
    if (!token) {
      console.log('No FCM token available');
      return null;
    }

    try {
      const baseUrl = serverUrl.split('/').slice(0, 3).join('/');
      const endpoint = `${baseUrl}/register-device`;

      const payload = {
        fcm_token: token,
        device_type: Platform.OS,
        device_model: Platform.OS === 'ios' ? 'iOS' : 'Android',
        timestamp: new Date().toISOString()
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ FCM token registered successfully');
        
        if (responseData.cctvId) {
          await storeFCMTokenWithCCTV(token, responseData.cctvId);
          return responseData.cctvId;
        }
      }
      return null;
    } catch (error) {
      console.log('❌ Error sending FCM token:', error);
      return null;
    }
  };

  // Handle QR code scanned
  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    console.log("📷 QR Code scanned:", data);

    // Validate URL
    if (data.startsWith("http://") || data.startsWith("https://")) {
      // Register FCM token and get CCTV ID
      let cctvId = null;
      if (fcmToken) {
        cctvId = await sendFCMTokenToServer(data, fcmToken);
      }

      // Create new camera or update existing
      if (editingCameraId) {
        // Update existing camera
        const updatedCameras = cameras.map(cam => 
          cam.id === editingCameraId 
            ? { ...cam, url: data, cctvId: cctvId || cam.cctvId }
            : cam
        );
        await saveCameras(updatedCameras);
        
        const updatedCamera = updatedCameras.find(c => c.id === editingCameraId);
        setSelectedCamera(updatedCamera || null);
      } else {
        // Add new camera
        const newCamera: Camera = {
          id: Date.now().toString(),
          name: `Camera ${cameras.length + 1}`,
          url: data,
          cctvId: cctvId,
        };
        
        await saveCameras([...cameras, newCamera]);
        setSelectedCamera(newCamera);
      }

      setEditingCameraId(null);
      setViewMode('stream');
      setIsLoading(true);
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

  // Add new camera
  const handleAddCamera = () => {
    setEditingCameraId(null);
    setScanned(false);
    setViewMode('scanner');
  };

  // Select camera to view
  const handleSelectCamera = (camera: Camera) => {
    setSelectedCamera(camera);
    setViewMode('stream');
    setIsLoading(true);
  };

  // Rescan camera QR
  const handleRescanCamera = (cameraId: string) => {
    setEditingCameraId(cameraId);
    setScanned(false);
    setViewMode('scanner');
  };

  // Delete camera
  const handleDeleteCamera = (cameraId: string) => {
    Alert.alert(
      "Delete Camera",
      "Are you sure you want to remove this camera?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedCameras = cameras.filter(cam => cam.id !== cameraId);
            await saveCameras(updatedCameras);
          },
        },
      ]
    );
  };

  // Back to camera list
  const handleBackToList = () => {
    setSelectedCamera(null);
    setViewMode('list');
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
          We need camera access to scan QR codes from your Flame Guard systems
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera List View
  if (viewMode === 'list') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Flame Guard</Text>
          <Text style={styles.headerSubtitle}>Manage your cameras</Text>
        </View>

        <ScrollView style={styles.cameraList} contentContainerStyle={styles.cameraListContent}>
          {cameras.map((camera) => (
            <View key={camera.id} style={styles.cameraCard}>
              <TouchableOpacity
                style={styles.cameraCardMain}
                onPress={() => handleSelectCamera(camera)}
              >
                <View style={styles.cameraIconContainer}>
                  <Ionicons name="videocam" size={24} color="#f97316" />
                </View>
                <View style={styles.cameraInfo}>
                  <Text style={styles.cameraName}>{camera.name}</Text>
                  {camera.cctvId && (
                    <Text style={styles.cameraCctvId}>ID: {camera.cctvId}</Text>
                  )}
                  <Text style={styles.cameraUrl} numberOfLines={1}>{camera.url}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#64748b" />
              </TouchableOpacity>
              
              <View style={styles.cameraActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleRescanCamera(camera.id)}
                >
                  <Ionicons name="qr-code-outline" size={18} color="#4A90E2" />
                  <Text style={styles.actionButtonText}>Rescan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteCamera(camera.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addCameraButton} onPress={handleAddCamera}>
            <Ionicons name="add-circle" size={32} color="#f97316" />
            <Text style={styles.addCameraText}>Add New Camera</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // QR Scanner View
  if (viewMode === 'scanner') {
    return (
      <View style={styles.container}>
        <View style={styles.scannerHeader}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.scannerTitle}>
            {editingCameraId ? 'Rescan Camera QR' : 'Scan New Camera'}
          </Text>
          <View style={{ width: 24 }} />
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

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Point camera at Flame Guard QR code
            </Text>
          </View>
        </CameraView>
      </View>
    );
  }

  // Stream View
  if (viewMode === 'stream' && selectedCamera) {
    return (
      <View style={styles.container}>
        <View style={styles.streamHeader}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.streamHeaderInfo}>
            <Text style={styles.streamTitle}>{selectedCamera.name}</Text>
            {selectedCamera.cctvId && (
              <Text style={styles.streamCctvId}>ID: {selectedCamera.cctvId}</Text>
            )}
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/*{isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>Connecting to stream...</Text>
          </View>
        )} */}

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
                <img id="stream" src="${selectedCamera.url}" onerror="document.body.innerHTML='<div class=error>Cannot connect to stream</div>'">
              </body>
              </html>
            `,
            baseUrl: selectedCamera.url,
          }}
          style={styles.webview}
          onLoadEnd={() => setIsLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("WebView error:", nativeEvent);
            setIsLoading(false);
            Alert.alert(
              "Connection Error",
              "Could not connect to the stream. Please check your network connection.",
              [{ text: "OK" }]
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

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  cameraList: {
    flex: 1,
  },
  cameraListContent: {
    padding: 16,
  },
  cameraCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: 'hidden',
  },
  cameraCardMain: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  cameraIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff7ed",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cameraInfo: {
    flex: 1,
  },
  cameraName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  cameraCctvId: {
    fontSize: 12,
    color: "#4A90E2",
    fontWeight: "500",
    marginBottom: 2,
  },
  cameraUrl: {
    fontSize: 11,
    color: "#64748b",
  },
  cameraActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A90E2',
  },
  deleteButton: {
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0',
  },
  deleteButtonText: {
    color: '#ef4444',
  },
  addCameraButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#f97316",
    borderStyle: "dashed",
  },
  addCameraText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#f97316",
    marginTop: 8,
  },
  scannerHeader: {
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
  backButton: {
    padding: 4,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
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
  streamHeader: {
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
  streamHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },
  streamTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  streamCctvId: {
    fontSize: 12,
    color: "#4A90E2",
    fontWeight: "500",
    marginTop: 2,
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
});