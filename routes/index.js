const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const siteRoutes = require('./site.routes');
const { pilgrimRouter: verificationRoutes, adminRouter: adminVerificationRoutes } = require('./verification.routes');

router.get('/', (req, res) => {
  res.json({
    message: 'API is working',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      docs: '/api-docs',
      auth: '/api/auth',
      admin: '/api/admin',
      sites: '/api/admin/sites',
      verification: '/api/verification-requests',
      adminVerification: '/api/admin/verification-requests'
    }
  });
});

// Auth routes
router.use('/auth', authRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Site routes (Admin only)
router.use('/admin/sites', siteRoutes);

// Verification routes (Pilgrim only)
router.use('/verification-requests', verificationRoutes);

// Admin Verification routes (Admin only)
router.use('/admin/verification-requests', adminVerificationRoutes);

module.exports = router;
