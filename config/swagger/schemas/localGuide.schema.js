/**
 * @swagger
 * components:
 *   schemas:
 *     CreateLocalGuideRequest:
 *       type: object
 *       required:
 *         - email
 *         - full_name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "localguide@example.com"
 *           description: "Email của Local Guide (unique)"
 *         full_name:
 *           type: string
 *           example: "Nguyễn Văn A"
 *           description: "Họ tên đầy đủ"
 *         phone:
 *           type: string
 *           example: "0901234567"
 *           description: "Số điện thoại (optional)"
 *
 *     LocalGuideResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         full_name:
 *           type: string
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *           example: "local_guide"
 *         status:
 *           type: string
 *           enum: [active, banned]
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
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     LocalGuideListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         full_name:
 *           type: string
 *         phone:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, banned]
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     LocalGuideListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy danh sách Local Guide thành công"
 *         data:
 *           type: object
 *           properties:
 *             data:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LocalGuideListItem'
 *             pagination:
 *               $ref: '#/components/schemas/Pagination'
 *
 *     UpdateLocalGuideStatusRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [active, banned]
 *           example: "banned"
 *           description: "active = mở khóa, banned = khóa"
 *
 *     LocalGuideSiteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy thông tin địa điểm thành công"
 *         data:
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
 *             description:
 *               type: string
 *             history:
 *               type: string
 *             address:
 *               type: string
 *               example: "01 Công xã Paris, Bến Nghé, Quận 1"
 *             province:
 *               type: string
 *               example: "Hồ Chí Minh"
 *             district:
 *               type: string
 *               example: "Quận 1"
 *             latitude:
 *               type: number
 *               format: float
 *               example: 10.779738
 *             longitude:
 *               type: number
 *               format: float
 *               example: 106.699092
 *             region:
 *               type: string
 *               enum: [Bac, Trung, Nam]
 *               example: "Nam"
 *             type:
 *               type: string
 *               enum: [church, shrine, monastery, center, other]
 *               example: "church"
 *             patron_saint:
 *               type: string
 *               example: "Đức Mẹ Vô Nhiễm Nguyên Tội"
 *             cover_image:
 *               type: string
 *               format: uri
 *             opening_hours:
 *               type: object
 *               example:
 *                 monday: "05:00-18:00"
 *                 sunday: "05:00-20:00"
 *             contact_info:
 *               type: object
 *               example:
 *                 phone: "028-3822-0477"
 *                 email: "contact@example.com"
 *             is_active:
 *               type: boolean
 *               example: true
 *             created_at:
 *               type: string
 *               format: date-time
 *             updated_at:
 *               type: string
 *               format: date-time
 *
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalItems:
 *           type: integer
 *           example: 25
 *         totalPages:
 *           type: integer
 *           example: 3
 *
 *     SiteMedia:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         site_id:
 *           type: string
 *           format: uuid
 *         url:
 *           type: string
 *           format: uri
 *           example: "https://res.cloudinary.com/xxx/image/upload/panorama.jpg"
 *         type:
 *           type: string
 *           enum: [image, video, panorama]
 *           description: |
 *             - image: Ảnh gallery
 *             - video: Video
 *             - panorama: Ảnh 360° (equirectangular)
 *           example: "panorama"
 *         caption:
 *           type: string
 *           maxLength: 255
 *           example: "Toàn cảnh bên trong nhà thờ"
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           description: |
 *             - pending: Đang chờ duyệt
 *             - approved: Đã duyệt (hiển thị public)
 *             - rejected: Bị từ chối
 *           example: "pending"
 *         created_by:
 *           type: string
 *           format: uuid
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     UploadMediaRequest:
 *       type: object
 *       required:
 *         - url
 *         - type
 *       properties:
 *         url:
 *           type: string
 *           format: uri
 *           description: URL của media (Cloudinary hoặc external)
 *           example: "https://res.cloudinary.com/xxx/image/upload/sample.jpg"
 *         type:
 *           type: string
 *           enum: [image, video, panorama]
 *           example: "image"
 *         caption:
 *           type: string
 *           maxLength: 255
 *           example: "Mô tả cho media"
 *
 *     SiteMediaListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy danh sách media thành công"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SiteMedia'
 */

