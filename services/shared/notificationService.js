const { Expo } = require('expo-server-sdk');
const { Notification, UserPushToken, User } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const { emitNotification } = require('../../websockets/socket');

// Create Expo SDK client
const expo = new Expo();

// Notification title/message templates (multilingual)
const NOTIFICATION_TEMPLATES = {
    // LocalGuide notifications
    local_guide_created: {
        vi: {
            title: 'Chào mừng bạn đến với đội ngũ!',
            message: 'Bạn đã được thêm làm Hướng dẫn viên tại {{siteName}}'
        },
        en: {
            title: 'Welcome to the team!',
            message: 'You have been added as a Local Guide at {{siteName}}'
        }
    },
    local_guide_disabled: {
        vi: {
            title: 'Tài khoản bị tạm khóa',
            message: 'Tài khoản hướng dẫn viên của bạn đã bị tạm khóa'
        },
        en: {
            title: 'Account suspended',
            message: 'Your local guide account has been suspended'
        }
    },
    local_guide_removed: {
        vi: {
            title: 'Tài khoản bị xóa',
            message: 'Bạn đã bị xóa khỏi đội ngũ hướng dẫn viên tại {{siteName}}'
        },
        en: {
            title: 'Account removed',
            message: 'You have been removed from the local guide team at {{siteName}}'
        }
    },

    // Shift notifications
    shift_assigned: {
        vi: {
            title: 'Lịch trực được duyệt',
            message: 'Lịch trực tuần {{weekStart}} đã được Manager duyệt'
        },
        en: {
            title: 'Shift approved',
            message: 'Your shift for week {{weekStart}} has been approved by Manager'
        }
    },
    shift_rejected: {
        vi: {
            title: 'Lịch trực bị từ chối',
            message: 'Lịch trực tuần {{weekStart}} đã bị từ chối: {{reason}}'
        },
        en: {
            title: 'Shift rejected',
            message: 'Your shift for week {{weekStart}} was rejected: {{reason}}'
        }
    },

    // Site notifications (for Manager)
    site_approved: {
        vi: {
            title: 'Địa điểm được phê duyệt',
            message: 'Địa điểm {{siteName}} đã được Admin phê duyệt'
        },
        en: {
            title: 'Site approved',
            message: 'Site {{siteName}} has been approved by Admin'
        }
    },
    site_rejected: {
        vi: {
            title: 'Địa điểm bị từ chối',
            message: 'Đơn đăng ký quản lý {{siteName}} đã bị từ chối: {{reason}}'
        },
        en: {
            title: 'Site rejected',
            message: 'Your application to manage {{siteName}} was rejected: {{reason}}'
        }
    },
    site_hidden: {
        vi: {
            title: 'Địa điểm bị ẩn',
            message: 'Địa điểm {{siteName}} đã bị Admin ẩn khỏi hệ thống'
        },
        en: {
            title: 'Site hidden',
            message: 'Site {{siteName}} has been hidden by Admin'
        }
    },

    // Content approval notifications
    media_approved: {
        vi: {
            title: 'Media được duyệt',
            message: 'Media của bạn tại {{siteName}} đã được duyệt'
        },
        en: {
            title: 'Media approved',
            message: 'Your media at {{siteName}} has been approved'
        }
    },
    media_rejected: {
        vi: {
            title: 'Media bị từ chối',
            message: 'Media của bạn đã bị từ chối: {{reason}}'
        },
        en: {
            title: 'Media rejected',
            message: 'Your media was rejected: {{reason}}'
        }
    },
    event_approved: {
        vi: {
            title: 'Sự kiện được duyệt',
            message: 'Sự kiện "{{eventName}}" đã được duyệt'
        },
        en: {
            title: 'Event approved',
            message: 'Event "{{eventName}}" has been approved'
        }
    },
    event_rejected: {
        vi: {
            title: 'Sự kiện bị từ chối',
            message: 'Sự kiện "{{eventName}}" đã bị từ chối: {{reason}}'
        },
        en: {
            title: 'Event rejected',
            message: 'Event "{{eventName}}" was rejected: {{reason}}'
        }
    },
    schedule_approved: {
        vi: {
            title: 'Lịch lễ được duyệt',
            message: 'Lịch lễ mới tại {{siteName}} đã được duyệt'
        },
        en: {
            title: 'Schedule approved',
            message: 'New mass schedule at {{siteName}} has been approved'
        }
    },
    schedule_rejected: {
        vi: {
            title: 'Lịch lễ bị từ chối',
            message: 'Lịch lễ đã bị từ chối: {{reason}}'
        },
        en: {
            title: 'Schedule rejected',
            message: 'Mass schedule was rejected: {{reason}}'
        }
    },
    nearby_place_approved: {
        vi: {
            title: 'Địa điểm lân cận được duyệt',
            message: 'Địa điểm "{{placeName}}" tại {{siteName}} đã được duyệt'
        },
        en: {
            title: 'Nearby place approved',
            message: 'Place "{{placeName}}" at {{siteName}} has been approved'
        }
    },
    nearby_place_rejected: {
        vi: {
            title: 'Địa điểm lân cận bị từ chối',
            message: 'Địa điểm "{{placeName}}" đã bị từ chối: {{reason}}'
        },
        en: {
            title: 'Nearby place rejected',
            message: 'Place "{{placeName}}" was rejected: {{reason}}'
        }
    },
    narrative_approved: {
        vi: {
            title: 'Thuyết minh được duyệt',
            message: 'Thuyết minh âm thanh tại {{siteName}} đã được Manager duyệt'
        },
        en: {
            title: 'Narrative approved',
            message: 'Audio narrative at {{siteName}} has been approved by Manager'
        }
    },
    narrative_rejected: {
        vi: {
            title: 'Thuyết minh bị từ chối',
            message: 'Thuyết minh đã bị từ chối: {{reason}}'
        },
        en: {
            title: 'Narrative rejected',
            message: 'Narrative was rejected: {{reason}}'
        }
    },

    // Favorite site update
    favorite_site_update: {
        vi: {
            title: 'Cập nhật từ {{siteName}}',
            message: '{{siteName}} có {{updateType}} mới'
        },
        en: {
            title: 'Update from {{siteName}}',
            message: '{{siteName}} has new {{updateType}}'
        }
    },

    // Planner notifications
    planner_invite: {
        vi: {
            title: 'Lời mời tham gia kế hoạch',
            message: '{{inviterName}} đã mời bạn tham gia kế hoạch "{{plannerName}}"'
        },
        en: {
            title: 'Planner invitation',
            message: '{{inviterName}} invited you to join planner "{{plannerName}}"'
        }
    },
    planner_joined: {
        vi: {
            title: 'Thành viên mới',
            message: '{{memberName}} đã tham gia kế hoạch "{{plannerName}}"'
        },
        en: {
            title: 'New member',
            message: '{{memberName}} joined planner "{{plannerName}}"'
        }
    },
    planner_kicked: {
        vi: {
            title: 'Bạn đã bị xóa khỏi nhóm',
            message: 'Bạn đã bị xóa khỏi kế hoạch "{{plannerName}}" bởi chủ nhóm'
        },
        en: {
            title: 'Removed from planner',
            message: 'You have been removed from planner "{{plannerName}}" by the owner'
        }
    },
    planner_deposit_refunded: {
        vi: {
            title: 'Hoàn tiền cọc',
            message: 'Tiền cọc {{amount}} VND cho kế hoạch "{{plannerName}}" đã được hoàn vào ví của bạn'
        },
        en: {
            title: 'Deposit refunded',
            message: 'Your deposit of {{amount}} VND for planner "{{plannerName}}" has been refunded to your wallet'
        }
    },
    planner_member_left: {
        vi: {
            title: 'Thành viên rời nhóm',
            message: '{{memberName}} đã rời khỏi kế hoạch "{{plannerName}}"'
        },
        en: {
            title: 'Member left',
            message: '{{memberName}} has left planner "{{plannerName}}"'
        }
    },

    planner_first_checkin: {
        vi: {
            title: 'Đã có người check-in',
            message: 'Đã có thành viên check-in tại {{siteName}} trong kế hoạch "{{plannerName}}". Hãy check-in trước khi điểm đến bị chốt.'
        },
        en: {
            title: 'Someone checked in',
            message: 'A group member has checked in at {{siteName}} in planner "{{plannerName}}". Please check in before this stop is closed.'
        }
    },
    planner_item_missed: {
        vi: {
            title: 'Bạn đã bị đánh dấu là không đến',
            message: 'Trưởng đoàn đã chốt điểm {{siteName}} trong kế hoạch "{{plannerName}}" khi bạn chưa check-in. Lý do: {{reason}}.'
        },
        en: {
            title: 'You were marked missed',
            message: 'The leader closed stop {{siteName}} in planner "{{plannerName}}" before you checked in. Reason: {{reason}}.'
        }
    },
    planner_item_skipped: {
        vi: {
            title: 'Địa điểm đã được bỏ qua',
            message: 'Điểm {{siteName}} đã được bỏ qua. Lý do: {{reason}}. Hãy di chuyển tới điểm tiếp theo {{nextSiteName}}.'
        },
        en: {
            title: 'Stop skipped',
            message: '{{siteName}} was skipped. Reason: {{reason}}. Please move to the next stop: {{nextSiteName}}.'
        }
    },
    planner_item_skipped_last: {
        vi: {
            title: 'Địa điểm đã được bỏ qua',
            message: 'Điểm {{siteName}} đã được bỏ qua. Lý do: {{reason}}.'
        },
        en: {
            title: 'Stop skipped',
            message: '{{siteName}} was skipped. Reason: {{reason}}.'
        }
    },
    planner_item_added: {
        vi: {
            title: 'Lịch trình đã được cập nhật',
            message: 'Lịch trình đã được cập nhật: thêm {{siteName}} vào ngày {{day}} lúc {{time}}.'
        },
        en: {
            title: 'Itinerary updated',
            message: 'The itinerary was updated: {{siteName}} was added on day {{day}} at {{time}}.'
        }
    },
    planner_schedule_changed: {
        vi: {
            title: 'Lịch trình đã thay đổi',
            message: 'Lịch trình đã thay đổi. Điểm tiếp theo là {{siteName}} lúc {{time}}.'
        },
        en: {
            title: 'Schedule changed',
            message: 'The itinerary has changed. The next stop is {{siteName}} at {{time}}.'
        }
    },
    planner_edit_locked: {
        vi: {
            title: 'Kế hoạch đã khóa chỉnh sửa',
            message: 'Chủ nhóm đã khóa chỉnh sửa kế hoạch "{{plannerName}}".'
        },
        en: {
            title: 'Planner edit locked',
            message: 'The owner has locked edits for planner "{{plannerName}}".'
        }
    },
    planner_started: {
        vi: {
            title: 'Chuyến đi đã bắt đầu',
            message: 'Kế hoạch "{{plannerName}}" đã chính thức bắt đầu. Hãy chuẩn bị check-in tại điểm đầu tiên!'
        },
        en: {
            title: 'Trip started',
            message: 'Planner "{{plannerName}}" has officially started. Get ready to check in at the first stop!'
        }
    },
    planner_locked: {
        vi: {
            title: 'Kế hoạch đã được chốt',
            message: 'Kế hoạch "{{plannerName}}" đã được chốt và sẵn sàng khởi hành.'
        },
        en: {
            title: 'Planner locked',
            message: 'Planner "{{plannerName}}" has been locked and is ready to start.'
        }
    },

    // SOS notifications
    sos_created: {
        vi: {
            title: 'SOS mới',
            message: 'Có yêu cầu SOS mới tại {{siteName}}'
        },
        en: {
            title: 'New SOS',
            message: 'New SOS request at {{siteName}}'
        }
    },
    sos_assigned_to_guide: {
        vi: {
            title: 'Bạn được phân công xử lý SOS',
            message: 'Bạn được phân công hỗ trợ {{pilgrimName}} tại {{siteName}}'
        },
        en: {
            title: 'You were assigned an SOS',
            message: 'You were assigned to help {{pilgrimName}} at {{siteName}}'
        }
    },
    sos_planner_alert: {
        vi: {
            title: '🚨 THÔNG BÁO KHẨN CẤP TỪ THÀNH VIÊN',
            message: 'Thành viên {{pilgrimName}} trong đoàn vừa gửi tín hiệu SOS cần hỗ trợ ngay lập tức!'
        },
        en: {
            title: '🚨 URGENT: MEMBER NEEDS HELP',
            message: 'Group member {{pilgrimName}} just triggered an SOS and needs immediate assistance!'
        }
    },
    sos_assigned: {
        vi: {
            title: 'SOS được tiếp nhận',
            message: 'Yêu cầu SOS của bạn đang được xử lý'
        },
        en: {
            title: 'SOS assigned',
            message: 'Your SOS request is being handled'
        }
    },
    sos_resolved: {
        vi: {
            title: 'SOS đã giải quyết',
            message: 'Yêu cầu SOS của bạn đã được giải quyết'
        },
        en: {
            title: 'SOS resolved',
            message: 'Your SOS request has been resolved'
        }
    },

    // Admin notifications
    verification_submitted: {
        vi: {
            title: 'Yêu cầu xác minh mới',
            message: '{{applicantName}} đã gửi yêu cầu xác minh tài khoản Manager'
        },
        en: {
            title: 'New verification request',
            message: '{{applicantName}} submitted a Manager account verification request'
        }
    },
    site_registration_submitted: {
        vi: {
            title: 'Đăng ký địa điểm mới',
            message: '{{managerName}} đã đăng ký quản lý địa điểm "{{siteName}}"'
        },
        en: {
            title: 'New site registration',
            message: '{{managerName}} registered to manage site "{{siteName}}"'
        }
    },
    site_ready_for_publish: {
        vi: {
            title: 'Địa điểm sẵn sàng Active',
            message: 'Địa điểm "{{siteName}}" ({{siteCode}}) đã được cập nhật đủ thông tin cơ bản. Admin có thể xem xét Active.'
        },
        en: {
            title: 'Site ready for Publish',
            message: 'Site "{{siteName}}" ({{siteCode}}) is now fully populated. Admin can review and activate it.'
        }
    },

    // Manager notifications (content submitted by LocalGuide)
    media_submitted: {
        vi: {
            title: 'Media mới cần duyệt',
            message: '{{guideName}} đã tải lên media mới'
        },
        en: {
            title: 'New media for review',
            message: '{{guideName}} uploaded new media'
        }
    },
    event_submitted: {
        vi: {
            title: 'Sự kiện mới cần duyệt',
            message: '{{guideName}} đã tạo sự kiện "{{eventName}}"'
        },
        en: {
            title: 'New event for review',
            message: '{{guideName}} created event "{{eventName}}"'
        }
    },
    schedule_submitted: {
        vi: {
            title: 'Lịch lễ mới cần duyệt',
            message: '{{guideName}} đã thêm lịch lễ mới'
        },
        en: {
            title: 'New schedule for review',
            message: '{{guideName}} added new mass schedule'
        }
    },
    nearby_place_submitted: {
        vi: {
            title: 'Địa điểm lân cận cần duyệt',
            message: '{{guideName}} đã đề xuất địa điểm "{{placeName}}"'
        },
        en: {
            title: 'New nearby place for review',
            message: '{{guideName}} suggested place "{{placeName}}"'
        }
    },
    shift_submitted: {
        vi: {
            title: 'Lịch trực mới cần duyệt',
            message: '{{guideName}} đã gửi lịch trực tuần {{weekStart}}'
        },
        en: {
            title: 'New shift for review',
            message: '{{guideName}} submitted shift for week {{weekStart}}'
        }
    },

    // Review notifications
    new_site_review: {
        vi: {
            title: 'Đánh giá mới',
            message: '{{reviewerName}} đã đánh giá {{siteName}} - ⭐ {{rating}}/5'
        },
        en: {
            title: 'New review',
            message: '{{reviewerName}} reviewed {{siteName}} - ⭐ {{rating}}/5'
        }
    },

    review_replied: {
        vi: {
            title: 'Đánh giá của bạn đã được phản hồi',
            message: '{{siteName}} đã phản hồi đánh giá của bạn'
        },
        en: {
            title: 'Your review got a reply',
            message: '{{siteName}} replied to your review'
        }
    },

    // Report penalty notifications
    content_deleted: {
        vi: {
            title: 'Nội dung của bạn đã bị gỡ',
            message: '{{snippet}} đã bị gỡ do vi phạm tiêu chuẩn cộng đồng.{{adminNote}}'
        },
        en: {
            title: 'Your content has been removed',
            message: '{{snippet}} was removed for violating community standards.{{adminNote}}'
        }
    },
    content_warning: {
        vi: {
            title: 'Cảnh cáo vi phạm nội dung',
            message: '{{snippet}} đã bị báo cáo vi phạm tiêu chuẩn cộng đồng.{{adminNote}}'
        },
        en: {
            title: 'Content violation warning',
            message: '{{snippet}} was reported for violating community standards.{{adminNote}}'
        }
    },

    // Friendship notifications
    friend_request: {
        vi: {
            title: 'Lời mời kết bạn',
            message: '{{requesterName}} đã gửi lời mời kết bạn'
        },
        en: {
            title: 'Friend request',
            message: '{{requesterName}} sent you a friend request'
        }
    },
    friend_accepted: {
        vi: {
            title: 'Kết bạn thành công',
            message: 'Bạn và {{friendName}} đã trở thành bạn bè'
        },
        en: {
            title: 'Friend request accepted',
            message: 'You and {{friendName}} are now friends'
        }
    },
    planner_friend_invite: {
        vi: {
            title: 'Lời mời tham gia kế hoạch',
            message: '{{inviterName}} đã mời bạn tham gia kế hoạch "{{plannerName}}" (không cần cọc)'
        },
        en: {
            title: 'Planner invitation from friend',
            message: '{{inviterName}} invited you to join planner "{{plannerName}}" (no deposit required)'
        }
    },

    // Post notifications
    post_liked: {
        vi: {
            title: 'Lượt thích mới',
            message: '{{likerName}} đã thích bài viết của bạn'
        },
        en: {
            title: 'New like',
            message: '{{likerName}} liked your post'
        }
    },
    post_commented: {
        vi: {
            title: 'Bình luận mới',
            message: '{{commenterName}} đã bình luận về bài viết của bạn'
        },
        en: {
            title: 'New comment',
            message: '{{commenterName}} commented on your post'
        }
    },
    post_comment_replied: {
        vi: {
            title: 'Phản hồi mới',
            message: '{{replierName}} đã phản hồi bình luận của bạn'
        },
        en: {
            title: 'New reply',
            message: '{{replierName}} replied to your comment'
        }
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

            // Get user language preference
            const receiver = await User.findByPk(receiverId, {
                attributes: ['language']
            });
            const userLanguage = receiver?.language || 'vi'; // Default to Vietnamese

            // Get template in user's language
            const localizedTemplate = template[userLanguage] || template.vi; // Fallback to Vietnamese

            const title = this.formatMessage(localizedTemplate.title, data);
            const message = this.formatMessage(localizedTemplate.message, data);

            // 1. Create in-app notification
            const notification = await Notification.create({
                receiver_id: receiverId,
                type,
                title,
                message,
                data
            });

            Logger.info(`Notification created: ${type} for user ${receiverId} (lang: ${userLanguage})`);

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
     * Delete all read notifications for a user
     */
    static async deleteReadNotifications(userId) {
        try {
            const deletedCount = await Notification.destroy({
                where: {
                    receiver_id: userId,
                    is_read: true
                }
            });
            Logger.info(`Deleted ${deletedCount} read notifications for user ${userId}`);
            return { deleted: deletedCount };
        } catch (error) {
            Logger.error('Delete read notifications error:', error);
            throw error;
        }
    }

    /**
     * TEST ONLY: Send test notification
     */
    static async sendTestNotification(userId, type, customData = {}) {
        try {
            const template = NOTIFICATION_TEMPLATES[type];
            if (!template) {
                throw new Error(`Unknown notification type: ${type}`);
            }

            // Use custom data or default test data
            const testData = {
                siteName: 'Test Site',
                guideName: 'Test Guide',
                eventName: 'Test Event',
                placeName: 'Test Place',
                weekStart: new Date().toLocaleDateString('vi-VN'),
                reason: 'Test reason',
                ...customData
            };

            return await this.createNotification(type, userId, testData);
        } catch (error) {
            Logger.error('Send test notification error:', error);
            throw error;
        }
    }

    /**
     * TEST ONLY: Send all notification types
     */
    static async sendAllTestNotifications(userId) {
        try {
            const allTypes = Object.keys(NOTIFICATION_TEMPLATES);
            const results = [];

            for (const type of allTypes) {
                try {
                    const notification = await this.sendTestNotification(userId, type);
                    results.push({ type, success: true, id: notification.id });
                } catch (error) {
                    results.push({ type, success: false, error: error.message });
                }
            }

            Logger.info(`Sent ${results.length} test notifications to user ${userId}`);
            return { total: results.length, results };
        } catch (error) {
            Logger.error('Send all test notifications error:', error);
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

    // Notify all users who favorited a site about updates
    static async notifyFavoriteSiteUsers(siteId, updateType) {
        try {
            const { UserFavorite, Site } = require('../../models');

            const site = await Site.findByPk(siteId);
            if (!site) {
                Logger.warn(`Site ${siteId} not found for favorite notification`);
                return;
            }

            const favorites = await UserFavorite.findAll({
                where: { site_id: siteId }
            });

            if (favorites.length === 0) {
                Logger.info(`No users favorited site ${site.name}`);
                return;
            }

            Logger.info(`Notifying ${favorites.length} users about ${updateType} at ${site.name}`);

            for (const fav of favorites) {
                try {
                    await this.createNotification('favorite_site_update', fav.user_id, {
                        siteName: site.name,
                        updateType: updateType
                    });
                } catch (err) {
                    Logger.error(`Failed to notify user ${fav.user_id}:`, err);
                }
            }
        } catch (error) {
            Logger.error('Notify favorite site users error:', error);

        }
    }
}

module.exports = NotificationService;
