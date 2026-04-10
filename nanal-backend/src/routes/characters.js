const express = require('express');
const router = express.Router();
const { getActiveCharacter, getCharacters, setActiveCharacter, getCharacterHistory, getCalendarCharacter, setCalendarCharacter } = require('../controllers/characterController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', getCharacters);
router.get('/active', getActiveCharacter);
router.get('/history', getCharacterHistory);
router.get('/calendar', getCalendarCharacter);
router.patch('/calendar', setCalendarCharacter);
router.patch('/:ucId/active', setActiveCharacter);

module.exports = router;
