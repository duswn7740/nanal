import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, fontFamily, spacing } from '../theme';

/**
 * 데이터가 없을 때 보여주는 빈 상태 컴포넌트
 *
 * 사용 예시:
 *   <EmptyState message="아직 챌린지가 없어요" sub="첫 습관을 만들어볼까요?" />
 *   <EmptyState emoji="🌱" message="새싹이가 기다리고 있어요!" />
 */
export default function EmptyState({ emoji = '🌿', message, sub, children }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {sub && <Text style={styles.sub}>{sub}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: typography.lg,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
    textAlign: 'center',
  },
  sub: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
    textAlign: 'center',
  },
});
