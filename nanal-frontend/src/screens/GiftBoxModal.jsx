import React, { useState } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  SafeAreaView, Image, ActivityIndicator,
} from 'react-native';
import { colors, typography, fontFamily, spacing, radius } from '../theme';
import api from '../api';

// 보상 타입별 표시 텍스트
function rewardLabel(reward) {
  if (!reward) return '';
  if (reward.type === 'xp') return `+${reward.amount} XP`;
  return `+${reward.amount} 코인 🪙`;
}

export default function GiftBoxModal({ visible, onClose, onCoinsUpdated }) {
  const [reward, setReward] = useState(null);
  const [adUsed, setAdUsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const opened = reward !== null;

  const handleOpen = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post('/box/open');
      setReward(data.reward);
      onCoinsUpdated?.(data.coins);
    } catch (err) {
      // 이미 열었거나 서버 오류
      const msg = err.response?.data?.message ?? '오류가 발생했어요.';
      setReward({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleAd = async () => {
    if (loading || adUsed) return;
    setLoading(true);
    try {
      // 실제 광고 SDK 연동 시 여기서 광고 시청 완료 후 호출
      const { data } = await api.post('/box/ad', { reward });
      setAdUsed(true);
      onCoinsUpdated?.(data.coins);
    } catch (err) {
      // 이미 광고 보상 받은 경우 등
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // 닫을 때 상태 초기화 (다음 날 다시 열릴 때를 위해)
    setReward(null);
    setAdUsed(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {!opened ? (
            // 상자 열기 전
            <>
              <Text style={styles.title}>오늘의 선물상자 🎁</Text>
              <Text style={styles.sub}>상자를 열어 보상을 받아요!</Text>

              <TouchableOpacity
                style={styles.boxButton}
                onPress={handleOpen}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.lavenderDark} />
                  : <Text style={styles.boxEmoji}>🎁</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeLink} onPress={handleClose}>
                <Text style={styles.closeLinkText}>나중에</Text>
              </TouchableOpacity>
            </>
          ) : (
            // 상자 열고 난 후
            <>
              <Text style={styles.title}>
                {reward?.type === 'error' ? '😢' : '🎉'}
              </Text>
              <Text style={styles.rewardText}>
                {reward?.type === 'error' ? reward.message : rewardLabel(reward)}
              </Text>

              {/* 광고 시청으로 2배 획득 (에러가 아닐 때만) */}
              {reward?.type !== 'error' && !adUsed && (
                <TouchableOpacity
                  style={styles.adButton}
                  onPress={handleAd}
                  activeOpacity={0.8}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color={colors.surface} size="small" />
                    : <Text style={styles.adButtonText}>📺 광고 보고 2배 획득!</Text>
                  }
                </TouchableOpacity>
              )}

              {adUsed && (
                <Text style={styles.adDoneText}>✓ 광고 보상 획득 완료!</Text>
              )}

              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>확인</Text>
              </TouchableOpacity>
            </>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    fontSize: typography.xl,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
  },
  sub: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
  },
  boxButton: {
    width: 100,
    height: 100,
    borderRadius: radius.xl,
    backgroundColor: colors.lavenderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  boxEmoji: {
    fontSize: 52,
  },
  rewardText: {
    fontSize: typography.xxl,
    fontFamily: fontFamily.bold,
    color: colors.lavenderDark,
    marginVertical: spacing.md,
  },
  adButton: {
    backgroundColor: colors.lavenderDark,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  adButtonText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.bold,
    color: colors.surface,
  },
  adDoneText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
  },
  closeButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  closeButtonText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
  },
  closeLink: {
    marginTop: spacing.xs,
  },
  closeLinkText: {
    fontSize: typography.sm,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
  },
});
