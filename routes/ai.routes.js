const express = require('express');
const router = express.Router();
const AiController = require('../controllers/ai/aiController');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const AiValidator = require('../validators/ai.validator');
const validate = require('../middlewares/validation.middleware');

router.use(i18nMiddleware);

// ========================
// PILGRIM AI
// ========================

// POST /api/ai/suggest-route - AI Route Suggestion
router.post(
    '/suggest-route',
    authMiddleware,
    AiValidator.suggestRoute,
    validate,
    AiController.suggestRoute
);

// POST /api/ai/suggest-prayer - AI Prayer Suggestion for Journal
router.post(
    '/suggest-prayer',
    authMiddleware,
    AiValidator.suggestPrayer,
    validate,
    AiController.suggestPrayer
);

// ========================
// LOCAL GUIDE AI
// ========================

// POST /api/ai/generate-article - AI Article Writer (Manager + Local Guide)
router.post(
    '/generate-article',
    authMiddleware,
    authMiddleware.authorize('manager', 'local_guide'),
    AiValidator.generateArticle,
    validate,
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
    AiValidator.suggestEvents,
    validate,
    AiController.suggestEvents
);

module.exports = router;
