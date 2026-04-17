/**
 * @swagger
 * tags:
 *   - name: Public - Sites
 *     description: API công khai xem địa điểm (Guest & Pilgrim)
 */

// ============================================
// PUBLIC SITE ROUTES (Guest & Pilgrim)
// ============================================

/**
 * @swagger
 * /api/sites/available:
 *   get:
 *     summary: Danh sách địa điểm có thể xin quản lý (Claim / Transition)
 *     description: |
 *       Lấy danh sách các địa điểm có thể xin nhận quản lý.
 *       Bao gồm 2 loại:
 *       - **transition**: Site đang active, có Manager hiện tại → xin thay thế Manager.
 *       - **unassigned**: Site do Admin tạo sẵn (is_active=false), chưa có Manager → xin nhận quản lý.
 *       Cả 2 loại đều phải chưa có yêu cầu transition/claim pending.
 *     tags: [Public - Sites]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *         description: Lọc theo tỉnh/thành phố
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *           enum: [Bac, Trung, Nam]
 *         description: Lọc theo miền
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo tên địa điểm
 *       - in: query
 *         name: claim_type
 *         schema:
 *           type: string
 *           enum: [transition, unassigned]
 *         description: Lọc theo loại chuyển quyền (Manager hiện tại / Chỗ trống)
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           code:
 *                             type: string
 *                             example: "CHNAM001"
 *                           name:
 *                             type: string
 *                             example: "Nhà thờ Đức Bà"
 *                           address:
 *                             type: string
 *                           province:
 *                             type: string
 *                           region:
 *                             type: string
 *                           type:
 *                             type: string
 *                           cover_image:
 *                             type: string
 *                           current_manager:
 *                             type: object
 *                             nullable: true
 *                             description: "null nếu site chưa có manager (unassigned)"
 *                             properties:
 *                               id:
 *                                 type: string
 *                               full_name:
 *                                 type: string
 *                           claim_type:
 *                             type: string
 *                             enum: [transition, unassigned]
 *                             description: "'transition' = site có manager, 'unassigned' = site admin tạo sẵn chưa có manager"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 */

/**
 * @swagger
 * /api/sites:
 *   get:
 *     summary: Xem danh sách địa điểm công khai (Public - không cần đăng nhập)
 *     description: Lấy danh sách tất cả địa điểm đang hoạt động (is_active = true)
 *     tags: [Public - Sites]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           example: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           example: 10
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: province
 *         schema:
 *           type: string
 *           example: "Hồ Chí Minh"
 *         description: Lọc theo tỉnh/thành phố
 *       - in: query
 *         name: region
 *         schema:
 *           type: string
 *           enum: [Bac, Trung, Nam]
 *           example: "Nam"
 *         description: Lọc theo miền
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [church, shrine, monastery, center, other]
 *           example: "church"
 *         description: Lọc theo loại địa điểm
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           example: "Đức Bà"
 *         description: Tìm kiếm theo tên địa điểm
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       code:
 *                         type: string
 *                         example: "CHNAM001"
 *                       name:
 *                         type: string
 *                         example: "Nhà thờ Đức Bà Sài Gòn"
 *                       description:
 *                         type: string
 *                       address:
 *                         type: string
 *                       province:
 *                         type: string
 *                       district:
 *                         type: string
 *                       region:
 *                         type: string
 *                         enum: [Bac, Trung, Nam]
 *                       type:
 *                         type: string
 *                         enum: [church, shrine, monastery, center, other]
 *                       patron_saint:
 *                         type: string
 *                       cover_image:
 *                         type: string
 *                       opening_hours:
 *                         type: object
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *                       average_rating:
 *                         type: number
 *                         example: 4.5
 *                         description: Điểm đánh giá trung bình (1-5)
 *                         nullable: true
 *                       review_count:
 *                         type: integer
 *                         example: 128
 *                         description: Tổng số lượt đánh giá
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/sites/{idOrCode}:
 *   get:
 *     summary: Xem chi tiết địa điểm (Public - không cần đăng nhập)
 *     description: Lấy thông tin chi tiết địa điểm bằng ID hoặc code
 *     tags: [Public - Sites]
 *     parameters:
 *       - in: path
 *         name: idOrCode
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID hoặc code của địa điểm
 *         examples:
 *           uuid:
 *             value: "550e8400-e29b-41d4-a716-446655440000"
 *             summary: Tìm bằng UUID
 *           code:
 *             value: "CHNAM001"
 *             summary: Tìm bằng code
 *     responses:
 *       200:
 *         description: Lấy thông tin thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     code:
 *                       type: string
 *                       example: "CHNAM001"
 *                     name:
 *                       type: string
 *                       example: "Nhà thờ Đức Bà Sài Gòn"
 *                     description:
 *                       type: string
 *                     history:
 *                       type: string
 *                     address:
 *                       type: string
 *                     province:
 *                       type: string
 *                     district:
 *                       type: string
 *                     region:
 *                       type: string
 *                       enum: [Bac, Trung, Nam]
 *                     type:
 *                       type: string
 *                       enum: [church, shrine, monastery, center, other]
 *                     patron_saint:
 *                       type: string
 *                     cover_image:
 *                       type: string
 *                     opening_hours:
 *                       type: object
 *                       example: {"open": "06:00", "close": "18:00"}
 *                     contact_info:
 *                       type: object
 *                       example: {"phone": "028-3822-0477"}
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     average_rating:
 *                       type: number
 *                       example: 4.5
 *                       description: Điểm đánh giá trung bình (1-5)
 *                       nullable: true
 *                     review_count:
 *                       type: integer
 *                       example: 128
 *                       description: Tổng số lượt đánh giá
 *       404:
 *         description: Không tìm thấy địa điểm
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/sites/{siteId}/media:
 *   get:
 *     summary: Xem gallery của địa điểm (Public - không cần đăng nhập)
 *     description: Lấy danh sách media đã được duyệt của địa điểm (image/video/model_3d), bao gồm audio_url nếu media có thuyết minh.
 *     tags: [Public - Sites]
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, model_3d]
 *         description: Lọc theo loại media
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Lấy danh sách media thành công
 *                 data:
 *                   type: object
 *                   properties:
 *                     site:
 *                     type: object
 *                     properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         code:
 *                           type: string
 *                         name:
 *                           type: string
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           code:
 *                             type: string
 *                           url:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [image, video, model_3d]
 *                           caption:
 *                             type: string
 *                             nullable: true
 *                           audio_url:
 *                             type: string
 *                             nullable: true
 *                             description: URL audio thuyết minh của media (nếu có)
 *                           narration_text:
 *                             type: string
 *                             nullable: true
 *                             description: Nội dung thuyết minh dạng văn bản (nếu có)
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       404:
 *         description: Không tìm thấy địa điểm
 */

