// THIS IS CLOUD VIDEO OF FIRE // ----------------------------------------------------
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { Video } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const screenWidth = Dimensions.get("window").width;

// 🔹 Component for each video (Using NEW History Design)
// ... (This component is unchanged, so I'll skip it for brevity)
const VideoCard = ({
  item,
  onDownload,
  onDelete,
  isDownloading,
  isDeleting,
  refreshVersion,
}) => {
  const videoRef = useRef(null);

  // Convert to proper MP4 format for seeking support in player
  const optimizedUrl = item.secure_url.replace(
    "/upload/",
    "/upload/f_mp4,vc_h264,ac_aac/"
  );
  const filename = item.public_id.split("/").pop();

  // Handle video end - replay from beginning
  const handlePlaybackStatusUpdate = (status) => {
    // If video finished, replay it
    if (status.didJustFinish && !status.isLooping) {
      videoRef.current?.replayAsync();
    }
  };

  const uploadDate = new Date(item.created_at).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const uploadTime = new Date(item.created_at).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <View style={styles.captureCard}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.severityIndicator,
              { backgroundColor: "#ef4444" }, // Hardcoded to 'high' severity color
            ]}
          />
          <View>
            <Text style={styles.incidentTitle} numberOfLines={1}>
              {filename}
            </Text>
            <View style={styles.timeStampRow}>
              <Text style={styles.timeStamp}>{uploadDate.split(",")[0]}</Text>
              <Text style={styles.timeCode}>{uploadTime}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* ORIGINAL Delete Button */}
          <TouchableOpacity
            style={[
              styles.deleteIconBtn,
              isDeleting && styles.deleteIconBtnDisabled,
            ]}
            onPress={() => onDelete(item.public_id, filename)}
            disabled={isDeleting || isDownloading}
          >
            {isDeleting ? (
              <ActivityIndicator color="#dc2626" size="small" />
            ) : (
              <Text style={styles.deleteIcon}>🗑️</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Capture Preview (Replaced with Video Player) */}
      <Video
        key={`${item.public_id}-${refreshVersion}`}
        ref={videoRef}
        source={{ uri: optimizedUrl }}
        useNativeControls
        resizeMode="contain"
        style={[styles.video, { width: "100%" }]}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onFullscreenUpdate={async ({ fullscreenUpdate }) => {
          if (fullscreenUpdate === 1) await videoRef.current.playAsync();
        }}
      />
      <Text style={styles.date}>Uploaded: {uploadDate}</Text>

      {/* Card Footer (Replaced with Download Button) */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.downloadBtn, isDownloading && styles.downloadBtnDisabled]}
          onPress={() => onDownload(item.secure_url, filename)}
          disabled={isDownloading || isDeleting}
        >
          {isDownloading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.downloadText}>⬇️ Download</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function App() {
  const [videos, setVideos] = useState([]); // ✨ Master list from Cloudinary
  const [displayedVideos, setDisplayedVideos] = useState([]); // ✨ List to show in UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [sortOrder, setSortOrder] = useState("date"); // ✨ 'date', 'long', 'short'

  // 🧾 Cloudinary credentials
  // ... (credentials unchanged)
  const cloudName = "djtzvegll";
  const apiKey = "542598738595935";
  const apiSecret = "zXHXXtfWlSMONbTVaWhOm-2SPls";

  // 🔹 Request permission when app loads
  useEffect(() => {
    // ... (code unchanged)
    const requestInitialPermission = async () => {
      const perms = await MediaLibrary.getPermissionsAsync();
      if (perms.status !== "granted") {
        await MediaLibrary.requestPermissionsAsync();
      }
    };
    requestInitialPermission();
  }, []);

  // 🔹 Fetch videos from Cloudinary
  const fetchVideos = async () => {
    try {
      const authHeader = "Basic " + btoa(`${apiKey}:${apiSecret}`);
      const res = await axios.get(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/video`,
        { headers: { Authorization: authHeader } }
      );
      setVideos(res.data.resources);
      setDisplayedVideos(res.data.resources); // ✨ Set displayed videos
      setSortOrder("date"); // ✨ Reset sort order to default (date)
      console.log(
        `✅ Fetched ${res.data.resources.length} videos from Cloudinary`
      );
    } catch (err) {
      console.error("❌ Error fetching videos:", err);
      Alert.alert("Error", "Failed to load videos. Please try again.");
    }
  };

  // Initial fetch when app loads
  useEffect(() => {
    const loadVideos = async () => {
      await fetchVideos();
      setLoading(false);
    };
    loadVideos();
  }, []);

  // 🔹 Pull to refresh handler
  const onRefresh = async () => {
    console.log("🔄 Pull to refresh triggered - Fetching latest videos...");
    setRefreshing(true);
    await fetchVideos(); // ✨ This will set both lists and reset sort
    setRefreshVersion((v) => v + 1);
    setRefreshing(false);
    console.log("✅ Refresh complete!");
  };

  // 🔹 Delete handler
  // ... (handleDelete confirmation dialog unchanged)
  const handleDelete = async (publicId, filename) => {
    console.log("🗑️ DELETE BUTTON CLICKED for:", filename);

    Alert.alert(
      "Delete Video",
      `Are you sure you want to delete "${filename}"?\n\n⚠️ This will permanently remove it from Cloudinary!`,
      [
        {
          text: "Cancel",
          onPress: () => {
            console.log("❌ User cancelled deletion");
          },
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            console.log("✅ User confirmed deletion");
            await startDelete(publicId, filename);
          },
        },
      ],
      { cancelable: false }
    );
  };

  // Actual delete function
  const startDelete = async (publicId, filename) => {
    setDeletingId(filename);

    try {
      console.log("⏳ Deleting from Cloudinary...");
      const authHeader = "Basic " + btoa(`${apiKey}:${apiSecret}`);
      await axios.delete(
        `https://api.cloudinary.com/v1_1/${cloudName}/resources/video/upload`,
        {
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          data: {
            public_ids: [publicId],
          },
        }
      );

      console.log("✅ Video deleted from Cloudinary");
      // ✨ Remove from both master list and displayed list
      setVideos((prevVideos) =>
        prevVideos.filter((v) => v.public_id !== publicId)
      );
      setDisplayedVideos((prevVideos) =>
        prevVideos.filter((v) => v.public_id !== publicId)
      );

      Alert.alert(
        "✅ Deleted",
        `"${filename}" has been permanently deleted from Cloudinary.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      // ... (error handling unchanged)
      console.error("❌ Delete failed:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete video. Please try again.";
      Alert.alert("Delete Failed", errorMessage);
    } finally {
      console.log("🔄 Finally block - resetting deletingId");
      setDeletingId(null);
    }
  };

  // 🔹 Download handler
  // ... (handleDownload and startDownload unchanged)
  const handleDownload = async (url, filename) => {
    console.log("🚀 DOWNLOAD BUTTON CLICKED for:", filename);

    Alert.alert(
      "Download Video",
      `Do you want to download "${filename}"?`,
      [
        {
          text: "Deny",
          onPress: () => {
            console.log("❌ User clicked DENY - Download cancelled");
          },
          style: "cancel",
        },
        {
          text: "Allow",
          onPress: async () => {
            console.log("✅ User clicked ALLOW - Starting download");
            await startDownload(url, filename);
          },
        },
      ],
      { cancelable: false }
    );
  };

  const startDownload = async (url, filename) => {
    setDownloadingId(filename);

    try {
      console.log("⏳ Checking current permission status...");
      const currentPerms = await MediaLibrary.getPermissionsAsync();
      console.log("📱 Current permission status:", JSON.stringify(currentPerms));

      if (currentPerms.status !== "granted") {
        console.log("❌ Permission not granted - Stopping download!");
        Alert.alert(
          "Permission Required",
          "Please allow media access in your device settings to download videos."
        );
        setDownloadingId(null);
        return;
      }

      console.log("✅ Permission GRANTED - Proceeding with download");

      const mp4Url = url.replace(
        "/upload/",
        "/upload/f_mp4,vc_h264,ac_aac/"
      );
      const cleanFilename = filename.replace(/\.(avi|AVI)$/gi, "");
      const fileUri = FileSystem.cacheDirectory + cleanFilename + ".mp4";

      console.log("Downloading from:", mp4Url);
      console.log("Saving to:", fileUri);

      const downloadResumable = FileSystem.createDownloadResumable(
        mp4Url,
        fileUri,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress: ${(progress * 100).toFixed(0)}%`);
        }
      );

      const { uri } = await downloadResumable.downloadAsync();
      console.log("Download complete, file at:", uri);

      console.log("⏳ Attempting to save to gallery...");
      let asset;
      try {
        asset = await MediaLibrary.createAssetAsync(uri);
        console.log("Asset created:", asset);
        if (!asset || !asset.id) {
          throw new Error("Asset creation failed - no valid ID returned");
        }
      } catch (assetError) {
        console.log("❌ Failed to create asset:", assetError);
        await FileSystem.deleteAsync(uri, { idempotent: true });
        Alert.alert(
          "Save Failed",
          "Could not save video to your gallery. Please check permissions in your device settings."
        );
        setDownloadingId(null);
        return;
      }

      try {
        const album = await MediaLibrary.getAlbumAsync("Downloads");
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync("Downloads", asset, false);
        }
      } catch (albumError) {
        console.log("Album creation skipped:", albumError);
      }

      console.log("✅ About to show Download Complete alert");
      Alert.alert(
        "✅ Download Complete",
        "Video saved to your gallery!\n\n✨ Video converted to MP4 - you can now seek forward/backward!",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("❌ Download failed:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      Alert.alert("Download Failed", errorMessage);
    } finally {
      console.log("🔄 Finally block - resetting downloadingId");
      setDownloadingId(null);
    }
  };

  // ✨ 🔹 Sort handler
  const handleSortToggle = () => {
    // Assuming 'item.duration' exists and is a number (in seconds)
    console.log("🔄 Toggling sort order...");

    let newSortOrder;
    // If current sort is default (date) or short, toggle to long
    if (sortOrder === "date" || sortOrder === "short") {
      newSortOrder = "long";
    } else {
      // Otherwise, toggle to short
      newSortOrder = "short";
    }
    setSortOrder(newSortOrder);

    // Sort from the MASTER list to ensure we have all data
    const sortedVideos = [...videos].sort((a, b) => {
      if (newSortOrder === "long") {
        // Longest to shortest
        return (b.duration || 0) - (a.duration || 0);
      } else {
        // Shortest to longest
        return (a.duration || 0) - (b.duration || 0);
      }
    });

    setDisplayedVideos(sortedVideos); // Update the list in the UI
    console.log(`✅ Sorted: ${newSortOrder}`);
  };

  // 🔹 Loading state
  if (loading) {
    // ... (unchanged)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  // 🔹 Empty state
  if (!videos.length) {
    // ... (unchanged)
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No videos found 😢</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setLoading(true);
            fetchVideos().finally(() => setLoading(false));
          }}
        >
          <Text style={styles.retryText}>🔄 Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🔹 Render list with NEW design
  return (
    <View style={styles.container}>
      {/* Enhanced Stats Header */}
      <View style={styles.header}>
        {/* ... (Stats Grid unchanged) */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="flame" size={18} color="#ef4444" />
            </View>
            <Text style={styles.statNumber}>{videos.length}</Text>
            <Text style={styles.statLabel}>Total Captures</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[styles.statIconContainer, { backgroundColor: "#fef2f2" }]}
            >
              <Ionicons name="warning" size={18} color="#dc2626" />
            </View>
            <Text style={[styles.statNumber, { color: "#dc2626" }]}>
              {videos.length}
            </Text>
            <Text style={styles.statLabel}>Critical Events</Text>
          </View>

          {/* REMOVED "Resolved" and "Analyzed" CARDS */}
        </View>
      </View>

      {/* ✨ Filter Header - MODIFIED */}
      <View style={styles.filterHeader}>
        <Text style={styles.sectionTitle}>Detection History</Text>
        <View style={styles.filterControls}>
          <TouchableOpacity
            style={styles.filterChip}
            onPress={handleSortToggle} // ✨ Added onPress
          >
            <Ionicons
              name={
                // ✨ Changed icon
                sortOrder === "long" ? "arrow-down-outline" : "arrow-up-outline"
              }
              size={16}
              color="#64748b"
            />
            <Text style={styles.filterChipText}>
              {
                // ✨ Changed text
                sortOrder === "date"
                  ? "Sort by Duration"
                  : sortOrder === "long"
                  ? "Longest First"
                  : "Shortest First"
              }
            </Text>
          </TouchableOpacity>
          {/* This button now does nothing, but we'll leave it */}
          <TouchableOpacity style={styles.sortButton}>
            <Ionicons name="swap-vertical" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Original FlatList */}
      <FlatList
        data={displayedVideos} // ✨ Changed data source
        keyExtractor={(item) => item.public_id}
        renderItem={({ item }) => {
          const filename = item.public_id.split("/").pop();
          return (
            <VideoCard
              item={item}
              onDownload={handleDownload}
              onDelete={handleDelete}
              isDownloading={downloadingId === filename}
              isDeleting={deletingId === filename}
              refreshVersion={refreshVersion}
            />
          );
        }}
        contentContainerStyle={styles.scrollContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </View>
  );
}

