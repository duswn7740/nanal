const express = require('express');
const router = express.Router();
const { signup, login, me, updateNickname, withdraw, forgotPassword, updatePassword, updatePushToken, refreshToken } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authMiddleware, me);
router.patch('/nickname', authMiddleware, updateNickname);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.patch('/password', authMiddleware, updatePassword);
router.delete('/withdraw', authMiddleware, withdraw);
router.put('/push-token', authMiddleware, updatePushToken);

module.exports = router;
