const { Expo } = require('expo-server-sdk');
const { Notification, UserPushToken, User } = require('../models');
const { Op } = require('sequelize');
const Logger = require('../utils/logger.util');
const { emitNotification } = require('../websockets/socket');

// Create Expo SDK client
const expo = new Expo();

// Notification title/message templates
const NOTIFICATION_TEMPLATES = {
    // LocalGuide notifications
    local_guide_created: {
        title: 'Chào mừng bạn đến với đội ngũ!',
        message: 'Bạn đã được thêm làm Hướng dẫn viên tại {{siteName}}'
    },
    local_guide_disabled: {
        title: 'Tài khoản bị tạm khóa',
        message: 'Tài khoản hướng dẫn viên của bạn đã bị tạm khóa'
    },
    local_guide_removed: {
        title: 'Tài khoản bị xóa',
        message: 'Bạn đã bị xóa khỏi đội ngũ hướng dẫn viên tại {{siteName}}'
    },

    // Shift notifications
    shift_assigned: {
        title: 'Lịch trực được duyệt',
        message: 'Lịch trực tuần {{weekStart}} đã được Manager duyệt'
    },
    shift_rejected: {
        title: 'Lịch trực bị từ chối',
        message: 'Lịch trực tuần {{weekStart}} đã bị từ chối: {{reason}}'
    },

    // Site notifications (for Manager)
    site_approved: {
        title: 'Địa điểm được phê duyệt',
        message: 'Địa điểm {{siteName}} đã được Admin phê duyệt'
    },
    site_rejected: {
        title: 'Địa điểm bị từ chối',
        message: 'Đơn đăng ký quản lý {{siteName}} đã bị từ chối: {{reason}}'
    },
    site_hidden: {
        title: 'Địa điểm bị ẩn',
        message: 'Địa điểm {{siteName}} đã bị Admin ẩn khỏi hệ thống'
    },

    // Content approval notifications
    media_approved: {
        title: 'Media được duyệt',
        message: 'Media của bạn tại {{siteName}} đã được duyệt'
    },
    media_rejected: {
        title: 'Media bị từ chối',
        message: 'Media của bạn đã bị từ chối: {{reason}}'
    },
    event_approved: {
        title: 'Sự kiện được duyệt',
        message: 'Sự kiện "{{eventName}}" đã được duyệt'
    },
    event_rejected: {
        title: 'Sự kiện bị từ chối',
        message: 'Sự kiện "{{eventName}}" đã bị từ chối: {{reason}}'
    },
    schedule_approved: {
        title: 'Lịch lễ được duyệt',
        message: 'Lịch lễ mới tại {{siteName}} đã được duyệt'
    },
    schedule_rejected: {
        title: 'Lịch lễ bị từ chối',
        message: 'Lịch lễ đã bị từ chối: {{reason}}'
    },
    nearby_place_approved: {
        title: 'Địa điểm lân cận được duyệt',
        message: 'Địa điểm "{{placeName}}" tại {{siteName}} đã được duyệt'
    },
    nearby_place_rejected: {
        title: 'Địa điểm lân cận bị từ chối',
        message: 'Địa điểm "{{placeName}}" đã bị từ chối: {{reason}}'
    },

    // Favorite site update
    favorite_site_update: {
        title: 'Cập nhật từ {{siteName}}',
        message: '{{siteName}} có {{updateType}} mới'
    },

    // Planner notifications
    planner_invite: {
        title: 'Lời mời tham gia kế hoạch',
        message: '{{inviterName}} đã mời bạn tham gia kế hoạch "{{plannerName}}"'
    },
    planner_joined: {
        title: 'Thành viên mới',
        message: '{{memberName}} đã tham gia kế hoạch "{{plannerName}}"'
    },

    // SOS notifications
    sos_created: {
        title: 'SOS mới',
        message: 'Có yêu cầu SOS mới tại {{siteName}}'
    },
    sos_assigned: {
        title: 'SOS được tiếp nhận',
        message: 'Yêu cầu SOS của bạn đang được xử lý'
    },
    sos_resolved: {
        title: 'SOS đã giải quyết',
        message: 'Yêu cầu SOS của bạn đã được giải quyết'
    },

    // Admin notifications
    verification_submitted: {
        title: 'Yêu cầu xác minh mới',
        message: '{{applicantName}} đã gửi yêu cầu xác minh tài khoản Manager'
    },
    site_registration_submitted: {
        title: 'Đăng ký địa điểm mới',
        message: '{{managerName}} đã đăng ký quản lý địa điểm "{{siteName}}"'
    },

    // Manager notifications (content submitted by LocalGuide)
    media_submitted: {
        title: 'Media mới cần duyệt',
        message: '{{guideName}} đã tải lên media mới'
    },
    event_submitted: {
        title: 'Sự kiện mới cần duyệt',
        message: '{{guideName}} đã tạo sự kiện "{{eventName}}"'
    },
    schedule_submitted: {
        title: 'Lịch lễ mới cần duyệt',
        message: '{{guideName}} đã thêm lịch lễ mới'
    },
    nearby_place_submitted: {
        title: 'Địa điểm lân cận cần duyệt',
        message: '{{guideName}} đã đề xuất địa điểm "{{placeName}}"'
    },
    shift_submitted: {
        title: 'Lịch trực mới cần duyệt',
        message: '{{guideName}} đã gửi lịch trực tuần {{weekStart}}'
    }
};

