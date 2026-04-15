import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, SafeAreaView,
  StyleSheet, Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import ConfirmModal from '../components/ConfirmModal';
import { colors, typography, fontFamily, spacing, radius } from '../theme';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import PolicyModal from './PolicyModal';

function SettingRow({ label, onPress, danger = false }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <Text style={styles.rowArrow}>{'>'}</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, logout, updateUser } = useAuth();
  const [nicknameModal, setNicknameModal] = useState(false);
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [loading, setLoading] = useState(false);
  const [policyType, setPolicyType] = useState(null); // 'terms' | 'privacy' | null
  const [pwModal, setPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', confirmText: '', onConfirm: null });
  const [alertModal, setAlertModal] = useState({ visible: false, title: '', message: '' });

  const showConfirm = (title, message, confirmText, onConfirm) =>
    setConfirmModal({ visible: true, title, message, confirmText, onConfirm });
  const showAlert = (title, message) => setAlertModal({ visible: true, title, message });

  const handleLogout = () => {
    showConfirm('로그아웃', '정말 로그아웃할까요?', '로그아웃', () => {
      setConfirmModal(m => ({ ...m, visible: false }));
      logout();
    });
  };

  const openNicknameModal = () => {
    setNickname(user?.nickname ?? '');
    setNicknameError('');
    setNicknameModal(true);
  };

  const openPwModal = () => {
    setCurrentPw(''); setNewPw(''); setPwError('');
    setPwModal(true);
  };

  const handlePwSubmit = async () => {
    if (!currentPw || !newPw) { setPwError('모두 입력해주세요.'); return; }
    if (newPw.length < 8) { setPwError('새 비밀번호는 8자 이상이어야 해요.'); return; }
    setPwLoading(true);
    try {
      await api.patch('/auth/password', { currentPassword: currentPw, newPassword: newPw });
      setPwModal(false);
      showAlert('완료', '비밀번호가 변경되었어요.');
    } catch (err) {
      setPwError(err.response?.data?.message ?? '변경에 실패했어요.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleNicknameSubmit = async () => {
    if (!nickname.trim()) { setNicknameError('닉네임을 입력해줘요.'); return; }
    setLoading(true);
    try {
      const { data } = await api.patch('/auth/nickname', { nickname });
      updateUser({ nickname: data.nickname });
      setNicknameModal(false);
    } catch (err) {
      setNicknameError(err.response?.data?.message ?? '변경에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="설정" />
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>닉네임</Text>
              <Text style={styles.profileValue}>{user?.nickname}</Text>
            </View>
            <View style={styles.divider} />
            <SettingRow label="닉네임 변경" onPress={openNicknameModal} />
            <View style={styles.divider} />
            <SettingRow label="비밀번호 변경" onPress={openPwModal} />
            <View style={styles.divider} />
            <SettingRow label="로그아웃" onPress={handleLogout} danger />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>정보</Text>
          <View style={styles.card}>
            <SettingRow label="이용약관" onPress={() => setPolicyType('terms')} />
            <View style={styles.divider} />
            <SettingRow label="개인정보처리방침" onPress={() => setPolicyType('privacy')} />
          </View>
        </View>

        <Text style={styles.version}>나날 v1.0.0</Text>

        <TouchableOpacity
          style={styles.withdrawBtn}
          onPress={() => {
            showConfirm('회원탈퇴', '정말 탈퇴할까요?\n모든 기록이 삭제됩니다.', '탈퇴', async () => {
              setConfirmModal(m => ({ ...m, visible: false }));
              try {
                await api.delete('/auth/withdraw');
                logout();
              } catch {
                showAlert('오류', '탈퇴에 실패했어요. 다시 시도해줘요.');
              }
            });
          }}
        >
          <Text style={styles.withdrawText}>회원탈퇴</Text>
        </TouchableOpacity>
      </ScrollView>

      <PolicyModal
        visible={policyType !== null}
        type={policyType}
        onClose={() => setPolicyType(null)}
      />
      <ConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText="취소"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(m => ({ ...m, visible: false }))}
      />
      <ConfirmModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="확인"
        onConfirm={() => setAlertModal(m => ({ ...m, visible: false }))}
      />

      {/* 비밀번호 변경 모달 */}
      <Modal visible={pwModal} transparent animationType="fade" onRequestClose={() => setPwModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>비밀번호 변경</Text>
            <Input value={currentPw} onChangeText={setCurrentPw} placeholder="현재 비밀번호" secureTextEntry autoFocus />
            <Input value={newPw} onChangeText={setNewPw} placeholder="새 비밀번호 (8자 이상)" secureTextEntry />
            {pwError ? <Text style={styles.modalError}>{pwError}</Text> : null}
            <View style={styles.modalButtons}>
              <Button label="취소" variant="ghost" onPress={() => setPwModal(false)} style={styles.modalBtn} />
              <Button label="변경" onPress={handlePwSubmit} loading={pwLoading} style={styles.modalBtn} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 닉네임 변경 모달 */}
      <Modal visible={nicknameModal} transparent animationType="fade" onRequestClose={() => setNicknameModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>닉네임 변경</Text>
            <Input
              value={nickname}
              onChangeText={setNickname}
              placeholder="새 닉네임을 입력해줘요"
              maxLength={20}
              error={nicknameError}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button label="취소" variant="ghost" onPress={() => setNicknameModal(false)} style={styles.modalBtn} />
              <Button label="변경" onPress={handleNicknameSubmit} loading={loading} style={styles.modalBtn} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  section: { paddingHorizontal: spacing.md, paddingTop: spacing.lg, gap: spacing.sm },
  sectionTitle: {
    fontSize: typography.xs,
    fontFamily: fontFamily.bold,
    color: colors.textSub,
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  profileLabel: {
    fontSize: typography.md,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
  },
  profileValue: {
    fontSize: typography.md,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowLabel: {
    fontSize: typography.md,
    fontFamily: fontFamily.regular,
    color: colors.textMain,
  },
  rowLabelDanger: { color: colors.error },
  rowArrow: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
  },

  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },

  version: {
    textAlign: 'center',
    fontSize: typography.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
    marginTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },

  withdrawBtn: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    marginBottom: 10,
  },
  withdrawText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
    opacity: 0.5,
  },

  // 닉네임 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: typography.lg,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
    textAlign: 'center',
  },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
  modalBtn: { flex: 1 },
  modalError: {
    fontSize: typography.sm, fontFamily: fontFamily.regular,
    color: colors.error, textAlign: 'center',
  },
});
