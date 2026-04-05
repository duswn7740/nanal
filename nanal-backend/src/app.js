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

// 자정 크론 등록
scheduleMidnightCron();

// 헬스체크
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
