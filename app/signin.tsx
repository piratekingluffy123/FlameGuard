import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export default function SignInScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const handleSignIn = async () => {
        if (!email.trim()) {
            Alert.alert('Required', 'Please enter your email address.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Invalid', 'Please enter a valid email address.');
            return;
        }

        setLoading(true);

        try {
            // Check if email exists in deviceTokens
            const { data, error } = await supabase
                .from('deviceTokens')
                .select('id')
                .eq('email', email)
                .limit(1);

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                Alert.alert(
                    'Not Registered',
                    'This email is not registered. Please sign up first.'
                );
                setLoading(false);
                return;
            }

            // Email exists, send OTP with shouldCreateUser: true
            console.log('📧 Sending verification code to email...');
            const { error: otpError } = await supabase.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: true, // ✅ Changed to true
                },
            });

            if (otpError) {
                console.log('❌ Error sending verification code:', otpError.message);
                Alert.alert('Error', 'Failed to send verification code. Please try again.');
                setLoading(false);
                return;
            }

            // Store email temporarily for verification screen
            await AsyncStorage.setItem('signinEmail', email);

            console.log('✅ Verification code sent successfully');

            Alert.alert(
                'Code Sent',
                'A 6-digit verification code has been sent to your email.',
                [
                    {
                        text: 'OK',
                        onPress: () => router.push('/camera'),
                    },
                ]
            );
        } catch (err) {
            console.log('❌ Sign-in error:', err);
            Alert.alert('Error', 'Unable to sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAwareScrollView
            contentContainerStyle={styles.container}
            enableOnAndroid
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Image
                                source={require('../assets/images/flame.png')}
                                style={styles.flameIcon}
                            />
                        </View>
                        <Text style={styles.title}>Sign In</Text>
                        <Text style={styles.subtitle}>
                            Enter your registered email address
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail" size={20} color="#64748b" style={styles.inputIcon} />
                            <TextInput
                                ref={inputRef}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="example@email.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={styles.input}
                                placeholderTextColor="#94a3b8"
                                editable={!loading}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSignIn}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>Sign In</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Go to Signup */}
                        <TouchableOpacity
                            style={styles.signupLink}
                            onPress={() => router.push('/signup')}
                        >
                            <Text style={styles.signupText}>
                                Don’t have an account? <Text style={styles.signupBold}>Sign up</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Ionicons name="shield-checkmark" size={16} color="#64748b" />
                        <Text style={styles.footerText}>
                            Used for secure access and emergency alerts
                        </Text>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAwareScrollView>
    );
}

/* ---------------- STYLES ---------------- */

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
    flameIcon: {
        width: 48,
        height: 48,
        resizeMode: 'contain',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 8,
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
    signupLink: {
        marginTop: 20,
        alignItems: 'center',
    },
    signupText: {
        fontSize: 14,
        color: '#64748b',
    },
    signupBold: {
        color: '#f97316',
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 'auto',
    },
    footerText: {
        fontSize: 12,
        color: '#64748b',
    },
});
