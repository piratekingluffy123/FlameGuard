import { Ionicons } from "@expo/vector-icons";
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// ✨ NEW: Import AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Notification Configuration ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Interface from new design
interface Notification {
  id: string; // Use string for request identifier
  title: string;
  message: string;
  time: string;
  type: "fire" | "alert" | "info" | "warning";
  isRead: boolean;
}

// ✨ NEW: Add a key for storage
const NOTIFICATIONS_STORAGE_KEY = '@notification_history';

export default function App() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // ✨ NEW: Add loading state to prevent saving before loading is complete
  const [isLoading, setIsLoading] = useState(true);

  // --- Refs for Listeners ---
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // --- 1. Get Push Token ---
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log('📱 Expo Push Token:', token);
      }
    });

    // --- 2. Set Up Notification Listeners ---
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received:', notification);
      
      const { request } = notification;
      const content = request.content || {};
      
      const newNotification: Notification = {
        id: request.identifier,
        title: content.title || 'No Title',
        message: content.body || 'No message',
        // ✨ Using toLocaleTimeString for consistency when loading
        time: new Date(notification.date).toLocaleTimeString(),
        type: (content.data?.type as any) || 'info', 
        isRead: false,
      };
      
      // ✨ Use functional update to ensure we're adding to the latest state
      setNotifications(prev => [newNotification, ...prev]);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      const identifier = response.notification.request.identifier;
      markAsRead(identifier);
      Alert.alert(
        response.notification.request.content.title || 'Notification Tapped', 
        response.notification.request.content.body || ''
      );
    });

    // --- 3. ✨ MODIFIED: Load notifications from storage on app start ---
    async function loadNotifications() {
      try {
        const savedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        if (savedNotifications) {
          setNotifications(JSON.parse(savedNotifications));
        }
      } catch (e) {
        console.error("Failed to load notifications from storage", e);
      } finally {
        setIsLoading(false); // We're done loading
      }
    }
    
    loadNotifications();

    // --- 4. Cleanup ---
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []); // This effect runs once on mount

  // --- ✨ NEW: Effect to save notifications whenever they change ---
  useEffect(() => {
    // Don't save if we are still loading
    if (isLoading) {
      return;
    }

    async function saveNotifications() {
      try {
        const jsonValue = JSON.stringify(notifications);
        await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, jsonValue);
      } catch (e) {
        console.error("Failed to save notifications to storage", e);
      }
    }

    saveNotifications();
  }, [notifications, isLoading]); // Runs when notifications or isLoading changes

  // --- Handler Functions from New Design ---
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, isRead: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  // ✨ Function to clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "fire":
        return "flame";
      case "alert":
        return "warning";
      case "warning":
        return "alert-circle";
      case "info":
      default:
        return "information-circle";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "fire":
        return "#FF4444";
      case "alert":
        return "#FF8C00";
      case "warning":
        return "#FFD700";
      case "info":
      default:
        return "#4A90E2";
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // --- Render Component (Using New Design's JSX) ---
  return (
    <View style={styles.container}>
      {/* Header with Quick Stats */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        {/* Wrapper for header buttons */}
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              style={styles.markAllButton}
            >
              <Ionicons name="checkmark-done" size={16} color="#fff" />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}

          {/* Clear All Button */}
          {notifications.length > 0 && (
            <TouchableOpacity
              onPress={clearAllNotifications}
              style={styles.clearAllButton} 
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off" size={48} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyText}>All clear!</Text>
            <Text style={styles.emptySubtext}>
              No new notifications{'\n'}Sendss one to see it appear here!
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.isRead && styles.unreadCard,
              ]}
              onPress={() => markAsRead(notification.id)}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor:
                        getNotificationColor(notification.type) + "15",
                    },
                  ]}
                >
                  <Ionicons
                    name={getNotificationIcon(notification.type)}
                    size={18}
                    color={getNotificationColor(notification.type)}
                  />
                </View>

                <View style={styles.contentContainer}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        !notification.isRead && styles.unreadTitle,
                      ]}
                    >
                      {notification.title}
                    </Text>
                    <Text style={styles.timeText}>{notification.time}</Text>
                  </View>

                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {notification.message}
                  </Text>
                </View>

                <View style={styles.actionsContainer}>
                  {!notification.isRead && (
                    <View style={styles.unreadIndicator} />
                  )}
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation(); // Prevents card's onPress
                      deleteNotification(notification.id);
                    }}
                  >
                    <Ionicons name="close" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// --- Push Notification Registration Logic (Unchanged) ---
async function registerForPushNotificationsAsync() {
  let token;
  if (!Device.isDevice) {
    Alert.alert('Error', 'Push notifications require a physical device.');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('Permission Denied', 'Failed to get push token for push notification!');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  
  token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

// --- Styles (From New Design) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  // Header Styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60, // Added padding for status bar
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  unreadBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  // Wrapper for header buttons
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    gap: 4,
  },
  markAllText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  // Style for the 'Clear All' button
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8, // Made it a square-ish icon button
    backgroundColor: "#fee2e2", // Light red background
    borderRadius: 8,
    gap: 4,
  },
  // Content Styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 20,
  },
  // Notification Card Styles
  notificationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
    backgroundColor: "#fffbfb",
  },
  cardHeader: {
    flexDirection: "row",
    padding: 12,
    alignItems: "flex-start",
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    color: "#1f2937",
    fontWeight: "700",
  },
  timeText: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
  },
  notificationMessage: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  actionsContainer: {
    alignItems: "center",
    gap: 8,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
  },
});