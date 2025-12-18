// import { Ionicons } from "@expo/vector-icons";
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import messaging from '@react-native-firebase/messaging';
// import React, { useEffect, useState } from 'react';
// import {
//   ActivityIndicator,
//   Alert,
//   RefreshControl,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { supabase } from '../../services/supabase';

// interface Notification {
//   id: string;
//   title: string;
//   message: string;
//   time: string;
//   type: "fire" | "alert" | "info" | "warning";
//   isRead: boolean;
//   cctvId?: string;
// }

// const FCM_TOKEN_KEY = '@fcm_token';

// export default function App() {
//   const [notifications, setNotifications] = useState<Notification[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [fcmToken, setFcmToken] = useState<string | null>(null);

//   // Load FCM token from storage
//   useEffect(() => {
//     loadFCMToken();
//   }, []);

//   const loadFCMToken = async () => {
//     try {
//       const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
//       if (token) {
//         setFcmToken(token);
//         console.log('📱 Loaded FCM Token from storage:', token);
//       }
//     } catch (e) {
//       console.error("Failed to load FCM token", e);
//     }
//   };

//   // Save FCM token to storage
//   const saveFCMToken = async (token: string) => {
//     try {
//       await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
//       setFcmToken(token);
//       console.log('💾 Saved FCM Token to storage');
//     } catch (e) {
//       console.error("Failed to save FCM token", e);
//     }
//   };

//   // Fetch notifications from Supabase
//   const fetchNotificationsFromSupabase = async () => {
//     if (!fcmToken) {
//       console.log('No FCM token available');
//       return;
//     }

//     try {
//       const { data, error } = await supabase
//         .from('notifications')
//         .select('*')
//         .eq('fcm_token', fcmToken)
//         .order('created_at', { ascending: false });

//       if (error) {
//         console.error('Error fetching notifications:', error);
//         return;
//       }

//       if (data) {
//         const formattedNotifications: Notification[] = data.map((notif) => ({
//           id: notif.id,
//           title: notif.title,
//           message: notif.body,
//           time: new Date(notif.created_at).toLocaleTimeString(),
//           type: notif.type || 'fire',
//           isRead: notif.is_read,
//           cctvId: notif.cctv_id,
//         }));

//         setNotifications(formattedNotifications);
//         console.log(`✅ Loaded ${formattedNotifications.length} notifications from Supabase`);
//       }
//     } catch (e) {
//       console.error("Exception fetching notifications:", e);
//     }
//   };

//   // Pull to refresh
//   const onRefresh = async () => {
//     setIsRefreshing(true);
//     await fetchNotificationsFromSupabase();
//     setIsRefreshing(false);
//   };

//   useEffect(() => {
//     // Initialize FCM
//     const initializeFCM = async () => {
//       try {
//         // Request permission
//         const authStatus = await messaging().requestPermission();
//         const enabled =
//           authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
//           authStatus === messaging.AuthorizationStatus.PROVISIONAL;

//         if (enabled) {
//           // Get FCM token
//           const token = await messaging().getToken();
//           console.log('📱 FCM Token from Firebase:', token);
//           saveFCMToken(token);
//         } else {
//           console.log('Notification permission denied');
//         }

//         // Handle foreground messages
//         const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
//           console.log('🔔 Foreground FCM message:', remoteMessage);
          
//           // Note: With real-time enabled, the notification will be added via the subscription
//           // But we still save here as a backup in case real-time fails
//           if (fcmToken) {
//             try {
//               const notificationData = {
//                 fcm_token: fcmToken,
//                 title: remoteMessage.notification?.title || 'No Title',
//                 body: remoteMessage.notification?.body || 'No message',
//                 cctv_id: remoteMessage.data?.cctvId || 'UNKNOWN',
//                 type: (remoteMessage.data?.type as string) || 'fire',
//                 is_read: false,
//               };

//               const { error } = await supabase
//                 .from('notifications')
//                 .insert(notificationData);

//               if (error) {
//                 console.error('Error saving notification to Supabase:', error);
//               } else {
//                 console.log('✅ Notification saved to Supabase (real-time will handle display)');
//               }
//             } catch (e) {
//               console.error('Exception saving notification:', e);
//             }
//           }

//           // Show alert
//           Alert.alert(
//             remoteMessage.notification?.title || 'Fire Alert',
//             remoteMessage.notification?.body || 'Fire detected!',
//             [{ text: 'OK' }]
//           );
//         });

