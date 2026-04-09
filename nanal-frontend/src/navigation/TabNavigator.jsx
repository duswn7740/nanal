import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Image, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, fontFamily } from '../theme';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_ID } from '../constants/adIds';

import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import CharacterScreen from '../screens/CharacterScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const TABS = [
  {
    name: 'Home', component: HomeScreen, label: '홈',
    active: require('../../assets/icons/home_active.png'),
    inactive: require('../../assets/icons/home_unactive.png'),
  },
  {
    name: 'Calendar', component: CalendarScreen, label: '달력',
    active: require('../../assets/icons/calendar_active.png'),
    inactive: require('../../assets/icons/calendar_unactive.png'),
  },
  {
    name: 'Character', component: CharacterScreen, label: '캐릭터',
    active: require('../../assets/icons/character_active.png'),
    inactive: require('../../assets/icons/character_unactive.png'),
  },
  {
    name: 'Settings', component: SettingsScreen, label: '설정',
    active: require('../../assets/icons/settings_active.png'),
    inactive: require('../../assets/icons/settings_unactive.png'),
  },
];

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find(t => t.name === route.name);
        return {
          headerShown: false,
          tabBarStyle: [styles.tabBar, { paddingBottom: insets.bottom + 6, height: 56 + insets.bottom }],
          tabBarActiveTintColor: colors.lavenderDark,
          tabBarInactiveTintColor: colors.textSub,
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <Image
              source={focused ? tab.active : tab.inactive}
              style={styles.icon}
              resizeMode="contain"
            />
          ),
        };
      }}
    >
      {TABS.map(tab => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
      <BannerAd
        unitId={BANNER_AD_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  icon: {
    width: 32,
    height: 32,
  },
  label: {
    fontSize: typography.xs,
    fontFamily: fontFamily.regular,
  },
});
