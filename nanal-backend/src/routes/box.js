const express = require('express');
const authMiddleware = require('../middleware/auth');
const { openBox, adReward, boxStatus } = require('../controllers/boxController');

const router = express.Router();

router.use(authMiddleware);

router.get('/status', boxStatus);    // 오늘 상자 열었는지 확인
router.post('/open', openBox);       // 상자 열기
router.post('/ad', adReward);        // 광고 시청 후 보상

module.exports = router;
