/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Notification ID
 *         receiver_id:
 *           type: string
 *           format: uuid
 *           description: User ID who receives the notification
 *         type:
 *           type: string
 *           enum:
 *             - local_guide_created
 *             - local_guide_disabled
 *             - shift_assigned
 *             - shift_rejected
 *             - site_update_submitted
 *             - site_approved
 *             - site_rejected
 *             - site_hidden
 *             - media_approved
 *             - media_rejected
 *             - event_approved
 *             - event_rejected
 *             - schedule_approved
 *             - schedule_rejected
 *             - sos_created
 *             - sos_assigned
 *             - sos_resolved
 *             - planner_invite
 *             - planner_joined
 *             - favorite_site_update
 *           description: Type of notification
 *         title:
 *           type: string
 *           description: Notification title
 *         message:
 *           type: string
 *           description: Notification message
 *         data:
 *           type: object
 *           description: Additional data (JSON)
 *         is_read:
 *           type: boolean
 *           description: Read status
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *       example:
 *         id: "e5ff7548-dc76-4a55-8e22-734bf7a14f51"
 *         receiver_id: "4d53e540-e90d-486c-90a3-970fbd59dc9e"
 *         type: "planner_invite"
 *         title: "Lời mời tham gia kế hoạch"
 *         message: "Admin Test đã mời bạn tham gia kế hoạch Hành trình Sài Gòn"
 *         data:
 *           planner_name: "Hành trình Sài Gòn"
 *           inviter_name: "Admin Test"
 *         is_read: false
 *         created_at: "2025-01-28T10:30:00Z"
 *
 *     UserPushToken:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Token ID
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: User ID
 *         expo_token:
 *           type: string
 *           description: Expo push token
 *         device_id:
 *           type: string
 *           description: Device identifier
 *         platform:
 *           type: string
 *           enum: [ios, android]
 *           description: Device platform
 *         status:
 *           type: string
 *           enum: [active, expired, revoked]
 *           description: Token status
 *         last_used_at:
 *           type: string
 *           format: date-time
 *           description: Last time token was used
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *       example:
 *         id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         user_id: "4d53e540-e90d-486c-90a3-970fbd59dc9e"
 *         expo_token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
 *         device_id: "device-123"
 *         platform: "android"
 *         status: "active"
 *         last_used_at: "2025-01-28T10:30:00Z"
 *         created_at: "2025-01-28T10:00:00Z"
 *         updated_at: "2025-01-28T10:30:00Z"
 *
 *     NotificationTypes:
 *       type: string
 *       enum:
 *         - local_guide_created
 *         - local_guide_disabled
 *         - shift_assigned
 *         - shift_rejected
 *         - site_update_submitted
 *         - site_approved
 *         - site_rejected
 *         - site_hidden
 *         - media_approved
 *         - media_rejected
 *         - event_approved
 *         - event_rejected
 *         - schedule_approved
 *         - schedule_rejected
 *         - sos_created
 *         - sos_assigned
 *         - sos_resolved
 *         - planner_invite
 *         - planner_joined
 *         - favorite_site_update
 *       description: |
 *         Available notification types:
 *         - **local_guide_created**: Manager tạo local guide mới
 *         - **local_guide_disabled**: Manager vô hiệu hóa local guide
 *         - **shift_assigned**: Local guide được phân công lịch trực
 *         - **shift_rejected**: Lịch trực bị từ chối
 *         - **site_update_submitted**: Manager submit cập nhật site
 *         - **site_approved**: Site được duyệt
 *         - **site_rejected**: Site bị từ chối
 *         - **site_hidden**: Site bị ẩn
 *         - **media_approved**: Media được duyệt
 *         - **media_rejected**: Media bị từ chối
 *         - **event_approved**: Event được duyệt
 *         - **event_rejected**: Event bị từ chối
 *         - **schedule_approved**: Schedule được duyệt
 *         - **schedule_rejected**: Schedule bị từ chối
 *         - **sos_created**: SOS được tạo
 *         - **sos_assigned**: SOS được phân công
 *         - **sos_resolved**: SOS được giải quyết
 *         - **planner_invite**: Lời mời tham gia planner
 *         - **planner_joined**: User tham gia planner
 *         - **favorite_site_update**: Site yêu thích có cập nhật
 */

module.exports = {};
