const express = require('express');
const router = express.Router();
const ManagerLocalGuideController = require('../controllers/ManagerLocalGuideController');
const ManagerLocalGuideValidator = require('../validators/managerLocalGuide.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

router.use(i18nMiddleware);

// POST - Create Local Guide
router.post(
    '/',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerLocalGuideValidator.createLocalGuide,
    ManagerLocalGuideController.createLocalGuide
);

// GET - List Local Guides
router.get(
    '/',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerLocalGuideController.getLocalGuides
);

// PATCH - Update Local Guide Status (block/unblock)
router.patch(
    '/:id/status',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerLocalGuideValidator.updateStatus,
    ManagerLocalGuideController.updateLocalGuideStatus
);

module.exports = router;
