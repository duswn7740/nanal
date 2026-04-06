import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Image, RefreshControl, AppState, Animated,
} from 'react-native';
import { colors, typography, fontFamily, spacing, radius } from '../theme';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import ProgressBar from '../components/ProgressBar';
import CheckButton from '../components/CheckButton';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import api from '../api';
import { getCharacterImage } from '../constants/characterImages';
import DraggableFlatList from 'react-native-draggable-flatlist';
import AddHabitModal from './AddHabitModal';
import EditHabitModal from './EditHabitModal';
import GiftBoxModal from './GiftBoxModal';
import { rescheduleAllHabits, scheduleHabitNotifications, cancelHabitNotifications } from '../utils/notifications';

export default function HomeScreen() {
  const [habits, setHabits] = useState([]);
  const [character, setCharacter] = useState(null);
  const [coins, setCoins] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [giftBoxVisible, setGiftBoxVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);         // 편집모드 on/off
  const [editTarget, setEditTarget] = useState(null);       // 편집할 습관
  const [editModalVisible, setEditModalVisible] = useState(false);
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

  // 드래그 완료 시 순서 서버에 저장
  const handleReorder = useCallback(async ({ data }) => {
    const reordered = data.map((h, idx) => ({ ...h, display_order: idx }));
    setHabits(reordered);
    try {
      await api.put('/challenges/reorder', {
        orders: reordered.map(h => ({ id: h.challenge_id, display_order: h.display_order })),
      });
    } catch {
      // 실패해도 로컬 상태는 유지
    }
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

  // 미완료(시간없는것→시간있는것) → 완료 순 정렬
  const sorted = useMemo(() => [...habits].sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1;
    if (!a.habit_time && b.habit_time) return -1;
    if (a.habit_time && !b.habit_time) return 1;
    if (a.habit_time && b.habit_time) return a.habit_time.localeCompare(b.habit_time);
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  }), [habits]);

  const doneCount = useMemo(() => habits.filter(h => h.is_done).length, [habits]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="나날 - 습관트래커"
        right={
          <TouchableOpacity onPress={() => setEditMode(prev => !prev)} style={{ padding: spacing.xs }}>
            <Text style={styles.editModeBtn}>{editMode ? '완료' : '⋮'}</Text>
          </TouchableOpacity>
        }
      />

      {error ? (
        <View style={styles.center}>
          <EmptyState emoji="😢" message="불러오지 못했어요" sub="네트워크 상태를 확인해줘요">
            <TouchableOpacity style={styles.retryButton} onPress={fetchToday}>
              <Text style={styles.retryText}>새로고침</Text>
            </TouchableOpacity>
          </EmptyState>
        </View>
      ) : editMode && sorted.length > 0 ? (
        /* 편집모드: DraggableFlatList, 캐릭터 섹션은 헤더로 */
        <DraggableFlatList
          data={sorted}
          keyExtractor={item => String(item.challenge_id)}
          onDragEnd={handleReorder}
          style={styles.scroll}
          contentContainerStyle={styles.habitSection}
          ListHeaderComponent={<CharacterHeader character={character} doneCount={doneCount} habitsLength={habits.length} xpPopup={xpPopup} xpOpacity={xpOpacity} xpAnim={xpAnim} />}
          renderItem={({ item, drag, isActive }) => (
            <HabitItem
              habit={item}
              onCheck={handleCheck}
              editMode
              onLongPress={() => {
                setEditTarget(item);
                setEditModalVisible(true);
              }}
              drag={drag}
              isActive={isActive}
            />
          )}
        />
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
                <HabitItem key={habit.challenge_id} habit={habit} onCheck={handleCheck} />
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

function HabitItem({ habit, onCheck, editMode, onLongPress, drag, isActive }) {
  const done = !!habit.is_done;
  return (
    <Card withShadow style={[done && !editMode && styles.habitItemDone, isActive && styles.habitItemDragging]}>
      <TouchableOpacity
        onLongPress={editMode ? onLongPress : undefined}
        delayLongPress={300}
        activeOpacity={editMode ? 0.7 : 1}
      >
        <View style={styles.habitItem}>
          {/* 편집모드가 아닐 때만 체크버튼 활성화 */}
          <CheckButton done={done} onPress={editMode ? undefined : () => onCheck(habit.challenge_id, done)} size={44} />
          <View style={styles.habitInfo}>
            {habit.habit_time && <Text style={styles.habitTime}>{habit.habit_time}</Text>}
            <Text style={[styles.habitTitle, done && !editMode && styles.habitTitleDone]}>{habit.title}</Text>
          </View>
          {/* 편집모드일 때 드래그 핸들(삼선) 표시 */}
          {editMode && (
            <TouchableOpacity onPressIn={drag} style={styles.dragHandle}>
              <Text style={styles.dragIcon}>☰</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  editModeBtn: { fontSize: typography.xl, fontFamily: fontFamily.bold, color: colors.textMain },

  characterSection: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  xpPopup: {
    position: 'absolute',
    fontSize: typography.lg,
    fontFamily: fontFamily.bold,
    color: colors.lavenderDark,
    zIndex: 10,
  },
  expWrapper: { width: '100%' },

  habitSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
    gap: spacing.sm,
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

  dragHandle: {
    padding: spacing.sm,
    justifyContent: 'center',
  },
  dragIcon: {
    fontSize: typography.lg,
    color: colors.textSub,
  },
  habitItemDragging: {
    opacity: 0.8,
    elevation: 8,
  },
  draggableList: { flex: 1 },

  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lavender,
    borderRadius: radius.md,
  },
  retryText: { fontSize: typography.sm, fontFamily: fontFamily.bold, color: colors.textMain },
});
