const express = require('express');
const router = express.Router();
const { signup, login, me, updateNickname } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authMiddleware, me);
router.patch('/nickname', authMiddleware, updateNickname);

module.exports = router;
