/**
 * @swagger
 * tags:
 *   - name: AI - Route Suggestion
 *     description: AI gợi ý lộ trình hành hương (Pilgrim)
 *   - name: AI - Article Writer
 *     description: AI viết bài mô tả địa điểm (Local Guide)
 *   - name: AI - Translator
 *     description: AI dịch nội dung đa ngôn ngữ (Local Guide)
 *   - name: AI - Event Recommender
 *     description: AI gợi ý sự kiện theo mùa phụng vụ (Local Guide)
 */

/**
 * @swagger
 * /api/ai/suggest-route:
 *   post:
 *     summary: AI gợi ý lộ trình hành hương tối ưu
 *     description: |
 *       Pilgrim chọn nhiều địa điểm → AI sắp xếp lộ trình tối ưu theo ngày.
 *       
 *       **Cải tiến:**
 *       - Tính khoảng cách Haversine giữa các điểm để ước tính travel time chính xác hơn
 *       - Validate UUID format trước khi query DB
 *       - Output có `order_index` tương thích trực tiếp với PlannerService
 *       - Retry tự động khi AI service gặp lỗi tạm thời
 *     tags: [AI - Route Suggestion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - site_ids
 *             properties:
 *               site_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 2
 *                 maxItems: 15
 *                 description: Danh sách UUID của các địa điểm (2-15)
 *                 example: ["uuid-site-1", "uuid-site-2", "uuid-site-3"]
 *               start_date:
 *                 type: string
 *                 format: date
 *                 description: Ngày bắt đầu dự kiến
 *                 example: "2026-04-01"
 *               max_days:
 *                 type: integer
 *                 description: Số ngày tối đa cho chuyến đi
 *                 example: 3
 *               transport_mode:
 *                 type: string
 *                 enum: [car, bus, motorbike]
 *                 default: car
 *                 description: Phương tiện di chuyển
 *               priority:
 *                 type: string
 *                 enum: [shortest_distance, most_spiritual, balanced]
 *                 default: balanced
 *                 description: Ưu tiên tối ưu
 *               number_of_people:
 *                 type: integer
 *                 default: 1
 *                 description: Số người tham gia hành hương
 *                 example: 2
 *               patron_saint:
 *                 type: string
 *                 description: Bổn mạng của pilgrim — AI sẽ ưu tiên site liên quan và thêm ghi chú tâm linh
 *                 example: "Đức Mẹ Maria"
 *     responses:
 *       200:
 *         description: Gợi ý lộ trình thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     planner:
 *                       type: object
 *                       description: Dữ liệu tương thích với PlannerService.createPlanner()
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "Con Đường Đức Mẹ Miền Nam"
 *                         estimated_days:
 *                           type: integer
 *                           example: 3
 *                         number_of_people:
 *                           type: integer
 *                           example: 2
 *                         transportation:
 *                           type: string
 *                           example: "car"
 *                         start_date:
 *                           type: string
 *                           format: date
 *                         end_date:
 *                           type: string
 *                           format: date
 *                     daily_itinerary:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           day_number:
 *                             type: integer
 *                           theme:
 *                             type: string
 *                           items:
 *                             type: array
 *                             description: Tương thích với PlannerService.addPlannerItem()
 *                             items:
 *                               type: object
 *                               properties:
 *                                 site_id:
 *                                   type: string
 *                                   format: uuid
 *                                 site_name:
 *                                   type: string
 *                                 day_number:
 *                                   type: integer
 *                                 order_index:
 *                                   type: integer
 *                                   description: Thứ tự trong ngày (1-based)
 *                                 estimated_time:
 *                                   type: string
 *                                   example: "08:00"
 *                                 rest_duration:
 *                                   type: string
 *                                   example: "1h30m"
 *                                 travel_time_minutes:
 *                                   type: integer
 *                                 note:
 *                                   type: string
 *                     summary:
 *                       type: string
 *                     total_estimated_km:
 *                       type: number
 *                     tips:
 *                       type: array
 *                       items:
 *                         type: string
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         generated_by:
 *                           type: string
 *                         sites_count:
 *                           type: integer
 *                         transport_mode:
 *                           type: string
 *                         priority:
 *                           type: string
 *                         compatible_with:
 *                           type: string
 *       400:
 *         description: Dữ liệu không hợp lệ (ít hơn 2, nhiều hơn 15, hoặc UUID sai format)
 *       502:
 *         description: AI trả kết quả không hợp lệ
 *       503:
 *         description: AI service chưa được cấu hình (thiếu GOOGLE_AI_KEY)
 */

