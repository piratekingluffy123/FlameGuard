import AsyncStorage from "@react-native-async-storage/async-storage";
import messaging from "@react-native-firebase/messaging";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { supabase } from "../services/supabase";

export default function VerificationScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert("Invalid", "Enter the 6-digit code sent to your email.");
      return;
    }

    setLoading(true);

    try {
      // Check if this is a signup or signin verification
      const pendingSignup = await AsyncStorage.getItem("pendingSignup");
      const signinEmail = await AsyncStorage.getItem("signinEmail");

      if (pendingSignup) {
        // This is a SIGNUP verification
        const signupData = JSON.parse(pendingSignup);

        const { error } = await supabase.auth.verifyOtp({
          email: signupData.email,
          token: code,
          type: "email",
        });

        if (error) {
          Alert.alert("Verification Failed", error.message);
          return;
        }

        const fcmToken = await messaging().getToken();

        await supabase.from("deviceTokens").upsert(
          {
            email: signupData.email,
            phonenumber: signupData.phoneNumber,
            first_name: signupData.firstName,
            last_name: signupData.lastName,
            house_number: signupData.houseNumber,
            street: signupData.street,
            barangay: signupData.barangay,
            city: signupData.city,
            province: signupData.province,
            fcmToken,
            created_at: new Date(),
          },
          { onConflict: "email" }
        );

        await AsyncStorage.setItem("userEmail", signupData.email);
        await AsyncStorage.removeItem("pendingSignup");

        Alert.alert("Success", "Account created successfully!", [
          { text: "OK", onPress: () => router.replace("/camera") }
        ]);
      } else if (signinEmail) {
        // This is a SIGNIN verification
        const { error } = await supabase.auth.verifyOtp({
          email: signinEmail,
          token: code,
          type: "email",
        });

        if (error) {
          Alert.alert("Verification Failed", error.message);
          return;
        }

        await AsyncStorage.setItem("userEmail", signinEmail);
        await AsyncStorage.removeItem("signinEmail");

        Alert.alert("Success", "Signed in successfully!", [
          { text: "OK", onPress: () => router.replace("/camera") }
        ]);
      } else {
        Alert.alert("Error", "Verification session expired.");
        router.replace("/signin");
        return;
      }
    } catch (err) {
      console.log("Verification error:", err);
      Alert.alert("Error", "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to your email
        </Text>

        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
          placeholder="123456"
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#f97316",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  backButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  backText: {
    color: "#64748b",
    fontSize: 14,
  },
});