//         // Handle background messages
//         messaging().setBackgroundMessageHandler(async remoteMessage => {
//           console.log('Background FCM message:', remoteMessage);
//         });

//         // Handle notification when app is opened from quit state
//         messaging().getInitialNotification().then(remoteMessage => {
//           if (remoteMessage) {
//             console.log('Initial notification:', remoteMessage);
//           }
//         });

//         return unsubscribeForeground;
//       } catch (error) {
//         console.log('Error initializing FCM:', error);
//       }
//     };

//     initializeFCM();
//   }, [fcmToken]);

//   // Load notifications when FCM token is available
//   useEffect(() => {
//     if (fcmToken) {
//       loadNotifications();
//       // Set up real-time subscription
//       setupRealtimeSubscription();
//     }
//   }, [fcmToken]);

//   const loadNotifications = async () => {
//     setIsLoading(true);
//     await fetchNotificationsFromSupabase();
//     setIsLoading(false);
//   };

//   // Set up real-time subscription for new notifications
//   const setupRealtimeSubscription = () => {
//     if (!fcmToken) return;

//     console.log('🔴 Setting up real-time subscription for notifications...');

//     const channel = supabase
//       .channel('notifications-realtime')
//       .on(
//         'postgres_changes',
//         {
//           event: 'INSERT',
//           schema: 'public',
//           table: 'notifications',
//           filter: `fcm_token=eq.${fcmToken}`,
//         },
//         (payload) => {
//           console.log('🔴 Real-time notification received:', payload);
          
//           const newNotif = payload.new;
//           const formattedNotification: Notification = {
//             id: newNotif.id,
//             title: newNotif.title,
//             message: newNotif.body,
//             time: new Date(newNotif.created_at).toLocaleTimeString(),
//             type: newNotif.type || 'fire',
//             isRead: newNotif.is_read,
//             cctvId: newNotif.cctv_id,
//           };

//           // Add to the top of the list
//           setNotifications((prev) => [formattedNotification, ...prev]);
          
//           console.log('✅ Notification added to list in real-time');
//         }
//       )
//       .on(
//         'postgres_changes',
//         {
//           event: 'UPDATE',
//           schema: 'public',
//           table: 'notifications',
//           filter: `fcm_token=eq.${fcmToken}`,
//         },
//         (payload) => {
//           console.log('🔴 Real-time notification updated:', payload);
          
//           const updatedNotif = payload.new;
//           setNotifications((prev) =>
//             prev.map((notif) =>
//               notif.id === updatedNotif.id
//                 ? {
//                     ...notif,
//                     isRead: updatedNotif.is_read,
//                     title: updatedNotif.title,
//                     message: updatedNotif.body,
//                   }
//                 : notif
//             )
//           );
//         }
//       )
//       .on(
//         'postgres_changes',
//         {
//           event: 'DELETE',
//           schema: 'public',
//           table: 'notifications',
//           filter: `fcm_token=eq.${fcmToken}`,
//         },
//         (payload) => {
//           console.log('🔴 Real-time notification deleted:', payload);
          
//           const deletedId = payload.old.id;
//           setNotifications((prev) =>
//             prev.filter((notif) => notif.id !== deletedId)
//           );
//         }
//       )
//       .subscribe((status) => {
//         console.log('Real-time subscription status:', status);
//       });

//     // Cleanup function
//     return () => {
//       console.log('🔴 Cleaning up real-time subscription');
//       supabase.removeChannel(channel);
//     };
//   };

//   // Mark notification as read in Supabase
//   const markAsRead = async (id: string) => {
//     try {
//       const { error } = await supabase
//         .from('notifications')
//         .update({ is_read: true })
//         .eq('id', id);

//       if (error) {
//         console.error('Error marking as read:', error);
//         return;
//       }

//       // Update local state
//       setNotifications((prev) =>
//         prev.map((notif) =>
//           notif.id === id ? { ...notif, isRead: true } : notif
//         )
//       );
//     } catch (e) {
//       console.error("Exception marking as read:", e);
//     }
//   };

//   // Mark all as read
//   const markAllAsRead = async () => {
//     if (!fcmToken) return;

//     try {
//       const { error } = await supabase
//         .from('notifications')
//         .update({ is_read: true })
//         .eq('fcm_token', fcmToken)
//         .eq('is_read', false);

