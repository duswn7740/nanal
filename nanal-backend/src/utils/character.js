const pool = require('../config/db');
const { getLevelFromExp } = require('./xp');
const { getTomorrowKST } = require('./date');

// 활성 캐릭터에 XP 지급 + 레벨업 처리 (구매한 메인 캐릭터만)
async function grantExp(userId, amount, conn) {
  const db = conn || pool;
  const [[uc]] = await db.query(
    'SELECT id, character_id, exp, level FROM user_characters WHERE user_id = ? AND is_active = 1 AND is_purchased = TRUE LIMIT 1',
    [userId]
  );
  if (!uc) return;
  const newExp = uc.exp + amount;
  const newLevel = getLevelFromExp(newExp);
  await db.query(
    'UPDATE user_characters SET exp = ?, level = ? WHERE id = ?',
    [newExp, newLevel, uc.id]
  );

  // 레벨업 시 이력 기록 (다음날부터 반영되도록 tomorrow 저장)
  if (newLevel > uc.level) {
    const tomorrow = getTomorrowKST();
    const [[existing]] = await db.query(
      'SELECT id FROM character_level_history WHERE user_id = ? AND character_id = ? AND level = ?',
      [userId, uc.character_id, newLevel]
    );
    if (!existing) {
      await db.query(
        'INSERT INTO character_level_history (user_id, character_id, level, leveled_up_at) VALUES (?, ?, ?, ?)',
        [userId, uc.character_id, newLevel, tomorrow]
      );
    }
  }
}

module.exports = { grantExp };
