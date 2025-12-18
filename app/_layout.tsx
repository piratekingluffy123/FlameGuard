// This is your Root Layout file: app/_layout.tsx
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {

  // We are only loading the FontAwesome icons now.
  // The 'SpaceMono' font that caused the crash has been removed.
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  // Hide the splash screen once resources are loaded
  useEffect(() => {
    if (error) {
      // If there's an error loading, hide the splash screen
      SplashScreen.hideAsync();
      console.warn(error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // Once fonts are loaded, hide the splash screen
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Don't render the app layout until all resources are loaded
  if (!loaded && !error) {
    return null; // The splash screen is still visible
  }

  // Once loaded, render the app's navigation structure
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="signin" options={{ headerShown: false }} />
      <Stack.Screen name="verification" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}