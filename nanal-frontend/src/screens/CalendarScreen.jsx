import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, Image, Modal, TouchableOpacity,
  SafeAreaView, StyleSheet, ActivityIndicator, Dimensions,
} from 'react-native';
import { colors, typography, fontFamily, spacing, radius } from '../theme';
import Header from '../components/Header';
import MonthNavigator from '../components/MonthNavigator';
import api from '../api';
import { getCalendarCache, setCalendarCache } from '../utils/calendarCache';
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

// 고정 모드: 특정 날짜의 레벨 반환
function getLevelForDate(dateStr, levelHistory) {
  let level = 1;
  for (const h of levelHistory) {
    const d = h.leveled_up_at?.slice?.(0, 10) ?? String(h.leveled_up_at);
    if (d <= dateStr) level = h.level;
    else break;
  }
  return level;
}

// 히스토리 모드: 특정 날짜에 활성이었던 캐릭터+레벨 이미지 반환
function getHistoryImageForDate(dateStr, history, levelHistory) {
  let match = null;
  for (const h of history) {
    const d = h.activated_at?.slice?.(0, 10) ?? String(h.activated_at);
    if (d <= dateStr) match = h;
    else break;
  }
  if (!match) return null;
  // 해당 캐릭터의 그날 레벨 계산
  let level = 1;
  for (const lh of (levelHistory ?? [])) {
    if (lh.character_id !== match.character_id) continue;
    const d = lh.leveled_up_at?.slice?.(0, 10) ?? String(lh.leveled_up_at);
    if (d <= dateStr) level = lh.level;
  }
  return getCharacterImage(match.name, level);
}

function HabitGrass({ title, year, month, calendar, calendarData }) {
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
              let image = null;
              if (done && calendarData) {
                if (calendarData.mode === 'history') {
                  image = getHistoryImageForDate(dateStr, calendarData.history ?? [], calendarData.levelHistory ?? []);
                } else {
                  image = calendarData.character
                    ? getCharacterImage(calendarData.character.name, calendarData.fixedLevel ?? 1)
                    : null;
                }
              }
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
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [charPickerVisible, setCharPickerVisible] = useState(false);
  const [ownedChars, setOwnedChars] = useState([]);

  const fetchData = useCallback(async (y, m) => {
    const cached = getCalendarCache(y, m);
    if (cached) {
      setCalendar(cached.calendar);
      setHabits(cached.habits);
      setCalendarData(cached.calendarData);
      setOwnedChars(cached.ownedChars);
      return;
    }
    setLoading(true);
    try {
      const [calRes, calCharRes, ownedRes] = await Promise.all([
        api.get('/logs/calendar', { params: { year: y, month: m } }),
        api.get('/characters/calendar'),
        api.get('/characters'),
      ]);
      const calData = calRes.data.calendar;
      setCalendar(calData);
      const titleSet = new Set();
      const habitList = [];
      for (const logs of Object.values(calData)) {
        for (const log of logs) {
          if (!titleSet.has(log.title)) {
            titleSet.add(log.title);
            habitList.push({ id: log.challenge_id, title: log.title });
          }
        }
      }
      const ownedList = (ownedRes.data.characters ?? []).filter(c => c.is_purchased || c.is_active);
      setHabits(habitList);
      setCalendarData(calCharRes.data);
      setOwnedChars(ownedList);
      setCalendarCache(y, m, { calendar: calData, habits: habitList, calendarData: calCharRes.data, ownedChars: ownedList });
    } catch {
      setCalendar({});
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth() + 1;
    if (nowYear !== year || nowMonth !== month) {
      setYear(nowYear);
      setMonth(nowMonth);
    } else {
      fetchData(year, month);
    }
  }, [year, month, fetchData]));

  const handleMonthChange = useCallback((y, m) => {
    setYear(y);
    setMonth(m);
  }, []);

  const handleSetHistory = async () => {
    setMenuVisible(false);
    await api.patch('/characters/calendar', { mode: 'history' }).catch(() => {});
    const res = await api.get('/characters/calendar').catch(() => null);
    if (res) setCalendarData(res.data);
  };

  const handleSetFixed = (characterId, level) => async () => {
    setCharPickerVisible(false);
    await api.patch('/characters/calendar', { mode: 'fixed', character_id: characterId, level }).catch(() => {});
    const res = await api.get('/characters/calendar').catch(() => null);
    if (res) setCalendarData(res.data);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="달력"
        right={
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn} activeOpacity={0.6}>
            <Text style={styles.menuDots}>⋮</Text>
          </TouchableOpacity>
        }
      />
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
                  calendarData={calendarData}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
      {/* 점3개 메뉴 */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleSetHistory}>
              <Text style={[styles.menuItemText, calendarData?.mode === 'history' && styles.menuItemActive]}>
                히스토리 아이콘
              </Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setCharPickerVisible(true); }}>
              <Text style={[styles.menuItemText, calendarData?.mode === 'fixed' && styles.menuItemActive]}>
                고정 아이콘
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 고정 아이콘 캐릭터+레벨 선택 */}
      <Modal visible={charPickerVisible} transparent animationType="slide" onRequestClose={() => setCharPickerVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setCharPickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>캐릭터 선택</Text>
            {ownedChars.map(c => {
              const maxLevel = c.level;
              return (
                <View key={c.character_id} style={styles.pickerRow}>
                  <Text style={styles.pickerCharName}>{c.name}</Text>
                  <View style={styles.pickerLevels}>
                    {Array.from({ length: 7 }, (_, i) => i + 1).map(lv => {
                      const available = lv <= maxLevel;
                      const img = available ? getCharacterImage(c.name, lv) : null;
                      return (
                        <TouchableOpacity
                          key={lv}
                          onPress={available ? handleSetFixed(c.character_id, lv) : undefined}
                          disabled={!available}
                          style={[styles.pickerLvCell, !available && styles.pickerLvCellEmpty]}
                        >
                          {img
                            ? <Image source={img} style={styles.pickerLvImage} />
                            : <View style={styles.pickerLvPlaceholder} />
                          }
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  menuBtn: { padding: spacing.xs },
  menuDots: { fontSize: typography.xl, color: colors.textMain, letterSpacing: 1 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 56, paddingRight: spacing.md },
  menuCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden', minWidth: 160 },
  menuItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  menuItemText: { fontSize: typography.md, fontFamily: fontFamily.regular, color: colors.textMain },
  menuItemActive: { fontFamily: fontFamily.bold, color: colors.lavenderDark },
  menuDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  pickerTitle: { fontSize: typography.lg, fontFamily: fontFamily.bold, color: colors.textMain, marginBottom: spacing.xs },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pickerCharName: { fontSize: typography.sm, fontFamily: fontFamily.bold, color: colors.textMain, width: 36 },
  pickerLevels: { flexDirection: 'row', gap: 6, flex: 1 },
  pickerLvCell: { width: 36, height: 36, borderRadius: radius.sm, overflow: 'hidden' },
  pickerLvCellEmpty: { opacity: 0.2 },
  pickerLvImage: { width: 36, height: 36, resizeMode: 'contain' },
  pickerLvPlaceholder: { width: 36, height: 36, backgroundColor: colors.inactive, borderRadius: radius.sm },

  emptyText: {
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    fontSize: typography.sm,
    color: colors.textSub,
    marginTop: spacing.xxl,
  },
});
