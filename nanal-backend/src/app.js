require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/auth');
const challengesRouter = require('./routes/challenges');
const logsRouter = require('./routes/logs');
const charactersRouter = require('./routes/characters');
const boxRouter = require('./routes/box');
const shopRouter = require('./routes/shop');
const { scheduleMidnightCron } = require('./cron/midnight');
const { scheduleReminderCron } = require('./cron/reminder');

const app = express();

app.use(cors());
app.use(express.json());

// 라우터 등록
app.use('/api/auth', authRouter);
app.use('/api/challenges', challengesRouter);
app.use('/api/logs', logsRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/box', boxRouter);
app.use('/api/shop', shopRouter);

// 크론 등록
scheduleMidnightCron();
scheduleReminderCron();

// 헬스체크
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 계정 삭제 안내 페이지 (Google Play 정책용)
app.get('/delete-account', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>나날 - 계정 삭제</title>
<style>body{font-family:sans-serif;max-width:480px;margin:60px auto;padding:0 20px;color:#333}h1{font-size:20px}p{line-height:1.6;color:#555}</style>
</head>
<body>
<h1>계정 삭제 방법</h1>
<p>나날 앱 내에서 계정을 삭제할 수 있습니다.</p>
<p><strong>앱 → 설정 → 회원탈퇴</strong></p>
<p>탈퇴 시 모든 습관 기록 및 계정 정보가 즉시 삭제됩니다.</p>
<p>문의: hellorollinpebbles@gmail.com</p>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
