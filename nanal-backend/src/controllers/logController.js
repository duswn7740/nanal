const pool = require('../config/db');
const { getTodayKST, getYesterdayKST, normalizeDateStr } = require('../utils/date');
const { grantExp } = require('../utils/character');

// 캐릭터 해금 조건 체크 후 미보유 캐릭터 자동 지급
async function checkUnlocks(userId) {
  // 최대 연속 스트릭
  const [[streakRow]] = await pool.query(
    'SELECT MAX(best_streak) AS best FROM challenges WHERE user_id = ?',
    [userId]
  );
  const bestStreak = streakRow.best ?? 0;

  // 총 완료 일수 (중복 날짜 없이)
  const [[doneRow]] = await pool.query(
    `SELECT COUNT(DISTINCT l.log_date) AS total
     FROM logs l
     JOIN challenges c ON c.id = l.challenge_id
     WHERE c.user_id = ? AND l.is_done = TRUE`,
    [userId]
  );
  const totalDays = doneRow.total ?? 0;

  // 이미 보유한 character_id 목록
  const [owned] = await pool.query(
    'SELECT character_id FROM user_characters WHERE user_id = ?',
    [userId]
  );
  const ownedIds = new Set(owned.map(r => r.character_id));

  const unlocks = [
    { id: 2, condition: bestStreak >= 7 },   // 장미: 7일 연속
    { id: 3, condition: totalDays >= 30 },   // 병아리: 30일 달성
    { id: 4, condition: totalDays >= 50 },   // 토끼: 50일 달성
  ];

  // 해금 조건 만족 + 미보유 캐릭터만 병렬 인서트
  await Promise.all(
    unlocks
      .filter(({ id, condition }) => condition && !ownedIds.has(id))
      .map(({ id }) => pool.query(
        'INSERT INTO user_characters (user_id, character_id, level, exp, is_active) VALUES (?, ?, 1, 0, 0)',
        [userId, id]
      ))
  );
}

