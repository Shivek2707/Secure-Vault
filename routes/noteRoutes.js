const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');

// All note routes require being logged in
router.use(protect);

router.route('/')
    .get(noteController.getMyNotes)
    .post(noteController.createNote);

router.route('/:id')
    .delete(noteController.deleteNote);

module.exports = router;