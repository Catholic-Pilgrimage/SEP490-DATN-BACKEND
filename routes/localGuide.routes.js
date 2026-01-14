const express = require('express');
const router = express.Router();
const LocalGuideController = require('../controllers/LocalGuideController');
const LocalGuideValidator = require('../validators/localGuide.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

router.use(i18nMiddleware);

// POST - Create Local Guide
router.post(
    '/',
    authMiddleware,
    authMiddleware.authorize('manager'),
    LocalGuideValidator.createLocalGuide,
    LocalGuideController.createLocalGuide
);

// GET - List Local Guides
router.get(
    '/',
    authMiddleware,
    authMiddleware.authorize('manager'),
    LocalGuideController.getLocalGuides
);

// PATCH - Update Local Guide Status (block/unblock)
router.patch(
    '/:id/status',
    authMiddleware,
    authMiddleware.authorize('manager'),
    LocalGuideValidator.updateStatus,
    LocalGuideController.updateLocalGuideStatus
);

module.exports = router;
