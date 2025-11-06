import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react"; // ✨ Import React
import {
  Alert, // ✨ Added
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, // ✨ Added
  TouchableOpacity,
  View,
} from "react-native";

export default function Stations() {
  // ✨ Made stations list mutable
  const [stations, setStations] = useState([
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
    // ... other initial stations
  ]);

  // ✨ State for the new station inputs
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  // --- Functions ---

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.split("/")[0]}`);
  };

  // ✨ Function to add a new station
  const handleAddStation = () => {
    if (!newName || !newPhone) {
      Alert.alert("Missing Info", "Please enter both a name and a phone number.");
      return;
    }
    const newStation = {
      id: Math.random(), // Simple unique ID
      name: newName,
      phone: newPhone,
      distance: "Custom",
      address: "User Added",
    };
    setStations((prevStations) => [newStation, ...prevStations]);
    setNewName("");
    setNewPhone("");
  };

  // ✨ Function to delete a station
  const handleDelete = (id: number) => {
    Alert.alert(
      "Delete Station",
      "Are you sure you want to delete this station?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setStations((prevStations) =>
              prevStations.filter((station) => station.id !== id)
            );
          },
        },
      ]
    );
  };

  // --- Render ---

  return (
    <View style={styles.container}>
      {/* Map Placeholder (Unchanged) */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={64} color="#e0e0e0" />
          <Text style={styles.mapText}>Interactive Map</Text>
          <Text style={styles.mapSubtext}>Fire stations near your location</Text>
        </View>
        <View style={styles.mapOverlay}>
          <Ionicons name="locate" size={24} color="#FF4444" />
        </View>
      </View>

      {/* ✨ New "Add Station" Form */}
      <View style={styles.addContainer}>
        <TextInput
          style={styles.input}
          placeholder="New Station Name"
          placeholderTextColor="#999"
          value={newName}
          onChangeText={setNewName}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number (e.g., 911)"
          placeholderTextColor="#999"
          value={newPhone}
          onChangeText={setNewPhone}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddStation}>
          <Text style={styles.addButtonText}>Add Station</Text>
        </TouchableOpacity>
      </View>

      {/* List Header (Unchanged) */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Nearby Fire Stations</Text>
        <Text style={styles.listSubtitle}>{stations.length} stations found</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {stations.map((station) => (
          <View key={station.id} style={styles.stationCard}>
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
              {/* ✨ Delete Button */}
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(station.id)}
              >
                <Ionicons name="trash-outline" size={22} color="#FF4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color="#999" />
              <Text style={styles.address}>{station.address}</Text>
            </View>

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
      </ScrollView>
    </View>
  );
}

// ✨ Styles (with additions)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  mapContainer: {
    height: 200, // Reduced height to make room for form
    backgroundColor: "#f5f5f5",
    position: "relative",
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  mapText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 0.3,
  },
  mapSubtext: {
    marginTop: 6,
    fontSize: 13,
    color: "#bbb",
  },
  mapOverlay: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "#fff",
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  // ✨ New Add Station Styles
  addContainer: {
    backgroundColor: "#fff",
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 12,
    color: "#333",
  },
  addButton: {
    backgroundColor: "#FF4444",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  // ---
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
  },
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
  },
  stationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
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
  // ✨ New Delete Button Style
  deleteButton: {
    padding: 8,
  },
  // ---
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