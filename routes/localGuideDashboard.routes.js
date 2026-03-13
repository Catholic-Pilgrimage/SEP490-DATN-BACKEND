const express = require('express');
const router = express.Router();
const { LocalGuideDashboardController } = require('../controllers/localGuide');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

// Apply middlewares
router.use(i18nMiddleware);
router.use(authMiddleware);
router.use(authMiddleware.authorize('local_guide'));

// Dashboard routes
router.get('/overview', LocalGuideDashboardController.getOverview);

module.exports = router;
