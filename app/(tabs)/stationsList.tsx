import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import messaging from "@react-native-firebase/messaging";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// ---------------------------
// FIRE STATION INTERFACE
// ---------------------------
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

// ---------------------------
// GET ALL FIRE STATIONS IN CAGAYAN DE ORO
// ---------------------------
const fetchCdoStations = async (): Promise<FireStation[]> => {
  try {
    const API_KEY = "AIzaSyAIvt81a49AXnxkHEdWnt79TXmBZH_6LGQ";
    const CDO_LAT = 8.4542;
    const CDO_LNG = 124.6319;

    const nearbyUrl =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${CDO_LAT},${CDO_LNG}&radius=25000&type=fire_station&key=${API_KEY}`;

    const nearbyResponse = await fetch(nearbyUrl);
    const nearbyData = await nearbyResponse.json();

    if (!nearbyData.results) return [];

    const stations = nearbyData.results;

    return await Promise.all(
      stations.map(async (place: any, index: number) => {
        const detailsUrl =
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,international_phone_number,formatted_address,geometry,opening_hours,rating&key=${API_KEY}`;

        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        const details = detailsData.result || {};

        return {
          id: place.place_id || `station-${index}`,
          name: place.name,
          address: details.formatted_address || place.vicinity || "No address available",
          phone: details.formatted_phone_number || details.international_phone_number || undefined,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          rating: details.rating,
          isOpen: details.opening_hours?.open_now,
        };
      })
    );
  } catch (err) {
    console.log("Error fetching CDO stations:", err);
    return [];
  }
};

// ---------------------------
// COMPONENT
// ---------------------------
export default function StationsList() {
  const router = useRouter();

  const [allStations, setAllStations] = useState<FireStation[]>([]);
  const [displayedStations, setDisplayedStations] = useState<FireStation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    setLoading(true);
    const data = await fetchCdoStations();
    setAllStations(data);
    setDisplayedStations(data.slice(0, PAGE_SIZE));
    setLoading(false);
  };

  // ---------------------------
  // PAGINATION
  // ---------------------------
  const loadMore = () => {
    if (loadingMore) return;
    const totalLoaded = page * PAGE_SIZE;
    if (totalLoaded >= allStations.length) return;

    setLoadingMore(true);
    setTimeout(() => {
      setDisplayedStations(prev => [
        ...prev,
        ...allStations.slice(totalLoaded, totalLoaded + PAGE_SIZE),
      ]);
      setPage(prev => prev + 1);
      setLoadingMore(false);
    }, 600);
  };

  // ---------------------------
  // SEARCH
  // ---------------------------
  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setDisplayedStations(allStations.slice(0, PAGE_SIZE));
      setPage(1);
      return;
    }

    setDisplayedStations(
      allStations.filter(st =>
        st.name.toLowerCase().includes(query.toLowerCase()) ||
        st.address.toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  // ---------------------------
  // CALL + LOG + REDIRECT
  // ---------------------------
  const handleCall = async (phone?: string, stationName?: string) => {
    if (!phone) {
      Alert.alert("No Phone Number", "This station has no phone number listed.");
      return;
    }

    Alert.alert(
      "Confirm Emergency Call",
      "This action will be logged for safety and accountability. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          onPress: async () => {
            try {
              const fcmToken = await messaging().getToken();

              const { data: user, error } = await supabase
                .from("deviceTokens")
                .select("*")
                .eq("fcmToken", fcmToken)
                .single();

              if (error || !user) {
                Alert.alert("Error", "Unable to identify caller.");
                return;
              }

              await supabase.from("emergency_logs").insert({
                phone_number: user.phonenumber,
                first_name: user.first_name,
                last_name: user.last_name,
                house_number: user.house_number,
                street: user.street,
                barangay: user.barangay,
                city: user.city,
                province: user.province,
                station_name: stationName,
                fcm_token: fcmToken,
              });

              router.push("/logs");
              Linking.openURL(`tel:${phone}`);
            } catch (err) {
              console.log("Emergency log error:", err);
              Alert.alert("Error", "Failed to log emergency call.");
            }
          },
        },
      ]
    );
  };

  // ---------------------------
  // LOADING
  // ---------------------------
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text>Loading fire stations...</Text>
        <ActivityIndicator size="large" color="#FF4444" style={{ marginTop: 20 }} />
      </View>
    );
  }

  // ---------------------------
  // RENDER ITEM (DESIGN UNCHANGED)
  // ---------------------------
  const renderItem = ({ item }: { item: FireStation }) => (
    <View key={item.id} style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="flame" size={24} color="#FF4444" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.stationName}>{item.name}</Text>
          <Text style={styles.address}>{item.address}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#4285F4" }]}
          onPress={() => Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`
          )}
        >
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={styles.btnText}>Directions</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: item.phone ? "#FF4444" : "#777" }]}
          onPress={() => handleCall(item.phone, item.name)}
          disabled={!item.phone}
        >
          <Ionicons name="call" size={16} color="#fff" />
          <Text style={styles.btnText}>{item.phone ? "Call" : "No Phone"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ---------------------------
  // MAIN
  // ---------------------------
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.search}
          placeholder="Search fire stations..."
          placeholderTextColor="#777"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={displayedStations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#555" style={{ marginVertical: 20 }} />
          ) : null
        }
      />
    </View>
  );
}

// ---------------------------
// STYLES (UNCHANGED)
// ---------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f7", top: 25 },

  searchContainer: { padding: 12 },
  search: {
    backgroundColor: "#fff",
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    color: "black",
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },

  headerRow: { flexDirection: "row", marginBottom: 14 },
  iconCircle: {
    width: 48,
    height: 48,
    backgroundColor: "#ffebee",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  stationName: { fontSize: 16, fontWeight: "700", color: "#222" },
  address: { fontSize: 13, color: "#777", marginTop: 4 },

  buttonRow: { flexDirection: "row", marginTop: 12, gap: 10 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  btnText: { color: "#fff", fontWeight: "600" },
});
