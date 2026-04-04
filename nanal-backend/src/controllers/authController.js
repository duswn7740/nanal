const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function generateToken(userId, email, nickname) {
  return jwt.sign(
    { userId, email, nickname },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
}

// POST /api/auth/signup
async function signup(req, res) {
  const { email, password, nickname, timezone = 'Asia/Seoul' } = req.body;

  if (!email || !password || !nickname) {
    return res.status(400).json({ message: '이메일, 비밀번호, 닉네임은 필수입니다.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: '올바른 이메일 형식이 아닙니다.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, nickname, timezone) VALUES (?, ?, ?, ?)',
      [email, password_hash, nickname, timezone]
    );

    // 회원가입 시 기본 캐릭터(꽃, id=1) 자동 지급 + 활성화
    await pool.query(
      'INSERT INTO user_characters (user_id, character_id, level, exp, is_active) VALUES (?, 1, 1, 0, 1)',
      [result.insertId]
    );

    const token = generateToken(result.insertId, email, nickname);

    return res.status(201).json({
      message: '회원가입 성공',
      token,
      user: { id: result.insertId, email, nickname, sprout_state: 0, timezone },
    });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;
  console.log('[login] 요청 수신:', email);

  if (!email || !password) {
    console.log('[login] 이메일/비밀번호 누락');
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, email, password_hash, nickname, sprout_state, timezone FROM users WHERE email = ?',
      [email]
    );
    console.log('[login] DB 조회 결과:', rows.length, '건');

    if (rows.length === 0) {
      console.log('[login] 이메일 없음');
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    console.log('[login] 비밀번호 일치:', isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = generateToken(user.id, user.email, user.nickname);

    return res.status(200).json({
      message: '로그인 성공',
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        sprout_state: user.sprout_state,
        timezone: user.timezone,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// GET /api/auth/me
async function me(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, nickname, sprout_state, timezone, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    return res.status(200).json({ user: rows[0] });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// PATCH /api/auth/nickname
async function updateNickname(req, res) {
  const { nickname } = req.body;
  if (!nickname || !nickname.trim()) {
    return res.status(400).json({ message: '닉네임을 입력해주세요.' });
  }
  if (nickname.trim().length > 20) {
    return res.status(400).json({ message: '닉네임은 20자 이하여야 합니다.' });
  }
  try {
    await pool.query('UPDATE users SET nickname = ? WHERE id = ?', [nickname.trim(), req.user.userId]);
    return res.json({ message: '닉네임이 변경되었습니다.', nickname: nickname.trim() });
  } catch (err) {
    console.error('updateNickname error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

module.exports = { signup, login, me, updateNickname };
