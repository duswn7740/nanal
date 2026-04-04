const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getChallenges,
  createChallenge,
  updateChallenge,
  reorderChallenges,
  deleteChallenge,
} = require('../controllers/challengeController');

router.use(authMiddleware); // 모든 챌린지 API는 로그인 필요

router.get('/', getChallenges);
router.post('/', createChallenge);
router.put('/reorder', reorderChallenges);  // /:id 보다 먼저 등록해야 충돌 안 남
router.put('/:id', updateChallenge);
router.delete('/:id', deleteChallenge);

module.exports = router;
