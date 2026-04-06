import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, SafeAreaView,
  TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { colors, typography, fontFamily, spacing } from '../theme';
import Header from '../components/Header';
import HabitForm, { parseHabitTime } from '../components/HabitForm';
import api from '../api';

export default function EditHabitModal({ visible, habit, onClose, onUpdated, onDeleted }) {
  const [loading, setLoading] = useState(false);

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
      alert(err.response?.data?.message ?? '저장에 실패했어요. 다시 시도해줘요.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToday = () => {
    Alert.alert(
      '오늘부터 삭제',
      '오늘부터 이 습관을 하지 않습니다. 과거 기록은 유지돼요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/challenges/${habit.challenge_id}?mode=today`);
              onDeleted(habit.challenge_id);
              onClose();
            } catch {
              alert('삭제에 실패했어요.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      '전체 삭제',
      '과거의 모든 기록이 삭제됩니다. 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전체 삭제', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/challenges/${habit.challenge_id}?mode=all`);
              onDeleted(habit.challenge_id);
              onClose();
            } catch {
              alert('삭제에 실패했어요.');
            }
          },
        },
      ]
    );
  };

  if (!habit) return null;

  return (
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
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  deleteSection: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.sm },
  deleteButton: { paddingVertical: spacing.sm },
  deleteText: { fontSize: typography.sm, fontFamily: fontFamily.regular, color: colors.textSub, textDecorationLine: 'underline' },
  deleteAllText: { color: colors.error },
});
