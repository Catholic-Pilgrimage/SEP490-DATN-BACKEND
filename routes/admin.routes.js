const express = require('express');
const router = express.Router();
const { AdminUserController, AdminDashboardController, AdminFinanceController, AiPromptController } = require('../controllers/admin');
const ReportController = require('../controllers/ReportController');
const AdminValidator = require('../validators/admin.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');
const { handleValidationErrors } = require('../utils/validation.util');

// Apply middlewares
router.use(i18nMiddleware);
router.use(authMiddleware);
router.use(authMiddleware.authorize('admin'));

// User routes
router.get('/users', AdminValidator.getUsers, AdminUserController.getUsers);
router.get('/users/:id', AdminValidator.validateUserId, AdminUserController.getUserById);
router.put('/users/:id', AdminValidator.updateUser, AdminUserController.updateUser);
router.patch('/users/:id/status', AdminValidator.updateUserStatus, AdminUserController.updateUserStatus);

// Dashboard routes
router.get('/dashboard/overview', AdminDashboardController.getOverview);
router.get('/dashboard/analytics/users-growth', AdminDashboardController.getUserGrowth);
router.get('/dashboard/analytics/checkins', AdminDashboardController.getCheckinsAnalytics);
router.get('/dashboard/analytics/popular-sites', AdminDashboardController.getPopularSites);
router.get('/dashboard/analytics/sos-by-site', AdminDashboardController.getSOSBySite);

// Finance routes
router.get('/dashboard/finance', AdminFinanceController.getFinanceDashboard);
router.get('/wallet/transactions', AdminFinanceController.getAllTransactions);
router.get('/wallet/transactions/:id', AdminValidator.validateTransactionId, handleValidationErrors, AdminFinanceController.getTransactionDetail);
router.get('/wallet/escrow', AdminFinanceController.getEscrowSummary);
router.get('/wallet/withdrawals', AdminFinanceController.getWithdrawals);

// Report routes (using existing ReportController)
router.get('/reports', ReportController.getReports);
router.get('/reports/:id', ReportController.getReportById);
router.put('/reports/:id/resolve', ReportController.resolveReport);

// AI Prompt Management routes
router.get('/ai-prompts', AiPromptController.getAllPrompts);
router.get('/ai-prompts/:key', AdminValidator.getAiPromptByKey, handleValidationErrors, AiPromptController.getPromptByKey);
router.put('/ai-prompts/:key', AdminValidator.updateAiPromptByKey, handleValidationErrors, AiPromptController.updatePromptByKey);

module.exports = router;
