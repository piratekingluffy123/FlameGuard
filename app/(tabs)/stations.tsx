import { Ionicons } from "@expo/vector-icons";
import Geolocation from '@react-native-community/geolocation';
import React, { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import MapView, { Marker } from 'react-native-maps';

// Types for our fire station data
interface FireStation {
  id: string;
  name: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
  rating?: number;
  isOpen?: boolean;
}

// Helper function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

// Add this near the top with other helper functions
const fetchPlaceDetails = async (placeId: string, apiKey: string): Promise<{ phone?: string }> => {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,international_phone_number&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.result) {
      return {
        phone: data.result.international_phone_number || data.result.formatted_phone_number
      };
    }

    return {};
  } catch (error) {
    console.error('Error fetching place details:', error);
    return {};
  }
};

// Google Maps Places API function
// Enhanced fetchNearbyFireStations with detailed debugging
const fetchNearbyFireStations = async (
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<FireStation[]> => {
  try {
    const API_KEY = 'AIzaSyAIvt81a49AXnxkHEdWnt79TXmBZH_6LGQ';

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=fire_station&key=${API_KEY}`;

    console.log('🔍 Searching for fire stations...');

    const response = await fetch(url);
    const data = await response.json();

    console.log('API Status:', data.status);

    if (data.status === 'REQUEST_DENIED') {
      throw new Error(`API Error: ${data.error_message || 'Request denied'}`);
    }

    if (data.status === 'ZERO_RESULTS' || !data.results || data.results.length === 0) {
      if (radius < 10000) {
        return fetchNearbyFireStations(latitude, longitude, 10000);
      }
      return [];
    }

    // Fetch details for all stations including phone numbers
    const stationsPromises = data.results.map(async (place: any, index: number) => {
      const details = await fetchPlaceDetails(place.place_id, API_KEY);

      return {
        id: place.place_id || `station-${index}`,
        name: place.name || `Fire Station ${index + 1}`,
        address: place.vicinity || place.formatted_address || 'Address not available',
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating,
        isOpen: place.opening_hours?.open_now,
        phone: details.phone
      };
    });

    const stations = await Promise.all(stationsPromises);
    console.log(`Total found: ${stations.length} fire stations`);

    return stations;

  } catch (error) {
    console.error('Error fetching fire stations:', error);
    throw error;
  }
};

const handleCall = (phone?: string) => {
  console.log('handleCall called with:', phone);

  if (!phone) {
    Alert.alert(
      "Phone Not Available",
      "This fire station does not have a phone number listed on Google Maps.",
      [{ text: "OK" }]
    );
    return;
  }

  // Clean phone number
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  console.log('Opening dialer with:', cleanPhone);

  Linking.openURL(`tel:${cleanPhone}`).catch(err => {
    console.error('Error opening phone dialer:', err);
    Alert.alert(
      "Error",
      `Could not open phone dialer.\n\nPlease dial manually:\n${phone}`,
      [{ text: "OK" }]
    );
  });
};

// Fallback function to generate mock data based on user location (if API fails)
const generateFallbackStations = (userLat: number, userLng: number): FireStation[] => {
  // Generate 8 stations around the user location within 5km radius
  const stations: FireStation[] = [];
  const radiusKm = 5;

  for (let i = 0; i < 8; i++) {
    // Generate random coordinates within 5km radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusKm;

    // Convert km to degrees (approx 111km per degree)
    const latOffset = (distance * Math.cos(angle)) / 111;
    const lngOffset = (distance * Math.sin(angle)) / (111 * Math.cos(userLat * Math.PI / 180));

    stations.push({
      id: `fallback-${i}`,
      name: `Fire Station ${i + 1}`,
      address: `Near your location ${i + 1}`,
      phone: '+63 XXX-XXX-XXXX',
      latitude: userLat + latOffset,
      longitude: userLng + lngOffset,
      rating: 4.0 + Math.random() * 1.0,
      isOpen: Math.random() > 0.3
    });
  }

  return stations;
};

export default function Stations() {
  const [stations, setStations] = useState<FireStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<FireStation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<FireStation[]>([]);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Request location permission and get current location
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "This app needs access to your location to show nearby fire stations.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log("Location permission granted");
          setHasLocationPermission(true);
          setLocationPermissionDenied(false);
          getCurrentLocation();
        } else {
          console.log("Location permission denied");
          setHasLocationPermission(false);
          setLocationPermissionDenied(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn(err);
        setHasLocationPermission(false);
        setLocationPermissionDenied(true);
        setIsLoading(false);
      }
    } else {
      // For iOS - we'll request through getCurrentLocation
      setHasLocationPermission(true);
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    setIsLoading(true);
    setApiError(null);

    let watchId: number | null = null;
    let hasReceivedLocation = false;

    // First attempt: Quick location with lower accuracy
    Geolocation.getCurrentPosition(
      async (position) => {
        if (hasReceivedLocation) return;
        hasReceivedLocation = true;

        const { latitude, longitude } = position.coords;
        console.log("User location:", latitude, longitude);
        setUserLocation({ latitude, longitude });

        try {
          const nearbyStations = await fetchNearbyFireStations(latitude, longitude, 5000);
          setStations(nearbyStations);
          setFilteredStations(nearbyStations);
        } catch (error) {
          console.log("Google API failed, using fallback data:", error);
          setApiError("Using demo data - API limit reached");
          const fallbackStations = generateFallbackStations(latitude, longitude);
          setStations(fallbackStations);
          setFilteredStations(fallbackStations);
        }

        setIsLoading(false);
      },
      (error) => {
        console.log("Initial location attempt failed:", error);

        // Fallback: Use watchPosition for continuous attempts
        console.log("Trying watchPosition as fallback...");

        watchId = Geolocation.watchPosition(
          async (position) => {
            if (hasReceivedLocation) {
              if (watchId !== null) {
                Geolocation.clearWatch(watchId);
              }
              return;
            }
            hasReceivedLocation = true;

            const { latitude, longitude } = position.coords;
            console.log("User location (from watchPosition):", latitude, longitude);
            setUserLocation({ latitude, longitude });

            try {
              const nearbyStations = await fetchNearbyFireStations(latitude, longitude, 5000);
              setStations(nearbyStations);
              setFilteredStations(nearbyStations);
            } catch (error) {
              console.log("Google API failed, using fallback data:", error);
              setApiError("Using demo data - API limit reached");
              const fallbackStations = generateFallbackStations(latitude, longitude);
              setStations(fallbackStations);
              setFilteredStations(fallbackStations);
            }

            setIsLoading(false);

            if (watchId !== null) {
              Geolocation.clearWatch(watchId);
            }
          },
          (watchError) => {
            console.log("watchPosition error:", watchError);

            // Final fallback: Use default location (Cagayan de Oro)
            if (!hasReceivedLocation) {
              hasReceivedLocation = true;
              Alert.alert(
                "Location Unavailable",
                "Unable to get your location. Using default location (Cagayan de Oro). Please check your device's location settings and ensure GPS is enabled.",
                [
                  {
                    text: "Use Default Location",
                    onPress: async () => {
                      const defaultLat = 8.4542;
                      const defaultLng = 124.6319;
                      setUserLocation({ latitude: defaultLat, longitude: defaultLng });

                      try {
                        const nearbyStations = await fetchNearbyFireStations(defaultLat, defaultLng, 5000);
                        setStations(nearbyStations);
                        setFilteredStations(nearbyStations);
                      } catch (error) {
                        const fallbackStations = generateFallbackStations(defaultLat, defaultLng);
                        setStations(fallbackStations);
                        setFilteredStations(fallbackStations);
                      }

                      setIsLoading(false);
                    }
                  },
                  {
                    text: "Open Settings",
                    onPress: () => {
                      handleOpenSettings();
                      setIsLoading(false);
                    }
                  }
                ]
              );
            }

            if (watchId !== null) {
              Geolocation.clearWatch(watchId);
            }
          },
          {
            enableHighAccuracy: false, // Start with lower accuracy for faster results
            timeout: 30000, // 30 seconds
            maximumAge: 0,
            distanceFilter: 0
          }
        );

        // Cleanup watchPosition after 30 seconds if still no location
        setTimeout(() => {
          if (!hasReceivedLocation && watchId !== null) {
            Geolocation.clearWatch(watchId);

            Alert.alert(
              "Location Timeout",
              "Unable to determine your location. Would you like to use a default location or try again?",
              [
                {
                  text: "Use Default",
                  onPress: async () => {
                    const defaultLat = 8.4542;
                    const defaultLng = 124.6319;
                    setUserLocation({ latitude: defaultLat, longitude: defaultLng });

                    try {
                      const nearbyStations = await fetchNearbyFireStations(defaultLat, defaultLng, 5000);
                      setStations(nearbyStations);
                      setFilteredStations(nearbyStations);
                    } catch (error) {
                      const fallbackStations = generateFallbackStations(defaultLat, defaultLng);
                      setStations(fallbackStations);
                      setFilteredStations(fallbackStations);
                    }

                    setIsLoading(false);
                  }
                },
                {
                  text: "Try Again",
                  onPress: () => {
                    setIsLoading(false);
                    setTimeout(() => getCurrentLocation(), 100);
                  }
                }
              ]
            );
          }
        }, 30000);
      },
      {
        enableHighAccuracy: false, // Use lower accuracy first for faster results
        timeout: 20000, // 20 seconds for initial attempt
        maximumAge: 5000, // Accept cached location up to 5 seconds old
      }
    );
  };

  const handleRefreshLocation = () => {
    if (hasLocationPermission) {
      getCurrentLocation();
    } else {
      requestLocationPermission();
    }
  };

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (query.trim() === "") {
      setFilteredStations(stations);
      setSuggestions([]);
    } else {
      const filtered = stations.filter(
        (station) =>
          station.name.toLowerCase().includes(query.toLowerCase()) ||
          station.address.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredStations(filtered);
      setSuggestions(filtered.slice(0, 5)); // show top 5 suggestions
    }
  };

  const selectSuggestion = (stationName: string) => {
    setSearchQuery(stationName);
    handleSearch(stationName);
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const handleCall = (phone: string) => {
    if (phone && phone !== 'Phone not available' && !phone.includes('XXX')) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert("Phone Not Available", "Phone number is not available for this station.");
    }
  };

  const handleGetDirections = (latitude: number, longitude: number, name: string) => {
    const url = Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${encodeURIComponent(name)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_name=${encodeURIComponent(name)}`;

    Linking.openURL(url).catch(err =>
      Alert.alert("Error", "Could not open maps application.")
    );
  };

  // If location permission is denied, show permission request UI
  if (locationPermissionDenied) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="location-outline" size={64} color="#FF4444" />
        <Text style={styles.permissionTitle}>Location Permission Required</Text>
        <Text style={styles.permissionText}>
          This app needs location access to show nearby fire stations within 5km radius.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestLocationPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, styles.settingsButton]}
          onPress={handleOpenSettings}
        >
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="locate" size={64} color="#FF4444" />
        <Text style={styles.loadingText}>Finding nearby fire stations...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Header with location info */}
        <View style={styles.header}>
          <View style={styles.locationHeader}>
            <Ionicons name="navigate" size={20} color="#FF4444" />
            <Text style={styles.locationText}>
              {filteredStations.length} fire stations within 5km radius
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshLocation}>
            <Ionicons name="refresh" size={20} color="#FF4444" />
          </TouchableOpacity>
        </View>

        {apiError && (
          <View style={styles.apiErrorContainer}>
            <Ionicons name="warning" size={16} color="#FFA000" />
            <Text style={styles.apiErrorText}>{apiError}</Text>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search fire stations..."
            placeholderTextColor={'#666'}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionBox}>
            {suggestions.map((station) => (
              <TouchableOpacity
                key={station.id}
                style={styles.suggestionItem}
                onPress={() => selectSuggestion(station.name)}
              >
                <Text style={styles.suggestionText}>{station.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* MapView */}
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: userLocation?.latitude || 8.4542,
            longitude: userLocation?.longitude || 124.6319,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          region={userLocation ?
            {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            } : undefined}
          showsUserLocation={true} // Keep this for the automatic blue circle/dot
          showsMyLocationButton={true}
        >
          {/* Only include the red fire station markers */}
          {filteredStations.map((station) => (
            <Marker
              key={station.id}
              coordinate={{
                latitude: station.latitude,
                longitude: station.longitude
              }}
              title={station.name}
              description={station.address}
              pinColor="red"
            />
          ))}
        </MapView>

        {/* Stations List */}
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {filteredStations.map((station) => (
            <View key={station.id} style={styles.stationCard}>
              <View style={styles.stationHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="flame" size={24} color="#FF4444" />
                </View>
                <View style={styles.stationInfo}>
                  <Text style={styles.stationName}>{station.name}</Text>
                  <View style={styles.stationMeta}>
                    {userLocation && (
                      <Text style={styles.distanceText}>
                        {calculateDistance(userLocation.latitude, userLocation.longitude, station.latitude, station.longitude).toFixed(1)} km away
                      </Text>
                    )}
                    {station.rating && (
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={styles.ratingText}>{station.rating.toFixed(1)}</Text>
                      </View>
                    )}
                    {station.isOpen !== undefined && (
                      <Text style={[styles.statusText, station.isOpen ? styles.openText : styles.closedText]}>
                        {station.isOpen ? 'Open' : 'Closed'}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={16} color="#999" />
                <Text style={styles.address}>{station.address}</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.directionsButton]}
                  onPress={() => handleGetDirections(station.latitude, station.longitude, station.name)}
                >
                  <Ionicons name="navigate" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Directions</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.phoneButton,
                    !station.phone && styles.disabledButton
                  ]}
                  onPress={() => handleCall(station.phone)}
                  disabled={!station.phone}
                >
                  <Ionicons name="call" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {station.phone ? 'Call' : 'No Phone'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {filteredStations.length === 0 && (
            <View style={styles.noStationsContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#999" />
              <Text style={styles.noStationsText}>No fire stations found within 5km radius</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefreshLocation}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAwareScrollView>
      </View>
    </>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", top: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 5,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4444',
  },
  refreshButton: {
    padding: 8,
  },
  apiErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    marginHorizontal: 10,
    borderRadius: 8,
    gap: 8,
  },
  apiErrorText: {
    fontSize: 12,
    color: '#FFA000',
    fontWeight: '500',
  },
  searchContainer: { flexDirection: "row", padding: 10, backgroundColor: "#f8f9fa", zIndex: 20 },
  searchInput: { flex: 1, height: 44, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, fontSize: 15, borderColor: "#e0e0e0", borderWidth: 1, color: 'black' },
  suggestionBox: { backgroundColor: "#fff", position: "absolute", top: 110, left: 10, right: 10, borderRadius: 12, zIndex: 50, elevation: 5, paddingVertical: 5 },
  suggestionItem: { paddingVertical: 10, paddingHorizontal: 15, borderBottomColor: "#eee", borderBottomWidth: 1 },
  suggestionText: { color: 'black' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 12 },
  stationCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 5, borderWidth: 0 },
  stationHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  iconContainer: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#ffebee", justifyContent: "center", alignItems: "center", marginRight: 14 },
  stationInfo: { flex: 1 },
  stationName: { fontSize: 17, fontWeight: "700", color: "#1a1a1a", marginBottom: 6, letterSpacing: 0.2, lineHeight: 22 },
  stationMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  distanceText: { fontSize: 12, color: "#FF4444", fontWeight: '600' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: "#666", fontWeight: '500' },
  statusText: { fontSize: 12, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  openText: { backgroundColor: '#E8F5E8', color: '#2E7D32' },
  closedText: { backgroundColor: '#FFEBEE', color: '#C62828' },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, paddingLeft: 2 },
  address: { fontSize: 13, color: "#999", flex: 1, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 12 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  directionsButton: {
    backgroundColor: "#4285F4",
  },
  phoneButton: {
    backgroundColor: "#FF4444",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.2
  },
  map: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 12,
  },
  // Permission denied styles
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  settingsButtonText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noStationsContainer: {
    alignItems: 'center',
    padding: 40,
  },
  noStationsText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#999',
    opacity: 0.6,
  }
});