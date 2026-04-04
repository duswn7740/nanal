import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, typography, fontFamily, spacing } from '../theme';
import Input from '../components/Input';
import Button from '../components/Button';
import Header from '../components/Header';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function SignupScreen({ navigation }) {
  const { login } = useAuth();

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState({});   // 필드별 에러 메시지
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!nickname.trim()) {
      newErrors.nickname = '닉네임을 입력해줘요.';
    }
    if (!email.trim()) {
      newErrors.email = '이메일을 입력해줘요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '올바른 이메일 형식이 아니에요.';
    }
    if (!password) {
      newErrors.password = '비밀번호를 입력해줘요.';
    } else if (password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 해요.';
    }
    if (password !== passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않아요.';
    }

    return newErrors;
  };

  const handleSignup = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setServerError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/signup', {
        nickname: nickname.trim(),
        email: email.trim(),
        password,
      });
      // 회원가입 성공: 바로 로그인 처리 → 홈으로 이동
      await login(data.token, data.user);
    } catch (err) {
      setServerError(err.response?.data?.message ?? '회원가입에 실패했어요. 다시 시도해줘요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="회원가입" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <Input
              label="닉네임"
              value={nickname}
              onChangeText={setNickname}
              placeholder="새싹이와 함께할 이름을 정해줘요"
              maxLength={20}
              error={errors.nickname}
            />
            <Input
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="nanal@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />
            <Input
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="6자 이상 입력해줘요"
              secureTextEntry
              error={errors.password}
            />
            <Input
              label="비밀번호 확인"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호를 한 번 더 입력해줘요"
              secureTextEntry
              error={errors.passwordConfirm}
            />

            {serverError ? <Text style={styles.errorText}>{serverError}</Text> : null}

            <Button
              label="시작하기"
              onPress={handleSignup}
              loading={loading}
              style={styles.signupButton}
            />
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>이미 계정이 있어요?</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>로그인</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.xl,
  },

  form: {
    gap: spacing.md,
  },
  signupButton: {
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
    textAlign: 'center',
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  loginText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
  },
  loginLink: {
    fontSize: typography.sm,
    fontFamily: fontFamily.bold,
    color: colors.lavenderDark,
  },
});