//       if (error) {
//         console.error('Error marking all as read:', error);
//         return;
//       }

//       // Update local state
//       setNotifications((prev) =>
//         prev.map((notif) => ({ ...notif, isRead: true }))
//       );
//     } catch (e) {
//       console.error("Exception marking all as read:", e);
//     }
//   };

//   // Delete notification
//   const deleteNotification = async (id: string) => {
//     try {
//       const { error } = await supabase
//         .from('notifications')
//         .delete()
//         .eq('id', id);

//       if (error) {
//         console.error('Error deleting notification:', error);
//         return;
//       }

//       // Update local state
//       setNotifications((prev) => prev.filter((notif) => notif.id !== id));
//     } catch (e) {
//       console.error("Exception deleting notification:", e);
//     }
//   };

//   // Clear all notifications
//   const clearAllNotifications = async () => {
//     if (!fcmToken) return;

//     Alert.alert(
//       "Clear All Notifications",
//       "Are you sure you want to delete all notifications? This cannot be undone.",
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Clear All",
//           style: "destructive",
//           onPress: async () => {
//             try {
//               const { error } = await supabase
//                 .from('notifications')
//                 .delete()
//                 .eq('fcm_token', fcmToken);

//               if (error) {
//                 console.error('Error clearing notifications:', error);
//                 return;
//               }

//               setNotifications([]);
//             } catch (e) {
//               console.error("Exception clearing notifications:", e);
//             }
//           },
//         },
//       ]
//     );
//   };

//   const getNotificationIcon = (type: string) => {
//     switch (type) {
//       case "fire":
//         return "flame";
//       case "alert":
//         return "warning";
//       case "warning":
//         return "alert-circle";
//       case "info":
//       default:
//         return "information-circle";
//     }
//   };

//   const getNotificationColor = (type: string) => {
//     switch (type) {
//       case "fire":
//         return "#FF4444";
//       case "alert":
//         return "#FF8C00";
//       case "warning":
//         return "#FFD700";
//       case "info":
//       default:
//         return "#4A90E2";
//     }
//   };

//   const unreadCount = notifications.filter((n) => !n.isRead).length;

//   // Show loading spinner while fetching
//   if (isLoading) {
//     return (
//       <View style={[styles.container, styles.centerContent]}>
//         <ActivityIndicator size="large" color="#ef4444" />
//         <Text style={styles.loadingText}>Loading notifications...</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       {/* Header */}
//       <View style={styles.header}>
//         <View style={styles.headerContent}>
//           <Text style={styles.headerTitle}>Notifications</Text>
//           {unreadCount > 0 && (
//             <View style={styles.unreadBadge}>
//               <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
//             </View>
//           )}
//         </View>
        
//         <View style={styles.headerActions}>
//           {unreadCount > 0 && (
//             <TouchableOpacity
//               onPress={markAllAsRead}
//               style={styles.markAllButton}
//             >
//               <Ionicons name="checkmark-done" size={16} color="#fff" />
//               <Text style={styles.markAllText}>Mark all read</Text>
//             </TouchableOpacity>
//           )}

//           {notifications.length > 0 && (
//             <TouchableOpacity
//               onPress={clearAllNotifications}
//               style={styles.clearAllButton} 
//             >
//               <Ionicons name="trash-outline" size={16} color="#ef4444" />
//             </TouchableOpacity>
//           )}
//         </View>
//       </View>
      
//       <ScrollView
//         style={styles.scrollView}
//         contentContainerStyle={styles.scrollContent}
//         refreshControl={
//           <RefreshControl
//             refreshing={isRefreshing}
//             onRefresh={onRefresh}
//             colors={['#ef4444']}
//             tintColor="#ef4444"
//           />
//         }
//       >
//         {notifications.length === 0 ? (
//           <View style={styles.emptyState}>
//             <View style={styles.emptyIconContainer}>
//               <Ionicons name="notifications-off" size={48} color="#cbd5e1" />
//             </View>
//             <Text style={styles.emptyText}>All clear!</Text>
//             <Text style={styles.emptySubtext}>
//               No notifications yet{'\n'}Pull down to refresh
//             </Text>
//           </View>
//         ) : (
//           notifications.map((notification) => (
//             <TouchableOpacity
//               key={notification.id}
//               style={[
//                 styles.notificationCard,
//                 !notification.isRead && styles.unreadCard,
//               ]}
//               onPress={() => markAsRead(notification.id)}
//             >
//               <View style={styles.cardHeader}>
//                 <View
//                   style={[
//                     styles.iconContainer,
//                     {
//                       backgroundColor:
//                         getNotificationColor(notification.type) + "15",
//                     },
//                   ]}
//                 >
//                   <Ionicons
//                     name={getNotificationIcon(notification.type)}
//                     size={18}
//                     color={getNotificationColor(notification.type)}
//                   />
//                 </View>

