import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Image, RefreshControl, AppState, Animated, Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, fontFamily, spacing, radius, shadow } from '../theme';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import ProgressBar from '../components/ProgressBar';
import CheckButton from '../components/CheckButton';
import EmptyState from '../components/EmptyState';
import api from '../api';
import { getCharacterImage } from '../constants/characterImages';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import AddHabitModal from './AddHabitModal';
import EditHabitModal from './EditHabitModal';
import GiftBoxModal from './GiftBoxModal';
import { rescheduleAllHabits, scheduleHabitNotifications, cancelHabitNotifications } from '../utils/notifications';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [habits, setHabits] = useState([]);
  const [allChallenges, setAllChallenges] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [character, setCharacter] = useState(null);
  const [coins, setCoins] = useState(0);
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
  const [anySwipeOpen, setAnySwipeOpen] = useState(false);
  const [xpPopup, setXpPopup] = useState(null); // 표시할 XP 텍스트 (예: '+10 XP')
  const xpAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;

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
      setCoins(boxRes.data.coins);
      rescheduleAllHabits(challengeRes.data.challenges);

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

  // XP 획득 시 캐릭터 위에 팝업 텍스트가 올라가며 사라지는 애니메이션
  const showXpPopup = useCallback((xp) => {
    if (!xp || xp <= 0) return;
    setXpPopup(`+${xp} XP`);
    xpAnim.setValue({ x: 0, y: 0 });
    xpOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(xpAnim, {
        toValue: { x: 0, y: -60 },
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(xpOpacity, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start(() => setXpPopup(null));
  }, [xpAnim, xpOpacity]);

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
    setAnySwipeOpen(true);
  }, []);

  const closeCurrentSwipeable = useCallback(() => {
    currentOpenSwipeable.current?.close();
    currentOpenSwipeable.current = null;
    setAnySwipeOpen(false);
  }, []);

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
        Alert.alert(
          '순서 편집 중',
          '변경된 순서를 저장할까요?',
          [
            {
              text: '저장 안 함',
              onPress: () => {
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
            },
            {
              text: '저장',
              onPress: () => {
                originalHabitsRef.current = null;
                setEditMode(false);
              },
            },
          ],
          { cancelable: false }
        );
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
    try {
      if (isDone) {
        await api.post('/logs/uncheck', { challenge_id: challengeId });
        setHabits(prev =>
          prev.map(h => h.challenge_id === challengeId ? { ...h, is_done: false } : h)
        );
      } else {
        const { data } = await api.post('/logs/checkin', { challenge_id: challengeId });
        setHabits(prev =>
          prev.map(h => h.challenge_id === challengeId ? { ...h, is_done: true } : h)
        );
        showXpPopup(data.xpGain);
      }
    } catch (err) {
      if (err.response?.status !== 409) alert('요청에 실패했어요. 다시 시도해줘요.');
    }
  }, [showXpPopup]);

  // 오늘 아닌 습관 (showAll 모드에서 하단에 표시, 체크 불가)
  const nonTodayHabits = useMemo(() => {
    const todayIds = new Set(habits.map(h => h.challenge_id));
    return allChallenges
      .filter(c => !todayIds.has(c.id))
      .map(c => ({ challenge_id: c.id, title: c.title, habit_time: c.habit_time, display_order: c.display_order, is_done: false, isNonToday: true }));
  }, [habits, allChallenges]);

  // 일반/모두보기 모드: 미완료 → 완료 → (오늘 아닌 습관)
  const sorted = useMemo(() => {
    const todayHabits = [...habits].sort((a, b) => {
      if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
      if (!a.habit_time && b.habit_time) return -1;
      if (a.habit_time && !b.habit_time) return 1;
      if (a.habit_time && b.habit_time) return a.habit_time.localeCompare(b.habit_time);
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });
    return showAll ? [...todayHabits, ...nonTodayHabits] : todayHabits;
  }, [habits, nonTodayHabits, showAll]);

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
              <Text style={styles.editModeBtn}>완료</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setHeaderMenuVisible(v => !v)} style={{ padding: spacing.xs }}>
              <Text style={styles.editModeBtn}>⋮</Text>
            </TouchableOpacity>
          )
        }
      />

      {/* 스와이프 열린 상태에서 다른 곳 터치 시 닫기 */}
      {anySwipeOpen && (
        <TouchableOpacity style={styles.swipeOverlay} activeOpacity={1} onPress={closeCurrentSwipeable} />
      )}

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
          <CharacterHeader character={character} doneCount={doneCount} habitsLength={habits.length} xpPopup={xpPopup} xpOpacity={xpOpacity} xpAnim={xpAnim} />
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lavender}
              colors={[colors.lavender]}
            />
          }
        >
          <CharacterHeader character={character} doneCount={doneCount} habitsLength={habits.length} xpPopup={xpPopup} xpOpacity={xpOpacity} xpAnim={xpAnim} />
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
                  onEdit={habit.isNonToday ? undefined : (h) => { setEditTarget(h); setEditModalVisible(true); }}
                  onSwipeOpen={habit.isNonToday ? undefined : handleSwipeOpen}
                  onSwipeClose={habit.isNonToday ? undefined : closeCurrentSwipeable}
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
          setHabits(prev => [...prev, { ...newHabit, is_done: false }]);
          scheduleHabitNotifications(newHabit);
          setModalVisible(false);
        }}
      />

      <GiftBoxModal
        visible={giftBoxVisible}
        onClose={() => setGiftBoxVisible(false)}
        onCoinsUpdated={(newCoins) => setCoins(newCoins)}
      />

      <EditHabitModal
        visible={editModalVisible}
        habit={editTarget}
        onClose={() => { setEditModalVisible(false); setEditTarget(null); }}
        onUpdated={(updated) => {
          setHabits(prev => prev.map(h =>
            h.challenge_id === updated.id ? { ...h, ...updated, challenge_id: updated.id } : h
          ));
          rescheduleAllHabits([updated]);
        }}
        onDeleted={(challengeId) => {
          setHabits(prev => prev.filter(h => h.challenge_id !== challengeId));
          cancelHabitNotifications(challengeId);
        }}
      />
    </SafeAreaView>
  );
}

