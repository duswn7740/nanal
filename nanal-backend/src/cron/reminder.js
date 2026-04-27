/**
 * 리마인더 크론 작업
 *
 * KST 19:00 (UTC 10:00), KST 22:00 (UTC 13:00) 두 번 실행
 * 오늘 습관을 하나도 체크하지 않은 유저에게 Expo 푸시 알림 전송
 */

const cron = require('node-cron');
const pool = require('../config/db');
const { getTodayKST } = require('../utils/date');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

function scheduleReminderCron() {
  // KST 19:00 = UTC 10:00
  cron.schedule('0 10 * * *', () => sendReminders('19시'));
  // KST 22:00 = UTC 13:00
  cron.schedule('0 13 * * *', () => sendReminders('22시'));

  console.log('[cron] 리마인더 스케줄 등록 완료 (KST 19:00, 22:00)');
}

async function sendReminders(label) {
  console.log(`[cron] 리마인더(${label}) 시작: ${new Date().toISOString()}`);
  const today = getTodayKST();

  // 오늘 요일 (0=일, 1=월, ... 6=토)
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayDow = kstNow.getDay();

  try {
    // expo_push_token 있고 오늘 활성 습관이 있는데 is_done=true 로그가 하나도 없는 유저
    const [users] = await pool.query(
      `SELECT u.id, u.nickname, u.expo_push_token
       FROM users u
       WHERE u.expo_push_token IS NOT NULL
         AND u.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM challenges c
           WHERE c.user_id = u.id
             AND c.is_active = TRUE
             AND (
               c.repeat_type = 'daily'
               OR (c.repeat_type = 'weekly' AND FIND_IN_SET(?, c.repeat_days))
             )
         )
         AND NOT EXISTS (
           SELECT 1 FROM logs l
           JOIN challenges c ON l.challenge_id = c.id
           WHERE c.user_id = u.id
             AND l.log_date = ?
             AND l.is_done = TRUE
         )`,
      [String(todayDow), today]
    );

    if (users.length === 0) {
      console.log(`[cron] 리마인더(${label}): 발송 대상 없음`);
      return;
    }

    const messages = users
      .filter(u => Expo.isExpoPushToken(u.expo_push_token))
      .map(u => ({
        to: u.expo_push_token,
        title: '나날 🌱',
        body: `${u.nickname}님 습관 할 시간이예요!!`,
        sound: 'default',
      }));

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        console.log(`[cron] 리마인더(${label}) 발송:`, tickets.length, '건');
      } catch (err) {
        console.error(`[cron] 리마인더(${label}) 청크 발송 오류:`, err);
      }
    }
  } catch (err) {
    console.error(`[cron] 리마인더(${label}) 오류:`, err);
  }
}

module.exports = { scheduleReminderCron };