// ─────────────────────────────────────────
// POST /api/logs/checkin
// 오늘의 챌린지를 완료로 표시하고 스트릭을 업데이트합니다.
// ─────────────────────────────────────────
async function checkin(req, res) {
  const userId = req.user.userId;
  const { challenge_id, memo } = req.body;

  if (!challenge_id) {
    return res.status(400).json({ message: 'challenge_id는 필수입니다.' });
  }

  const today = getTodayKST(); // KST 기준 오늘 날짜 (ex: '2026-03-27')
  const todayDow = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDay(); // KST 기준 요일 (0=일)

  try {
    // Step 1: 챌린지가 본인 소유이고 활성 상태인지 확인
    // current_streak, best_streak도 함께 가져와 스트릭 계산에 사용
    const [challenges] = await pool.query(
      `SELECT id, current_streak, best_streak
       FROM challenges
       WHERE id = ? AND user_id = ? AND is_active = TRUE`,
      [challenge_id, userId]
    );
    if (challenges.length === 0) {
      return res.status(404).json({ message: '챌린지를 찾을 수 없습니다.' });
    }
    const challenge = challenges[0];

    // Step 2: 오늘 이미 체크인했는지 확인
    const [existing] = await pool.query(
      'SELECT id, is_done, xp_granted FROM logs WHERE challenge_id = ? AND log_date = ?',
      [challenge_id, today]
    );
    if (existing.length > 0 && existing[0].is_done) {
      return res.status(409).json({ message: '오늘 이미 완료했습니다.' });
    }

    const doneAt = new Date(); // 완료 시각은 UTC 그대로 저장 (DB 전략: 저장은 UTC)
    const alreadyGranted = existing.length > 0 && existing[0].xp_granted; // 취소 후 재체크인 시 XP 중복 방지

    // Step 3: 로그 저장
    // 자정 cron이 먼저 실행됐다면 is_done=false 레코드가 이미 있을 수 있음 → UPDATE
    // 아직 cron이 안 돌았다면 레코드가 없음 → INSERT
    if (existing.length > 0) {
      await pool.query(
        'UPDATE logs SET is_done = TRUE, done_at = ?, memo = ? WHERE id = ?',
        [doneAt, memo || null, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO logs (challenge_id, log_date, is_done, done_at, memo) VALUES (?, ?, TRUE, ?, ?)',
        [challenge_id, today, doneAt, memo || null]
      );
    }

    // Step 4: 스트릭(연속 달성일) 계산
    // 어제 로그가 is_done=true면 연속 달성 → streak +1
    // 어제 못 했거나 로그가 없으면 새로 시작 → streak = 1
    const yesterday = getYesterdayKST();
    const [yesterdayLog] = await pool.query(
      'SELECT is_done FROM logs WHERE challenge_id = ? AND log_date = ?',
      [challenge_id, yesterday]
    );
    const continuedStreak = yesterdayLog.length > 0 && yesterdayLog[0].is_done;
    const newStreak = continuedStreak ? challenge.current_streak + 1 : 1;

    // best_streak는 DB에서 GREATEST로 처리해 현재값보다 작아지는 걸 방지
    await pool.query(
      `UPDATE challenges
       SET current_streak = ?,
           best_streak    = GREATEST(best_streak, ?)
       WHERE id = ?`,
      [newStreak, newStreak, challenge_id]
    );

    // Step 5: 달성하면 새싹이 상태를 건강(0)으로 회복
    await pool.query(
      'UPDATE users SET sprout_state = 0 WHERE id = ?',
      [userId]
    );

    // Step 6: XP 지급 (하루 첫 체크인 +10, 연속달성 +5, 전체완료 보너스 +5)
    // 취소 후 재체크인이면 XP 지급 건너뜀
    let xpGain = 0;
    if (!alreadyGranted) {
      // 오늘 이미 다른 습관에서 XP를 받았는지 확인 (하루 첫 체크인에만 +10+연속보너스 지급)
      const [[alreadyXpRow]] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM logs l
         JOIN challenges c ON c.id = l.challenge_id
         WHERE c.user_id = ? AND l.log_date = ? AND l.xp_granted = TRUE AND l.challenge_id != ?`,
        [userId, today, challenge_id]
      );
      const isFirstCheckinToday = alreadyXpRow.cnt === 0;

      if (isFirstCheckinToday) {
        xpGain = 10 + (continuedStreak ? 5 : 0);
      }

      // 오늘 스케줄된 습관 전체 완료 여부 확인 (오늘 요일에 해당하는 습관만 카운트)
      const [[allDoneRow]] = await pool.query(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN l.is_done = TRUE THEN 1 ELSE 0 END) AS done
         FROM challenges c
         LEFT JOIN logs l ON l.challenge_id = c.id AND l.log_date = ?
         WHERE c.user_id = ? AND c.is_active = TRUE
           AND (c.repeat_type = 'daily' OR FIND_IN_SET(?, c.repeat_days))`,
        [today, userId, todayDow]
      );

      const allDone = allDoneRow.total > 0 && allDoneRow.total === allDoneRow.done;

      if (allDone) {
        const [[userRow]] = await pool.query(
          'SELECT last_all_done_date FROM users WHERE id = ?',
          [userId]
        );
        const lastDate = userRow.last_all_done_date
          ? normalizeDateStr(userRow.last_all_done_date)
          : null;

        if (lastDate !== today) {
          xpGain += 5;
          await pool.query('UPDATE users SET last_all_done_date = ? WHERE id = ?', [today, userId]);
        }
      }

      if (xpGain > 0) {
        await grantExp(userId, xpGain);
        await checkUnlocks(userId);
      }

      // XP 지급 완료 표시 + 지급량 저장
      await pool.query(
        'UPDATE logs SET xp_granted = TRUE, xp_amount = ? WHERE challenge_id = ? AND log_date = ?',
        [xpGain, challenge_id, today]
      );
    }

    return res.json({
      message: '체크인 성공!',
      log: { challenge_id, log_date: today, is_done: true, done_at: doneAt, memo: memo || null },
      streak: { current: newStreak, best: Math.max(challenge.best_streak, newStreak) },
      xpGain: alreadyGranted ? 0 : xpGain,
    });
  } catch (err) {
    console.error('checkin error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// ─────────────────────────────────────────
// GET /api/logs/today
// 오늘의 모든 활성 챌린지 + 각 체크인 상태를 반환합니다.
// 홈 화면에서 "오늘 할 일 목록"을 그릴 때 사용합니다.
// ─────────────────────────────────────────
async function getToday(req, res) {
  const userId = req.user.userId;
  const today = getTodayKST();

  try {
    // LEFT JOIN이므로 오늘 아직 체크인 안 한 챌린지도 포함됨
    // → is_done이 null이면 미완료로 해석
    // KST 기준 요일 (0=일, 1=월 ... 6=토) — repeat_days와 동일 기준
    const todayDow = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDay();

    const [rows] = await pool.query(
      `SELECT
         c.id            AS challenge_id,
         c.title,
         c.habit_time,
         c.display_order,
         c.current_streak,
         l.id            AS log_id,
         l.is_done,
         l.done_at,
         l.memo
       FROM challenges c
       LEFT JOIN logs l ON l.challenge_id = c.id AND l.log_date = ?
       WHERE c.user_id = ? AND c.is_active = TRUE
         AND (c.repeat_type = 'daily' OR FIND_IN_SET(?, c.repeat_days))
       ORDER BY c.created_at ASC`,
      [today, userId, todayDow]
    );

    // MariaDB TIME 컬럼은 HH:MM:SS로 반환 → HH:MM으로 정규화
    const logs = rows.map(r => ({
      ...r,
      habit_time: r.habit_time ? String(r.habit_time).slice(0, 5) : null,
    }));

    return res.json({ date: today, logs });
  } catch (err) {
    console.error('getToday error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// ─────────────────────────────────────────
// GET /api/logs/calendar?year=2026&month=3
// 특정 월의 날짜별 달성 현황을 반환합니다.
// 달력 화면에서 날짜마다 완료/미완료 표시를 그릴 때 사용합니다.
// ─────────────────────────────────────────
async function getCalendar(req, res) {
  const userId = req.user.userId;
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ message: 'year, month 쿼리 파라미터가 필요합니다.' });
  }

  // '2026-03' 형식으로 만들어 LIKE 검색에 사용 (월이 한 자리면 앞에 0 붙임)
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

  try {
    const [rows] = await pool.query(
      `SELECT l.log_date, l.challenge_id, l.is_done, c.title, c.category
       FROM logs l
       JOIN challenges c ON l.challenge_id = c.id
       WHERE c.user_id = ? AND l.log_date LIKE ?
       ORDER BY l.log_date ASC`,
      [userId, `${yearMonth}-%`]
    );

    // 날짜를 키로 그룹핑
    // 결과 예시: { '2026-03-01': [{ challenge_id, title, ... }], '2026-03-02': [...] }
    const calendar = {};
    for (const row of rows) {
      const date = normalizeDateStr(row.log_date);

      if (!calendar[date]) calendar[date] = [];
      calendar[date].push({
        challenge_id: row.challenge_id,
        title: row.title,
        category: row.category,
        is_done: Boolean(row.is_done),
      });
    }

    return res.json({ year_month: yearMonth, calendar });
  } catch (err) {
    console.error('getCalendar error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// ─────────────────────────────────────────
// POST /api/logs/uncheck
// 오늘 체크인을 취소합니다. 오늘 날짜만 가능, 지난 날짜는 불가.
// ─────────────────────────────────────────
async function uncheck(req, res) {
  const userId = req.user.userId;
  const { challenge_id } = req.body;

  if (!challenge_id) {
    return res.status(400).json({ message: 'challenge_id는 필수입니다.' });
  }

  const today = getTodayKST();

  try {
    // 본인 소유 + 활성 챌린지 확인
    const [challenges] = await pool.query(
      'SELECT id, current_streak FROM challenges WHERE id = ? AND user_id = ? AND is_active = TRUE',
      [challenge_id, userId]
    );
    if (challenges.length === 0) {
      return res.status(404).json({ message: '챌린지를 찾을 수 없습니다.' });
    }

    // 오늘 완료된 로그 확인
    const [logs] = await pool.query(
      'SELECT id, xp_amount FROM logs WHERE challenge_id = ? AND log_date = ? AND is_done = TRUE',
      [challenge_id, today]
    );
    if (logs.length === 0) {
      return res.status(409).json({ message: '오늘 완료된 기록이 없습니다.' });
    }

    // 체크인 취소: is_done = false, xp 초기화
    await pool.query(
      'UPDATE logs SET is_done = FALSE, done_at = NULL, memo = NULL, xp_granted = FALSE, xp_amount = 0 WHERE id = ?',
      [logs[0].id]
    );

    // XP 환수
    const xpAmount = logs[0].xp_amount ?? 0;
    if (xpAmount > 0) {
      await pool.query(
        `UPDATE user_characters
         SET exp = GREATEST(0, exp - ?)
         WHERE user_id = ? AND is_active = 1 AND is_purchased = TRUE`,
        [xpAmount, userId]
      );
      // 전체완료 보너스 받았을 수 있으니 오늘 날짜 리셋 → 다시 전체완료 시 보너스 재지급 가능
      await pool.query(
        'UPDATE users SET last_all_done_date = NULL WHERE id = ? AND last_all_done_date = ?',
        [userId, today]
      );
    }

    // 스트릭 롤백: 어제 완료 여부에 따라 결정
    const yesterday = getYesterdayKST();
    const [yesterdayLog] = await pool.query(
      'SELECT is_done FROM logs WHERE challenge_id = ? AND log_date = ?',
      [challenge_id, yesterday]
    );
    const yesterdayDone = yesterdayLog.length > 0 && yesterdayLog[0].is_done;
    const restoredStreak = yesterdayDone
      ? Math.max(0, challenges[0].current_streak - 1)
      : 0;

    await pool.query(
      'UPDATE challenges SET current_streak = ? WHERE id = ?',
      [restoredStreak, challenge_id]
    );

    return res.json({ message: '체크인이 취소되었습니다.', streak: { current: restoredStreak } });
  } catch (err) {
    console.error('uncheck error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

module.exports = { checkin, uncheck, getToday, getCalendar };