/**
 * @swagger
 * /api/ai/generate-article:
 *   post:
 *     summary: AI viết bài mô tả địa điểm hành hương (Local Guide only)
 *     description: |
 *       Tạo bài viết về một địa điểm hành hương với nhiều phong cách.
 *       AI sẽ tự lấy thông tin site (bao gồm history đầy đủ) từ DB.
 *       
 *       **Cải tiến:**
 *       - Thêm param `style` để chọn phong cách viết
 *       - Lấy full site.history thay vì cắt 500 chars
 *       - Output có thêm `summary` cho FE preview
 *     tags: [AI - Article Writer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 description: Chủ đề bài viết
 *                 example: "Lịch sử và kiến trúc nhà thờ"
 *               site_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID của site (tự detect từ guide's assigned site nếu bỏ trống)
 *               additional_context:
 *                 type: string
 *                 description: Thông tin thêm từ Local Guide
 *                 example: "Nhà thờ mới được trùng tu năm 2024"
 *               language:
 *                 type: string
 *                 enum: [vi, en]
 *                 default: vi
 *                 description: Ngôn ngữ bài viết
 *               length:
 *                 type: string
 *                 enum: [short, medium, long]
 *                 default: medium
 *                 description: "Độ dài: short (~200 từ), medium (~400 từ), long (~700 từ)"
 *               style:
 *                 type: string
 *                 enum: [devotional, informational, historical, youth]
 *                 default: devotional
 *                 description: |
 *                   Phong cách viết:
 *                   - devotional: Suy niệm, cầu nguyện
 *                   - informational: Thông tin, giáo dục
 *                   - historical: Lịch sử, biên niên
 *                   - youth: Trẻ trung, gần gũi cho giới trẻ
 *     responses:
 *       200:
 *         description: Tạo bài viết thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       example: "Nhà Thờ Đức Bà - Viên Ngọc Kiến Trúc Giữa Lòng Sài Gòn"
 *                     summary:
 *                       type: string
 *                       description: Tóm tắt 2-3 câu cho FE preview
 *                       example: "Nhà thờ Đức Bà Sài Gòn là biểu tượng kiến trúc Gothic..."
 *                     content:
 *                       type: string
 *                       description: Nội dung bài viết đầy đủ
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["lịch sử", "kiến trúc", "Sài Gòn", "Gothic", "hành hương"]
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         generated_by:
 *                           type: string
 *                         language:
 *                           type: string
 *                         length:
 *                           type: string
 *                         style:
 *                           type: string
 *                         topic:
 *                           type: string
 *       400:
 *         description: Topic không hợp lệ hoặc guide chưa được gán site
 *       403:
 *         description: Unauthorized hoặc site không thuộc quyền quản lý
 *       502:
 *         description: AI trả kết quả không hợp lệ
 *       503:
 *         description: AI service chưa được cấu hình
 */

