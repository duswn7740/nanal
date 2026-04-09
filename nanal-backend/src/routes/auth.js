const express = require('express');
const router = express.Router();
const { signup, login, me, updateNickname, withdraw } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authMiddleware, me);
router.patch('/nickname', authMiddleware, updateNickname);
router.delete('/withdraw', authMiddleware, withdraw);

module.exports = router;
