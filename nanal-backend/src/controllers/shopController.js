const pool = require('../config/db');

// POST /api/shop/buy/:characterId
// 코인으로 캐릭터 구매 (해금 조건 충족 + 미구매 상태여야 함)
async function buyCharacter(req, res) {
  const userId = req.user.userId;
  const characterId = Number(req.params.characterId);

  try {
    // 캐릭터 정보 조회 (가격 + 해금 조건 텍스트)
    const [[character]] = await pool.query(
      'SELECT id, name, price FROM characters WHERE id = ?',
      [characterId]
    );
    if (!character) {
      return res.status(404).json({ message: '캐릭터를 찾을 수 없습니다.' });
    }

    // 이미 보유 중인지 확인
    const [[uc]] = await pool.query(
      'SELECT id, is_purchased FROM user_characters WHERE user_id = ? AND character_id = ?',
      [userId, characterId]
    );

    if (uc?.is_purchased) {
      return res.status(409).json({ message: '이미 구매한 캐릭터예요.' });
    }

    // 해금 조건 충족 여부 확인 (user_characters에 행이 있어야 함 = 조건 충족 시 자동 삽입됨)
    if (!uc) {
      return res.status(403).json({ message: '해금 조건을 아직 충족하지 못했어요.' });
    }

    // 코인 확인
    const [[user]] = await pool.query('SELECT coins FROM users WHERE id = ?', [userId]);
    if (user.coins < character.price) {
      return res.status(400).json({ message: `코인이 부족해요. (필요: ${character.price}, 보유: ${user.coins})` });
    }

    // 구매 처리: 코인 차감 + is_purchased = TRUE
    await Promise.all([
      pool.query('UPDATE users SET coins = coins - ? WHERE id = ?', [character.price, userId]),
      pool.query('UPDATE user_characters SET is_purchased = TRUE WHERE id = ?', [uc.id]),
    ]);

    const [[updated]] = await pool.query('SELECT coins FROM users WHERE id = ?', [userId]);

    return res.json({
      message: `${character.name}을(를) 구매했어요!`,
      characterId,
      coins: updated.coins,
    });
  } catch (err) {
    console.error('buyCharacter error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// GET /api/shop/characters
// 상점 목록: 전체 캐릭터 + 유저 해금/구매 현황
async function getShopCharacters(req, res) {
  const userId = req.user.userId;

  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.description, c.unlock_condition, c.price,
              uc.id AS uc_id, uc.is_purchased,
              uc.unlocked_at IS NOT NULL AS is_unlocked
       FROM characters c
       LEFT JOIN user_characters uc ON uc.character_id = c.id AND uc.user_id = ?
       ORDER BY c.id ASC`,
      [userId]
    );

    return res.json({ characters: rows });
  } catch (err) {
    console.error('getShopCharacters error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

module.exports = { buyCharacter, getShopCharacters };
