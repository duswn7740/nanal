import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, fontFamily, radius, spacing } from '../theme';

/**
 * 연속 달성일(스트릭) 표시 배지
 *
 * 사용 예시:
 *   <StreakBadge count={7} />           // 🔥 7일
 *   <StreakBadge count={0} />           // 스트릭 없음 (회색)
 *   <StreakBadge count={30} best />     // 역대 최고 표시
 */
export default function StreakBadge({ count = 0, best = false }) {
  const hasStreak = count > 0;

  return (
    <View style={[styles.badge, !hasStreak && styles.badgeInactive]}>
      <Text style={styles.icon}>{hasStreak ? '🔥' : '💤'}</Text>
      <Text style={[styles.count, !hasStreak && styles.countInactive]}>
        {count}일
      </Text>
      {best && (
        <Text style={styles.bestLabel}>최고</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.roseLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },

  badgeInactive: {
    backgroundColor: colors.inactive,
  },

  icon: {
    fontSize: typography.sm,
  },

  count: {
    fontSize: typography.sm,
    fontFamily: fontFamily.bold,
    color: colors.roseDark,
  },

  countInactive: {
    color: colors.textSub,
  },

  bestLabel: {
    fontSize: typography.xs,
    fontFamily: fontFamily.regular,
    color: colors.roseDark,
    marginLeft: spacing.xs,
  },
});
