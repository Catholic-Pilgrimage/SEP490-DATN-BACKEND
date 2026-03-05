const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/shared/NotificationController');
const NotificationValidator = require('../validators/notification.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

// Apply i18n middleware
router.use(i18nMiddleware);



// GET /api/notifications - Get user's notifications
router.get(
    '/',
    authMiddleware,
    NotificationController.getNotifications
);

// PATCH /api/notifications/read-all - Mark all as read
router.patch(
    '/read-all',
    authMiddleware,
    NotificationController.markAllAsRead
);

// DELETE /api/notifications - Delete all notifications
router.delete(
    '/',
    authMiddleware,
    NotificationController.deleteAllNotifications
);

// POST /api/notifications/token - Register push token (BEFORE /:id)
router.post(
    '/token',
    authMiddleware,
    NotificationValidator.registerToken,
    NotificationController.registerPushToken
);

// DELETE /api/notifications/token - Revoke push token (BEFORE /:id)
router.delete(
    '/token',
    authMiddleware,
    NotificationController.revokePushToken
);

// DELETE /api/notifications/read - Delete all read notifications (BEFORE /:id)
router.delete(
    '/read',
    authMiddleware,
    NotificationController.deleteReadNotifications
);

// PATCH /api/notifications/:id/read - Mark single as read
router.patch(
    '/:id/read',
    authMiddleware,
    NotificationController.markAsRead
);

// DELETE /api/notifications/:id - Delete notification
router.delete(
    '/:id',
    authMiddleware,
    NotificationController.deleteNotification
);

// POST /api/notifications/test - Send test notification (DEV ONLY)
router.post(
    '/test',
    authMiddleware,
    NotificationValidator.testNotification,
    NotificationController.sendTestNotification
);

// POST /api/notifications/test/all - Send all notification types (DEV ONLY)
router.post(
    '/test/all',
    authMiddleware,
    NotificationValidator.testAllNotifications,
    NotificationController.sendAllTestNotifications
);

module.exports = router;