function CharacterHeader({ character, doneCount, habitsLength, xpPopup, xpOpacity, xpAnim }) {
  return (
    <View style={styles.characterSection}>
      <View style={styles.avatarWrapper}>
        {xpPopup && (
          <Animated.Text style={[
            styles.xpPopup,
            { opacity: xpOpacity, transform: xpAnim.getTranslateTransform() },
          ]}>
            {xpPopup}
          </Animated.Text>
        )}
        <Avatar
          size="lg"
          image={character ? getCharacterImage(character.name, character.level) : null}
        />
      </View>
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

function HabitItem({ habit, onCheck, editMode, onEdit, onSwipeOpen, onSwipeClose, drag, isActive, disabled }) {
  const swipeableRef = useRef(null);
  const done = !!habit.is_done;

  if (editMode) {
    return (
      <View style={[styles.habitCard, isActive && styles.habitItemDragging]}>
        <View style={styles.habitCardContent}>
          <CheckButton done={false} size={44} />
          <View style={styles.habitInfo}>
            {habit.habit_time && <Text style={styles.habitTime}>{habit.habit_time}</Text>}
            <Text style={styles.habitTitle}>{habit.title}</Text>
          </View>
          <TouchableOpacity onLongPress={drag} delayLongPress={0} style={styles.dragHandle}>
            <Text style={styles.dragIcon}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.swipeAction}
      onPress={() => {
        swipeableRef.current?.close();
        onEdit(habit);
      }}
    >
      <Image source={require('../../assets/icons/edit.png')} style={styles.swipeActionIcon} />
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={disabled ? undefined : renderRightActions}
      overshootRight={false}
      onSwipeableWillOpen={() => onSwipeOpen?.(swipeableRef.current)}
      onSwipeableClose={() => onSwipeClose?.()}
      containerStyle={[
        styles.habitCard,
        done || disabled ? styles.habitItemDone : null,
      ]}
    >
      <View style={styles.habitCardContent}>
        <CheckButton done={disabled ? false : done} onPress={disabled ? undefined : () => onCheck(habit.challenge_id, done)} size={44} />
        <View style={styles.habitInfo}>
          {habit.habit_time && <Text style={styles.habitTime}>{habit.habit_time}</Text>}
          <Text style={[styles.habitTitle, (done && !disabled) && styles.habitTitleDone]}>{habit.title}</Text>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  editModeBtn: { fontSize: typography.sm, fontFamily: fontFamily.regular, color: colors.textSub },

  characterSection: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpPopup: {
    position: 'absolute',
    top: -28,
    fontSize: typography.lg,
    fontFamily: fontFamily.bold,
    color: colors.lavenderDark,
    zIndex: 10,
  },
  expWrapper: { alignSelf: 'stretch' },

  habitSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
    gap: spacing.sm,
  },

  habitCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.sm,
  },
  habitCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  habitItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  habitItemDone: { opacity: 0.5 },
  habitInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  habitTime: { fontSize: typography.sm, fontFamily: fontFamily.bold, color: colors.lavenderDark },
  habitTitle: { fontSize: typography.md, fontFamily: fontFamily.regular, color: colors.textMain, flex: 1 },
  habitTitleDone: { textDecorationLine: 'line-through', color: colors.textSub },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: spacing.lg,
    elevation: 6,
  },
  fabIcon: { width: 56, height: 56, resizeMode: 'contain' },

  dragHandle: { padding: spacing.sm, justifyContent: 'center', alignItems: 'center' },
  dragIcon: { fontSize: typography.lg, color: colors.textSub },
  habitItemDragging: {
    opacity: 0.8,
    elevation: 8,
  },
  draggableList: { flex: 1 },

  swipeOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 10,
  },
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

  swipeAction: {
    width: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lavenderLight,
  },
  swipeActionIcon: { width: 32, height: 32, resizeMode: 'contain' },

  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lavender,
    borderRadius: radius.md,
  },
  retryText: { fontSize: typography.sm, fontFamily: fontFamily.bold, color: colors.textMain },
});
