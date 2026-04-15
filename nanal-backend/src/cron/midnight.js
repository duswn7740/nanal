/**
 * 자정 크론 작업 (매일 KST 00:00 = UTC 15:00)
 *
 * 실행 순서:
 *   1. createMissedLogs   - 어제 체크인 안 한 챌린지에 is_done=false 로그 자동 생성
 *   2. resetMissedStreaks  - 미달성 챌린지의 current_streak를 0으로 초기화
 *   3. updateSproutStates - 유저별 새싹이 상태(sprout_state) 업데이트
 *
 * 왜 이렇게 나눠서 실행하나?
 *   각 단계가 명확히 분리되어 있어 특정 단계에서 오류가 나도 원인을 빠르게 찾을 수 있습니다.
 */

const cron = require('node-cron');
const pool = require('../config/db');
const { getYesterdayKST } = require('../utils/date');

/**
 * 크론 스케줄 등록 - app.js에서 호출
 */
function scheduleMidnightCron() {
  // cron 표현식: '분 시 일 월 요일'
  // '0 15 * * *' = 매일 UTC 15:00 = KST 00:00 자정
  cron.schedule('0 15 * * *', async () => {
    console.log(`[cron] 자정 작업 시작: ${new Date().toISOString()}`);
    // yesterday를 한 번만 계산해서 모든 함수에 전달
    // 각 함수 안에서 매번 계산하면 자정 경계에서 날짜가 달라질 수 있음
    const yesterday = getYesterdayKST();
    try {
      await createMissedLogs(yesterday);
      await resetMissedStreaks(yesterday);
      await updateSproutStates(yesterday);
      console.log('[cron] 자정 작업 완료');
    } catch (err) {
      console.error('[cron] 자정 작업 오류:', err);
    }
  });

  console.log('[cron] 자정 스케줄 등록 완료 (매일 KST 00:00)');
}

/**
 * Step 1: 어제 체크인 안 한 활성 챌린지에 is_done=false 로그 자동 생성
 *
 * INSERT IGNORE를 쓰는 이유:
 *   체크인을 완료한 챌린지는 이미 is_done=true 로그가 있습니다.
 *   (challenge_id, log_date) UNIQUE 제약 때문에 중복 삽입이 오류를 내는데,
 *   IGNORE를 붙이면 중복이면 조용히 건너뛰어 완료된 로그를 덮어쓰지 않습니다.
 */
async function createMissedLogs(yesterday) {
  // 어제 요일 (0=일, 1=월, ... 6=토)
  const yesterdayDate = new Date(yesterday + 'T00:00:00+09:00');
  const yesterdayDow = yesterdayDate.getDay();

  const [result] = await pool.query(
    `INSERT IGNORE INTO logs (challenge_id, log_date, is_done)
     SELECT id, ?, FALSE
     FROM challenges
     WHERE is_active = TRUE
       AND (
         repeat_type = 'daily'
         OR (repeat_type = 'weekly' AND FIND_IN_SET(?, repeat_days))
       )`,
    [yesterday, String(yesterdayDow)]
  );
  console.log(`[cron] 미달성 로그 생성: ${result.affectedRows}건`);
}

/**
 * Step 2: 어제 미달성(is_done=false)인 챌린지의 current_streak를 0으로 초기화
 *
 * 연속 달성이 끊겼으므로 streak를 리셋합니다.
 * best_streak는 건드리지 않습니다 - 역대 최고 기록이므로 유지해야 합니다.
 */
async function resetMissedStreaks(yesterday) {
  const [result] = await pool.query(
    `UPDATE challenges c
     JOIN logs l ON l.challenge_id = c.id AND l.log_date = ?
     SET c.current_streak = 0
     WHERE l.is_done = FALSE`,
    [yesterday]
  );
  console.log(`[cron] streak 초기화: ${result.affectedRows}건`);
}

/**
 * Step 3: 유저별 새싹이 상태(sprout_state) 업데이트
 *
 * 어제 하나라도 완료한 챌린지가 있으면 → 0 (건강함, 회복)
 * 하나도 완료 못 했으면 → sprout_state + 1, 최대 4 (사망)
 *
 * 활성 챌린지가 없는 유저는 대상에서 제외합니다.
 * (앱을 쓰지 않는 유저의 상태까지 바꿀 필요는 없습니다.)
 */
async function updateSproutStates(yesterday) {
  const [result] = await pool.query(
    `UPDATE users u
     SET u.sprout_state = CASE
       WHEN EXISTS (
         -- 어제 완료한 챌린지가 하나라도 있는지 확인
         SELECT 1
         FROM logs l
         JOIN challenges c ON l.challenge_id = c.id
         WHERE c.user_id = u.id
           AND l.log_date  = ?
           AND l.is_done   = TRUE
       )
       THEN 0                              -- 달성 → 건강 상태로 회복
       ELSE LEAST(u.sprout_state + 1, 4)  -- 미달성 → 상태 1단계 악화 (최대 4: 사망)
     END
     WHERE EXISTS (
       -- 활성 챌린지가 있는 유저만 처리
       SELECT 1 FROM challenges WHERE user_id = u.id AND is_active = TRUE
     )`,
    [yesterday]
  );
  console.log(`[cron] 새싹이 상태 업데이트: ${result.affectedRows}명`);
}

module.exports = { scheduleMidnightCron };
