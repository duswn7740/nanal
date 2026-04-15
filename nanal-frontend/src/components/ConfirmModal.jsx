import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, fontFamily, spacing, radius } from '../theme';

/**
 * 공통 확인/알림 모달
 *
 * - cancelText 없으면 버튼 1개 (알림용)
 * - cancelText 있으면 버튼 2개 (확인용)
 *
 * 사용 예시:
 *   <ConfirmModal
 *     visible={visible}
 *     title="캐릭터 구매"
 *     message="장미를 5코인으로 구매할까요?"
 *     confirmText="구매"
 *     cancelText="취소"
 *     onConfirm={handleConfirm}
 *     onCancel={() => setVisible(false)}
 *   />
 */
export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = '확인',
  cancelText,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel ?? onConfirm}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel ?? onConfirm}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={[styles.btnRow, !cancelText && styles.btnRowSingle]}>
            {cancelText && (
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel} activeOpacity={0.7}>
                <Text style={[styles.btnText, styles.cancelText]}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={onConfirm} activeOpacity={0.7}>
              <Text style={[styles.btnText, styles.confirmText]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.md,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btnRowSingle: {
    justifyContent: 'center',
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.inactive,
  },
  confirmBtn: {
    backgroundColor: colors.lavender,
  },
  btnText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.bold,
  },
  cancelText: {
    color: colors.textSub,
  },
  confirmText: {
    color: colors.textMain,
  },
});