// ✨ STYLES: Merged from BOTH files
// ... (All styles are unchanged, so I'll skip them for brevity)
const styles = StyleSheet.create({
  // Styles from History.js
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  // Header Styles
  header: {
    padding: 16,
    paddingTop: 50, // Added padding for status bar
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
    textAlign: "center",
  },
  // Filter Header
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  filterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    gap: 4,
  },
  filterChipText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  sortButton: {
    padding: 6,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
  },
  // Content Styles
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  // Capture Card Styles
  captureCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  criticalCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    backgroundColor: "#fffbfb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 8,
    paddingRight: 8, // Ensure text doesn't overlap button
  },
  severityIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginTop: 2,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  timeStampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeStamp: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  timeCode: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "monospace",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  // Card Footer
  cardFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },

  // ✨ STYLES from original Cloud Video App (Merged)
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc", // Use new bg color
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#64748b", // Use new text color
  },
  emptyText: {
    fontSize: 18,
    color: "#64748b", // Use new text color
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: "#ef4444", // Use new red color
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  video: {
    height: 230,
    borderRadius: 10,
    backgroundColor: "#000",
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
    fontStyle: "italic",
  },
  // Delete button (used in cardHeader)
  deleteIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIconBtnDisabled: {
    opacity: 0.5,
  },
  deleteIcon: {
    fontSize: 20,
  },
  // Download button (used in cardFooter)
  downloadBtn: {
    padding: 12,
    backgroundColor: "#f97316", // Kept original orange color
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  downloadBtnDisabled: {
    backgroundColor: "#fca164",
    opacity: 0.7,
  },
  downloadText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});