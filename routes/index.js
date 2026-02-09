const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const { adminRouter: adminSiteRoutes, managerRouter: managerSiteRoutes, publicRouter: publicSiteRoutes } = require('./site.routes');
const { publicRouter: publicVerificationRoutes, pilgrimRouter: verificationRoutes, adminRouter: adminVerificationRoutes } = require('./verification.routes');
const managerLocalGuideRoutes = require('./managerLocalGuide.routes');
const localGuideRoutes = require('./localGuide.routes');
const managerContentRoutes = require('./managerContent.routes');
const publicRoutes = require('./public.routes');
const journalRoutes = require('./journal.routes');
const plannerRoutes = require('./planner.routes');
const plannerChatRoutes = require('./plannerChat.routes');
const checkinRoutes = require('./checkin.routes');
const checkinHistoryRoutes = require('./checkin-history.routes');
const notificationRoutes = require('./notification.routes');
const sosRoutes = require('./sos.routes');
const groupRoutes = require('./group.routes');
const postRoutes = require('./post.routes');
const reportRoutes = require('./report.routes');

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
      adminVerification: '/api/admin/verification-requests',
      sitesAvailable: '/api/sites/available',
      journals: '/api/journals',
      planners: '/api/planners',
      plannerChat: '/api/planners/:id/messages',
      checkins: '/api/planner-items/:id/checkin',
      checkinHistory: '/api/checkins/me',
      notifications: '/api/notifications',
      sos: '/api/sos',
      groups: '/api/groups',
      posts: '/api/posts',
      reports: '/api/reports'
    }
  });
});

// Auth routes
router.use('/auth', authRoutes);

// Public Verification routes (Guest registration - no auth)
router.use('/verification', publicVerificationRoutes);

// Admin routes
router.use('/admin', adminRoutes);

// Admin Site routes
router.use('/admin/sites', adminSiteRoutes);

// Manager Site routes
router.use('/manager/sites', managerSiteRoutes);

// Public Site routes (for all authenticated users)
router.use('/sites', publicSiteRoutes);

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

// Public routes (Sites, Events, etc.) - includes /available endpoint
router.use('/sites', publicRoutes);

// Journal routes
router.use('/journals', journalRoutes);

// Planner routes
router.use('/planners', plannerRoutes);

// Planner Chat routes
router.use('/planners', plannerChatRoutes);

// Check-in routes
router.use('/planner-items', checkinRoutes);

// Check-in history routes
router.use('/checkins', checkinHistoryRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

// SOS routes
router.use('/sos', sosRoutes);

// Group routes
router.use('/groups', groupRoutes);

// Post routes
router.use('/posts', postRoutes);

// Report routes
router.use('/reports', reportRoutes);


module.exports = router;
