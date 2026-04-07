import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Image,
  SafeAreaView, StyleSheet, ActivityIndicator, Alert, Dimensions,
} from 'react-native';

const GRID_PADDING = 16; // spacing.md
const GRID_GAP = 8;      // spacing.sm
const CARD_WIDTH = (Dimensions.get('window').width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;
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
  const [shopChars, setShopChars] = useState([]);   // 전체 캐릭터 (상태 포함)
  const [ownedMap, setOwnedMap] = useState({});      // character_id → { level, exp, uc_id }
  const [coins, setCoins] = useState(0);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState(null);
  const [xpModalVisible, setXpModalVisible] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, shopRes, ownedRes, boxRes] = await Promise.all([
        api.get('/characters/active').catch(() => ({ data: { character: null } })),
        api.get('/shop/characters').catch(() => ({ data: { characters: [] } })),
        api.get('/characters').catch(() => ({ data: { characters: [] } })),
        api.get('/box/status').catch(() => ({ data: { coins: 0 } })),
      ]);
      setActive(activeRes.data.character);
      setShopChars(shopRes.data.characters ?? []);
      setCoins(boxRes.data.coins ?? 0);

      setOwnedMap(Object.fromEntries(
        (ownedRes.data.characters ?? []).map(c => [
          c.character_id,
          { level: c.level, exp: c.exp, uc_id: c.id, is_active: c.is_active },
        ])
      ));
    } catch {
      // 무시
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleSetActive = (ucId, name) => {
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

  const handleBuy = (char) => {
    if (coins < char.price) {
      Alert.alert('코인 부족', `코인이 부족해요.\n필요: ${char.price}개, 보유: ${coins}개`);
      return;
    }
    Alert.alert(
      '캐릭터 구매',
      `${char.name}을(를) ${char.price}코인으로 구매할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '구매', onPress: async () => {
            setBuying(char.id);
            try {
              const { data } = await api.post(`/shop/buy/${char.id}`);
              setCoins(data.coins);
              await fetchData();
            } catch (err) {
              Alert.alert(err.response?.data?.message ?? '구매에 실패했어요.');
            } finally {
              setBuying(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="캐릭터" />
        <ActivityIndicator style={styles.loader} color={colors.lavender} />
      </SafeAreaView>
    );
  }

  const expProgress = active ? getLevelProgress(active.exp, active.level) : 0;
  const expLabel = active?.level >= MAX_LEVEL
    ? '최종 진화 완료!'
    : active
      ? `${active.exp} / ${LEVEL_THRESHOLDS[active.level]} XP`
      : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="캐릭터"
        right={
          <View style={styles.coinBadge}>
            <Image source={require('../../assets/icons/coin.png')} style={styles.coinIcon} />
            <Text style={styles.coinNum}>{coins}</Text>
          </View>
        }
      />
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
              <ProgressBar value={active.exp} max={LEVEL_THRESHOLDS[active.level] ?? active.exp} label={expLabel} hideValue />
            </View>
          </View>
        )}

        {/* 전체 캐릭터 목록 */}
        <Text style={styles.sectionTitle}>캐릭터 도감</Text>
        <View style={styles.grid}>
          {shopChars.map(char => {
            const owned = ownedMap[char.id];
            const isActive = active && owned?.uc_id === active.id;
            // is_active인 캐릭터는 최초 지급이므로 purchased 취급
            const isPurchased = !!char.is_purchased || !!owned?.is_active;
            const isUnlocked = !!char.is_unlocked;
            const level = owned?.level ?? 1;
            const image = getCharacterImage(char.name, level);

            if (!isUnlocked) {
              // 잠금 상태
              return (
                <View key={char.id} style={[styles.charCard, styles.charCardLocked]}>
                  <View style={styles.lockedImageWrapper}>
                    <Avatar size="md" image={image} style={styles.lockedAvatar} />
                    <Text style={styles.lockIcon}>🔒</Text>
                  </View>
                  <Text style={styles.charName}>{char.name}</Text>
                  <Text style={styles.unlockCondition}>{char.unlock_condition}</Text>
                  <View style={styles.priceTag}>
                    <Image source={require('../../assets/icons/coin.png')} style={styles.priceIcon} />
                    <Text style={styles.priceText}>{char.price}</Text>
                  </View>
                </View>
              );
            }

            if (!isPurchased) {
              // 해금됐지만 미구매
              return (
                <TouchableOpacity
                  key={char.id}
                  style={[styles.charCard, styles.charCardUnlocked]}
                  onPress={() => handleBuy(char)}
                  disabled={buying === char.id}
                  activeOpacity={0.8}
                >
                  <Avatar size="md" image={image} />
                  <Text style={styles.charName}>{char.name}</Text>
                  <View style={styles.priceTag}>
                    <Image source={require('../../assets/icons/coin.png')} style={styles.priceIcon} />
                    <Text style={styles.priceText}>{char.price}</Text>
                  </View>
                </TouchableOpacity>
              );
            }

            // 구매 완료 (메인 또는 보유)
            return (
              <TouchableOpacity
                key={char.id}
                style={[styles.charCard, isActive && styles.charCardActive]}
                onPress={() => owned && handleSetActive(owned.uc_id, char.name)}
                activeOpacity={0.8}
              >
                <Avatar size="md" image={image} />
                <Text style={styles.charName}>{char.name}</Text>
                <Text style={styles.charLevel}>Lv.{level}</Text>
                <View style={[styles.ownedBadge, isActive && styles.activeBadge]}>
                  <Text style={[styles.ownedBadgeText, isActive && { color: colors.surface }]}>
                    {isActive ? '메인' : '보유중'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* XP 안내 모달 */}
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

  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lavenderLight,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    gap: 8,
  },
  coinIcon: { width: 16, height: 16, resizeMode: 'contain' },
  coinNum: { fontSize: typography.sm, fontFamily: fontFamily.bold, color: colors.lavenderDark },

  activeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border, padding: spacing.md,
  },
  activeInfo: { flex: 1, gap: spacing.sm },
  activeNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoBtn: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    width: 20, height: 20, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.textSub,
    alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  infoBtnText: { fontSize: typography.xs, fontFamily: fontFamily.bold, color: colors.textSub },
  activeName: { fontSize: typography.lg, fontFamily: fontFamily.bold, color: colors.textMain },
  levelBadge: {
    backgroundColor: colors.lavenderLight, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  levelBadgeText: { fontSize: typography.xs, fontFamily: fontFamily.bold, color: colors.lavenderDark },

  sectionTitle: {
    fontSize: typography.sm, fontFamily: fontFamily.bold, color: colors.textSub,
    paddingHorizontal: spacing.xs,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  charCard: {
    width: CARD_WIDTH, alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border, padding: spacing.sm,
  },
  charCardActive: { borderColor: colors.lavender, backgroundColor: colors.lavenderLight },
  charCardLocked: { opacity: 0.55 },
  charCardUnlocked: { borderColor: colors.rose, borderStyle: 'dashed' },

  lockedImageWrapper: { position: 'relative', alignItems: 'center' },
  lockIcon: { position: 'absolute', bottom: -4, right: -4, fontSize: 14 },

  charName: { fontSize: typography.sm, fontFamily: fontFamily.bold, color: colors.textMain, textAlign: 'center' },
  charLevel: { fontSize: typography.xs, fontFamily: fontFamily.regular, color: colors.textSub },
  unlockCondition: {
    fontSize: typography.xs, fontFamily: fontFamily.regular,
    color: colors.textSub, textAlign: 'center',
  },

  priceTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginTop: 2, opacity: 0.45,
  },
  priceIcon: { width: 13, height: 13, resizeMode: 'contain' },
  priceText: { fontSize: typography.xs, fontFamily: fontFamily.bold, color: colors.textMain },

  ownedBadge: {
    backgroundColor: colors.surface, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  activeBadge: {
    backgroundColor: colors.lavenderDark, borderColor: colors.lavenderDark,
  },
  ownedBadgeText: { fontSize: typography.xs, fontFamily: fontFamily.bold, color: colors.textSub },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', paddingHorizontal: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.md, fontFamily: fontFamily.bold,
    color: colors.textMain, textAlign: 'center', marginBottom: spacing.xs,
  },
  xpRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  xpLabel: { fontSize: typography.md, fontFamily: fontFamily.regular, color: colors.textMain },
  xpValue: { fontSize: typography.md, fontFamily: fontFamily.bold, color: colors.lavenderDark },
});
