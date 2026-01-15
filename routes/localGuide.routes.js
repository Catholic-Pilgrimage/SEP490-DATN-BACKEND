const express = require('express');
const router = express.Router();
const LocalGuideController = require('../controllers/LocalGuideController');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const { uploadMedia } = require('../config/cloudinary.config');

router.use(i18nMiddleware);

// GET /api/local-guide/site - Get my site details
router.get(
    '/site',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getMySite
);

// POST /api/local-guide/media - Upload media (file or YouTube URL)
router.post(
    '/media',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    uploadMedia.single('file'),  
    LocalGuideController.uploadMedia
);

// GET /api/local-guide/media - List site media
router.get(
    '/media',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.getSiteMedia
);

// DELETE /api/local-guide/media/:id - Delete media (pending only)
router.delete(
    '/media/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    LocalGuideController.deleteMedia
);

// PUT /api/local-guide/media/:id - Update media (pending only)
router.put(
    '/media/:id',
    authMiddleware,
    authMiddleware.authorize('local_guide'),
    uploadMedia.single('file'),
    LocalGuideController.updateMedia
);

module.exports = router;
