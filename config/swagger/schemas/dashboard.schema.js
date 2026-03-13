/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardFilterApplied:
 *       type: object
 *       properties:
 *         period:
 *           type: string
 *           enum: [all, today, week, month, custom]
 *           example: "month"
 *           description: "Khoảng thời gian được áp dụng"
 *         from_date:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2026-03-01"
 *           description: "Ngày bắt đầu (chỉ có khi period=custom)"
 *         to_date:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2026-03-14"
 *           description: "Ngày kết thúc (chỉ có khi period=custom)"
 *
 *     DashboardUsersStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 1500
 *           description: "Tổng số người dùng (có thể được lọc theo thời gian)"
 *         by_role:
 *           type: object
 *           properties:
 *             pilgrim:
 *               type: integer
 *               example: 1200
 *             local_guide:
 *               type: integer
 *               example: 250
 *             manager:
 *               type: integer
 *               example: 48
 *             admin:
 *               type: integer
 *               example: 2
 *         new_this_month:
 *           type: integer
 *           example: 85
 *           description: "Người dùng mới trong tháng này"
 *         banned:
 *           type: integer
 *           example: 5
 *           description: "Số người dùng bị cấm (có thể được lọc theo thời gian)"
 *
 *     DashboardSitesStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 150
 *           description: "Tổng số địa điểm (không lọc theo thời gian)"
 *         active:
 *           type: integer
 *           example: 145
 *         inactive:
 *           type: integer
 *           example: 5
 *         by_region:
 *           type: object
 *           properties:
 *             Bac:
 *               type: integer
 *               example: 60
 *             Trung:
 *               type: integer
 *               example: 45
 *             Nam:
 *               type: integer
 *               example: 45
 *         by_type:
 *           type: object
 *           properties:
 *             church:
 *               type: integer
 *               example: 80
 *             shrine:
 *               type: integer
 *               example: 40
 *             monastery:
 *               type: integer
 *               example: 20
 *             center:
 *               type: integer
 *               example: 10
 *             other:
 *               type: integer
 *               example: 0
 *
 *     DashboardPlannersStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 850
 *           description: "Tổng số kế hoạch (có thể được lọc theo thời gian)"
 *         planning:
 *           type: integer
 *           example: 200
 *         ongoing:
 *           type: integer
 *           example: 150
 *         completed:
 *           type: integer
 *           example: 500
 *
 *     DashboardCheckinsStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 5200
 *           description: "Tổng số check-in (có thể được lọc theo thời gian)"
 *         today:
 *           type: integer
 *           example: 45
 *         this_week:
 *           type: integer
 *           example: 320
 *         this_month:
 *           type: integer
 *           example: 1200
 *
 *     DashboardJournalsStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 3500
 *           description: "Tổng số nhật ký (có thể được lọc theo thời gian)"
 *         public:
 *           type: integer
 *           example: 2100
 *         private:
 *           type: integer
 *           example: 1400
 *         this_month:
 *           type: integer
 *           example: 280
 *
 *     DashboardPostsStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 4200
 *           description: "Tổng số bài viết (có thể được lọc theo thời gian)"
 *         this_month:
 *           type: integer
 *           example: 350
 *         total_likes:
 *           type: integer
 *           example: 15000
 *           description: "Tổng số lượt thích (có thể được lọc theo thời gian)"
 *         total_comments:
 *           type: integer
 *           example: 8500
 *           description: "Tổng số bình luận (có thể được lọc theo thời gian)"
 *
 *     DashboardSOSStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 120
 *           description: "Tổng số yêu cầu SOS (có thể được lọc theo thời gian)"
 *         by_status:
 *           type: object
 *           properties:
 *             pending:
 *               type: integer
 *               example: 5
 *             accepted:
 *               type: integer
 *               example: 0
 *             resolved:
 *               type: integer
 *               example: 110
 *             cancelled:
 *               type: integer
 *               example: 5
 *         by_region:
 *           type: object
 *           properties:
 *             Bac:
 *               type: integer
 *               example: 40
 *               description: "SOS ở miền Bắc"
 *             Trung:
 *               type: integer
 *               example: 35
 *               description: "SOS ở miền Trung"
 *             Nam:
 *               type: integer
 *               example: 30
 *               description: "SOS ở miền Nam"
 *             unknown:
 *               type: integer
 *               example: 15
 *               description: "SOS không xác định được site/region"
 *         avg_resolution_minutes:
 *           type: integer
 *           example: 25
 *           description: "Thời gian giải quyết trung bình (phút)"
 *
 *     DashboardReportsStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           example: 85
 *           description: "Tổng số báo cáo vi phạm (có thể được lọc theo thời gian)"
 *         by_status:
 *           type: object
 *           properties:
 *             pending:
 *               type: integer
 *               example: 12
 *               description: "Báo cáo chờ xử lý"
 *             resolved:
 *               type: integer
 *               example: 60
 *               description: "Báo cáo đã xử lý"
 *             dismissed:
 *               type: integer
 *               example: 13
 *               description: "Báo cáo bị bỏ qua"
 *         by_reason:
 *           type: object
 *           properties:
 *             spam:
 *               type: integer
 *               example: 30
 *               description: "Báo cáo spam"
 *             inappropriate:
 *               type: integer
 *               example: 25
 *               description: "Nội dung không phù hợp"
 *             harassment:
 *               type: integer
 *               example: 20
 *               description: "Quấy rối"
 *             other:
 *               type: integer
 *               example: 10
 *               description: "Lý do khác"
 *
 *     DashboardContentPendingReview:
 *       type: object
 *       properties:
 *         verification_requests:
 *           type: integer
 *           example: 8
 *           description: "Yêu cầu xác minh chờ duyệt"
 *         media:
 *           type: integer
 *           example: 15
 *           description: "Media chờ duyệt"
 *         schedules:
 *           type: integer
 *           example: 5
 *           description: "Lịch lễ chờ duyệt"
 *         events:
 *           type: integer
 *           example: 3
 *           description: "Sự kiện chờ duyệt"
 *         nearby_places:
 *           type: integer
 *           example: 7
 *           description: "Địa điểm lân cận chờ duyệt"
 *         shifts:
 *           type: integer
 *           example: 4
 *           description: "Ca làm việc chờ duyệt"
 *
 *     DashboardOverviewResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy thống kê dashboard thành công"
 *         data:
 *           type: object
 *           properties:
 *             filter_applied:
 *               $ref: '#/components/schemas/DashboardFilterApplied'
 *             users:
 *               $ref: '#/components/schemas/DashboardUsersStats'
 *             sites:
 *               $ref: '#/components/schemas/DashboardSitesStats'
 *             planners:
 *               $ref: '#/components/schemas/DashboardPlannersStats'
 *             checkins:
 *               $ref: '#/components/schemas/DashboardCheckinsStats'
 *             journals:
 *               $ref: '#/components/schemas/DashboardJournalsStats'
 *             posts:
 *               $ref: '#/components/schemas/DashboardPostsStats'
 *             sos:
 *               $ref: '#/components/schemas/DashboardSOSStats'
 *             reports:
 *               $ref: '#/components/schemas/DashboardReportsStats'
 *             content_pending_review:
 *               $ref: '#/components/schemas/DashboardContentPendingReview'
 *
 *     UserGrowthDataPoint:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: "2026-03-14"
 *         count:
 *           type: integer
 *           example: 15
 *           description: "Số người dùng đăng ký trong ngày"
 *
 *     UserGrowthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy dữ liệu phân tích thành công"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserGrowthDataPoint'
 *
 *     CheckinAnalyticsDataPoint:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: "2026-03-14"
 *         count:
 *           type: integer
 *           example: 45
 *           description: "Số lượt check-in trong ngày"
 *
 *     CheckinAnalyticsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy dữ liệu phân tích thành công"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CheckinAnalyticsDataPoint'
 *
 *     PopularSiteItem:
 *       type: object
 *       properties:
 *         site:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               example: "123e4567-e89b-12d3-a456-426614174000"
 *             code:
 *               type: string
 *               example: "CHNAM001"
 *             name:
 *               type: string
 *               example: "Nhà thờ Đức Bà Sài Gòn"
 *             region:
 *               type: string
 *               enum: [Bac, Trung, Nam]
 *               example: "Nam"
 *             type:
 *               type: string
 *               enum: [church, shrine, monastery, center, other]
 *               example: "church"
 *             cover_image:
 *               type: string
 *               example: "https://cloudinary.com/..."
 *         visit_count:
 *           type: integer
 *           example: 450
 *           description: "Số lượt thăm (dựa trên PlannerItem)"
 *
 *     PopularSitesResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy dữ liệu phân tích thành công"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PopularSiteItem'
 *
 *     SOSBySiteItem:
 *       type: object
 *       properties:
 *         site:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             code:
 *               type: string
 *               example: "CHNAM001"
 *             name:
 *               type: string
 *               example: "Nhà thờ Đức Bà Sài Gòn"
 *             region:
 *               type: string
 *               enum: [Bac, Trung, Nam]
 *               example: "Nam"
 *             type:
 *               type: string
 *               enum: [church, shrine, monastery, center, other]
 *               example: "church"
 *             cover_image:
 *               type: string
 *               example: "https://cloudinary.com/..."
 *         sos_count:
 *           type: integer
 *           example: 50
 *           description: "Tổng số yêu cầu SOS tại site này"
 *         resolved_count:
 *           type: integer
 *           example: 45
 *           description: "Số SOS đã giải quyết"
 *         pending_count:
 *           type: integer
 *           example: 5
 *           description: "Số SOS đang chờ xử lý"
 *
 *     SOSBySiteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy dữ liệu phân tích thành công"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SOSBySiteItem'
 */

module.exports = {};
