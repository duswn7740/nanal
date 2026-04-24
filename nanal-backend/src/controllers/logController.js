const pool = require('../config/db');
const { getTodayKST, getYesterdayKST, normalizeDateStr } = require('../utils/date');
const { grantExp } = require('../utils/character');

// 캐릭터 해금 조건 체크 후 미보유 캐릭터 자동 지급
async function checkUnlocks(userId, conn) {
  const db = conn || pool;

  // 최대 연속 스트릭
  const [[streakRow]] = await db.query(
    'SELECT MAX(best_streak) AS best FROM challenges WHERE user_id = ?',
    [userId]
  );
  const bestStreak = streakRow.best ?? 0;

  // 총 완료 일수 (중복 날짜 없이)
  const [[doneRow]] = await db.query(
    `SELECT COUNT(DISTINCT l.log_date) AS total
     FROM logs l
     JOIN challenges c ON c.id = l.challenge_id
     WHERE c.user_id = ? AND l.is_done = TRUE`,
    [userId]
  );
  const totalDays = doneRow.total ?? 0;

  // 이미 보유한 character_id 목록
  const [owned] = await db.query(
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
      .map(({ id }) => db.query(
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

  const today = getTodayKST();
  const todayDow = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDay();

  // Step 1, 2: 트랜잭션 전 검증 (읽기 전용)
  let challenge, existing;
  try {
    const [challenges] = await pool.query(
      `SELECT id, current_streak, best_streak
       FROM challenges
       WHERE id = ? AND user_id = ? AND is_active = TRUE`,
      [challenge_id, userId]
    );
    if (challenges.length === 0) {
      return res.status(404).json({ message: '챌린지를 찾을 수 없습니다.' });
    }
    challenge = challenges[0];

    const [existingRows] = await pool.query(
      'SELECT id, is_done, xp_granted FROM logs WHERE challenge_id = ? AND log_date = ?',
      [challenge_id, today]
    );
    if (existingRows.length > 0 && existingRows[0].is_done) {
      return res.status(409).json({ message: '오늘 이미 완료했습니다.' });
    }
    existing = existingRows;
  } catch (err) {
    console.error('checkin error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }

  const doneAt = new Date();
  const alreadyGranted = existing.length > 0 && existing[0].xp_granted;

  // Step 3~7: 트랜잭션으로 묶기
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Step 3: 로그 저장
    if (existing.length > 0) {
      await conn.query(
        'UPDATE logs SET is_done = TRUE, done_at = ?, memo = ? WHERE id = ?',
        [doneAt, memo || null, existing[0].id]
      );
    } else {
      await conn.query(
        'INSERT INTO logs (challenge_id, log_date, is_done, done_at, memo) VALUES (?, ?, TRUE, ?, ?)',
        [challenge_id, today, doneAt, memo || null]
      );
    }

    // Step 4: 스트릭 계산
    const yesterday = getYesterdayKST();
    const [yesterdayLog] = await conn.query(
      'SELECT is_done FROM logs WHERE challenge_id = ? AND log_date = ?',
      [challenge_id, yesterday]
    );
    const continuedStreak = yesterdayLog.length > 0 && yesterdayLog[0].is_done;
    const newStreak = continuedStreak ? challenge.current_streak + 1 : 1;

    await conn.query(
      `UPDATE challenges
       SET current_streak = ?,
           best_streak    = GREATEST(best_streak, ?)
       WHERE id = ?`,
      [newStreak, newStreak, challenge_id]
    );

    // Step 5: 새싹이 상태 회복
    await conn.query('UPDATE users SET sprout_state = 0 WHERE id = ?', [userId]);

    // Step 6: XP 지급
    let xpGain = 0;
    if (!alreadyGranted) {
      const [[userRow]] = await conn.query(
        'SELECT last_checkin_date, last_all_done_date FROM users WHERE id = ?',
        [userId]
      );
      const lastCheckinDate = userRow.last_checkin_date ? normalizeDateStr(userRow.last_checkin_date) : null;
      const lastAllDoneDate = userRow.last_all_done_date ? normalizeDateStr(userRow.last_all_done_date) : null;

      if (lastCheckinDate !== today) {
        xpGain += 10;
        await conn.query('UPDATE users SET last_checkin_date = ? WHERE id = ?', [today, userId]);
      }

      const [[allDoneRow]] = await conn.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(CASE WHEN l.is_done = TRUE THEN 1 END) AS done
         FROM challenges c
         LEFT JOIN logs l ON l.challenge_id = c.id AND l.log_date = ?
         WHERE c.user_id = ? AND c.is_active = TRUE
           AND (c.repeat_type = 'daily' OR FIND_IN_SET(?, c.repeat_days))`,
        [today, userId, todayDow]
      );
      const allDone = allDoneRow.total > 0 && Number(allDoneRow.total) === Number(allDoneRow.done);

      if (allDone && lastAllDoneDate !== today) {
        xpGain += 5;
        await conn.query('UPDATE users SET last_all_done_date = ? WHERE id = ?', [today, userId]);
      }

      if (xpGain > 0) {
        await grantExp(userId, xpGain, conn);
        await checkUnlocks(userId, conn);
      }

      // Step 7: XP 지급 완료 표시
      await conn.query(
        'UPDATE logs SET xp_granted = TRUE WHERE challenge_id = ? AND log_date = ?',
        [challenge_id, today]
      );
    }

    await conn.commit();

    return res.json({
      message: '체크인 성공!',
      log: { challenge_id, log_date: today, is_done: true, done_at: doneAt, memo: memo || null },
      streak: { current: newStreak, best: Math.max(challenge.best_streak, newStreak) },
      xpGain: alreadyGranted ? 0 : xpGain,
    });
  } catch (err) {
    await conn.rollback();
    console.error('checkin error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  } finally {
    conn.release();
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
       WHERE c.user_id = ? AND l.log_date LIKE ? AND l.deleted_at IS NULL
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
      'SELECT id FROM logs WHERE challenge_id = ? AND log_date = ? AND is_done = TRUE',
      [challenge_id, today]
    );
    if (logs.length === 0) {
      return res.status(409).json({ message: '오늘 완료된 기록이 없습니다.' });
    }

    // 체크인 취소: is_done = false (XP는 환수하지 않음, xp_granted 유지 → 재체크인 시 중복 지급 방지)
    await pool.query(
      'UPDATE logs SET is_done = FALSE, done_at = NULL, memo = NULL WHERE id = ?',
      [logs[0].id]
    );

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

// ─────────────────────────────────────────
// POST /api/logs/xp-ad
// 습관 체크인 후 광고 시청 시 해당 XP 2배 지급 (하루 1회)
// ─────────────────────────────────────────
// xpType: 'checkin' (첫 습관 달성) | 'alldone' (모든 습관 완료)
async function xpAd(req, res) {
  const userId = req.user.userId;
  const { xp, xpType } = req.body;

  if (!xp || xp <= 0) {
    return res.status(400).json({ message: 'xp 값이 올바르지 않습니다.' });
  }
  if (!['checkin', 'alldone'].includes(xpType)) {
    return res.status(400).json({ message: 'xpType이 올바르지 않습니다.' });
  }

  const today = getTodayKST();
  const col = xpType === 'checkin' ? 'last_checkin_ad_date' : 'last_alldone_ad_date';

  try {
    const [[userRow]] = await pool.query(
      `SELECT ${col} AS lastAdDate FROM users WHERE id = ?`,
      [userId]
    );
    const lastAdDate = userRow.lastAdDate ? normalizeDateStr(userRow.lastAdDate) : null;

    if (lastAdDate === today) {
      return res.status(409).json({ message: '오늘은 이미 해당 광고 XP 보너스를 받았어요.' });
    }

    await grantExp(userId, xp);
    await pool.query(`UPDATE users SET ${col} = ? WHERE id = ?`, [today, userId]);

    return res.json({ message: '광고 XP 보너스 지급 완료!', bonusXp: xp });
  } catch (err) {
    console.error('xpAd error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

module.exports = { checkin, uncheck, getToday, getCalendar, xpAd };