//                 <View style={styles.contentContainer}>
//                   <View style={styles.titleRow}>
//                     <Text
//                       style={[
//                         styles.notificationTitle,
//                         !notification.isRead && styles.unreadTitle,
//                       ]}
//                     >
//                       {notification.title}
//                     </Text>
//                     <Text style={styles.timeText}>{notification.time}</Text>
//                   </View>

//                   {notification.cctvId && (
//                     <View style={styles.cctvBadge}>
//                       <Ionicons name="videocam" size={10} color="#64748b" />
//                       <Text style={styles.cctvText}>{notification.cctvId}</Text>
//                     </View>
//                   )}

//                   <Text style={styles.notificationMessage} numberOfLines={2}>
//                     {notification.message}
//                   </Text>
//                 </View>

//                 <View style={styles.actionsContainer}>
//                   {!notification.isRead && (
//                     <View style={styles.unreadIndicator} />
//                   )}
//                   <TouchableOpacity
//                     style={styles.deleteButton}
//                     onPress={(e) => {
//                       e.stopPropagation();
//                       deleteNotification(notification.id);
//                     }}
//                   >
//                     <Ionicons name="close" size={16} color="#94a3b8" />
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             </TouchableOpacity>
//           ))
//         )}
//       </ScrollView>
//     </View>
//   );
// }

// // Styles
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f8fafc",
//   },
//   centerContent: {
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   loadingText: {
//     marginTop: 12,
//     fontSize: 14,
//     color: '#64748b',
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingHorizontal: 16,
//     paddingVertical: 16,
//     paddingTop: 60,
//     backgroundColor: "#fff",
//     borderBottomWidth: 1,
//     borderBottomColor: "#e2e8f0",
//   },
//   headerContent: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//   },
//   headerTitle: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#1e293b",
//   },
//   unreadBadge: {
//     backgroundColor: "#ef4444",
//     borderRadius: 10,
//     minWidth: 20,
//     height: 20,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingHorizontal: 6,
//   },
//   unreadBadgeText: {
//     color: "#fff",
//     fontSize: 11,
//     fontWeight: "700",
//   },
//   headerActions: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   markAllButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     backgroundColor: "#ef4444",
//     borderRadius: 8,
//     gap: 4,
//   },
//   markAllText: {
//     color: "#fff",
//     fontSize: 12,
//     fontWeight: "600",
//   },
//   clearAllButton: {
//     flexDirection: "row",
//     alignItems: "center",
//     padding: 8,
//     backgroundColor: "#fee2e2",
//     borderRadius: 8,
//     gap: 4,
//   },
//   scrollView: {
//     flex: 1,
//   },
//   scrollContent: {
//     padding: 16,
//   },
//   emptyState: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingVertical: 80,
//   },
//   emptyIconContainer: {
//     width: 80,
//     height: 80,
//     borderRadius: 40,
//     backgroundColor: "#f1f5f9",
//     justifyContent: "center",
//     alignItems: "center",
//     marginBottom: 16,
//   },
//   emptyText: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#475569",
//     marginBottom: 4,
//   },
//   emptySubtext: {
//     fontSize: 14,
//     color: "#94a3b8",
//     textAlign: "center",
//     lineHeight: 20,
//   },
//   notificationCard: {
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     marginBottom: 8,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 3,
//     elevation: 2,
//     borderWidth: 1,
//     borderColor: "#f1f5f9",
//   },
//   unreadCard: {
//     borderLeftWidth: 3,
//     borderLeftColor: "#ef4444",
//     backgroundColor: "#fffbfb",
//   },
//   cardHeader: {
//     flexDirection: "row",
//     padding: 12,
//     alignItems: "flex-start",
//     gap: 12,
//   },
//   iconContainer: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   contentContainer: {
//     flex: 1,
//   },
//   titleRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "flex-start",
//     marginBottom: 4,
//   },
//   notificationTitle: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#374151",
//     flex: 1,
//     marginRight: 8,
//   },
//   unreadTitle: {
//     color: "#1f2937",
//     fontWeight: "700",
//   },
//   timeText: {
//     fontSize: 11,
//     color: "#9ca3af",
//     fontWeight: "500",
//   },
//   cctvBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     marginBottom: 4,
//   },
//   cctvText: {
//     fontSize: 10,
//     color: '#64748b',
//     fontWeight: '600',
//   },
//   notificationMessage: {
//     fontSize: 13,
//     color: "#6b7280",
//     lineHeight: 18,
//   },
//   actionsContainer: {
//     alignItems: "center",
//     gap: 8,
//   },
//   unreadIndicator: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: "#ef4444",
//   },
//   deleteButton: {
//     padding: 6,
//     borderRadius: 6,
//   },
// });

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../services/supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: "fire" | "alert" | "info" | "warning";
  isRead: boolean;
  cctvId?: string;
  created_at: string; // Add this for pagination
}