class NotificationService {
    /**
     * Replace template variables with actual values
     */
    static formatMessage(template, data) {
        let result = template;
        for (const [key, value] of Object.entries(data)) {
            result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
        }
        return result;
    }

    /**
     * Create notification (in-app + push)
     * @param {string} type - Notification type
     * @param {string} receiverId - User ID to receive notification
     * @param {object} data - Extra data (siteName, reason, etc.)
     */
    static async createNotification(type, receiverId, data = {}) {
        try {
            const template = NOTIFICATION_TEMPLATES[type];
            if (!template) {
                Logger.warn(`Unknown notification type: ${type}`);
                return null;
            }

            const title = this.formatMessage(template.title, data);
            const message = this.formatMessage(template.message, data);

            // 1. Create in-app notification
            const notification = await Notification.create({
                receiver_id: receiverId,
                type,
                title,
                message,
                data
            });

            Logger.info(`Notification created: ${type} for user ${receiverId}`);

            // 2. Send push notification (mobile)
            await this.sendPushNotification(receiverId, title, message, { type, ...data });

            // 3. Emit WebSocket event (web real-time)
            try {
                emitNotification(receiverId, notification);
            } catch (wsError) {
                Logger.warn('WebSocket emit failed:', wsError.message);
            }

            return notification;
        } catch (error) {
            Logger.error('Create notification error:', error);
            throw error;
        }
    }

    /**
     * Send push notification via Expo
     */
    static async sendPushNotification(userId, title, body, data = {}) {
        try {
            // Get active push tokens for user
            const tokens = await UserPushToken.findAll({
                where: { user_id: userId, status: 'active' }
            });

            if (tokens.length === 0) {
                Logger.info(`No push tokens for user ${userId}`);
                return;
            }

            // Build messages
            const messages = [];
            for (const tokenRecord of tokens) {
                if (!Expo.isExpoPushToken(tokenRecord.expo_token)) {
                    Logger.warn(`Invalid Expo token: ${tokenRecord.expo_token}`);
                    continue;
                }

                messages.push({
                    to: tokenRecord.expo_token,
                    sound: 'default',
                    title,
                    body,
                    data
                });
            }

            if (messages.length === 0) return;

            // Send in chunks
            const chunks = expo.chunkPushNotifications(messages);
            const tickets = [];

            for (const chunk of chunks) {
                try {
                    const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                    tickets.push(...ticketChunk);
                } catch (error) {
                    Logger.error('Expo push error:', error);
                }
            }

            // Handle invalid tokens
            for (let i = 0; i < tickets.length; i++) {
                const ticket = tickets[i];
                if (ticket.status === 'error') {
                    if (ticket.details?.error === 'DeviceNotRegistered') {
                        // Mark token as expired
                        await UserPushToken.update(
                            { status: 'expired' },
                            { where: { expo_token: tokens[i].expo_token } }
                        );
                        Logger.info(`Token expired: ${tokens[i].expo_token}`);
                    }
                }
            }

            // Update last_used_at for successful sends
            await UserPushToken.update(
                { last_used_at: new Date() },
                { where: { user_id: userId, status: 'active' } }
            );

            Logger.info(`Push sent to ${messages.length} devices for user ${userId}`);
        } catch (error) {
            Logger.error('Send push notification error:', error);
        }
    }

