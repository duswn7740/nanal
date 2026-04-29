const pool = require('../config/db');
const { getTodayKST, normalizeDateField } = require('../utils/date');
const { grantExp } = require('../utils/character');

// 선물상자 보상 테이블
const REWARDS = [
  { type: 'xp',   amount: 10,  weight: 54 },
  { type: 'xp',   amount: 15, weight: 33 },
  { type: 'coin', amount: 1,  weight: 10 },
  { type: 'coin', amount: 3,  weight: 3 },
];
const TOTAL_WEIGHT = REWARDS.reduce((sum, r) => sum + r.weight, 0); // 100

function pickReward() {
  let rand = Math.random() * TOTAL_WEIGHT;
  for (const reward of REWARDS) {
    rand -= reward.weight;
    if (rand <= 0) return reward;
  }
  return REWARDS[0]; // fallback
}

// POST /api/box/open
// 오늘 선물상자 열기 (하루 1회)
async function openBox(req, res) {
  const userId = req.user.userId;
  const today = getTodayKST();

  try {
    const [[user]] = await pool.query(
      'SELECT last_box_date, coins FROM users WHERE id = ?',
      [userId]
    );

    // 오늘 이미 열었는지 확인
    const lastBoxDate = user.last_box_date
      ? normalizeDateField(user.last_box_date)
      : null;
    if (lastBoxDate === today) {
      return res.status(409).json({ message: '오늘은 이미 선물상자를 열었어요.' });
    }

    const reward = pickReward();

    if (reward.type === 'xp') {
      await grantExp(userId, reward.amount);
    } else {
      // 코인 지급
      await pool.query('UPDATE users SET coins = coins + ? WHERE id = ?', [reward.amount, userId]);
    }

    // 오늘 날짜 기록
    await pool.query('UPDATE users SET last_box_date = ? WHERE id = ?', [today, userId]);

    return res.json({
      message: '선물상자를 열었어요!',
      reward,
      coins: reward.type === 'coin' ? user.coins + reward.amount : user.coins,
    });
  } catch (err) {
    console.error('openBox error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// POST /api/box/ad
// 광고 시청 후 당일 보상 2배 획득 (하루 1회)
async function adReward(req, res) {
  const userId = req.user.userId;
  const today = getTodayKST();

  try {
    const [[user]] = await pool.query(
      'SELECT last_box_date, last_ad_date, coins FROM users WHERE id = ?',
      [userId]
    );

    // 오늘 상자를 아직 안 열었으면 광고 보상 불가
    const lastBoxDate = user.last_box_date
      ? normalizeDateField(user.last_box_date)
      : null;
    if (lastBoxDate !== today) {
      return res.status(400).json({ message: '먼저 오늘 선물상자를 열어야 해요.' });
    }

    // 오늘 이미 광고 보상 받았는지 확인
    const lastAdDate = user.last_ad_date
      ? normalizeDateField(user.last_ad_date)
      : null;
    if (lastAdDate === today) {
      return res.status(409).json({ message: '오늘은 이미 광고 보상을 받았어요.' });
    }

    // 오늘 뽑은 보상과 동일한 보상을 1번 더 지급 (2배 효과)
    // 프론트에서 reward를 body로 전달
    const { reward } = req.body;
    if (!reward || !reward.type || !reward.amount) {
      return res.status(400).json({ message: '보상 정보가 없어요.' });
    }

    if (reward.type === 'xp') {
      await grantExp(userId, reward.amount);
    } else {
      await pool.query('UPDATE users SET coins = coins + ? WHERE id = ?', [reward.amount, userId]);
    }

    await pool.query('UPDATE users SET last_ad_date = ? WHERE id = ?', [today, userId]);

    const [[updated]] = await pool.query('SELECT coins FROM users WHERE id = ?', [userId]);

    return res.json({
      message: '광고 보상을 받았어요!',
      reward,
      coins: updated.coins,
    });
  } catch (err) {
    console.error('adReward error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// GET /api/box/status
// 오늘 상자 열었는지, 광고 봤는지 확인 (앱 접속 시 모달 표시 여부 판단용)
async function boxStatus(req, res) {
  const userId = req.user.userId;
  const today = getTodayKST();

  try {
    const [[user]] = await pool.query(
      'SELECT last_box_date, last_ad_date, coins FROM users WHERE id = ?',
      [userId]
    );

    const lastBoxDate = user.last_box_date
      ? normalizeDateField(user.last_box_date)
      : null;
    const lastAdDate = user.last_ad_date
      ? normalizeDateField(user.last_ad_date)
      : null;

    return res.json({
      opened: lastBoxDate === today,    // 오늘 상자 열었는지
      adUsed: lastAdDate === today,     // 오늘 광고 봤는지
      coins: user.coins,
    });
  } catch (err) {
    console.error('boxStatus error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

module.exports = { openBox, adReward, boxStatus };
