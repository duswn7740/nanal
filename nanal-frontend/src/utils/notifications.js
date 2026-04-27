import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

const EXACT_ALARM_PROMPTED_KEY = 'exact_alarm_prompted';

const CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '나날이 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A78BFA',
      sound: true,
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Android 12+(API 31+)에서 정확한 알람 권한 설정을 최초 1회 안내
// 권한이 없으면 알람이 수 분씩 지연될 수 있음
export async function promptExactAlarmIfNeeded() {
  if (Platform.OS !== 'android' || Platform.Version < 31) return;

  const already = await AsyncStorage.getItem(EXACT_ALARM_PROMPTED_KEY);
  if (already) return;

  await AsyncStorage.setItem(EXACT_ALARM_PROMPTED_KEY, 'true');

  Alert.alert(
    '정확한 알람 권한이 필요해요',
    '습관 알림이 정확한 시간에 울리려면 "알람 및 리마인더" 권한을 허용해야 해요.\n\n설정 → 앱 → 나날 → 알람 및 리마인더 → 허용',
    [
      { text: '나중에', style: 'cancel' },
      {
        text: '설정 열기',
        onPress: () => Linking.openSettings(),
      },
    ]
  );
}

// Expo 푸시 토큰을 서버에 등록
export async function registerPushToken() {
  if (!Device.isDevice) return; // 에뮬레이터에서는 푸시 토큰 불가
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: '695a39dd-a1b7-42ea-8b35-694d8c9c9d4b',
    });
    await api.put('/auth/push-token', { token });
  } catch (err) {
    console.warn('registerPushToken 실패:', err);
  }
}

// habit_time: "07:30", alarm_lead_min: "0,5,30", repeat_type: "daily"/"weekly", repeat_days: "1,3,5"
export async function scheduleHabitNotifications(habit, nickname) {
  await cancelHabitNotifications(habit.id);

  const { id, title, habit_time, alarm_lead_min, repeat_type, repeat_days } = habit;
  if (!habit_time || !alarm_lead_min) return;

  const [h, m] = habit_time.split(':').map(Number);
  const leads = String(alarm_lead_min).split(',').map(Number);
  const dowList = repeat_type === 'weekly' && repeat_days
    ? String(repeat_days).split(',').map(Number)
    : null; // null = 매일

  // 모든 알림을 한 번에 병렬 스케줄 (leads * days 만큼 직렬 대기 방지)
  const tasks = [];
  for (const lead of leads) {
    const totalMin = h * 60 + m - lead;
    const notifHour = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
    const notifMin = ((totalMin % 1440) + 1440) % 1440 % 60;
    const prefix = nickname ? `${nickname}님 ` : '';
    const body = lead === 0 ? `${prefix}${title} 할 시간이에요!` : `${prefix}${lead}분 후 ${title} 할 시간이에요!`;

    if (dowList) {
      // 주간 반복: 요일별로 각각 스케줄
      for (const dow of dowList) {
        tasks.push(Notifications.scheduleNotificationAsync({
          identifier: `habit-${id}-${lead}-${dow}`,
          content: { title: '나날 🌱', body, sound: true },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: dow + 1, // expo: 1=일, 2=월 ...
            hour: notifHour,
            minute: notifMin,
            channelId: CHANNEL_ID,
          },
        }));
      }
    } else {
      // 매일 반복
      tasks.push(Notifications.scheduleNotificationAsync({
        identifier: `habit-${id}-${lead}`,
        content: { title: '나날 🌱', body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: notifHour,
          minute: notifMin,
          channelId: CHANNEL_ID,
        },
      }));
    }
  }
  await Promise.all(tasks);
}

export async function cancelHabitNotifications(habitId) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter(n => n.identifier.startsWith(`habit-${habitId}-`));
  await Promise.all(toCancel.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function rescheduleAllHabits(habits, nickname) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Promise.all(habits.map(h => scheduleHabitNotifications(h, nickname)));
}
