import React, { useRef, useState } from 'react';
import {
  View, Image, FlatList, TouchableOpacity,
  Text, StyleSheet, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontFamily, typography, spacing, radius } from '../theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  { key: '1', image: require('../../assets/onboarding/onboard01.png') },
  { key: '2', image: require('../../assets/onboarding/onboard02.png') },
  { key: '3', image: require('../../assets/onboarding/onboard03.png') },
];

export default function OnboardingScreen({ onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Image source={item.image} style={styles.image} resizeMode="contain" />
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>

        {currentIndex === SLIDES.length - 1 && (
          <TouchableOpacity style={styles.startBtn} onPress={onDone} activeOpacity={0.8}>
            <Text style={styles.startBtnText}>시작하기</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  slide: { width, height, justifyContent: 'center', alignItems: 'center' },
  image: { width: width, height: height * 0.85 },
  footer: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.lg,
  },
  dots: { flexDirection: 'row', gap: spacing.sm },
  dot: {
    width: 8, height: 8, borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.lavenderDark, width: 20 },
  startBtn: {
    backgroundColor: colors.lavender,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 2,
  },
  startBtnText: {
    fontSize: typography.md,
    fontFamily: fontFamily.bold,
    color: colors.surface,
  },
});
