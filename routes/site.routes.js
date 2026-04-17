const express = require('express');

// Import split controllers by role
const { AdminSiteController } = require('../controllers/admin');
const { ManagerSiteController } = require('../controllers/manager');
const { PilgrimSiteController } = require('../controllers/pilgrim');

const SiteValidator = require('../validators/site.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const { upload } = require('../config/cloudinary.config');

// Admin Site Router - /api/admin/sites
const adminRouter = express.Router();
adminRouter.use(i18nMiddleware);

// POST /api/admin/sites - Create placeholder site (pre-created, unmanaged)
adminRouter.post(
  '/',
  authMiddleware,
  authMiddleware.authorize('admin'),
  upload.single('cover_image'),
  SiteValidator.createSiteAdmin,
  AdminSiteController.createSite
);

// GET /api/admin/sites - Get all sites
adminRouter.get(
  '/',
  authMiddleware,
  authMiddleware.authorize('admin'),
  AdminSiteController.getSites
);

// GET /api/admin/sites/:id - Get site by ID
adminRouter.get(
  '/:id',
  authMiddleware,
  authMiddleware.authorize('admin'),
  AdminSiteController.getSiteById
);

// PUT /api/admin/sites/:id - Update site
adminRouter.put(
  '/:id',
  authMiddleware,
  authMiddleware.authorize('admin'),
  upload.single('cover_image'),
  SiteValidator.updateSite,
  AdminSiteController.updateSite
);

// DELETE /api/admin/sites/:id - Soft delete site
adminRouter.delete(
  '/:id',
  authMiddleware,
  authMiddleware.authorize('admin'),
  AdminSiteController.deleteSite
);

// PATCH /api/admin/sites/:id/restore - Restore site
adminRouter.patch(
  '/:id/restore',
  authMiddleware,
  authMiddleware.authorize('admin'),
  AdminSiteController.restoreSite
);

// GET /api/admin/sites/:siteId/local-guides - Get local guides of a site
adminRouter.get(
  '/:siteId/local-guides',
  authMiddleware,
  authMiddleware.authorize('admin'),
  AdminSiteController.getSiteGuides
);

// GET /api/admin/sites/:siteId/shifts - Get shift submissions of a site
adminRouter.get(
  '/:siteId/shifts',
  authMiddleware,
  authMiddleware.authorize('admin'),
  AdminSiteController.getSiteShifts
);

// GET /api/admin/sites/:siteId/media - Get media of a site
adminRouter.get(
  '/:siteId/media',
  authMiddleware,
  authMiddleware.authorize('admin'),
  AdminSiteController.getSiteMedia
);

// GET /api/admin/sites/:siteId/schedules - Get schedules of a site
adminRouter.get(
  '/:siteId/schedules',
  authMiddleware,
  authMiddleware.authorize('admin'),
  AdminSiteController.getSiteSchedules
);

// GET /api/admin/sites/:siteId/events - Get events of a site
adminRouter.get(
  '/:siteId/events',
  authMiddleware,
  authMiddleware.authorize('admin'),
  AdminSiteController.getSiteEvents
);

// GET /api/admin/sites/:siteId/nearby-places - Get nearby places of a site
adminRouter.get(
  '/:siteId/nearby-places',
  authMiddleware,
  authMiddleware.authorize('admin'),
  AdminSiteController.getSiteNearbyPlaces
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
  ManagerSiteController.createManagerSite
);

// GET /api/manager/sites - Get my site
managerRouter.get(
  '/',
  authMiddleware,
  authMiddleware.authorize('manager'),
  ManagerSiteController.getManagerSite
);

// PUT /api/manager/sites - Update my site
managerRouter.put(
  '/',
  authMiddleware,
  authMiddleware.authorize('manager'),
  upload.single('cover_image'),
  SiteValidator.updateSite,
  ManagerSiteController.updateManagerSite
);


// Public Site Router - /api/sites (for all authenticated users)
const publicRouter = express.Router();
publicRouter.use(i18nMiddleware);

// Get favorite sites
publicRouter.get(
  '/favorites',
  authMiddleware,
  PilgrimSiteController.getFavorites
);

// Add site to favorites
publicRouter.post(
  '/:id/favorite',
  authMiddleware,
  SiteValidator.validateSiteId,
  PilgrimSiteController.addFavorite
);

// Remove site from favorites
publicRouter.delete(
  '/:id/favorite',
  authMiddleware,
  SiteValidator.validateSiteId,
  PilgrimSiteController.removeFavorite
);


module.exports = { adminRouter, managerRouter, publicRouter };
