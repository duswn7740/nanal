import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, fontFamily, spacing } from '../theme';

/**
 * 월 이동 네비게이터
 * 통계/달력 화면 상단에 사용
 *
 * 사용 예시:
 *   const [year, setYear] = useState(2026);
 *   const [month, setMonth] = useState(3);
 *
 *   <MonthNavigator year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
 */
export default function MonthNavigator({ year, month, onChange }) {
  const goPrev = useCallback(() => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  }, [year, month, onChange]);

  const goNext = useCallback(() => {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  }, [year, month, onChange]);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={goPrev} style={styles.arrow} activeOpacity={0.6}>
        <Text style={styles.arrowText}>{'<'}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>{year}년 {month}월</Text>

      <TouchableOpacity onPress={goNext} style={styles.arrow} activeOpacity={0.6}>
        <Text style={styles.arrowText}>{'>'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },

  arrow: {
    padding: spacing.sm,
  },

  arrowText: {
    fontSize: typography.lg,
    fontFamily: fontFamily.bold,
    color: colors.lavenderDark,
  },

  label: {
    fontSize: typography.lg,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
    minWidth: 100,
    textAlign: 'center',
  },
});
