import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, RefreshControl, AppState, BackHandler,
} from 'react-native';
import ConfirmModal from '../components/ConfirmModal';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colors, typography, fontFamily, spacing, radius } from '../theme';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import api from '../api';
import { getCharacterImage } from '../constants/characterImages';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import AddHabitModal from './AddHabitModal';
import EditHabitModal from './EditHabitModal';
import GiftBoxModal from './GiftBoxModal';
import XpModal from './XpModal';
import HabitItem from '../components/HabitItem';
import { rescheduleAllHabits, scheduleHabitNotifications, cancelHabitNotifications, requestNotificationPermission, registerPushToken } from '../utils/notifications';
import { invalidateCalendarCache } from '../utils/calendarCache';
import { useRewardedAd } from '../hooks/useRewardedAd';

export default function HomeScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { user } = useAuth();
  const [habits, setHabits] = useState([]);
  const [allChallenges, setAllChallenges] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [character, setCharacter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [giftBoxVisible, setGiftBoxVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const originalHabitsRef = useRef(null);
  const allChallengesRef = useRef([]);
  const currentOpenSwipeable = useRef(null); // 현재 열린 스와이프 카드
  const [xpModal, setXpModal] = useState(null); // { xp, allDone }
  const [xpAdDone, setXpAdDone] = useState(false);
  const xpModalRef = useRef(null);
  const adContextRef = useRef(null); // 'xp' | { type: 'box', reward, onDone }
  const [alertModal, setAlertModal] = useState({ visible: false, message: '' });
  const [reorderModal, setReorderModal] = useState({ visible: false, onSave: null, onDiscard: null });

  const { show: showRewardedAd } = useRewardedAd(useCallback(async () => {
    const ctx = adContextRef.current;
    if (!ctx) return;

    if (ctx === 'xp') {
      const modal = xpModalRef.current;
      if (!modal) return;
      if (modal.xp >= 10) await api.post('/logs/xp-ad', { xp: 10, xpType: 'checkin' }).catch(() => {});
      if (modal.allDone) await api.post('/logs/xp-ad', { xp: 5, xpType: 'alldone' }).catch(() => {});
      setXpAdDone(true);
    } else if (ctx.type === 'box') {
      ctx.onDone();
    }

    adContextRef.current = null;
  }, []));

  useEffect(() => {
    requestNotificationPermission().then(granted => {
      if (granted) registerPushToken();
    });
  }, []);

  const fetchToday = useCallback(async () => {
    setError(false);
    try {
      const [logsRes, charRes, challengeRes, boxRes] = await Promise.all([
        api.get('/logs/today'),
        api.get('/characters/active'),
        api.get('/challenges'),
        api.get('/box/status'),
      ]);
      setHabits(logsRes.data.logs);
      setAllChallenges(challengeRes.data.challenges.map(c => ({
        ...c,
        habit_time: c.habit_time ? String(c.habit_time).slice(0, 5) : null,
      })));
      setCharacter(charRes.data.character);
      rescheduleAllHabits(challengeRes.data.challenges, user?.nickname);

      // 오늘 아직 상자를 안 열었으면 모달 자동 오픈
      if (!boxRes.data.opened) {
        setGiftBoxVisible(true);
      }
    } catch {
      setError(true);
    }
  }, []);

  // 최초 1회 로드
  useEffect(() => { fetchToday(); }, [fetchToday]);

  // 탭 벗어나면 메뉴 닫기
  useEffect(() => { if (!isFocused) setHeaderMenuVisible(false); }, [isFocused]);

  // 앱이 백그라운드에서 포그라운드로 돌아올 때 날짜 바뀌었으면 새로고침
  // toLocaleDateString 대신 KST 기준 YYYY-MM-DD 포맷 사용 (백엔드와 동일 기준)
  const getTodayKST = useCallback(
    () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10),
    []
  );
  const lastDateRef = useRef(getTodayKST());
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        const today = getTodayKST();
        if (today !== lastDateRef.current) {
          lastDateRef.current = today;
          fetchToday();
        }
      }
    });
    return () => sub.remove();
  }, [fetchToday, getTodayKST]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchToday();
    } finally {
      setRefreshing(false);
    }
  }, [fetchToday]);


  // 편집모드 진입: 전체 습관 순서 스냅샷
  const enterEditMode = useCallback(() => {
    originalHabitsRef.current = allChallenges.map(c => ({ challenge_id: c.id, display_order: c.display_order }));
    setEditMode(true);
    setHeaderMenuVisible(false);
  }, [allChallenges]);

  useEffect(() => { allChallengesRef.current = allChallenges; }, [allChallenges]);

  // 편집모드 정상 종료 (완료 버튼)
  const exitEditMode = useCallback(() => {
    originalHabitsRef.current = null;
    setEditMode(false);
  }, []);

  const handleSwipeOpen = useCallback((ref) => {
    if (currentOpenSwipeable.current && currentOpenSwipeable.current !== ref) {
      currentOpenSwipeable.current.close();
    }
    currentOpenSwipeable.current = ref;
  }, []);

  const closeCurrentSwipeable = useCallback(() => {
    currentOpenSwipeable.current?.close();
    currentOpenSwipeable.current = null;
  }, []);

  // 편집모드일 때 뒤로가기 버튼 → 변경 있으면 저장 여부 확인, 없으면 그냥 종료
  useEffect(() => {
    if (!editMode) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const original = originalHabitsRef.current;
      const current = allChallengesRef.current;
      const hasChanges = original?.some(o => {
        const c = current.find(ch => ch.id === o.challenge_id);
        return c?.display_order !== o.display_order;
      }) ?? false;

      if (!hasChanges) {
        exitEditMode();
        return true;
      }

      setReorderModal({
        visible: true,
        onDiscard: () => {
          setReorderModal(m => ({ ...m, visible: false }));
          if (original) {
            setAllChallenges(prev => prev.map(c => {
              const o = original.find(r => r.challenge_id === c.id);
              return o ? { ...c, display_order: o.display_order } : c;
            }));
            api.put('/challenges/reorder', {
              orders: original.map(r => ({ id: r.challenge_id, display_order: r.display_order })),
            }).catch(() => {});
          }
          originalHabitsRef.current = null;
          setEditMode(false);
        },
        onSave: () => {
          setReorderModal(m => ({ ...m, visible: false }));
          originalHabitsRef.current = null;
          setEditMode(false);
        },
      });
      return true;
    });
    return () => sub.remove();
  }, [editMode, exitEditMode]);

  // 탭 전환 시 열린 스와이프 카드 닫기
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', closeCurrentSwipeable);
    return unsubscribe;
  }, [navigation, closeCurrentSwipeable]);

  // 편집모드일 때 탭 전환 감지: 변경 있으면 저장 여부 물어보기, 없으면 그냥 종료
  useEffect(() => {
    if (!editMode) return;
    const unsubscribe = navigation.addListener('blur', () => {
      const original = originalHabitsRef.current;
      const current = allChallengesRef.current;
      const hasChanges = original?.some(o => {
        const c = current.find(ch => ch.id === o.challenge_id);
        return c?.display_order !== o.display_order;
      }) ?? false;

      if (!hasChanges) {
        originalHabitsRef.current = null;
        setEditMode(false);
        return;
      }

      setTimeout(() => {
        setReorderModal({
          visible: true,
          onDiscard: () => {
            setReorderModal(m => ({ ...m, visible: false }));
            if (original) {
              setAllChallenges(prev => prev.map(c => {
                const o = original.find(r => r.challenge_id === c.id);
                return o ? { ...c, display_order: o.display_order } : c;
              }));
              api.put('/challenges/reorder', {
                orders: original.map(r => ({ id: r.challenge_id, display_order: r.display_order })),
              }).catch(() => {});
            }
            originalHabitsRef.current = null;
            setEditMode(false);
          },
          onSave: () => {
            setReorderModal(m => ({ ...m, visible: false }));
            originalHabitsRef.current = null;
            setEditMode(false);
          },
        });
      }, 50);
    });
    return unsubscribe;
  }, [navigation, editMode]);

  // 드래그 완료 시 순서 서버에 저장
  const handleReorder = useCallback(async ({ data }) => {
    const reordered = data.map((item, idx) => ({ ...item, display_order: idx }));
    const orderMap = Object.fromEntries(reordered.map(h => [h.challenge_id, h.display_order]));
    setAllChallenges(prev => prev.map(c => orderMap[c.id] !== undefined ? { ...c, display_order: orderMap[c.id] } : c));
    try {
      await api.put('/challenges/reorder', {
        orders: reordered.map(h => ({ id: h.challenge_id, display_order: h.display_order })),
      });
    } catch { }
  }, []);

  const handleCheck = useCallback(async (challengeId, isDone) => {
    // 낙관적 업데이트: API 응답 전에 UI 먼저 반영
    setHabits(prev =>
      prev.map(h => h.challenge_id === challengeId ? { ...h, is_done: !isDone } : h)
    );
    try {
      if (isDone) {
        await api.post('/logs/uncheck', { challenge_id: challengeId });
        invalidateCalendarCache();
      } else {
        const { data } = await api.post('/logs/checkin', { challenge_id: challengeId });
        invalidateCalendarCache();
        if (data.xpGain > 0) {
          const modal = { xp: data.xpGain, allDone: data.xpGain >= 15 };
          xpModalRef.current = modal;
          setXpModal(modal);
          // 레벨업 반영을 위해 캐릭터 데이터 갱신
          api.get('/characters/active').then(res => setCharacter(res.data.character)).catch(() => {});
        }
      }
    } catch (err) {
      // 실패 시 원래 상태로 되돌리기
      setHabits(prev =>
        prev.map(h => h.challenge_id === challengeId ? { ...h, is_done: isDone } : h)
      );
      if (err.response?.status !== 409) setAlertModal({ visible: true, message: '요청에 실패했어요. 다시 시도해줘요.' });
    }
  }, []);

  // 오늘 아닌 습관 (showAll 모드에서 하단에 표시, 체크 불가)
  const nonTodayHabits = useMemo(() => {
    const todayIds = new Set(habits.map(h => h.challenge_id));
    return allChallenges
      .filter(c => !todayIds.has(c.id))
      .map(c => ({ challenge_id: c.id, title: c.title, habit_time: c.habit_time, display_order: c.display_order, is_done: false, isNonToday: true, repeat_type: c.repeat_type, repeat_days: c.repeat_days }));
  }, [habits, allChallenges]);

  // 일반/모두보기 모드: 미완료 → 완료 → (오늘 아닌 습관)
  const sorted = useMemo(() => {
    const todayHabits = [...habits].sort((a, b) => {
      if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
      if (!a.habit_time && b.habit_time) return -1;
      if (a.habit_time && !b.habit_time) return 1;
      if (a.habit_time && b.habit_time) return a.habit_time.localeCompare(b.habit_time);
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    }).map(h => {
      const c = allChallenges.find(c => c.id === h.challenge_id);
      return { ...h, repeat_type: c?.repeat_type, repeat_days: c?.repeat_days };
    });
    return showAll ? [...todayHabits, ...nonTodayHabits] : todayHabits;
  }, [habits, nonTodayHabits, showAll, allChallenges]);

  // 편집모드: 전체 습관을 display_order로 정렬
  const editSorted = useMemo(() =>
    [...allChallenges]
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map(c => ({ ...c, challenge_id: c.id }))
  , [allChallenges]);

  const doneCount = useMemo(() => habits.filter(h => h.is_done).length, [habits]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="나날 - 습관트래커"
        right={
          editMode ? (
            <TouchableOpacity onPress={exitEditMode} style={{ padding: spacing.xs }}>
              <Text style={styles.editModeDoneBtn}>완료</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setHeaderMenuVisible(v => !v)} style={{ padding: spacing.xs }}>
              <Text style={styles.editModeBtn}>⋮</Text>
            </TouchableOpacity>
          )
        }
      />


      {/* ⋮ 드롭다운 메뉴 */}
      {headerMenuVisible && (
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setHeaderMenuVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.menuCard, styles.headerMenuCard]}>
            <TouchableOpacity style={styles.menuItem} onPress={enterEditMode}>
              <Text style={styles.menuItemText}>순서 편집하기</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowAll(v => !v); setHeaderMenuVisible(false); }}>
              <Text style={styles.menuItemText}>{showAll ? '오늘 습관 보기' : '모든 습관 보기'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}


      {error ? (
        <View style={styles.center}>
          <EmptyState emoji="😢" message="불러오지 못했어요" sub="네트워크 상태를 확인해줘요">
            <TouchableOpacity style={styles.retryButton} onPress={fetchToday}>
              <Text style={styles.retryText}>새로고침</Text>
            </TouchableOpacity>
          </EmptyState>
        </View>
      ) : editMode && editSorted.length > 0 ? (
        /* 편집모드: CharacterHeader는 FlatList 밖, 드래그 리스트만 FlatList */
        <View style={styles.scroll}>
          <CharacterHeader character={character} doneCount={doneCount} habitsLength={habits.length} />
          <DraggableFlatList
            data={editSorted}
            keyExtractor={item => String(item.challenge_id)}
            onDragEnd={handleReorder}
            contentContainerStyle={styles.habitSection}
            renderItem={({ item, drag, isActive }) => (
              <ScaleDecorator activeScale={1.03}>
                <HabitItem
                  habit={item}
                  onCheck={handleCheck}
                  editMode
                  drag={drag}
                  isActive={isActive}
                />
              </ScaleDecorator>
            )}
          />
        </View>
      ) : (
        /* 일반모드: 단일 ScrollView */
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={closeCurrentSwipeable}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lavender}
              colors={[colors.lavender]}
            />
          }
        >
          <CharacterHeader character={character} doneCount={doneCount} habitsLength={habits.length} />
          {sorted.length === 0 ? (
            <View style={styles.habitSection}>
              <EmptyState
                emoji="🌱"
                message="아직 습관이 없어요"
                sub="아래 + 버튼으로 첫 습관을 추가해봐요!"
              />
            </View>
          ) : (
            <View style={styles.habitSection}>
              {sorted.map(habit => (
                <HabitItem
                  key={habit.challenge_id}
                  habit={habit}
                  onCheck={habit.isNonToday ? undefined : handleCheck}
                  onEdit={(h) => {
                    const full = allChallenges.find(c => c.id === h.challenge_id);
                    setEditTarget({ ...h, ...(full ?? {}) });
                    setEditModalVisible(true);
                  }}
                  onSwipeOpen={handleSwipeOpen}
                  disabled={!!habit.isNonToday}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Image source={require('../../assets/icons/plusbtn.png')} style={styles.fabIcon} />
      </TouchableOpacity>

      <AddHabitModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdded={(newHabit) => {
          setHabits(prev => [...prev, { ...newHabit, challenge_id: newHabit.id, is_done: false }]);
          scheduleHabitNotifications(newHabit, user?.nickname);
          setModalVisible(false);
        }}
      />

      <GiftBoxModal
        visible={giftBoxVisible}
        onClose={() => setGiftBoxVisible(false)}
        onCoinsUpdated={() => {}}
        onWatchAd={async (reward, onDone, onError) => {
          adContextRef.current = { type: 'box', reward, onDone };
          const shown = await showRewardedAd();
          if (!shown) { adContextRef.current = null; onError?.(); }
        }}
      />

      <EditHabitModal
        visible={editModalVisible}
        habit={editTarget}
        onClose={() => { setEditModalVisible(false); setEditTarget(null); }}
        onUpdated={(updated) => {
          setHabits(prev => prev.map(h =>
            h.challenge_id === updated.id ? { ...h, ...updated, challenge_id: updated.id } : h
          ));
          rescheduleAllHabits([updated], user?.nickname);
        }}
        onDeleted={(challengeId) => {
          setHabits(prev => prev.filter(h => h.challenge_id !== challengeId));
          cancelHabitNotifications(challengeId);
        }}
      />

      <XpModal
        visible={!!xpModal}
        xp={xpModal?.xp ?? 0}
        allDone={xpModal?.allDone ?? false}
        adDone={xpAdDone}
        onClose={() => { setXpModal(null); setXpAdDone(false); }}
        onWatchAd={async () => {
          adContextRef.current = 'xp';
          const shown = await showRewardedAd();
          if (!shown) { adContextRef.current = null; setAlertModal({ visible: true, message: '광고를 불러오는 중이에요. 잠시 후 다시 시도해줘요.' }); }
        }}
      />

      <ConfirmModal
        visible={reorderModal.visible}
        title="순서 편집 중"
        message="변경된 순서를 저장할까요?"
        confirmText="저장"
        cancelText="저장 안 함"
        onConfirm={reorderModal.onSave}
        onCancel={reorderModal.onDiscard}
      />
      <ConfirmModal
        visible={alertModal.visible}
        message={alertModal.message}
        confirmText="확인"
        onConfirm={() => setAlertModal({ visible: false, message: '' })}
      />
    </SafeAreaView>
  );
}

function CharacterHeader({ character, doneCount, habitsLength }) {
  return (
    <View style={styles.characterSection}>
      <Avatar
        size="lg"
        image={character ? getCharacterImage(character.name, character.level) : null}
      />
      <View style={styles.expWrapper}>
        <ProgressBar
          value={doneCount}
          max={habitsLength || 1}
          label="오늘의 달성"
          showPercent
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  editModeBtn: { fontSize: typography.xl, color: colors.textMain, letterSpacing: 1 },
  editModeDoneBtn: { fontSize: typography.md, color: colors.textMain},

  characterSection: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  expWrapper: { alignSelf: 'stretch' },

  habitSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
    gap: spacing.sm,
  },


  fab: {
    position: 'absolute',
    bottom: 20,
    right: spacing.lg,
    elevation: 6,
  },
  fabIcon: { width: 56, height: 56, resizeMode: 'contain' },

  draggableList: { flex: 1 },

  menuOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
  },
  menuCard: {
    position: 'absolute', right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    minWidth: 160,
    elevation: 8,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  menuItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuItemText: {
    fontSize: typography.md, fontFamily: fontFamily.regular, color: colors.textMain,
  },
  menuDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  headerMenuCard: { top: 52 },

  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lavender,
    borderRadius: radius.md,
  },
  retryText: { fontSize: typography.sm, fontFamily: fontFamily.bold, color: colors.textMain },

});
