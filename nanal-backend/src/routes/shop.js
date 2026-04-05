const express = require('express');
const authMiddleware = require('../middleware/auth');
const { buyCharacter, getShopCharacters } = require('../controllers/shopController');

const router = express.Router();

router.use(authMiddleware);

router.get('/characters', getShopCharacters);       // 상점 캐릭터 목록
router.post('/buy/:characterId', buyCharacter);     // 캐릭터 구매

module.exports = router;
