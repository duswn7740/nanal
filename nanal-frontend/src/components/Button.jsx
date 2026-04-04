import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, typography, fontFamily, radius, spacing } from '../theme';

/**
 * 공통 버튼 컴포넌트
 *
 * variant:
 *   'primary'   - 라벤더 채운 버튼 (메인 액션)
 *   'secondary' - 로즈 채운 버튼 (보조 액션)
 *   'ghost'     - 테두리만 있는 버튼 (취소, 뒤로 등)
 *
 * 사용 예시:
 *   <Button label="체크인" onPress={handleCheckin} />
 *   <Button label="취소" variant="ghost" onPress={handleCancel} />
 *   <Button label="저장 중..." loading />
 */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' ? colors.lavender : colors.textOnPoint}
        />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  // variant 배경
  primary: {
    backgroundColor: colors.lavender,
  },
  secondary: {
    backgroundColor: colors.rose,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.lavender,
  },

  // 비활성
  disabled: {
    opacity: 0.5,
  },

  // variant 텍스트
  label: {
    fontSize: typography.md,
    fontFamily: fontFamily.bold,
  },
  primaryLabel: {
    color: colors.textOnPoint,
  },
  secondaryLabel: {
    color: colors.textOnPoint,
  },
  ghostLabel: {
    color: colors.lavenderDark,
  },
});