const FCM_TOKEN_KEY = '@fcm_token';
const PAGE_SIZE = 15; // Number of notifications per page

export default function App() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Load FCM token from storage
  useEffect(() => {
    loadFCMToken();
  }, []);

  const loadFCMToken = async () => {
    try {
      const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      if (token) {
        setFcmToken(token);
        console.log('📱 Loaded FCM Token from storage:', token);
      }
    } catch (e) {
      console.error("Failed to load FCM token", e);
    }
  };

  // Save FCM token to storage
  const saveFCMToken = async (token: string) => {
    try {
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      setFcmToken(token);
      console.log('💾 Saved FCM Token to storage');
    } catch (e) {
      console.error("Failed to save FCM token", e);
    }
  };

  // Fetch notifications from Supabase with pagination
  const fetchNotificationsFromSupabase = async (page: number = 0, isLoadMore: boolean = false) => {
    if (!fcmToken) {
      console.log('No FCM token available');
      return;
    }

    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      console.log(`📄 Fetching page ${page} (${from} to ${to})`);

      const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('fcm_token', fcmToken)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      if (data) {
        const formattedNotifications: Notification[] = data.map((notif) => ({
          id: notif.id,
          title: notif.title,
          message: notif.body,
          time: new Date(notif.created_at).toLocaleDateString(),
          type: notif.type || 'fire',
          isRead: notif.is_read,
          cctvId: notif.cctv_id,
          created_at: notif.created_at // Keep for pagination
        }));

        // Check if there are more notifications to load
        const totalCount = count || 0;
        const hasMoreData = totalCount > (page + 1) * PAGE_SIZE;
        setHasMore(hasMoreData);

        if (isLoadMore) {
          // Append to existing notifications
          setNotifications(prev => [...prev, ...formattedNotifications]);
        } else {
          // Replace notifications (first load or refresh)
          setNotifications(formattedNotifications);
        }

        console.log(`✅ Loaded ${formattedNotifications.length} notifications (page ${page}), has more: ${hasMoreData}`);
      }
    } catch (e) {
      console.error("Exception fetching notifications:", e);
    }
  };

  // Load initial notifications
  const loadNotifications = async () => {
    setIsLoading(true);
    setCurrentPage(0);
    await fetchNotificationsFromSupabase(0, false);
    setIsLoading(false);
  };

  // Load more notifications
  const loadMoreNotifications = async () => {
    if (!hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    await fetchNotificationsFromSupabase(nextPage, true);
    setCurrentPage(nextPage);
    setIsLoadingMore(false);
  };

  // Pull to refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    setCurrentPage(0);
    await fetchNotificationsFromSupabase(0, false);
    setIsRefreshing(false);
  };

  // Handle scroll for infinite loading
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20; // Load more when 20px from bottom
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMoreNotifications();
    }
  };

  useEffect(() => {
    // Initialize FCM
    const initializeFCM = async () => {
      try {
        // Request permission
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          // Get FCM token
          const token = await messaging().getToken();
          console.log('📱 FCM Token from Firebase:', token);
          saveFCMToken(token);
        } else {
          console.log('Notification permission denied');
        }

        // Handle foreground messages
        const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
          console.log('🔔 Foreground FCM message:', remoteMessage);
          
          // Show alert
          Alert.alert(
            remoteMessage.notification?.title || 'Fire Alert',
            remoteMessage.notification?.body || 'Fire detected!',
            [{ text: 'OK' }]
          );
        });

        // Handle background messages
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
  }, [fcmToken]);

  // Load notifications when FCM token is available
  useEffect(() => {
    if (fcmToken) {
      loadNotifications();
      // Set up real-time subscription
      setupRealtimeSubscription();
    }
  }, [fcmToken]);

  // Set up real-time subscription for new notifications
  const setupRealtimeSubscription = () => {
    if (!fcmToken) return;

    console.log('🔴 Setting up real-time subscription for notifications...');

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `fcm_token=eq.${fcmToken}`,
        },
        (payload) => {
          console.log('🔴 Real-time notification received:', payload);
          
          const newNotif = payload.new;
          const formattedNotification: Notification = {
            id: newNotif.id,
            title: newNotif.title,
            message: newNotif.body,
            time: new Date(newNotif.created_at).toLocaleDateString(),
            type: newNotif.type || 'fire',
            isRead: newNotif.is_read,
            cctvId: newNotif.cctv_id,
            created_at: newNotif.created_at
          };

          // Add to the top of the list and reset pagination
          setNotifications((prev) => [formattedNotification, ...prev.slice(0, -1)]);
          setCurrentPage(0); // Reset pagination since we're modifying the list
          
          console.log('✅ Notification added to list in real-time');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `fcm_token=eq.${fcmToken}`,
        },
        (payload) => {
          console.log('🔴 Real-time notification updated:', payload);
          
          const updatedNotif = payload.new;
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.id === updatedNotif.id
                ? {
                    ...notif,
                    isRead: updatedNotif.is_read,
                    title: updatedNotif.title,
                    message: updatedNotif.body,
                  }
                : notif
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `fcm_token=eq.${fcmToken}`,
        },
        (payload) => {
          console.log('🔴 Real-time notification deleted:', payload);
          
          const deletedId = payload.old.id;
          setNotifications((prev) =>
            prev.filter((notif) => notif.id !== deletedId)
          );
          setCurrentPage(0); // Reset pagination
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    // Cleanup function
    return () => {
      console.log('🔴 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  };

  // Mark notification as read in Supabase
  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) {
        console.error('Error marking as read:', error);
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
    } catch (e) {
      console.error("Exception marking as read:", e);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!fcmToken) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('fcm_token', fcmToken)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return;
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
    } catch (e) {
      console.error("Exception marking all as read:", e);
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting notification:', error);
        return;
      }

      // Update local state
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      setCurrentPage(0); // Reset pagination
    } catch (e) {
      console.error("Exception deleting notification:", e);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!fcmToken) return;

    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to delete all notifications? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('fcm_token', fcmToken);

              if (error) {
                console.error('Error clearing notifications:', error);
                return;
              }

              setNotifications([]);
              setCurrentPage(0);
              setHasMore(false);
            } catch (e) {
              console.error("Exception clearing notifications:", e);
            }
          },
        },
      ]
    );
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

  // Show loading spinner while fetching
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              style={styles.markAllButton}
            >
              <Ionicons name="checkmark-done" size={16} color="#fff" />
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}

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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#ef4444']}
            tintColor="#ef4444"
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off" size={48} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyText}>All clear!</Text>
            <Text style={styles.emptySubtext}>
              No notifications yet{'\n'}Pull down to refresh
            </Text>
          </View>
        ) : (
          <>
            {notifications.map((notification) => (
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

                    {notification.cctvId && (
                      <View style={styles.cctvBadge}>
                        <Ionicons name="videocam" size={10} color="#64748b" />
                        <Text style={styles.cctvText}>{notification.cctvId}</Text>
                      </View>
                    )}

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
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Ionicons name="close" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            
            {/* Loading More Indicator */}
            {hasMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#ef4444" />
                <Text style={styles.loadingMoreText}>Loading more notifications...</Text>
              </View>
            )}
            
            {/* No More Notifications */}
            {!hasMore && notifications.length > 0 && (
              <View style={styles.noMoreContainer}>
                <Text style={styles.noMoreText}>No more notifications</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Updated Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
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
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    gap: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
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
  cctvBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cctvText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
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
  // New styles for pagination
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#64748b',
  },
  noMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noMoreText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});