/**
 * @swagger
 * /api/sites/{siteId}/mass-schedules:
 *   get:
 *     summary: Xem lịch lễ của địa điểm (Public - không cần đăng nhập)
 *     description: Lấy danh sách lịch lễ đã được duyệt của địa điểm
 *     tags: [Public - Sites]
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *       - in: query
 *         name: day_of_week
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *         description: Lọc theo ngày trong tuần (0=CN, 1=T2, ..., 6=T7)
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       code:
 *                         type: string
 *                       days_of_week:
 *                         type: array
 *                         items:
 *                           type: integer
 *                       time:
 *                         type: string
 *                         example: "06:00:00"
 *                       note:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Không tìm thấy địa điểm
 */

/**
 * @swagger
 * /api/sites/{siteId}/events:
 *   get:
 *     summary: Xem sự kiện của địa điểm (Public - không cần đăng nhập)
 *     description: Lấy danh sách sự kiện đã được duyệt của địa điểm
 *     tags: [Public - Sites]
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của địa điểm
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: upcoming
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: Chỉ lấy sự kiện chưa kết thúc (time_state là upcoming hoặc ongoing)
 *     responses:
 *       200:
 *         description: Lấy danh sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       start_date:
 *                         type: string
 *                         format: date
 *                       end_date:
 *                         type: string
 *                         format: date
 *                       start_time:
 *                         type: string
 *                       end_time:
 *                         type: string
 *                       location:
 *                         type: string
 *                       banner_url:
 *                         type: string
 *                       category:
 *                         type: string
 *                         nullable: true
 *                         description: "Phân loại sự kiện"
 *                         example: "mass"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Không tìm thấy địa điểm
 */


// ============================================

/**
 * @swagger
 * /api/sites/{siteId}/nearby-places:
 *   get:
 *     summary: Lấy danh sách địa điểm lân cận của site (Public)
 *     description: |
 *       API công khai để xem địa điểm lân cận (ăn uống, lưu trú, y tế) gần site.
 *       Chỉ hiển thị địa điểm đã được duyệt (approved).
 *       Sắp xếp theo khoảng cách gần nhất.
 *     tags: [Public - Sites]
 *     parameters:
 *       - in: path
 *         name: siteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID hoặc code của site
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng mỗi trang
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [food, lodging, medical]
 *         description: Lọc theo danh mục
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Lấy danh sách địa điểm lân cận thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     site:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         code:
 *                           type: string
 *                           example: "CHNAM001"
 *                         name:
 *                           type: string
 *                           example: "Nhà thờ Đức Bà Sài Gòn"
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           code:
 *                             type: string
 *                             example: "NBP0122001"
 *                           name:
 *                             type: string
 *                             example: "Nhà hàng Phở 24"
 *                           category:
 *                             type: string
 *                             enum: [food, lodging, medical]
 *                             example: "food"
 *                           address:
 *                             type: string
 *                             example: "123 Đường ABC, Quận 1"
 *                           latitude:
 *                             type: number
 *                             format: float
 *                             example: 10.779738
 *                           longitude:
 *                             type: number
 *                             format: float
 *                             example: 106.699092
 *                           distance_meters:
 *                             type: integer
 *                             example: 500
 *                             description: Khoảng cách từ site (mét)
 *                           phone:
 *                             type: string
 *                             example: "0901234567"
 *                           description:
 *                             type: string
 *                             example: "Nhà hàng phở truyền thống"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       404:
 *         description: Không tìm thấy site
 */

module.exports = {};