    /**
     * Get user's notifications with pagination
     */
    static async getNotifications(userId, filters = {}) {
        try {
            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 20;
            const offset = (page - 1) * limit;

            const where = { receiver_id: userId };
            if (filters.unread_only === 'true' || filters.unread_only === true) {
                where.is_read = false;
            }

            const { count, rows } = await Notification.findAndCountAll({
                where,
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            // Count unread
            const unreadCount = await Notification.count({
                where: { receiver_id: userId, is_read: false }
            });

            return {
                notifications: rows,
                unread_count: unreadCount,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            Logger.error('Get notifications error:', error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId, userId) {
        try {
            const notification = await Notification.findOne({
                where: { id: notificationId, receiver_id: userId }
            });

            if (!notification) {
                throw new Error('Notification not found');
            }

            await notification.update({ is_read: true });
            return notification;
        } catch (error) {
            Logger.error('Mark as read error:', error);
            throw error;
        }
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(userId) {
        try {
            const [updatedCount] = await Notification.update(
                { is_read: true },
                { where: { receiver_id: userId, is_read: false } }
            );
            return { updated: updatedCount };
        } catch (error) {
            Logger.error('Mark all as read error:', error);
            throw error;
        }
    }

    /**
     * Delete single notification
     */
    static async deleteNotification(notificationId, userId) {
        try {
            const notification = await Notification.findOne({
                where: { id: notificationId, receiver_id: userId }
            });

            if (!notification) {
                throw new Error('Notification not found');
            }

            await notification.destroy();
            Logger.info(`Notification ${notificationId} deleted by user ${userId}`);
            return { message: 'Notification deleted successfully' };
        } catch (error) {
            Logger.error('Delete notification error:', error);
            throw error;
        }
    }

    /**
     * Delete all notifications for a user
     */
    static async deleteAllNotifications(userId) {
        try {
            const deletedCount = await Notification.destroy({
                where: { receiver_id: userId }
            });
            Logger.info(`Deleted ${deletedCount} notifications for user ${userId}`);
            return { deleted: deletedCount };
        } catch (error) {
            Logger.error('Delete all notifications error:', error);
            throw error;
        }
    }

    /**
     * Register or update push token
     */
    static async registerPushToken(userId, expoToken, platform = null, deviceId = null) {
        try {
            if (!Expo.isExpoPushToken(expoToken)) {
                throw new Error('Invalid Expo push token');
            }

            // Check if token exists
            const existing = await UserPushToken.findOne({
                where: { expo_token: expoToken }
            });

            if (existing) {
                // Update existing token
                await existing.update({
                    user_id: userId,
                    platform,
                    device_id: deviceId,
                    status: 'active',
                    last_used_at: new Date()
                });
                Logger.info(`Push token updated for user ${userId}`);
                return existing;
            }


            const token = await UserPushToken.create({
                user_id: userId,
                expo_token: expoToken,
                platform,
                device_id: deviceId,
                status: 'active'
            });

            Logger.info(`Push token registered for user ${userId}`);
            return token;
        } catch (error) {
            Logger.error('Register push token error:', error);
            throw error;
        }
    }

    /**
     * Revoke push token
     */
    static async revokePushToken(expoToken) {
        try {
            const [updated] = await UserPushToken.update(
                { status: 'revoked' },
                { where: { expo_token: expoToken } }
            );
            Logger.info(`Push token revoked: ${expoToken}`);
            return { revoked: updated > 0 };
        } catch (error) {
            Logger.error('Revoke push token error:', error);
            throw error;
        }
    }

    /**
     * Delete notification
     */
    static async deleteNotification(notificationId, userId) {
        try {
            const deleted = await Notification.destroy({
                where: { id: notificationId, receiver_id: userId }
            });
            return { deleted: deleted > 0 };
        } catch (error) {
            Logger.error('Delete notification error:', error);
            throw error;
        }
    }

    /**
     * Notify all admin users
     */
    static async notifyAllAdmins(type, data = {}) {
        try {
            const admins = await User.findAll({
                where: { role: 'admin', status: 'active' },
                attributes: ['id']
            });

            const results = [];
            for (const admin of admins) {
                try {
                    const notification = await this.createNotification(type, admin.id, data);
                    results.push(notification);
                } catch (err) {
                    Logger.warn(`Failed to notify admin ${admin.id}:`, err.message);
                }
            }

            Logger.info(`Notified ${results.length} admins for ${type}`);
            return results;
        } catch (error) {
            Logger.error('Notify all admins error:', error);
            throw error;
        }
    }

    /**
     * Notify manager of a specific site
     */
    static async notifySiteManager(siteId, type, data = {}) {
        try {
            const manager = await User.findOne({
                where: { site_id: siteId, role: 'manager', status: 'active' }
            });

            if (!manager) {
                Logger.warn(`No manager found for site ${siteId}`);
                return null;
            }

            return await this.createNotification(type, manager.id, data);
        } catch (error) {
            Logger.error('Notify site manager error:', error);
            throw error;
        }
    }
}

module.exports = NotificationService;
