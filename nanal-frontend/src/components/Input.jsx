import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, typography, fontFamily, radius, spacing } from '../theme';

/**
 * 공통 입력 컴포넌트
 *
 * 사용 예시:
 *   <Input label="이메일" value={email} onChangeText={setEmail} placeholder="nanal@example.com" />
 *   <Input label="비밀번호" value={pw} onChangeText={setPw} secureTextEntry />
 *   <Input label="메모" value={memo} onChangeText={setMemo} multiline />
 *   <Input label="닉네임" value={name} onChangeText={setName} error="이미 사용 중인 닉네임입니다." />
 */
export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  error,
  style,
  ...rest
}) {
  // 포커스 여부에 따라 테두리 색상 변경
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}

      <TextInput
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
          multiline && styles.inputMultiline,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSub}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />

      {/* 에러 메시지 */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },

  label: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textMain,
  },

  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: typography.md,
    fontFamily: fontFamily.regular,
    color: colors.textMain,
  },

  // 포커스 시 테두리를 라벤더로
  inputFocused: {
    borderColor: colors.lavender,
  },

  // 에러 시 테두리를 빨간색으로
  inputError: {
    borderColor: colors.error,
  },

  // 여러 줄 입력 시 높이 확장
  inputMultiline: {
    height: 100,
    paddingTop: spacing.sm,
    textAlignVertical: 'top',  // Android에서 텍스트가 위쪽부터 시작
  },

  errorText: {
    fontSize: typography.xs,
    color: colors.error,
  },
});
