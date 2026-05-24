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
import { colors, typography, fontFamily, spacing, radius } from '../theme';
import Input from '../components/Input';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');   // 서버에서 온 에러 메시지
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해줘요.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });
      await login(data.token, data.refreshToken, data.user);
    } catch (err) {
      setError(err.response?.data?.message ?? '로그인에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoArea}>
            <Avatar size="lg" image={require('../../assets/icons/loginicon.png')} />
            <Text style={styles.appName}>나날</Text>
            <Text style={styles.appSub}>매일 조금씩, 새싹이와 함께</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="nanal@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호를 입력해줘요"
              secureTextEntry
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              label="로그인"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>아직 계정이 없어요?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>회원가입</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
            <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>
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
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },

  // 로고
  logoArea: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  appName: {
    fontSize: typography.title,
    fontFamily: fontFamily.title,
    color: colors.textMain,
  },
  appSub: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
  },

  // 폼
  form: {
    gap: spacing.md,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.error,
    textAlign: 'center',
  },

  // 회원가입 링크
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  signupText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
  },
  signupLink: {
    fontSize: typography.sm,
    fontFamily: fontFamily.bold,
    color: colors.lavenderDark,
  },
  forgotRow: {
    alignItems: 'center',
  },
  forgotText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
    textDecorationLine: 'underline',
  },
});
