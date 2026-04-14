import React, { useState } from 'react';
import {
  View, Text, SafeAreaView, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity,
} from 'react-native';
import { colors, typography, fontFamily, spacing, radius } from '../theme';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import api from '../api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message ?? '오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="비밀번호 찾기" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>임시 비밀번호가 이메일로 발송되었어요.</Text>
              <Text style={styles.successSub}>이메일을 확인하고 로그인 후 비밀번호를 변경해주세요.</Text>
              <Button label="로그인으로 돌아가기" onPress={() => navigation.navigate('Login')} style={styles.btn} />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.desc}>가입한 이메일 주소를 입력하면{'\n'}임시 비밀번호를 보내드려요.</Text>
              <Input
                label="이메일"
                value={email}
                onChangeText={setEmail}
                placeholder="nanal@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Button label="임시 비밀번호 받기" onPress={handleSubmit} loading={loading} style={styles.btn} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.lg },
  form: { gap: spacing.md },
  desc: {
    fontSize: typography.sm, fontFamily: fontFamily.regular,
    color: colors.textSub, lineHeight: 22,
  },
  errorText: {
    fontSize: typography.sm, fontFamily: fontFamily.regular,
    color: colors.error, textAlign: 'center',
  },
  btn: { marginTop: spacing.sm },
  successBox: { gap: spacing.md, alignItems: 'center', paddingTop: spacing.xxl },
  successText: {
    fontSize: typography.md, fontFamily: fontFamily.bold,
    color: colors.textMain, textAlign: 'center',
  },
  successSub: {
    fontSize: typography.sm, fontFamily: fontFamily.regular,
    color: colors.textSub, textAlign: 'center', lineHeight: 22,
  },
});
