const express = require('express');
const router = express.Router();
const AiController = require('../controllers/ai/aiController');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

router.use(i18nMiddleware);

// ========================
// PILGRIM AI
// ========================

// POST /api/ai/suggest-route - AI Route Suggestion
router.post(
    '/suggest-route',
    authMiddleware,
    AiController.suggestRoute
);

// ========================
// LOCAL GUIDE AI
// ========================

// POST /api/ai/generate-article - AI Article Writer
router.post(
    '/generate-article',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    AiController.generateArticle
);

// POST /api/ai/summarize-reviews - AI Review Summarizer
router.post(
    '/summarize-reviews',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    AiController.summarizeReviews
);

// POST /api/ai/suggest-events - AI Event Recommender
router.post(
    '/suggest-events',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    AiController.suggestEvents
);

module.exports = router;
