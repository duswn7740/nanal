import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, fontFamily, radius, spacing } from '../theme';

/**
 * 카테고리 라벨 배지 컴포넌트
 *
 * 사용 예시:
 *   <Badge label="운동" />
 *   <Badge label="독서" variant="rose" />
 *   <Badge label="식습관" variant="neutral" />
 */

const variantStyles = {
  lavender: {
    background: colors.lavenderLight,
    text: colors.lavenderDark,
  },
  rose: {
    background: colors.roseLight,
    text: colors.roseDark,
  },
  neutral: {
    background: colors.inactive,
    text: colors.textSub,
  },
};

// 카테고리별 자동 variant 매핑
const categoryVariant = {
  '운동': 'lavender',
  '독서': 'rose',
  '식습관': 'neutral',
};

export default function Badge({ label, variant }) {
  // variant가 없으면 카테고리 이름으로 자동 결정, 둘 다 없으면 lavender
  const resolvedVariant = variant ?? categoryVariant[label] ?? 'lavender';
  const { background, text } = variantStyles[resolvedVariant];

  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: typography.xs,
    fontFamily: fontFamily.bold,
  },
});
