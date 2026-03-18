const express = require('express');
const router = express.Router();
const { PilgrimDashboardController } = require('../controllers/pilgrim');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

// Apply middlewares
router.use(i18nMiddleware);
router.use(authMiddleware);
router.use(authMiddleware.authorize('pilgrim'));

// Dashboard routes
router.get('/overview', PilgrimDashboardController.getOverview);

module.exports = router;
