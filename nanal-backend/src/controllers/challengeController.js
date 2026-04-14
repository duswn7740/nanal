const pool = require('../config/db');

const VALID_ALARM_LEADS = [0, 5, 10, 15, 30, 60]; // 0=정시
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// alarm_lead_min: "0,5,30" 형태의 콤마 구분 문자열 검증
function validateAlarmLeads(value) {
  if (value === null || value === undefined) return null;
  const leads = String(value).split(',').map(Number);
  if (leads.some(v => !VALID_ALARM_LEADS.includes(v))) {
    return '알림 설정은 0, 5, 10, 15, 30, 60만 가능합니다.';
  }
  return null;
}

async function verifyOwnership(challengeId, userId) {
  const [rows] = await pool.query(
    'SELECT id FROM challenges WHERE id = ? AND user_id = ?',
    [challengeId, userId]
  );
  return rows.length > 0;
}

function validateRepeat(repeat_type, repeat_days) {
  if (!['daily', 'weekly'].includes(repeat_type)) {
    return '반복 유형은 daily 또는 weekly여야 합니다.';
  }
  if (repeat_type === 'weekly') {
    if (!repeat_days) return '매주 반복은 요일을 선택해야 합니다.';
    const days = repeat_days.split(',').map(Number);
    if (days.some(d => d < 0 || d > 6 || isNaN(d))) {
      return '요일은 0(일)~6(토) 사이 숫자여야 합니다.';
    }
  }
  return null;
}

// GET /api/challenges
async function getChallenges(req, res) {
  const userId = req.user.userId;
  try {
    const [challenges] = await pool.query(
      `SELECT *
       FROM challenges
       WHERE user_id = ? AND is_active = TRUE
       ORDER BY
         habit_time IS NULL DESC,
         display_order ASC,
         habit_time ASC`,
      [userId]
    );
    return res.json({ challenges });
  } catch (err) {
    console.error('getChallenges error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// POST /api/challenges
async function createChallenge(req, res) {
  const userId = req.user.userId;
  const {
    title, habit_time, alarm_lead_min, display_order,
    repeat_type = 'daily', repeat_days = null,
  } = req.body;

  if (!title) return res.status(400).json({ message: '제목은 필수입니다.' });

  if (habit_time && !TIME_REGEX.test(habit_time)) {
    return res.status(400).json({ message: '올바른 시간 형식이 아닙니다. (예: 07:00)' });
  }
  const alarmError = validateAlarmLeads(alarm_lead_min);
  if (alarmError) return res.status(400).json({ message: alarmError });

  const repeatError = validateRepeat(repeat_type, repeat_days);
  if (repeatError) return res.status(400).json({ message: repeatError });

  const startDate = new Date().toISOString().slice(0, 10);

  try {
    const [result] = await pool.query(
      `INSERT INTO challenges
         (user_id, title, started_at, habit_time, alarm_lead_min, display_order, repeat_type, repeat_days)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, title, startDate,
        habit_time || null, alarm_lead_min ?? null, display_order ?? 0,
        repeat_type, repeat_type === 'weekly' ? repeat_days : null,
      ]
    );

    return res.status(201).json({
      message: '챌린지가 생성되었습니다.',
      challenge: {
        id: result.insertId,
        user_id: userId,
        title,
        habit_time: habit_time || null,
        alarm_lead_min: alarm_lead_min ?? null,
        display_order: display_order ?? 0,
        repeat_type,
        repeat_days: repeat_type === 'weekly' ? repeat_days : null,
        current_streak: 0,
        best_streak: 0,
        started_at: startDate,
        is_active: true,
      },
    });
  } catch (err) {
    console.error('createChallenge error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// PUT /api/challenges/:id
async function updateChallenge(req, res) {
  const userId = req.user.userId;
  const challengeId = req.params.id;
  const { title, is_active, habit_time, alarm_lead_min, display_order, repeat_type, repeat_days } = req.body;

  if (habit_time && !TIME_REGEX.test(habit_time)) {
    return res.status(400).json({ message: '올바른 시간 형식이 아닙니다. (예: 07:00)' });
  }
  if (alarm_lead_min !== undefined) {
    const alarmError = validateAlarmLeads(alarm_lead_min);
    if (alarmError) return res.status(400).json({ message: alarmError });
  }
  if (repeat_type) {
    const repeatError = validateRepeat(repeat_type, repeat_days);
    if (repeatError) return res.status(400).json({ message: repeatError });
  }

  try {
    if (!(await verifyOwnership(challengeId, userId))) {
      return res.status(404).json({ message: '챌린지를 찾을 수 없습니다.' });
    }

    await pool.query(
      `UPDATE challenges
       SET title          = COALESCE(?, title),
           is_active      = COALESCE(?, is_active),
           habit_time     = COALESCE(?, habit_time),
           alarm_lead_min = COALESCE(?, alarm_lead_min),
           display_order  = COALESCE(?, display_order),
           repeat_type    = COALESCE(?, repeat_type),
           repeat_days    = COALESCE(?, repeat_days)
       WHERE id = ?`,
      [
        title ?? null, is_active ?? null, habit_time ?? null,
        alarm_lead_min ?? null, display_order ?? null,
        repeat_type ?? null, repeat_days ?? null,
        challengeId,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM challenges WHERE id = ?', [challengeId]);
    return res.json({ message: '챌린지가 수정되었습니다.', challenge: updated[0] });
  } catch (err) {
    console.error('updateChallenge error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// PUT /api/challenges/reorder
async function reorderChallenges(req, res) {
  const userId = req.user.userId;
  const { orders } = req.body;

  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ message: 'orders 배열이 필요합니다.' });
  }

  try {
    const ids = orders.map(o => o.id);
    const [rows] = await pool.query(
      'SELECT id FROM challenges WHERE id IN (?) AND user_id = ?',
      [ids, userId]
    );
    if (rows.length !== ids.length) {
      return res.status(403).json({ message: '권한이 없는 챌린지가 포함되어 있습니다.' });
    }

    await Promise.all(
      orders.map(({ id, display_order }) =>
        pool.query('UPDATE challenges SET display_order = ? WHERE id = ?', [display_order, id])
      )
    );

    return res.json({ message: '순서가 저장되었습니다.' });
  } catch (err) {
    console.error('reorderChallenges error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// DELETE /api/challenges/:id?mode=today|all
// today: 오늘부터 비활성화 (과거 기록 유지)
// all: 과거 로그 삭제 + 비활성화
async function deleteChallenge(req, res) {
  const userId = req.user.userId;
  const challengeId = req.params.id;
  const mode = req.query.mode ?? 'today'; // 기본값: 오늘부터

  try {
    if (!(await verifyOwnership(challengeId, userId))) {
      return res.status(404).json({ message: '챌린지를 찾을 수 없습니다.' });
    }

    if (mode === 'all') {
      // 과거 로그 소프트 삭제 후 비활성화
      await pool.query('UPDATE logs SET deleted_at = NOW() WHERE challenge_id = ?', [challengeId]);
    }

    // 오늘부터 비활성화 (두 모드 공통)
    await pool.query('UPDATE challenges SET is_active = FALSE WHERE id = ?', [challengeId]);

    return res.json({ message: '습관이 삭제되었습니다.' });
  } catch (err) {
    console.error('deleteChallenge error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

module.exports = { getChallenges, createChallenge, updateChallenge, reorderChallenges, deleteChallenge };
