const express = require('express');
const router = express.Router();
const SiteController = require('../controllers/SiteController');
const SiteValidator = require('../validators/site.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const { upload } = require('../config/cloudinary.config');

router.use(i18nMiddleware);

// Admin routes - Get all sites
router.get(
  '/',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.getSites
);

// Admin routes - Get site by ID
router.get(
  '/:id',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.getSiteById
);

// Admin routes - Create site with image upload
router.post(
  '/',
  authMiddleware,
  authMiddleware.authorize('admin'),
  upload.single('cover_image'),
  SiteValidator.createSite,
  SiteController.createSite
);

// Admin routes - Soft delete site
router.delete(
  '/:id',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.deleteSite
);

// Admin routes - Update site
router.put(
  '/:id',
  authMiddleware,
  authMiddleware.authorize('admin'),
  upload.single('cover_image'),
  SiteValidator.updateSite,
  SiteController.updateSite
);

// Admin routes - Restore soft deleted site
router.patch(
  '/:id/restore',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.restoreSite
);

module.exports = router;
