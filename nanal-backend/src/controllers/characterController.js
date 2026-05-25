const pool = require('../config/db');
const { getLevelFromExp, getExpToNextLevel, LEVEL_THRESHOLDS } = require('../utils/xp');

async function getActiveCharacter(req, res) {
  const userId = req.user.userId;
  try {
    const [rows] = await pool.query(
      `SELECT uc.id, uc.level, uc.exp, c.name, c.description
       FROM user_characters uc
       JOIN characters c ON c.id = uc.character_id
       WHERE uc.user_id = ? AND uc.is_active = 1
       LIMIT 1`,
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: '활성 캐릭터가 없습니다.' });

    const uc = rows[0];
    return res.json({
      character: {
        ...uc,
        expToNext: getExpToNextLevel(uc.exp),
        levelThreshold: LEVEL_THRESHOLDS[uc.level - 1] ?? 0,
        nextThreshold: LEVEL_THRESHOLDS[uc.level] ?? null,
      },
    });
  } catch (err) {
    console.error('getActiveCharacter error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

async function getCharacters(req, res) {
  const userId = req.user.userId;
  try {
    const [rows] = await pool.query(
      `SELECT uc.id, uc.character_id, uc.level, uc.exp, uc.is_active, uc.unlocked_at,
              c.name, c.description, c.unlock_condition, c.is_limited
       FROM user_characters uc
       JOIN characters c ON c.id = uc.character_id
       WHERE uc.user_id = ?
       ORDER BY uc.unlocked_at ASC`,
      [userId]
    );
    return res.json({ characters: rows });
  } catch (err) {
    console.error('getCharacters error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// PATCH /api/characters/:ucId/active — 메인 캐릭터 변경
async function setActiveCharacter(req, res) {
  const userId = req.user.userId;
  const ucId = req.params.ucId;

  try {
    const [rows] = await pool.query(
      'SELECT id FROM user_characters WHERE id = ? AND user_id = ?',
      [ucId, userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: '캐릭터를 찾을 수 없습니다.' });

    await pool.query(
      "UPDATE user_characters SET is_active = 0, activated_at = COALESCE(activated_at, '2000-01-01') WHERE user_id = ? AND is_active = 1",
      [userId]
    );
    await pool.query('UPDATE user_characters SET is_active = 1, activated_at = CURDATE() WHERE id = ?', [ucId]);

    return res.json({ message: '메인 캐릭터가 변경되었습니다.' });
  } catch (err) {
    console.error('setActiveCharacter error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// GET /api/characters/history — 캐릭터 활성화 이력 (달력에서 날짜별 캐릭터 결정용)
async function getCharacterHistory(req, res) {
  const userId = req.user.userId;
  try {
    const [rows] = await pool.query(
      `SELECT uc.activated_at, uc.level, c.name
       FROM user_characters uc
       JOIN characters c ON c.id = uc.character_id
       WHERE uc.user_id = ? AND uc.activated_at IS NOT NULL
       ORDER BY uc.activated_at ASC`,
      [userId]
    );
    return res.json({ history: rows });
  } catch (err) {
    console.error('getCharacterHistory error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// GET /api/characters/calendar — 달력 표시용 데이터
async function getCalendarCharacter(req, res) {
  const userId = req.user.userId;
  try {
    const [[user]] = await pool.query(
      'SELECT calendar_mode, calendar_character_id, calendar_fixed_level FROM users WHERE id = ?',
      [userId]
    );

    if (user.calendar_mode === 'history') {
      // 히스토리 모드: 날짜별 활성 캐릭터 + 레벨 이력 전체
      const [history] = await pool.query(
        `SELECT
           COALESCE(uc.activated_at, uc.unlocked_at, '2000-01-01') AS activated_at,
           uc.level, c.name, uc.character_id
         FROM user_characters uc
         JOIN characters c ON c.id = uc.character_id
         WHERE uc.user_id = ? AND (uc.is_active = 1 OR uc.activated_at IS NOT NULL)
         ORDER BY activated_at ASC`,
        [userId]
      );

      // 레벨 이력도 함께 (날짜별 레벨 정확히 반영)
      const [levelHistory] = await pool.query(
        `SELECT character_id, level, leveled_up_at
         FROM character_level_history
         WHERE user_id = ?
         ORDER BY leveled_up_at ASC`,
        [userId]
      );
      return res.json({ mode: 'history', history, levelHistory });
    } else {
      // 고정 모드: 선택한 캐릭터 + 레벨 이력
      const [[char]] = await pool.query(
        `SELECT c.id, c.name
         FROM user_characters uc
         JOIN characters c ON c.id = uc.character_id
         WHERE uc.user_id = ? AND uc.character_id = ?`,
        [userId, user.calendar_character_id]
      );
      if (!char) return res.status(404).json({ message: '달력 캐릭터를 찾을 수 없습니다.' });

      const [levelHistory] = await pool.query(
        `SELECT level, leveled_up_at
         FROM character_level_history
         WHERE user_id = ? AND character_id = ?
         ORDER BY leveled_up_at ASC`,
        [userId, user.calendar_character_id]
      );
      return res.json({ mode: 'fixed', character: char, fixedLevel: user.calendar_fixed_level });
    }
  } catch (err) {
    console.error('getCalendarCharacter error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// PATCH /api/characters/calendar — 달력 모드/캐릭터 변경
// body: { mode: 'history' } 또는 { mode: 'fixed', character_id, level }
async function setCalendarCharacter(req, res) {
  const userId = req.user.userId;
  const { mode, character_id, level } = req.body;

  if (!['history', 'fixed'].includes(mode)) {
    return res.status(400).json({ message: 'mode는 history 또는 fixed여야 합니다.' });
  }

  try {
    if (mode === 'fixed') {
      const [rows] = await pool.query(
        'SELECT id FROM user_characters WHERE user_id = ? AND character_id = ?',
        [userId, character_id]
      );
      if (rows.length === 0) return res.status(403).json({ message: '보유하지 않은 캐릭터입니다.' });
      await pool.query(
        'UPDATE users SET calendar_mode = ?, calendar_character_id = ?, calendar_fixed_level = ? WHERE id = ?',
        [mode, character_id, level ?? 1, userId]
      );
    } else {
      await pool.query('UPDATE users SET calendar_mode = ? WHERE id = ?', [mode, userId]);
    }
    return res.json({ message: '달력 설정이 변경되었습니다.' });
  } catch (err) {
    console.error('setCalendarCharacter error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

module.exports = { getActiveCharacter, getCharacters, setActiveCharacter, getCharacterHistory, getCalendarCharacter, setCalendarCharacter };
