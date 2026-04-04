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

    await pool.query('UPDATE user_characters SET is_active = 0 WHERE user_id = ?', [userId]);
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

module.exports = { getActiveCharacter, getCharacters, setActiveCharacter, getCharacterHistory };
