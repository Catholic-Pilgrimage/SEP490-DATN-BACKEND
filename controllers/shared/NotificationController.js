const NotificationService = require('../../services/shared/notificationService');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

/**
 * Get user's notifications
 */
exports.getNotifications = async (req, res) => {
    try {
        const { page, limit, unread_only } = req.query;
        const result = await NotificationService.getNotifications(req.user.id, {
            page,
            limit,
            unread_only
        });
        return ResponseUtil.success(res, result, req.__('notification.get_list_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Mark single notification as read
 */
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await NotificationService.markAsRead(id, req.user.id);
        return ResponseUtil.success(res, result, req.__('notification.mark_read_success'));
    } catch (error) {
        if (error.message === 'Notification not found') {
            return ResponseUtil.notFound(res, req.__('notification.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const result = await NotificationService.markAllAsRead(req.user.id);
        return ResponseUtil.success(res, result, req.__('notification.mark_all_read_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Register push token
 */
exports.registerPushToken = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
        }

        const { expo_token, platform, device_id } = req.body;
        const result = await NotificationService.registerPushToken(
            req.user.id,
            expo_token,
            platform,
            device_id
        );
        return ResponseUtil.success(res, result, req.__('notification.token_registered'));
    } catch (error) {
        if (error.message === 'Invalid Expo push token') {
            return ResponseUtil.badRequest(res, req.__('notification.invalid_token'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Revoke push token
 */
exports.revokePushToken = async (req, res) => {
    try {
        const { expo_token } = req.body;
        if (!expo_token) {
            return ResponseUtil.badRequest(res, req.__('notification.token_required'));
        }
        const result = await NotificationService.revokePushToken(expo_token);
        return ResponseUtil.success(res, result, req.__('notification.token_revoked'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Delete notification
 */
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await NotificationService.deleteNotification(id, req.user.id);
        return ResponseUtil.success(res, result, req.__('notification.delete_success'));
    } catch (error) {
        if (error.message === 'Notification not found') {
            return ResponseUtil.notFound(res, req.__('notification.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Delete all notifications
 */
exports.deleteAllNotifications = async (req, res) => {
    try {
        console.log('[DEBUG] Delete all notifications for user:', req.user.id);
        const result = await NotificationService.deleteAllNotifications(req.user.id);
        console.log('[DEBUG] Delete result:', result);
        return ResponseUtil.success(res, result, req.__('notification.delete_all_success'));
    } catch (error) {
        console.error('[ERROR] Delete all notifications error:', error);
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Delete all read notifications
 */
exports.deleteReadNotifications = async (req, res) => {
    try {
        console.log('[DEBUG] Delete read notifications for user:', req.user.id);
        const result = await NotificationService.deleteReadNotifications(req.user.id);
        console.log('[DEBUG] Delete read result:', result);
        return ResponseUtil.success(res, result, req.__('notification.delete_success'));
    } catch (error) {
        console.error('[ERROR] Delete read notifications error:', error);
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * TEST ONLY: Send test notification
 */
exports.sendTestNotification = async (req, res) => {
    try {
        const { type, data, user_id } = req.body;
        
        if (!type) {
            return ResponseUtil.badRequest(res, 'Notification type is required');
        }

        // Allow specifying user_id for testing, otherwise use authenticated user
        const targetUserId = user_id || req.user.id;

        const result = await NotificationService.sendTestNotification(targetUserId, type, data);
        return ResponseUtil.success(res, result, `Test notification sent to user ${targetUserId}`);
    } catch (error) {
        if (error.message.includes('Unknown notification type')) {
            return ResponseUtil.badRequest(res, error.message);
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * TEST ONLY: Send all notification types
 */
exports.sendAllTestNotifications = async (req, res) => {
    try {
        const { user_id } = req.body;
        
        // Allow specifying user_id for testing, otherwise use authenticated user
        const targetUserId = user_id || req.user.id;

        const result = await NotificationService.sendAllTestNotifications(targetUserId);
        return ResponseUtil.success(res, result, `Sent ${result.total} test notifications to user ${targetUserId}`);
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
