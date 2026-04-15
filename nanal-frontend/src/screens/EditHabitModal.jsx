import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, SafeAreaView,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import { colors, typography, fontFamily, spacing } from '../theme';
import Header from '../components/Header';
import HabitForm, { parseHabitTime } from '../components/HabitForm';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api';

export default function EditHabitModal({ visible, habit, onClose, onUpdated, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', confirmText: '', onConfirm: null });
  const [alertModal, setAlertModal] = useState({ visible: false, message: '' });

  const showConfirm = (title, message, confirmText, onConfirm) =>
    setConfirmModal({ visible: true, title, message, confirmText, onConfirm });
  const showAlert = (message) => setAlertModal({ visible: true, message });

  // habit이 바뀔 때마다 초기값 재계산
  const initialValues = useMemo(() => {
    if (!habit) return null;
    const parsed = parseHabitTime(habit.habit_time);
    return {
      title: habit.title ?? '',
      repeatType: habit.repeat_type ?? 'daily',
      selectedDays: habit.repeat_days ? habit.repeat_days.split(',').map(Number) : [],
      timeEnabled: !!habit.habit_time,
      ...parsed,
      selectedAlarms: habit.alarm_lead_min ? String(habit.alarm_lead_min).split(',').map(Number) : [],
    };
  }, [habit]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const { data } = await api.put(`/challenges/${habit.challenge_id}`, values);
      onUpdated(data.challenge);
      onClose();
    } catch (err) {
      showAlert(err.response?.data?.message ?? '저장에 실패했어요. 다시 시도해줘요.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToday = () => {
    showConfirm(
      '오늘부터 삭제',
      '오늘부터 이 습관을 하지 않습니다. 과거 기록은 유지돼요.',
      '삭제',
      async () => {
        setConfirmModal(m => ({ ...m, visible: false }));
        try {
          await api.delete(`/challenges/${habit.challenge_id}?mode=today`);
          onDeleted(habit.challenge_id);
          onClose();
        } catch {
          showAlert('삭제에 실패했어요.');
        }
      }
    );
  };

  const handleDeleteAll = () => {
    showConfirm(
      '전체 삭제',
      '과거의 모든 기록이 삭제됩니다. 삭제하시겠습니까?',
      '전체 삭제',
      async () => {
        setConfirmModal(m => ({ ...m, visible: false }));
        try {
          await api.delete(`/challenges/${habit.challenge_id}?mode=all`);
          onDeleted(habit.challenge_id);
          onClose();
        } catch {
          showAlert('삭제에 실패했어요.');
        }
      }
    );
  };

  if (!habit) return null;

  return (
    <>
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <Header title="습관 편집" onBack={onClose} />
        <HabitForm
          key={habit.challenge_id}
          initialValues={initialValues}
          onSubmit={handleSubmit}
          submitLabel="저장하기"
          loading={loading}
          footer={
            <View style={styles.deleteSection}>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteToday}>
                <Text style={styles.deleteText}>오늘부터 삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAll}>
                <Text style={[styles.deleteText, styles.deleteAllText]}>전체 삭제</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>

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
      message={alertModal.message}
      confirmText="확인"
      onConfirm={() => setAlertModal(m => ({ ...m, visible: false }))}
    />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  deleteSection: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.sm },
  deleteButton: { paddingVertical: spacing.sm },
  deleteText: { fontSize: typography.sm, fontFamily: fontFamily.regular, color: colors.textSub, textDecorationLine: 'underline' },
  deleteAllText: { color: colors.error },
});
