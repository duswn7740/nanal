import React, { useState } from 'react';
import { Modal, SafeAreaView, StyleSheet } from 'react-native';
import { colors } from '../theme';
import Header from '../components/Header';
import HabitForm from '../components/HabitForm';
import ConfirmModal from '../components/ConfirmModal';
import api from '../api';

const DEFAULT_VALUES = {
  title: '', repeatType: 'daily', selectedDays: [],
  timeEnabled: false, periodIdx: 0, hourIdx: 6, minuteIdx: 0, selectedAlarms: [],
};

export default function AddHabitModal({ visible, onClose, onAdded }) {
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ visible: false, message: '' });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const { data } = await api.post('/challenges', values);
      onAdded(data.challenge);
      onClose();
    } catch (err) {
      setAlertModal({ visible: true, message: err.response?.data?.message ?? '저장에 실패했어요. 다시 시도해줘요.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.safeArea}>
          <Header title="습관 추가" onBack={onClose} />
          <HabitForm
            key={String(visible)}
            initialValues={DEFAULT_VALUES}
            onSubmit={handleSubmit}
            submitLabel="추가하기"
            loading={loading}
          />
        </SafeAreaView>
      </Modal>
      <ConfirmModal
        visible={alertModal.visible}
        message={alertModal.message}
        confirmText="확인"
        onConfirm={() => setAlertModal({ visible: false, message: '' })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
});
