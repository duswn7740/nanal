const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { checkin, uncheck, getToday, getCalendar, xpAd } = require('../controllers/logController');

router.use(authMiddleware);

router.post('/checkin', checkin);
router.post('/uncheck', uncheck);
router.get('/today', getToday);
router.get('/calendar', getCalendar);
router.post('/xp-ad', xpAd);

module.exports = router;
