import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { colors, typography, fontFamily, spacing, radius } from '../theme';
import Input from './Input';
import Button from './Button';
import WheelPicker from './WheelPicker';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const ALARM_OPTIONS = [
  { label: '정시', value: 0 },
  { label: '5분 전', value: 5 },
  { label: '10분 전', value: 10 },
  { label: '15분 전', value: 15 },
  { label: '30분 전', value: 30 },
  { label: '1시간 전', value: 60 },
];
const PERIODS = ['오전', '오후'];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = ['00', '10', '20', '30', '40', '50'];

export function toHabitTime(period, hourIdx, minuteIdx) {
  let hour = hourIdx + 1;
  if (period === '오전' && hour === 12) hour = 0;
  if (period === '오후' && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, '0')}:${MINUTES[minuteIdx]}`;
}

export function parseHabitTime(habitTime) {
  if (!habitTime) return { periodIdx: 0, hourIdx: 6, minuteIdx: 0 };
  const [h, m] = habitTime.split(':').map(Number);
  const isPM = h >= 12;
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  const minuteIdx = MINUTES.indexOf(String(m).padStart(2, '0'));
  return { periodIdx: isPM ? 1 : 0, hourIdx: hour12 - 1, minuteIdx: minuteIdx >= 0 ? minuteIdx : 0 };
}

// initialValues: { title, repeatType, selectedDays, timeEnabled, periodIdx, hourIdx, minuteIdx, selectedAlarms }
// onSubmit(values) → caller handles API call
// footer: optional JSX rendered below the submit button
export default function HabitForm({ initialValues, onSubmit, submitLabel, loading, footer }) {
  const [title, setTitle] = useState('');
  const [repeatType, setRepeatType] = useState('daily');
  const [selectedDays, setSelectedDays] = useState([]);
  const [timeEnabled, setTimeEnabled] = useState(false);
  const [periodIdx, setPeriodIdx] = useState(0);
  const [hourIdx, setHourIdx] = useState(6);
  const [minuteIdx, setMinuteIdx] = useState(0);
  const [selectedAlarms, setSelectedAlarms] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialValues) return;
    setTitle(initialValues.title ?? '');
    setRepeatType(initialValues.repeatType ?? 'daily');
    setSelectedDays(initialValues.selectedDays ?? []);
    setTimeEnabled(initialValues.timeEnabled ?? false);
    setPeriodIdx(initialValues.periodIdx ?? 0);
    setHourIdx(initialValues.hourIdx ?? 6);
    setMinuteIdx(initialValues.minuteIdx ?? 0);
    setSelectedAlarms(initialValues.selectedAlarms ?? []);
    setError('');
  }, [initialValues]);

  const toggle = (setter) => (val) =>
    setter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const toggleDay = toggle(setSelectedDays);
  const toggleAlarm = toggle(setSelectedAlarms);

  const handleSubmit = () => {
    if (!title.trim()) { setError('제목을 입력해줘요.'); return; }
    if (repeatType === 'weekly' && selectedDays.length === 0) {
      setError('요일을 하나 이상 선택해줘요.'); return;
    }
    setError('');
    const habitTime = timeEnabled ? toHabitTime(PERIODS[periodIdx], hourIdx, minuteIdx) : null;
    onSubmit({
      title: title.trim(),
      repeat_type: repeatType,
      repeat_days: repeatType === 'weekly' ? selectedDays.sort().join(',') : null,
      habit_time: habitTime,
      alarm_lead_min: (timeEnabled && selectedAlarms.length > 0)
        ? selectedAlarms.sort((a, b) => a - b).join(',')
        : null,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <Input
        label="어떤 습관인가요?"
        value={title}
        onChangeText={setTitle}
        placeholder="예: 물 2L 마시기"
        maxLength={50}
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>반복 주기</Text>
        <View style={styles.chipRow}>
          {[{ label: '매일', value: 'daily' }, { label: '매주', value: 'weekly' }].map(opt => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={repeatType === opt.value}
              onPress={() => { setRepeatType(opt.value); setSelectedDays([]); }}
            />
          ))}
        </View>
        {repeatType === 'weekly' && (
          <View style={styles.chipRow}>
            {DAYS.map((day, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.dayChip, selectedDays.includes(idx) && styles.dayChipActive]}
                onPress={() => toggleDay(idx)}
              >
                <Text style={[styles.dayText, selectedDays.includes(idx) && styles.dayTextActive]}>
                  {day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionLabel}>시간 설정</Text>
          <Switch
            value={timeEnabled}
            onValueChange={setTimeEnabled}
            trackColor={{ false: colors.inactive, true: colors.lavender }}
            thumbColor={colors.surface}
          />
        </View>
        {timeEnabled && (
          <View style={styles.pickerRow}>
            <WheelPicker items={PERIODS} selectedIndex={periodIdx} onSelect={setPeriodIdx} width={70} />
            <Text style={styles.pickerSep}>:</Text>
            <WheelPicker items={HOURS} selectedIndex={hourIdx} onSelect={setHourIdx} width={64} />
            <Text style={styles.pickerSep}>:</Text>
            <WheelPicker items={MINUTES} selectedIndex={minuteIdx} onSelect={setMinuteIdx} width={64} />
          </View>
        )}
      </View>

      {timeEnabled && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>알람 (중복 선택 가능)</Text>
          <View style={styles.alarmList}>
            {ALARM_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.alarmRow}
                onPress={() => toggleAlarm(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.alarmLabel}>{opt.label}</Text>
                <View style={[styles.alarmCheck, selectedAlarms.includes(opt.value) && styles.alarmCheckActive]}>
                  {selectedAlarms.includes(opt.value) && (
                    <Text style={styles.alarmCheckMark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button label={submitLabel} onPress={handleSubmit} loading={loading} style={styles.submitButton} />

      {footer}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionLabel: { fontSize: typography.sm, fontFamily: fontFamily.regular, color: colors.textMain },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.lavender, backgroundColor: colors.lavenderLight },
  chipText: { fontSize: typography.sm, fontFamily: fontFamily.regular, color: colors.textSub },
  chipTextActive: { color: colors.lavenderDark, fontFamily: fontFamily.bold },
  dayChip: {
    width: 38, height: 38, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  dayChipActive: { borderColor: colors.rose, backgroundColor: colors.roseLight },
  dayText: { fontSize: typography.sm, fontFamily: fontFamily.regular, color: colors.textSub },
  dayTextActive: { color: colors.roseDark, fontFamily: fontFamily.bold },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    paddingVertical: spacing.sm, gap: spacing.xs,
  },
  pickerSep: { fontSize: typography.xl, fontFamily: fontFamily.bold, color: colors.textSub, marginBottom: 4 },
  alarmList: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border, overflow: 'hidden',
  },
  alarmRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  alarmLabel: { fontSize: typography.md, fontFamily: fontFamily.regular, color: colors.textMain },
  alarmCheck: {
    width: 24, height: 24, borderRadius: radius.sm,
    borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  alarmCheckActive: { borderColor: colors.lavenderDark, backgroundColor: colors.lavender },
  alarmCheckMark: { fontSize: typography.sm, fontFamily: fontFamily.bold, color: colors.surface },
  errorText: { fontSize: typography.sm, fontFamily: fontFamily.regular, color: colors.error, textAlign: 'center' },
  submitButton: { marginTop: spacing.sm },
});
