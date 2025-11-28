import messaging from '@react-native-firebase/messaging';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../services/supabase';

export default function Index() {
  const [hasPhone, setHasPhone] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPhoneWithFCM = async () => {
      try {
        console.log('🚀 Starting Supabase check...');
        
        // Get FCM token
        const fcmToken = await messaging().getToken();
        console.log('✅ FCM Token:', fcmToken);
        
        if (!fcmToken) {
          console.log('❌ No FCM token available');
          setHasPhone(false);
          return;
        }

        console.log('🔍 Querying Supabase for FCM token...');
        
        // Remove timeout first to see if query works without it
        const { data, error } = await supabase
          .from('deviceTokens')
          .select('phonenumber')
          .eq('fcmToken', fcmToken)
          .single();

        console.log('📊 Supabase response - Data:', data);
        console.log('📊 Supabase response - Error:', error);

        if (error) {
          console.log('❌ Supabase error:', error);
          if (error.code === 'PGRST116') {
            console.log('📝 No record found for this FCM token');
          }
          setHasPhone(false);
          return;
        }

        console.log('✅ Supabase record found:', data);
        
        const hasPhoneInSupabase = !!data?.phonenumber;
        console.log('📞 Phone number exists:', hasPhoneInSupabase);
        console.log('📞 Phone number value:', data?.phonenumber);

        setHasPhone(hasPhoneInSupabase);
        
      } catch (error) {
        console.log('💥 Exception in check:', error);
        setHasPhone(false);
      }
    };

    checkPhoneWithFCM();
  }, []);

  // Show loading while checking
  if (hasPhone === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  console.log('🎯 Final decision - Redirecting to:', hasPhone ? '/camera' : '/phone');
  return <Redirect href={hasPhone ? "/camera" : "/phone"} />;
}