import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator,
} from 'react-native';
import { colors, typography, fontFamily, spacing, radius } from '../theme';
import api from '../api';
import { useRewardedAd } from '../hooks/useRewardedAd';

const GIFT_IMAGES = [
  require('../../assets/icons/gift1.png'),
  require('../../assets/icons/gift2.png'),
  require('../../assets/icons/gift3.png'),
  require('../../assets/icons/gift4.png'),
  require('../../assets/icons/gift5.png'),
];

function rewardLabel(reward) {
  if (!reward) return '';
  if (reward.type === 'xp') return `+${reward.amount} XP`;
  return `+${reward.amount} 코인`;
}

// 5개 중 3개 랜덤 선택 + 순서 셔플
function pickBoxes() {
  const indices = [0, 1, 2, 3, 4];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, 3);
}

export default function GiftBoxModal({ visible, onClose, onCoinsUpdated }) {
  const [reward, setReward] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [adUsed, setAdUsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const rewardRef = React.useRef(null);

  const boxes = useMemo(() => pickBoxes(), [visible]);

  const handleAdRewarded = useCallback(async () => {
    if (!rewardRef.current) return;
    try {
      const { data } = await api.post('/box/ad', { reward: rewardRef.current });
      setAdUsed(true);
      onCoinsUpdated?.(data.coins);
    } catch { }
  }, [onCoinsUpdated]);

  const { show: showRewardedAd } = useRewardedAd(handleAdRewarded);

  const handleOpen = async (idx) => {
    if (loading || reward) return;
    setSelectedIdx(idx);
    setLoading(true);
    try {
      const { data } = await api.post('/box/open');
      rewardRef.current = data.reward;
      setReward(data.reward);
      onCoinsUpdated?.(data.coins);
    } catch (err) {
      const msg = err.response?.data?.message ?? '오류가 발생했어요.';
      setReward({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleAd = () => {
    if (loading || adUsed) return;
    const shown = showRewardedAd();
    if (!shown) alert('광고를 불러오는 중이에요. 잠시 후 다시 시도해줘요.');
  };

  const handleClose = () => {
    setReward(null);
    setSelectedIdx(null);
    setAdUsed(false);
    onClose();
  };

  const opened = reward !== null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>오늘의 선물상자 🎁</Text>
          {!opened && <Text style={styles.sub}>상자 하나를 골라보세요!</Text>}

          {/* 상자 3개 */}
          <View style={styles.boxRow}>
            {boxes.map((imgIdx, i) => {
              const isSelected = selectedIdx === i;
              const isDimmed = opened && !isSelected;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleOpen(i)}
                  disabled={opened || loading}
                  activeOpacity={0.75}
                  style={[styles.boxBtn, isDimmed && styles.boxBtnDimmed]}
                >
                  {loading && isSelected
                    ? <ActivityIndicator color={colors.lavenderDark} />
                    : <Image source={GIFT_IMAGES[imgIdx]} style={styles.boxImage} />
                  }
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 보상 결과 */}
          {opened && (
            reward?.type === 'error' ? (
              <Text style={styles.errorText}>{reward.message}</Text>
            ) : (
              <>
                <Text style={styles.rewardText}>{rewardLabel(reward)}</Text>

                {!adUsed ? (
                  <TouchableOpacity style={styles.adButton} onPress={handleAd} activeOpacity={0.8} disabled={loading}>
                    {loading
                      ? <ActivityIndicator color={colors.surface} size="small" />
                      : <Text style={styles.adButtonText}>📺 광고 보고 2배 획득!</Text>
                    }
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.adDoneText}>✓ 광고 보상 획득 완료!</Text>
                )}
              </>
            )
          )}

          {opened
            ? <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>확인</Text>
              </TouchableOpacity>
            : <TouchableOpacity style={styles.closeLink} onPress={handleClose}>
                <Text style={styles.closeLinkText}>나중에</Text>
              </TouchableOpacity>
          }
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
  boxRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginVertical: spacing.md,
  },
  boxBtn: {
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    backgroundColor: colors.lavenderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxBtnDimmed: {
    opacity: 0.3,
  },
  boxImage: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  rewardText: {
    fontSize: typography.xxl,
    fontFamily: fontFamily.bold,
    color: colors.lavenderDark,
  },
  errorText: {
    fontSize: typography.md,
    fontFamily: fontFamily.regular,
    color: colors.error,
    textAlign: 'center',
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
