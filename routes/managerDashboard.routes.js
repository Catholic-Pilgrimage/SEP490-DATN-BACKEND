const express = require('express');
const router = express.Router();
const { ManagerDashboardController } = require('../controllers/manager');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

// Apply middlewares
router.use(i18nMiddleware);
router.use(authMiddleware);
router.use(authMiddleware.authorize('manager'));

// Dashboard routes
router.get('/overview', ManagerDashboardController.getOverview);
router.get('/analytics/checkins', ManagerDashboardController.getCheckinsAnalytics);

module.exports = router;
