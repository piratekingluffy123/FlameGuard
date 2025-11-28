import { Ionicons } from "@expo/vector-icons";
import * as NavigationBar from 'expo-navigation-bar'; // <-- NEW
import { Tabs } from "expo-router";
import { StatusBar } from 'expo-status-bar'; // <-- NEW
import React, { useEffect } from 'react'; // <-- NEW
import { AppState, BackHandler, Platform } from 'react-native'; // <-- NEW

// --- Core Function: Hides System Navigation Bar (Home/Back Buttons) ---
const hideSystemBars = async () => {
  if (Platform.OS === 'android') {
    try {
      // 1. Force the bar to be hidden
      await NavigationBar.setVisibilityAsync('hidden');

      // 2. Set the behavior to 'overlay-swipe' (Android Immersive Sticky Mode)
      // This is the CRUCIAL part that makes the home/back buttons disappear 
      // and only temporarily reappear on an explicit swipe from the edge.
      await NavigationBar.setBehaviorAsync('overlay-swipe');
    } catch (e) {
      console.error("Failed to set NavigationBar visibility or behavior:", e);
    }
  }
};

// --- Custom Hook: Disables Back Button Functionality ---
// Prevents the hardware/gesture back button from exiting the app or navigating away.
const useDisableBackButton = () => {
  useEffect(() => {
    const backAction = () => {
      // Returning true PREVENTS the default behavior.
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, []);
};

export default function RootLayout() {

  // 1. Apply Full-Screen Mode and Reapply on Focus
  useEffect(() => { // <-- NEW LOGIC
    hideSystemBars();

    // Re-apply full-screen mode whenever the app comes back to the foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        hideSystemBars();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 2. Disable Back Button across all screens in the tabs group
  useDisableBackButton(); // <-- NEW LOGIC

  return (
    <>
      {/* 3. Hide the top Status Bar (Time/Battery/Notifications) */}
      <StatusBar hidden={true} /> {/* <-- NEW */}

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#ef4444",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderTopWidth: 0,
            height: 80,
            paddingBottom: 20,
            paddingTop: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: 4,
          },
          tabBarIconStyle: {
            marginTop: 4,
          },
          // If you want the app's *internal* header bar gone too, uncomment this:
          // headerShown: false, 

          headerStyle: {
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#e2e8f0",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 3,
          },
          headerTintColor: "#1e293b",
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 18,
          },
          headerTitleAlign: "left",
        }}
      >
        <Tabs.Screen
          name="camera"
          options={{
            title: "FLAMEGUARD",
            tabBarLabel: "Monitor",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="videocam-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stations"
          options={{
            title: "Maps",
            tabBarLabel: "Maps",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="map" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Notification",
            tabBarLabel: "Notifications",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="notifications-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="video"
          options={{
            title: "Fire History",
            tabBarLabel: "Videos",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="albums-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stationsList"
          options={{
            title: "Stations",
            tabBarLabel: "Stations",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="call-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}