import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, Modal,
  SafeAreaView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, fontFamily, spacing, radius } from '../theme';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import ProgressBar from '../components/ProgressBar';
import api from '../api';
import { getCharacterImage } from '../constants/characterImages';

const LEVEL_THRESHOLDS = [0, 100, 220, 360, 520, 700, 900];
const MAX_LEVEL = 7;

function getLevelProgress(exp, level) {
  if (level >= MAX_LEVEL) return 1;
  const current = LEVEL_THRESHOLDS[level - 1];
  const next = LEVEL_THRESHOLDS[level];
  return (exp - current) / (next - current);
}

const XP_INFO = [
  { label: '습관 완료', xp: '+10 XP' },
  { label: '모든 습관 완료', xp: '+5 XP' },
  { label: '연속 달성 보너스', xp: '+5 XP' },
];

export default function CharacterScreen() {
  const [active, setActive] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [xpModalVisible, setXpModalVisible] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, listRes] = await Promise.all([
        api.get('/characters/active'),
        api.get('/characters'),
      ]);
      setActive(activeRes.data.character);
      setCharacters(listRes.data.characters);
    } catch {
      // 무시
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleSetActive = async (ucId, name) => {
    if (active?.id === ucId) return;
    Alert.alert('메인 캐릭터 변경', `${name}을(를) 메인 캐릭터로 설정할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '변경', onPress: async () => {
          try {
            await api.patch(`/characters/${ucId}/active`);
            await fetchData();
          } catch {
            Alert.alert('변경에 실패했어요.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="캐릭터" />
        <ActivityIndicator style={styles.loader} color={colors.lavender} />
      </SafeAreaView>
    );
  }

  const expProgress = active
    ? getLevelProgress(active.exp, active.level)
    : 0;
  const expLabel = active?.level >= MAX_LEVEL
    ? '최종 진화 완료!'
    : active
      ? `${active.exp} / ${LEVEL_THRESHOLDS[active.level]} XP`
      : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="캐릭터" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* 메인 캐릭터 */}
        {active && (
          <View style={styles.activeCard}>
            <TouchableOpacity onPress={() => setXpModalVisible(true)} style={styles.infoBtn}>
              <Text style={styles.infoBtnText}>i</Text>
            </TouchableOpacity>
            <Avatar size="lg" image={getCharacterImage(active.name, active.level)} />
            <View style={styles.activeInfo}>
              <View style={styles.activeNameRow}>
                <Text style={styles.activeName}>{active.name}</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>Lv.{active.level}</Text>
                </View>
              </View>
              <ProgressBar value={Math.round(expProgress * 100)} max={100} label={expLabel} />
            </View>
          </View>
        )}

        {/* 보유 캐릭터 목록 */}
        <Text style={styles.sectionTitle}>보유 캐릭터</Text>
        <View style={styles.grid}>
          {characters.map(c => {
            const isActive = c.id === active?.id;
            const image = getCharacterImage(c.name, c.level);
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.charCard, isActive && styles.charCardActive]}
                onPress={() => handleSetActive(c.id, c.name)}
                activeOpacity={0.8}
              >
                <Avatar size="md" image={image} />
                <Text style={styles.charName}>{c.name}</Text>
                <Text style={styles.charLevel}>Lv.{c.level}</Text>
                {isActive && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      <Modal visible={xpModalVisible} transparent animationType="fade" onRequestClose={() => setXpModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setXpModalVisible(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>XP 획득 방법</Text>
            {XP_INFO.map(({ label, xp }) => (
              <View key={label} style={styles.xpRow}>
                <Text style={styles.xpLabel}>{label}</Text>
                <Text style={styles.xpValue}>{xp}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xxl },
  scrollContent: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },

  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  activeInfo: { flex: 1, gap: spacing.sm },
  activeNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  expBarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.textSub,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  infoBtnText: {
    fontSize: typography.xs,
    fontFamily: fontFamily.bold,
    color: colors.textSub,
  },
  activeName: {
    fontSize: typography.lg,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
  },
  levelBadge: {
    backgroundColor: colors.lavenderLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  levelBadgeText: {
    fontSize: typography.xs,
    fontFamily: fontFamily.bold,
    color: colors.lavenderDark,
  },

  sectionTitle: {
    fontSize: typography.sm,
    fontFamily: fontFamily.bold,
    color: colors.textSub,
    paddingHorizontal: spacing.xs,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  charCard: {
    width: '30%',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  charCardActive: {
    borderColor: colors.lavender,
    backgroundColor: colors.lavenderLight,
  },
  charName: {
    fontSize: typography.sm,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
  },
  charLevel: {
    fontSize: typography.xs,
    fontFamily: fontFamily.regular,
    color: colors.textSub,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.lavenderDark,
  },

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
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.md,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  xpLabel: {
    fontSize: typography.md,
    fontFamily: fontFamily.regular,
    color: colors.textMain,
  },
  xpValue: {
    fontSize: typography.md,
    fontFamily: fontFamily.bold,
    color: colors.lavenderDark,
  },
});
