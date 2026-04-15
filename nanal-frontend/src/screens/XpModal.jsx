import React, { useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, fontFamily, spacing, radius } from '../theme';

export default function XpModal({ visible, xp, allDone, adDone, onClose, onWatchAd }) {
  // 닫히는 애니메이션 중에 값이 0으로 바뀌지 않도록 마지막 값 유지
  const lastXp = useRef(xp);
  const lastAllDone = useRef(allDone);
  if (visible) {
    lastXp.current = xp;
    lastAllDone.current = allDone;
  }
  const displayXp = lastXp.current;
  const displayAllDone = lastAllDone.current;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <Text style={styles.title}>🎉 경험치 획득!</Text>
          <Text style={styles.amount}>+{displayXp} XP</Text>
          {displayAllDone && (
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusText}>보너스 포함</Text>
            </View>
          )}
          {adDone ? (
            <View style={styles.adDoneBadge}>
              <Text style={styles.adDoneText}>✓ 광고 보상 획득 완료!</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.adBtn} onPress={onWatchAd} activeOpacity={0.8}>
              <Text style={styles.adBtnText}>📺 광고 보고 2배 받기</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>나가기</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.xl, alignItems: 'center', gap: spacing.md,
  },
  title: { fontSize: typography.lg, fontFamily: fontFamily.bold, color: colors.textMain },
  amount: { fontSize: 40, fontFamily: fontFamily.bold, color: colors.lavenderDark },
  bonusBadge: {
    backgroundColor: colors.lavenderLight, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  bonusText: { fontSize: typography.xs, fontFamily: fontFamily.bold, color: colors.lavenderDark },
  adBtn: {
    width: '100%', backgroundColor: colors.lavender,
    borderRadius: radius.lg, paddingVertical: spacing.md,
    alignItems: 'center', marginTop: spacing.sm,
  },
  adBtnText: { fontSize: typography.md, fontFamily: fontFamily.bold, color: colors.surface },
  adDoneBadge: {
    width: '100%', backgroundColor: colors.lavenderLight,
    borderRadius: radius.lg, paddingVertical: spacing.md,
    alignItems: 'center', marginTop: spacing.sm,
  },
  adDoneText: { fontSize: typography.md, fontFamily: fontFamily.bold, color: colors.lavenderDark },
  closeBtn: {
    width: '100%', borderRadius: radius.lg, paddingVertical: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  closeBtnText: { fontSize: typography.md, fontFamily: fontFamily.regular, color: colors.textSub },
});
