const express = require('express');
const SiteController = require('../controllers/SiteController');
const SiteValidator = require('../validators/site.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const { upload } = require('../config/cloudinary.config');

// Admin Site Router - /api/admin/sites
const adminRouter = express.Router();
adminRouter.use(i18nMiddleware);

// GET /api/admin/sites - Get all sites
adminRouter.get(
  '/',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.getSites
);

// GET /api/admin/sites/:id - Get site by ID
adminRouter.get(
  '/:id',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.getSiteById
);

// PUT /api/admin/sites/:id - Update site
adminRouter.put(
  '/:id',
  authMiddleware,
  authMiddleware.authorize('admin'),
  upload.single('cover_image'),
  SiteValidator.updateSite,
  SiteController.updateSite
);

// DELETE /api/admin/sites/:id - Soft delete site
adminRouter.delete(
  '/:id',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.deleteSite
);

// PATCH /api/admin/sites/:id/restore - Restore site
adminRouter.patch(
  '/:id/restore',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.restoreSite
);

// GET /api/admin/sites/:siteId/local-guides - Get local guides of a site
adminRouter.get(
  '/:siteId/local-guides',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.getSiteGuides
);

// GET /api/admin/sites/:siteId/shifts - Get shift submissions of a site
adminRouter.get(
  '/:siteId/shifts',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.getSiteShifts
);

// GET /api/admin/sites/:siteId/media - Get media of a site
adminRouter.get(
  '/:siteId/media',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.getSiteMedia
);

// GET /api/admin/sites/:siteId/schedules - Get schedules of a site
adminRouter.get(
  '/:siteId/schedules',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.getSiteSchedules
);

// GET /api/admin/sites/:siteId/events - Get events of a site
adminRouter.get(
  '/:siteId/events',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.getSiteEvents
);

// GET /api/admin/sites/:siteId/nearby-places - Get nearby places of a site
adminRouter.get(
  '/:siteId/nearby-places',
  authMiddleware,
  authMiddleware.authorize('admin'),
  SiteController.getSiteNearbyPlaces
);


// Manager Site Router - /api/manager/sites
const managerRouter = express.Router();
managerRouter.use(i18nMiddleware);

// POST /api/manager/sites - Create site (max 1, auto-approved)
managerRouter.post(
  '/',
  authMiddleware,
  authMiddleware.authorize('manager'),
  upload.single('cover_image'),
  SiteValidator.createSite,
  SiteController.createManagerSite
);

// GET /api/manager/sites - Get my site
managerRouter.get(
  '/',
  authMiddleware,
  authMiddleware.authorize('manager'),
  SiteController.getManagerSite
);

// PUT /api/manager/sites - Update my site
managerRouter.put(
  '/',
  authMiddleware,
  authMiddleware.authorize('manager'),
  upload.single('cover_image'),
  SiteValidator.updateSite,
  SiteController.updateManagerSite
);


// Public Site Router - /api/sites (for all authenticated users)
const publicRouter = express.Router();
publicRouter.use(i18nMiddleware);

// Get favorite sites
publicRouter.get(
  '/favorites',
  authMiddleware,
  SiteController.getFavorites
);

// Add site to favorites
publicRouter.post(
  '/:id/favorite',
  authMiddleware,
  SiteValidator.validateSiteId,
  SiteController.addFavorite
);

// Remove site from favorites
publicRouter.delete(
  '/:id/favorite',
  authMiddleware,
  SiteValidator.validateSiteId,
  SiteController.removeFavorite
);


module.exports = { adminRouter, managerRouter, publicRouter };
