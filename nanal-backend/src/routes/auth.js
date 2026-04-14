const express = require('express');
const router = express.Router();
const { signup, login, me, updateNickname, withdraw, forgotPassword, updatePassword } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authMiddleware, me);
router.patch('/nickname', authMiddleware, updateNickname);
router.post('/forgot-password', forgotPassword);
router.patch('/password', authMiddleware, updatePassword);
router.delete('/withdraw', authMiddleware, withdraw);

module.exports = router;
