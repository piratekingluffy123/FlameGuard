import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
// ✨ 1. Import the new library
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

// This is your list of starting stations
const INITIAL_STATIONS = [
  {
    id: 1,
    name: "Benpli Theater, DY Soria",
    phone: "857-3110-7310-5571",
    distance: "1.2 km",
    address: "DY Soria St, Quezon City",
  },
  {
    id: 2,
    name: "Cogon Market",
    phone: "857-3110/310-5572",
    distance: "1.8 km",
    address: "Cogon Market Road",
  },
  {
    id: 3,
    name: "IBT Terminal, Bigpa",
    phone: "856-5171/310-5573",
    distance: "2.3 km",
    address: "IBT Terminal Building",
  },
  {
    id: 4,
    name: "Carmen Market",
    phone: "858-3087/310-5574",
    distance: "2.7 km",
    address: "Carmen Market Complex",
  },
  {
    id: 5,
    name: "Puerto",
    phone: "855-1917/310-5576",
    distance: "3.1 km",
    address: "Puerto District",
  },
  {
    id: 6,
    name: "Lumbia",
    phone: "310-5575",
    distance: "3.5 km",
    address: "Lumbia Area",
  },
];

// This is the default map URL (Cagayan de Oro)
const DEFAULT_MAP_URL =
  "https://www.openstreetmap.org/export/embed.html?bbox=124.6069,8.4526,124.6853,8.5135&layer=mapnik&marker=8.4830,124.6461";

export default function Stations() {
  // --- STATE VARIABLES ---
  const [stations, setStations] = useState(INITIAL_STATIONS);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapUrl, setMapUrl] = useState(DEFAULT_MAP_URL);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // --- (All your functions like handleSearch, handleAddStation, etc. go here) ---
  const handleSearch = () => {
    if (searchQuery.trim() === "") {
      setMapUrl(DEFAULT_MAP_URL);
    } else {
      const encodedQuery = encodeURIComponent(searchQuery);
      setMapUrl(`https://www.openstreetmap.org/search?query=${encodedQuery}`);
    }
    Keyboard.dismiss();
  };

  const handleAddStation = () => {
    if (newName.trim() === "" || newPhone.trim() === "") {
      Alert.alert("Missing Info", "Please enter both name and phone number.");
      return;
    }

    const newId = stations.length > 0 ? Math.max(...stations.map(s => s.id)) + 1 : 1;
    const newStation = {
      id: newId,
      name: newName,
      phone: newPhone,
      distance: "N/A",
      address: "New Station",
    };

    setStations([newStation, ...stations]);
    setNewName("");
    setNewPhone("");
    Keyboard.dismiss();
  };

  const handleDelete = (idToDelete: number) => {
    Alert.alert(
      "Delete Station",
      "Are you sure you want to delete this station?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setStations(stations.filter((station) => station.id !== idToDelete));
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.split("/")[0]}`);
  };

  // --- RENDER ---
  return (
    // ✨ 2. We removed the KeyboardAvoidingView from here
    <View style={styles.container}>
      {/* --- DYNAMIC MAP CONTAINER --- */}
      <View
        style={[
          styles.mapContainerBase,
          isMapExpanded ? styles.mapExpanded : styles.mapCollapsed,
        ]}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search on map..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* WebView Map */}
        <WebView
          style={styles.mapView}
          originWhitelist={["*"]}
          source={{ uri: mapUrl }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {/* --- MAP TOGGLE BUTTON --- */}
        <TouchableOpacity
          style={styles.mapToggleButton}
          onPress={() => setIsMapExpanded(!isMapExpanded)}
        >
          <Ionicons
            name={isMapExpanded ? "contract" : "expand"}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* --- CONDITIONAL LIST --- */}
      {!isMapExpanded && (
        <>
          {/* List Header */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Nearby Fire Stations</Text>
            <Text style={styles.listSubtitle}>
              {stations.length} stations found
            </Text>
          </View>

          {/* ✨ 3. We replaced <ScrollView> with <KeyboardAwareScrollView> */}
          <KeyboardAwareScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            // This tells it to scroll more, just in case
            extraScrollHeight={20}
          >
            {/* Add New Station Form */}
            <View style={styles.addStationCard}>
              <Text style={styles.addStationTitle}>Add New Station</Text>
              <TextInput
                style={styles.addInput}
                placeholder="Station Name"
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={styles.addInput}
                placeholder="Phone Number"
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddStation}
              >
                <Ionicons name="add-circle" size={22} color="#fff" />
                <Text style={styles.addButtonText}>Add Station</Text>
              </TouchableOpacity>
            </View>

            {/* Stations List */}
            {stations.map((station) => (
              <View key={station.id} style={styles.stationCard}>
                {/* Delete Button */}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(station.id)}
                >
                  <Ionicons name="trash-bin" size={20} color="#FF4444" />
                </TouchableOpacity>

                {/* Station Info */}
                <View style={styles.stationHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="flame" size={24} color="#FF4444" />
                  </View>
                  <View style={styles.stationInfo}>
                    <Text style={styles.stationName}>{station.name}</Text>
                    <View style={styles.distanceRow}>
                      <Ionicons name="navigate" size={14} color="#666" />
                      <Text style={styles.distance}>{station.distance}</Text>
                    </View>
                  </View>
                </View>

                {/* Address */}
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={16} color="#999" />
                  <Text style={styles.address}>{station.address}</Text>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.phoneButton}
                    onPress={() => handleCall(station.phone)}
                  >
                    <Ionicons name="call" size={20} color="#fff" />
                    <Text style={styles.phoneText}>{station.phone}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.directionsButton}>
                    <Ionicons name="navigate-outline" size={20} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </KeyboardAwareScrollView>
        </>
      )}
    </View>
  );
}

// --- STYLES (All styles included) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  // Map Container
  mapContainerBase: {
    backgroundColor: "#f5f5f5",
    zIndex: 10,
  },
  mapCollapsed: {
    height: 260,
  },
  mapExpanded: {
    ...StyleSheet.absoluteFillObject,
  },
  // Search Bar
  searchContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#f8f9fa",
    zIndex: 20,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderColor: "#e0e0e0",
    borderWidth: 1,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FF4444",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  // Map View
  mapView: {
    flex: 1,
  },
  // Map Toggle Button
  mapToggleButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  // List Header
  listHeader: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: "#f8f9fa",
  },
  listTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  listSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
  },
  // Add Station Form
  addStationCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  addStationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  addInput: {
    height: 50,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    borderColor: "#e0e0e0",
    borderWidth: 1,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28a745",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  // Station Card
  stationCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 0,
    position: "relative",
  },
  // Delete Button
  deleteButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
  },
  // Station Card Content
  stationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    paddingRight: 30,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  distance: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingLeft: 2,
  },
  address: {
    fontSize: 13,
    color: "#999",
    flex: 1,
    lineHeight: 18,
  },
  // Action Buttons
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  phoneButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF4444",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    shadowColor: "#FF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  phoneText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  directionsButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#ffebee",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0,
  },
});