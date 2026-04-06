const pool = require('../config/db');
const { getLevelFromExp } = require('./xp');

// 활성 캐릭터에 XP 지급 + 레벨업 처리 (구매한 메인 캐릭터만)
async function grantExp(userId, amount) {
  const [[uc]] = await pool.query(
    'SELECT id, exp FROM user_characters WHERE user_id = ? AND is_active = 1 AND is_purchased = TRUE LIMIT 1',
    [userId]
  );
  if (!uc) return;
  const newExp = uc.exp + amount;
  const newLevel = getLevelFromExp(newExp);
  await pool.query(
    'UPDATE user_characters SET exp = ?, level = ? WHERE id = ?',
    [newExp, newLevel, uc.id]
  );
}

module.exports = { grantExp };
