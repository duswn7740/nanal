import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TextInput } from 'react-native';

// 시스템 글꼴 크기 설정 무시 (모든 기기에서 동일한 폰트 크기 유지)
if (Text.defaultProps == null) Text.defaultProps = {};
Text.defaultProps.allowFontScaling = false;
if (TextInput.defaultProps == null) TextInput.defaultProps = {};
TextInput.defaultProps.allowFontScaling = false;
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestNotificationPermission, promptExactAlarmIfNeeded } from './src/utils/notifications';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import TabNavigator from './src/navigation/TabNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { colors } from './src/theme';

const ONBOARDING_KEY = 'onboarding_done';

// 로그인 상태에 따라 보여줄 네비게이터 결정
function RootNavigator() {
  const { user, isLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  if (isLoading || onboardingDone === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </View>
    );
  }

  if (!onboardingDone) {
    return (
      <OnboardingScreen onDone={async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        setOnboardingDone(true);
      }} />
    );
  }

  // 로그인 됐으면 홈(탭 네비게이터), 아니면 로그인/회원가입
  return user ? <TabNavigator /> : <AuthNavigator />;
}

export default function App() {
  useEffect(() => {
    requestNotificationPermission().then(granted => {
      if (granted) promptExactAlarmIfNeeded();
    });
  }, []);

  const [fontsLoaded] = useFonts({
    'Galmuri11': require('./assets/fonts/Galmuri11.ttf'),
    'Galmuri11-Bold': require('./assets/fonts/Galmuri11-Bold.ttf'),
    'Galmuri14': require('./assets/fonts/Galmuri14.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </View>
    );
  }

  return (
    // GestureHandlerRootView: @react-navigation/stack 에서 필요
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" backgroundColor="transparent" translucent />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
