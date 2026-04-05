import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Image, RefreshControl, AppState,
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
import AddHabitModal from './AddHabitModal';
import { rescheduleAllHabits, scheduleHabitNotifications } from '../utils/notifications';

export default function HomeScreen() {
  const [habits, setHabits] = useState([]);
  const [character, setCharacter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchToday = useCallback(async () => {
    setError(false);
    try {
      const [logsRes, charRes, challengeRes] = await Promise.all([
        api.get('/logs/today'),
        api.get('/characters/active'),
        api.get('/challenges'),
      ]);
      setHabits(logsRes.data.logs);
      setCharacter(charRes.data.character);
      rescheduleAllHabits(challengeRes.data.challenges);
    } catch {
      setError(true);
    }
  }, []);

  // 최초 1회 로드
  useEffect(() => { fetchToday(); }, [fetchToday]);

  // 앱이 백그라운드에서 포그라운드로 돌아올 때 날짜 바뀌었으면 새로고침
  const lastDateRef = useRef(new Date().toLocaleDateString());
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        const today = new Date().toLocaleDateString();
        if (today !== lastDateRef.current) {
          lastDateRef.current = today;
          fetchToday();
        }
      }
    });
    return () => sub.remove();
  }, [fetchToday]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchToday();
    } finally {
      setRefreshing(false);
    }
  }, [fetchToday]);

  const handleCheck = useCallback(async (challengeId, isDone) => {
    try {
      if (isDone) {
        await api.post('/logs/uncheck', { challenge_id: challengeId });
        setHabits(prev =>
          prev.map(h => h.challenge_id === challengeId ? { ...h, is_done: false } : h)
        );
      } else {
        await api.post('/logs/checkin', { challenge_id: challengeId });
        setHabits(prev =>
          prev.map(h => h.challenge_id === challengeId ? { ...h, is_done: true } : h)
        );
      }
    } catch (err) {
      if (err.response?.status !== 409) alert('요청에 실패했어요. 다시 시도해줘요.');
    }
  }, []);

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
      <Header title="나날 - 습관트래커" />

      {error ? (
        <View style={styles.center}>
          <EmptyState emoji="😢" message="불러오지 못했어요" sub="네트워크 상태를 확인해줘요">
            <TouchableOpacity style={styles.retryButton} onPress={fetchToday}>
              <Text style={styles.retryText}>새로고침</Text>
            </TouchableOpacity>
          </EmptyState>
        </View>
      ) : (
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
          <View style={styles.characterSection}>
            <Avatar
              size="lg"
              image={character ? getCharacterImage(character.name, character.level) : null}
            />
            <View style={styles.expWrapper}>
              <ProgressBar
                value={doneCount}
                max={habits.length || 1}
                label="오늘의 달성"
                showPercent
              />
            </View>
          </View>

          <View style={styles.habitSection}>
            {sorted.length === 0 ? (
              <EmptyState
                emoji="🌱"
                message="아직 습관이 없어요"
                sub="아래 + 버튼으로 첫 습관을 추가해봐요!"
              />
            ) : (
              sorted.map(habit => (
                <HabitItem key={habit.challenge_id} habit={habit} onCheck={handleCheck} />
              ))
            )}
          </View>
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
    </SafeAreaView>
  );
}

function HabitItem({ habit, onCheck }) {
  const done = !!habit.is_done;
  return (
    <Card withShadow style={done && styles.habitItemDone}>
      <View style={styles.habitItem}>
        <CheckButton done={done} onPress={() => onCheck(habit.challenge_id, done)} size={44} />
        <View style={styles.habitInfo}>
          {habit.habit_time && <Text style={styles.habitTime}>{habit.habit_time}</Text>}
          <Text style={[styles.habitTitle, done && styles.habitTitleDone]}>{habit.title}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  characterSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  expWrapper: { width: '100%' },

  habitSection: {
    paddingHorizontal: spacing.md,
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
    bottom: 80,
    right: spacing.lg,
    elevation: 6,
  },
  fabIcon: { width: 56, height: 56, resizeMode: 'contain' },

  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.lavender,
    borderRadius: radius.md,
  },
  retryText: { fontSize: typography.sm, fontFamily: fontFamily.bold, color: colors.textMain },
});
