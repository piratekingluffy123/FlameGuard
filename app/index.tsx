import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const email = await AsyncStorage.getItem('userEmail');
        setIsLoggedIn(!!email);
      } catch (error) {
        console.log('Login check error:', error);
        setIsLoggedIn(false);
      }
    };

    checkLogin();
  }, []);

  // Loading screen
  if (isLoggedIn === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
        }}
      >
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return <Redirect href={isLoggedIn ? '/camera' : '/signin'} />;
}
