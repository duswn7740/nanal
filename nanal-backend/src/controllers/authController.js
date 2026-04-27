const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const pool = require('../config/db');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

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
      'INSERT INTO user_characters (user_id, character_id, level, exp, is_active, is_purchased) VALUES (?, 1, 1, 0, 1, 1)',
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
      'SELECT id, email, password_hash, nickname, sprout_state, timezone FROM users WHERE email = ? AND deleted_at IS NULL',
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

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: '이메일을 입력해주세요.' });

  try {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: '가입된 이메일이 아닙니다.' });
    }

    const tempPassword = generateTempPassword();
    const password_hash = await bcrypt.hash(tempPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, rows[0].id]);

    await transporter.sendMail({
      from: `"나날 습관트래커" <${process.env.MAIL_USER}>`,
      to: email,
      subject: '[나날] 임시 비밀번호 안내',
      text: `안녕하세요, 나날입니다.\n\n임시 비밀번호: ${tempPassword}\n\n로그인 후 반드시 비밀번호를 변경해주세요.`,
    });

    return res.json({ message: '임시 비밀번호가 이메일로 발송되었습니다.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// PATCH /api/auth/password
async function updatePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 입력해주세요.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: '비밀번호는 8자 이상이어야 합니다.' });
  }
  try {
    const [[user]] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.userId]);
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) return res.status(401).json({ message: '현재 비밀번호가 올바르지 않습니다.' });

    const password_hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, req.user.userId]);
    return res.json({ message: '비밀번호가 변경되었습니다.' });
  } catch (err) {
    console.error('updatePassword error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// PUT /api/auth/push-token
async function updatePushToken(req, res) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'token이 필요합니다.' });
  try {
    await pool.query('UPDATE users SET expo_push_token = ? WHERE id = ?', [token, req.user.userId]);
    return res.json({ message: '푸시 토큰이 저장되었습니다.' });
  } catch (err) {
    console.error('updatePushToken error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

// DELETE /api/auth/withdraw
async function withdraw(req, res) {
  const userId = req.user.userId;
  try {
    await pool.query('UPDATE users SET deleted_at = NOW() WHERE id = ?', [userId]);
    return res.json({ message: '회원탈퇴가 완료되었습니다.' });
  } catch (err) {
    console.error('withdraw error:', err);
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
}

module.exports = { signup, login, me, updateNickname, withdraw, forgotPassword, updatePassword, updatePushToken };
