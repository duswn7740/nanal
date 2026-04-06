import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { requestNotificationPermission, promptExactAlarmIfNeeded } from './src/utils/notifications';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import TabNavigator from './src/navigation/TabNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { colors } from './src/theme';

// 로그인 상태에 따라 보여줄 네비게이터 결정
function RootNavigator() {
  const { user, isLoading } = useAuth();

  // 앱 시작 시 토큰 복원 중이면 로딩 표시
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </View>
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
