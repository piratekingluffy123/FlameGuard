import { supabase } from "@/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import messaging from "@react-native-firebase/messaging";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    View,
} from "react-native";

// ---------------------------
// LOG INTERFACE
// ---------------------------
interface EmergencyLog {
    id: string;
    phone_number: string;
    station_name: string;
    created_at: string;
}

// ---------------------------
// COMPONENT
// ---------------------------
export default function LogsScreen() {
    const [logs, setLogs] = useState<EmergencyLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    // ---------------------------
    // FETCH LOGS
    // ---------------------------
    const fetchLogs = async () => {
        setLoading(true);

        const fcmToken = await messaging().getToken();

        const { data, error } = await supabase
            .from("emergency_logs")
            .select("*")
            .eq("fcm_token", fcmToken)
            .order("created_at", { ascending: false });

        if (!error && data) {
            setLogs(data);
        }

        setLoading(false);
    };

    // ---------------------------
    // FORMAT TIME (PH TIME)
    // ---------------------------
    const formatPHTime = (utcDate: string) => {
        return new Date(utcDate).toLocaleString("en-PH", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    // ---------------------------
    // RENDER ITEM
    // ---------------------------
    const renderItem = ({ item }: { item: EmergencyLog }) => (
        <View style={styles.card}>
            <View style={styles.row}>
                <View style={styles.iconCircle}>
                    <Ionicons name="call-outline" size={22} color="#ef4444" />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={styles.station}>{item.station_name}</Text>
                    <Text style={styles.phone}>{item.phone_number}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Ionicons name="time-outline" size={14} color="#64748b" />
                <Text style={styles.time}>
                    {formatPHTime(item.created_at)}
                </Text>
            </View>
        </View>
    );

    // ---------------------------
    // LOADING STATE
    // ---------------------------
    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#ef4444" />
                <Text style={{ marginTop: 10, color: "#555" }}>
                    Loading call logs...
                </Text>
            </View>
        );
    }

    // ---------------------------
    // EMPTY STATE
    // ---------------------------
    if (!logs.length) {
        return (
            <View style={styles.center}>
                <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Logs Yet</Text>
                <Text style={styles.emptyText}>
                    Emergency call activity will appear here.
                </Text>
            </View>
        );
    }

    // ---------------------------
    // MAIN RENDER
    // ---------------------------
    return (
        <View style={styles.container}>
            <View style={{ left: 20, marginTop: 20}}>
                <Text style={{fontSize: 16, fontWeight: '500'}}>Emergency Logs</Text>
            </View>
            <FlatList
                data={logs}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

// ---------------------------
// STYLES
// ---------------------------
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
        top: 20
    },

    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20
    },

    emptyTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginTop: 12,
        color: "#1e293b",
    },

    emptyText: {
        fontSize: 14,
        color: "#64748b",
        marginTop: 4,
        textAlign: "center",
    },

    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
    },

    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#fee2e2",
        alignItems: "center",
        justifyContent: "center",
    },

    station: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1e293b",
    },

    phone: {
        fontSize: 13,
        color: "#475569",
        marginTop: 2,
    },

    footer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 12,
        gap: 6,
    },

    time: {
        fontSize: 12,
        color: "#64748b",
    },
});
