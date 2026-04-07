import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, fontFamily, radius, spacing } from '../theme';

/**
 * 경험치/달성률 프로그레스 바
 * 캐릭터 화면의 경험치 바, 통계 화면 달성률 등에 사용
 *
 * 사용 예시:
 *   <ProgressBar value={350} max={520} label="레벨 4" />
 *   <ProgressBar value={75} max={100} showPercent />
 */
export default function ProgressBar({ value = 0, max = 100, label, showPercent = false, hideValue = false }) {
  const ratio = Math.min(Math.max(value / max, 0), 1);
  const percent = Math.round(ratio * 100);

  return (
    <View style={styles.wrapper}>
      {(label || showPercent) && (
        <View style={styles.header}>
          {label && <Text style={styles.label}>{label}</Text>}
          {!hideValue && (
            showPercent
              ? <Text style={styles.value}>{percent}%</Text>
              : <Text style={styles.value}>{value} / {max}</Text>
          )}
        </View>
      )}

      {/* 바 트랙 */}
      <View style={styles.track}>
        {/* width % 방식으로 빈 spacer View 없이 비율 표현 */}
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMain,
  },
  value: {
    fontSize: typography.sm,
    fontFamily: fontFamily.bold,
    color: colors.lavenderDark,
  },
  track: {
    height: 10,
    backgroundColor: colors.inactive,
    borderRadius: radius.full,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.lavender,
    borderRadius: radius.full,
  },
});
