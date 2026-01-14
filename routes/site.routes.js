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


module.exports = { adminRouter, managerRouter };