/**
 * @swagger
 * /api/ai/translate:
 *   post:
 *     summary: AI dịch nội dung đa ngôn ngữ (Local Guide only)
 *     description: |
 *       Dịch nội dung với hỗ trợ đa ngôn ngữ, sử dụng thuật ngữ Công Giáo chuẩn.
 *       
 *       **Cải tiến:**
 *       - Hỗ trợ 6 ngôn ngữ: vi, en, zh, ko, ja, fr
 *       - Auto-detect ngôn ngữ nguồn
 *       - Cảnh báo khi source = target language
 *       - Thêm `context` để dịch chính xác proper nouns
 *     tags: [AI - Translator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Nội dung cần dịch (2-10.000 ký tự)
 *                 example: "Nhà thờ được xây dựng từ năm 1880, mang phong cách kiến trúc Gothic."
 *               target_lang:
 *                 type: string
 *                 enum: [vi, en]
 *                 default: en
 *                 description: |
 *                   Ngôn ngữ đích:
 *                   - vi: Tiếng Việt
 *                   - en: English
 *               context:
 *                 type: string
 *                 description: Context/domain để dịch chính xác proper nouns (tên nhà thờ, tên thánh...)
 *                 example: "Nhà thờ Đức Bà Sài Gòn, Thánh Nữ Têrêsa"
 *     responses:
 *       200:
 *         description: Dịch thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     original:
 *                       type: string
 *                     translated:
 *                       type: string
 *                       example: "The church was built in 1880, featuring Gothic architectural style."
 *                     source_lang:
 *                       type: string
 *                       description: Ngôn ngữ nguồn được auto-detect
 *                       example: "vi"
 *                     target_lang:
 *                       type: string
 *                       example: "en"
 *                     same_language:
 *                       type: boolean
 *                       description: true nếu ngôn ngữ nguồn trùng với ngôn ngữ đích
 *                       example: false
 *       400:
 *         description: Nội dung quá ngắn, quá dài, hoặc ngôn ngữ không được hỗ trợ
 *       502:
 *         description: AI trả kết quả không hợp lệ
 *       503:
 *         description: AI service chưa được cấu hình
 */

/**
 * @swagger
 * /api/ai/suggest-events:
 *   post:
 *     summary: AI gợi ý sự kiện theo mùa phụng vụ (Local Guide only)
 *     description: |
 *       Dựa trên ngày hiện tại, AI xác định mùa phụng vụ và gợi ý sự kiện phù hợp.
 *       
 *       **Cải tiến:**
 *       - Output aligned với Event model: trả `start_date`, `end_date`, `start_time`, `end_time`, `location`, `category`
 *       - Có thể dùng trực tiếp để tạo event không cần map lại
 *       - Fetch 15 recent events để avoid trùng lặp
 *       - Tối đa 10 suggestions
 *     tags: [AI - Event Recommender]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               site_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID của site (tự detect từ guide's assigned site nếu bỏ trống)
 *               current_date:
 *                 type: string
 *                 format: date
 *                 description: Ngày cần gợi ý (mặc định hôm nay)
 *                 example: "2026-03-21"
 *               count:
 *                 type: integer
 *                 default: 5
 *                 maximum: 10
 *                 description: Số gợi ý muốn nhận (tối đa 10)
 *     responses:
 *       200:
 *         description: Gợi ý sự kiện thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     site_name:
 *                       type: string
 *                     current_date:
 *                       type: string
 *                     liturgical_season:
 *                       type: string
 *                       example: "Mùa Chay"
 *                     liturgical_season_en:
 *                       type: string
 *                       example: "Lent"
 *                     season_description:
 *                       type: string
 *                     suggestions:
 *                       type: array
 *                       description: Mỗi suggestion tương thích trực tiếp với Event model
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: "Đêm Thánh Ca Mùa Chay"
 *                           name_en:
 *                             type: string
 *                             example: "Lenten Sacred Music Night"
 *                           description:
 *                             type: string
 *                           start_date:
 *                             type: string
 *                             format: date
 *                             description: Tương thích Event.start_date
 *                           end_date:
 *                             type: string
 *                             format: date
 *                             description: Tương thích Event.end_date
 *                           start_time:
 *                             type: string
 *                             description: "Format HH:mm:ss, tương thích Event.start_time"
 *                             example: "19:00:00"
 *                           end_time:
 *                             type: string
 *                             description: "Format HH:mm:ss, tương thích Event.end_time"
 *                             example: "21:00:00"
 *                           location:
 *                             type: string
 *                             description: Tương thích Event.location
 *                             example: "Sân nhà thờ"
 *                           category:
 *                             type: string
 *                             enum: [mass, retreat, procession, workshop, prayer, festival, charity, youth]
 *                             description: Tương thích Event.category
 *                           relevance:
 *                             type: string
 *                             description: Lý do event phù hợp với mùa phụng vụ và site
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         generated_by:
 *                           type: string
 *                         count:
 *                           type: integer
 *       400:
 *         description: Guide chưa được gán site
 *       403:
 *         description: Unauthorized hoặc site không thuộc quyền quản lý
 *       502:
 *         description: AI trả kết quả không hợp lệ
 *       503:
 *         description: AI service chưa được cấu hình
 */

module.exports = {};
