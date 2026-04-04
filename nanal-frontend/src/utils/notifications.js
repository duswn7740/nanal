import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// habit_time: "07:30", alarm_lead_min: "0,5,30", repeat_type: "daily"/"weekly", repeat_days: "1,3,5"
export async function scheduleHabitNotifications(habit) {
  await cancelHabitNotifications(habit.id);

  const { id, title, habit_time, alarm_lead_min, repeat_type, repeat_days } = habit;
  if (!habit_time || !alarm_lead_min) return;

  const [h, m] = habit_time.split(':').map(Number);
  const leads = String(alarm_lead_min).split(',').map(Number);
  const dowList = repeat_type === 'weekly' && repeat_days
    ? String(repeat_days).split(',').map(Number)
    : null; // null = 매일

  for (const lead of leads) {
    const totalMin = h * 60 + m - lead;
    const notifHour = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
    const notifMin = ((totalMin % 1440) + 1440) % 1440 % 60;
    const body = lead === 0 ? `${title} 할 시간이에요!` : `${lead}분 후 ${title} 할 시간이에요!`;

    if (dowList) {
      // 주간 반복: 요일별로 각각 스케줄
      for (const dow of dowList) {
        await Notifications.scheduleNotificationAsync({
          identifier: `habit-${id}-${lead}-${dow}`,
          content: { title: '나날이 🌱', body },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: dow + 1, // expo: 1=일, 2=월 ...
            hour: notifHour,
            minute: notifMin,
          },
        });
      }
    } else {
      // 매일 반복
      await Notifications.scheduleNotificationAsync({
        identifier: `habit-${id}-${lead}`,
        content: { title: '나날이 🌱', body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: notifHour,
          minute: notifMin,
        },
      });
    }
  }
}

export async function cancelHabitNotifications(habitId) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter(n => n.identifier.startsWith(`habit-${habitId}-`));
  await Promise.all(toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function rescheduleAllHabits(habits) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Promise.all(habits.map(scheduleHabitNotifications));
}
