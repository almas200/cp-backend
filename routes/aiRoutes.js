const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

// POST /api/ai/chat
router.post('/chat', protect, aiController.chatWithAI);

// POST /api/ai/course-summary
router.post('/course-summary', protect, aiController.generateCourseSummary);

// POST /api/ai/lesson-quiz
router.post('/lesson-quiz', protect, aiController.generateLessonQuiz);

// POST /api/ai/generate-outline
router.post('/generate-outline', protect, aiController.generateCourseOutline);

module.exports = router;
