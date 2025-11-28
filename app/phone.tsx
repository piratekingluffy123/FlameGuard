import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { supabase } from '../services/supabase';

export default function PhoneScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  const handleContinue = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }

    if (phoneNumber.length < 11) {
      Alert.alert('Invalid', 'Please enter a valid 11-digit phone number (e.g., 09*********).');
      return;
    }

    if (!phoneNumber.startsWith('09')) {
      Alert.alert('Invalid', 'Phone number must start with 09.');
      return;
    }

    // Confirmation dialog
    Alert.alert(
      'Confirm Phone Number',
      `Is this really your number?\n\n${phoneNumber}`,
      [
        {
          text: 'No, Edit',
          style: 'cancel',
          onPress: () => {
            textInputRef.current?.focus();
          }
        },
        {
          text: 'Yes, Continue',
          onPress: async () => {
            await savePhoneNumber();
          }
        }
      ]
    );
  };

  const savePhoneNumber = async () => {
    setIsSaving(true);

    try {
      console.log('💾 Saving phone number:', phoneNumber);
      
      await AsyncStorage.setItem('userPhoneNumber', phoneNumber);
      console.log('✅ Phone saved to AsyncStorage');

      const fcmToken = await messaging().getToken();
      
      if (!fcmToken) {
        console.log('⚠️  No FCM token available, skipping Supabase update');
        Alert.alert('Warning', 'Phone number saved locally, but could not update server.');
        router.replace('/camera');
        return;
      }

      console.log('✅ FCM Token obtained:', fcmToken.substring(0, 20) + '...');
      console.log('📡 Updating Supabase with phone number...');

      const { data, error } = await supabase
        .from('deviceTokens')
        .upsert(
          {
            fcmToken: fcmToken,
            phonenumber: phoneNumber,
          },
          { 
            onConflict: 'fcmToken',
            ignoreDuplicates: false 
          }
        )
        .select();

      if (error) {
        console.log('❌ Error updating Supabase:', error.message);
        Alert.alert(
          'Partial Success', 
          'Phone saved locally but could not sync to server. You can continue.'
        );
      } else {
        console.log('✅ Phone number saved to Supabase:', data);
      }

      console.log('➡️  Navigating to camera...');
      router.replace('/camera');
    } catch (error) {
      console.log('❌ Error saving phone number:', error);
      Alert.alert('Error', 'Failed to save phone number. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.container}
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Image source={require('../assets/images/flame.png')} style={styles.flameIcon}/>
            </View>
            <Text style={styles.title}>Welcome to Flame Guard</Text>
            <Text style={styles.subtitle}>
              Fire detection and alert system
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#4A90E2" />
              <Text style={styles.infoText}>
                We need your phone number to send you emergency fire alerts via SMS
              </Text>
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                ref={textInputRef}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="09xxxxxxxxxx"
                keyboardType="phone-pad"
                maxLength={11}
                style={styles.input}
                placeholderTextColor="#94a3b8"
                editable={!isSaving}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isSaving && styles.buttonDisabled]}
              onPress={handleContinue}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark" size={16} color="#64748b" />
            <Text style={styles.footerText}>
              Your information is secure and will only be used for emergency alerts
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#fed7aa',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 24,
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  button: {
    backgroundColor: '#f97316',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 24,
    marginTop: 'auto',
  },
  flameIcon: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  }
});