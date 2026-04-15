import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { colors, typography, fontFamily, spacing, radius, shadow } from '../theme';
import CheckButton from './CheckButton';

export default function HabitItem({ habit, onCheck, editMode, onEdit, onSwipeOpen, drag, isActive, disabled }) {
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
      onPress={() => { swipeableRef.current?.close(); onEdit(habit); }}
    >
      <Image source={require('../../assets/icons/edit.png')} style={styles.swipeActionIcon} />
    </TouchableOpacity>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      onSwipeableWillOpen={() => onSwipeOpen?.(swipeableRef.current)}
      containerStyle={[styles.habitCard, (done || disabled) && styles.habitItemDone]}
    >
      <View style={styles.habitCardContent}>
        <CheckButton
          done={disabled ? false : done}
          onPress={disabled ? undefined : () => onCheck(habit.challenge_id, done)}
          size={44}
        />
        <View style={styles.habitInfo}>
          {habit.habit_time && <Text style={styles.habitTime}>{habit.habit_time}</Text>}
          <Text style={[styles.habitTitle, (done && !disabled) && styles.habitTitleDone]}>{habit.title}</Text>
        </View>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
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
  habitItemDone: { opacity: 0.5 },
  habitItemDragging: { opacity: 0.8, elevation: 8 },
  habitInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  habitTime: { fontSize: typography.sm, fontFamily: fontFamily.bold, color: colors.lavenderDark },
  habitTitle: { fontSize: typography.md, fontFamily: fontFamily.regular, color: colors.textMain, flex: 1 },
  habitTitleDone: { textDecorationLine: 'line-through', color: colors.textSub },
  dragHandle: { padding: spacing.sm, justifyContent: 'center', alignItems: 'center' },
  dragIcon: { fontSize: typography.lg, color: colors.textSub },
  swipeAction: {
    width: 64,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lavenderLight,
  },
  swipeActionIcon: { width: 32, height: 32, resizeMode: 'contain' },
});