module.exports = {};

/**
 * @swagger
 * components:
 *   schemas:
 *     GuideShift:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         submission_id:
 *           type: string
 *           format: uuid
 *         day_of_week:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           description: Ngày trong tuần (0=CN, 1=T2, ..., 6=T7)
 *           example: 1
 *         start_time:
 *           type: string
 *           format: time
 *           example: "08:00:00"
 *         end_time:
 *           type: string
 *           format: time
 *           example: "17:00:00"
 *         created_at:
 *           type: string
 *           format: date-time
 *
 *     GuideShiftSubmission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         guide_id:
 *           type: string
 *           format: uuid
 *         site_id:
 *           type: string
 *           format: uuid
 *         code:
 *           type: string
 *           example: "SHF0121001"
 *           description: Mã submission tự động (SHF[MMDD][SEQ])
 *         week_start_date:
 *           type: string
 *           format: date
 *           example: "2026-01-27"
 *         submission_type:
 *           type: string
 *           enum: [new, update]
 *           example: "new"
 *         change_reason:
 *           type: string
 *           nullable: true
 *           description: Lý do thay đổi (bắt buộc khi update)
 *         previous_submission_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           example: "pending"
 *         total_shifts:
 *           type: integer
 *         rejection_reason:
 *           type: string
 *           nullable: true
 *         approved_by:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         approved_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         shifts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/GuideShift'
 *
 *     CreateSubmissionRequest:
 *       type: object
 *       required:
 *         - week_start_date
 *         - shifts
 *       properties:
 *         week_start_date:
 *           type: string
 *           format: date
 *           description: Ngày đầu tuần (Thứ 2)
 *           example: "2026-01-27"
 *         previous_submission_id:
 *           type: string
 *           format: uuid
 *           description: ID submission cũ (nếu là update)
 *         change_reason:
 *           type: string
 *           description: Lý do thay đổi (bắt buộc nếu có previous_submission_id)
 *         shifts:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required:
 *               - day_of_week
 *               - start_time
 *               - end_time
 *             properties:
 *               day_of_week:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *                 example: 1
 *               start_time:
 *                 type: string
 *                 format: time
 *                 example: "08:00"
 *               end_time:
 *                 type: string
 *                 format: time
 *                 example: "17:00"
 *
 *     UpdateSubmissionRequest:
 *       type: object
 *       required:
 *         - shifts
 *       properties:
 *         shifts:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required:
 *               - day_of_week
 *               - start_time
 *               - end_time
 *             properties:
 *               day_of_week:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 6
 *               start_time:
 *                 type: string
 *                 format: time
 *               end_time:
 *                 type: string
 *                 format: time
 *
 *     SubmissionStatusRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [approved, rejected]
 *         rejection_reason:
 *           type: string
 *           description: Lý do từ chối (bắt buộc nếu status=rejected)
 *
 *     SubmissionWithChanges:
 *       allOf:
 *         - $ref: '#/components/schemas/GuideShiftSubmission'
 *         - type: object
 *           properties:
 *             changes:
 *               type: array
 *               nullable: true
 *               description: Danh sách thay đổi so với lịch cũ (chỉ có khi type=update)
 *               items:
 *                 type: object
 *                 properties:
 *                   day_of_week:
 *                     type: integer
 *                   old:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       start_time:
 *                         type: string
 *                       end_time:
 *                         type: string
 *                   new:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       start_time:
 *                         type: string
 *                       end_time:
 *                         type: string
 *                   is_changed:
 *                     type: boolean
 *                   is_new:
 *                     type: boolean
 *                   is_removed:
 *                     type: boolean
 */

