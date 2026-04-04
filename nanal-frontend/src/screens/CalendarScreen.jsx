import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, Image,
  SafeAreaView, StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import { colors, typography, fontFamily, spacing, radius } from '../theme';
import Header from '../components/Header';
import MonthNavigator from '../components/MonthNavigator';
import api from '../api';
import { getCharacterImage } from '../constants/characterImages';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = spacing.sm;
const CARD_PADDING = spacing.md * 2;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING - CARD_GAP) / 2;
const CELL_GAP = 3;
const CARD_INNER_PADDING = spacing.sm * 2;
const CELL_SIZE = Math.floor((CARD_WIDTH - CARD_INNER_PADDING - CELL_GAP * 6) / 7);

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

function toDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 특정 날짜에 활성이었던 캐릭터 이미지 반환
// history: [{activated_at, name, level}, ...] activated_at ASC 정렬
function getCharacterImageForDate(dateStr, history, activeCharacter) {
  if (!history || history.length === 0) {
    return activeCharacter ? getCharacterImage(activeCharacter.name, activeCharacter.level) : null;
  }
  // dateStr 이하의 마지막 activated_at 항목
  let match = null;
  for (const h of history) {
    const activatedStr = h.activated_at?.slice(0, 10) ?? h.activated_at;
    if (activatedStr <= dateStr) match = h;
    else break;
  }
  if (!match) return null;
  return getCharacterImage(match.name, match.level);
}

function HabitGrass({ title, year, month, calendar, history, activeCharacter }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);

  const cells = useMemo(() => {
    const arr = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    return arr;
  }, [year, month, firstDow, daysInMonth]);

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [cells]);

  return (
    <View style={styles.habitSection}>
      <Text style={styles.habitTitle}>{title}</Text>
      <View style={styles.grass}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.grassRow}>
            {row.map((day, ci) => {
              if (!day) return <View key={ci} style={styles.cell} />;
              const dateStr = toDateStr(year, month, day);
              const dayLogs = calendar[dateStr] ?? [];
              const done = dayLogs.find(l => l.title === title)?.is_done ?? false;
              const image = done ? getCharacterImageForDate(dateStr, history, activeCharacter) : null;
              return (
                <View key={ci} style={[styles.cell, done ? styles.cellDone : styles.cellEmpty]}>
                  {image && <Image source={image} style={styles.cellImage} />}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function CalendarScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [calendar, setCalendar] = useState({});
  const [habits, setHabits] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeCharacter, setActiveCharacter] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async (y, m) => {
    setLoading(true);
    try {
      const [calRes, charRes, challengeRes, historyRes] = await Promise.all([
        api.get('/logs/calendar', { params: { year: y, month: m } }),
        api.get('/characters/active'),
        api.get('/challenges'),
        api.get('/characters/history'),
      ]);
      setCalendar(calRes.data.calendar);
      setActiveCharacter(charRes.data.character);
      setHabits(challengeRes.data.challenges);
      setHistory(historyRes.data.history);
    } catch {
      setCalendar({});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(year, month); }, [year, month, fetchData]));

  const handleMonthChange = useCallback((y, m) => {
    setYear(y);
    setMonth(m);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="달력" />
      <MonthNavigator year={year} month={month} onChange={handleMonthChange} />

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.lavender} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {habits.length === 0 ? (
            <Text style={styles.emptyText}>아직 습관이 없어요</Text>
          ) : (
            <View style={styles.grid}>
              {habits.map(habit => (
                <HabitGrass
                  key={habit.id}
                  title={habit.title}
                  year={year}
                  month={month}
                  calendar={calendar}
                  history={history}
                  activeCharacter={activeCharacter}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xxl },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },

  habitSection: {
    width: CARD_WIDTH,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  habitTitle: {
    fontSize: typography.xs,
    fontFamily: fontFamily.bold,
    color: colors.textMain,
    marginBottom: 2,
  },

  grass: { gap: CELL_GAP },
  grassRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: radius.sm,
  },
  cellEmpty: {
    backgroundColor: colors.inactive,
  },
  cellDone: {
    backgroundColor: colors.lavenderLight,
  },
  cellImage: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: radius.sm,
    resizeMode: 'cover',
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: typography.sm,
    color: colors.textSub,
    marginTop: spacing.xxl,
  },
});
