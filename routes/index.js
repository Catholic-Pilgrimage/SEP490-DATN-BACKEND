const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const { adminRouter: adminSiteRoutes, managerRouter: managerSiteRoutes } = require('./site.routes');
const { pilgrimRouter: verificationRoutes, adminRouter: adminVerificationRoutes } = require('./verification.routes');
const managerLocalGuideRoutes = require('./managerLocalGuide.routes');
const localGuideRoutes = require('./localGuide.routes');
const managerContentRoutes = require('./managerContent.routes');
const publicRoutes = require('./public.routes');

router.get('/', (req, res) => {
  res.json({
    message: 'API is working',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      docs: '/api-docs',
      auth: '/api/auth',
      admin: '/api/admin',
      adminSites: '/api/admin/sites',
      managerSites: '/api/manager/sites',
      managerLocalGuides: '/api/manager/local-guides',
      managerContent: '/api/manager/content',
      localGuide: '/api/local-guide',
      verification: '/api/verification-requests',
      adminVerification: '/api/admin/verification-requests'
    }
  });
});

// Auth routes
router.use('/auth', authRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Admin Site routes
router.use('/admin/sites', adminSiteRoutes);

// Manager Site routes
router.use('/manager/sites', managerSiteRoutes);

// Manager Local Guide routes
router.use('/manager/local-guides', managerLocalGuideRoutes);

// Manager Content routes (Media, Schedule, Event approval)
router.use('/manager/content', managerContentRoutes);

// Local Guide self routes
router.use('/local-guide', localGuideRoutes);

// Verification routes (Pilgrim only)
router.use('/verification-requests', verificationRoutes);

// Admin Verification routes (Admin only)
router.use('/admin/verification-requests', adminVerificationRoutes);

// Public routes (Sites, Events, etc.)
router.use('/sites', publicRoutes);

module.exports = router;

