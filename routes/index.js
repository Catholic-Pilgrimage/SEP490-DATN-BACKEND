const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const { adminRouter: adminSiteRoutes, managerRouter: managerSiteRoutes, publicRouter: publicSiteRoutes } = require('./site.routes');
const { publicRouter: publicVerificationRoutes, pilgrimRouter: verificationRoutes, adminRouter: adminVerificationRoutes } = require('./verification.routes');
const managerLocalGuideRoutes = require('./managerLocalGuide.routes');
const managerDashboardRoutes = require('./managerDashboard.routes');
const localGuideRoutes = require('./localGuide.routes');
const localGuideDashboardRoutes = require('./localGuideDashboard.routes');
const pilgrimDashboardRoutes = require('./pilgrimDashboard.routes');
const managerContentRoutes = require('./managerContent.routes');
const publicRoutes = require('./public.routes');
const journalRoutes = require('./journal.routes');
const plannerRoutes = require('./planner.routes');
const plannerChatRoutes = require('./plannerChat.routes');
const checkinRoutes = require('./checkin.routes');
const checkinHistoryRoutes = require('./checkin-history.routes');
const notificationRoutes = require('./notification.routes');
const sosRoutes = require('./sos.routes');
const postRoutes = require('./post.routes');
const reportRoutes = require('./report.routes');
const walletRoutes = require('./wallet.routes');
const aiRoutes = require('./ai.routes');

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
      managerDashboard: '/api/manager/dashboard',
      managerContent: '/api/manager/content',
      localGuide: '/api/local-guide',
      localGuideDashboard: '/api/local-guide/dashboard',
      pilgrimDashboard: '/api/pilgrim/dashboard',
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
      posts: '/api/posts',
      reports: '/api/reports',
      wallet: '/api/wallet',
      ai: '/api/ai'
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

// Manager Dashboard routes
router.use('/manager/dashboard', managerDashboardRoutes);

// Manager Content routes (Media, Schedule, Event approval)
router.use('/manager/content', managerContentRoutes);

// Local Guide self routes
router.use('/local-guide', localGuideRoutes);

// Local Guide Dashboard routes
router.use('/local-guide/dashboard', localGuideDashboardRoutes);

// Pilgrim Dashboard routes
router.use('/pilgrim/dashboard', pilgrimDashboardRoutes);

// Verification routes (Pilgrim only)
router.use('/verification-requests', verificationRoutes);

// Admin Verification routes (Admin only)
router.use('/admin/verification-requests', adminVerificationRoutes);

// Public routes (Sites, Events, etc.) - includes /available endpoint
router.use('/sites', publicRoutes);

// Journal routes
router.use('/journals', journalRoutes);

// Public planner invite preview route (no auth required)
const { PilgrimPlannerShareController } = require('../controllers/pilgrim');
const i18nMiddleware = require('../middlewares/i18n.middleware');
router.get('/planners/invite/:token', i18nMiddleware, PilgrimPlannerShareController.getPlannerByInviteToken);

// Planner routes (authenticated)
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

// Post routes
router.use('/posts', postRoutes);

// Report routes
router.use('/reports', reportRoutes);

// Wallet routes (shared - all authenticated users)
router.use('/wallet', walletRoutes);

// AI routes (Google Gemini AI features)
router.use('/ai', aiRoutes);


module.exports = router;
