/**
 * @swagger
 * tags:
 *   - name: AI - Route Suggestion
 *     description: AI gợi ý lộ trình hành hương (Pilgrim)
 *   - name: AI - Prayer Suggestion
 *     description: AI gợi ý lời nguyện cho nhật ký tâm linh (Pilgrim)
 *   - name: AI - Article Writer
 *     description: AI viết bài mô tả địa điểm (Local Guide)
 *   - name: AI - Review Summarizer
 *     description: AI tóm tắt đánh giá (Local Guide)
 *   - name: AI - Event Recommender
 *     description: AI gợi ý sự kiện theo mùa phụng vụ (Local Guide)
 *   - name: AI - Content Translator
 *     description: AI biên dịch nội dung bài viết và bình luận on-demand (Shared)
 */

/**
 * @swagger
 * /api/ai/suggest-route:
 *   post:
 *     summary: AI gợi ý lộ trình hành hương tối ưu
 *     description: |
 *       Pilgrim chọn nhiều địa điểm, AI sẽ sắp xếp lộ trình tối ưu theo ngày.
 *
 *       Cải tiến:
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
 *                 description: Bổn mạng của pilgrim, AI sẽ ưu tiên site liên quan và thêm ghi chú tâm linh
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
 *         description: AI service chưa được cấu hình
 */

/**
 * @swagger
 * /api/ai/suggest-prayer:
 *   post:
 *     summary: AI gợi ý lời nguyện cho nhật ký tâm linh (Pilgrim)
 *     description: |
 *       Pilgrim đang viết Spiritual Journal có thể nhờ AI gợi ý lời nguyện phù hợp
 *       với trải nghiệm hành hương hiện tại.
 *
 *       **Business Rules:**
 *       - Phải truyền đúng 1 trong 2: `planner_item_id` hoặc `planner_id`
 *       - Phải có ít nhất 1 trong 3: `current_text`, `mood`, `intention`
 *       - User phải đã check-in (planner_item) hoặc là owner/member joined (planner)
 *       - Planner phải ở trạng thái `completed`
 *     tags: [AI - Prayer Suggestion]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planner_item_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID điểm đến trong kế hoạch (cho point journal)
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               planner_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID kế hoạch hành hương (cho trip summary journal)
 *                 example: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *               current_text:
 *                 type: string
 *                 description: Nội dung người dùng đã viết trong journal
 *                 example: "Hôm nay tôi đã đến Đền Thánh Đức Mẹ La Vang..."
 *               mood:
 *                 type: string
 *                 description: Tâm trạng hiện tại của người hành hương
 *                 example: "biết ơn, bình an"
 *               intention:
 *                 type: string
 *                 description: Ý nguyện đặc biệt cho lời cầu nguyện
 *                 example: "Cầu nguyện cho gia đình bình an"
 *     responses:
 *       200:
 *         description: Gợi ý lời nguyện thành công
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
 *                     prayer_text:
 *                       type: string
 *                       description: Lời nguyện gợi ý
 *                       example: "Lạy Chúa, con xin tạ ơn Ngài vì hành trình hành hương đầy ơn sủng..."
 *                     explanation:
 *                       type: string
 *                       description: Giải thích ngắn vì sao lời nguyện phù hợp
 *                       example: "Lời nguyện này phù hợp vì bạn đang cảm thấy biết ơn sau chuyến viếng thăm..."
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Các thẻ liên quan
 *                       example: ["gratitude", "peace", "family"]
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         generated_by:
 *                           type: string
 *                           example: "google_ai"
 *                         context_type:
 *                           type: string
 *                           enum: [planner_item, planner]
 *                         language:
 *                           type: string
 *                           example: "vi"
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc context journal không đúng
 *       429:
 *         description: Vượt giới hạn request AI
 *       502:
 *         description: AI trả kết quả không hợp lệ
 *       503:
 *         description: AI service chưa được cấu hình
 */

/**
 * @swagger
 * /api/ai/generate-article:
 *   post:
 *     summary: AI viết bài mô tả địa điểm hành hương (Manager & Local Guide)
 *     description: |
 *       Tạo bài viết về địa điểm hành hương với nhiều phong cách.
 *       AI sẽ tự lấy thông tin site, bao gồm history đầy đủ, theo site được gán cho user.
 *
 *       Dùng cho:
 *       - **Manager**: Tạo nội dung để cập nhật mô tả / lịch sử site, hoặc viết kịch bản thuyết minh cho 3D Model
 *       - **Local Guide**: Tạo kịch bản thuyết minh (narrative) cho 3D Model
 *
 *       Cải tiến:
 *       - Thêm param `style` để chọn phong cách viết
 *       - Lấy full `site.history` thay vì cắt 500 ký tự
 *       - Output có thêm `summary` cho FE preview
 *       - Không cần truyền `site_id`, hệ thống tự resolve từ tài khoản user
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
 *         description: Chỉ Local Guide được dùng endpoint này
 *       502:
 *         description: AI trả kết quả không hợp lệ
 *       503:
 *         description: AI service chưa được cấu hình
 */

/**
 * @swagger
 * /api/ai/summarize-reviews:
 *   post:
 *     summary: AI tóm tắt đánh giá gần đây (Local Guide only)
 *     description: |
 *       Lấy tối đa 20 đánh giá mới nhất của địa điểm và dùng AI phân tích:
 *       - Tóm tắt tổng quan
 *       - Ưu điểm nổi bật
 *       - Nhược điểm cần cải thiện
 *       - Sentiment (positive, neutral, negative)
 *
 *       Hệ thống tự resolve `site_id` và ngôn ngữ phản hồi từ tài khoản Local Guide.
 *       Endpoint này không cần request body.
 *     tags: [AI - Review Summarizer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tóm tắt đánh giá thành công
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
 *                       example: "Nhà Thờ Đức Bà Sài Gòn"
 *                     total_reviews:
 *                       type: integer
 *                       description: Tổng số đánh giá của toàn bộ site
 *                       example: 42
 *                     average_rating:
 *                       type: number
 *                       description: Điểm trung bình của toàn bộ site
 *                       example: 4.3
 *                     reviews_analyzed:
 *                       type: integer
 *                       description: Số lượng đánh giá gần nhất được AI phân tích (tối đa 20)
 *                       example: 20
 *                     overall_summary:
 *                       type: string
 *                       description: Tóm tắt tổng quan 2-3 câu
 *                       example: "Nhà thờ được đánh giá cao về kiến trúc và không gian tâm linh..."
 *                     strengths:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Kiến trúc đẹp", "Không gian yên tĩnh", "Hướng dẫn viên nhiệt tình"]
 *                     weaknesses:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Bãi đỗ xe hạn chế", "Đông đúc vào cuối tuần"]
 *                     sentiment:
 *                       type: string
 *                       enum: [positive, neutral, negative]
 *                       example: "positive"
 *                     highlights:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Điểm nổi bật được nhiều người nhắc đến
 *                       example: ["Kiến trúc Gothic ấn tượng", "Thánh lễ trang nghiêm"]
 *                     metadata:
 *                       type: object
 *                       properties:
 *                         generated_by:
 *                           type: string
 *                         language:
 *                           type: string
 *                         reviews_analyzed:
 *                           type: integer
 *       400:
 *         description: Guide chưa được gán site hoặc chưa có đánh giá nào
 *       403:
 *         description: Chỉ Local Guide được dùng endpoint này
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
 *       Cải tiến:
 *       - Output aligned với Event model: `start_date`, `end_date`, `start_time`, `end_time`, `location`, `category`
 *       - Có thể dùng trực tiếp để tạo event không cần map lại
 *       - Fetch 15 recent events để tránh trùng lặp
 *       - Tối đa 10 suggestions
 *     tags: [AI - Event Recommender]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *         description: Chỉ Local Guide được dùng endpoint này
 *       502:
 *         description: AI trả kết quả không hợp lệ
 *       503:
 *         description: AI service chưa được cấu hình
 */

/**
 * @swagger
 * /api/posts/{id}/translate:
 *   get:
 *     summary: AI phiên dịch bài viết
 *     description: Lấy bản dịch tiếng Anh của bài viết (title_en, content_en).
 *     tags: [AI - Content Translator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
 *     responses:
 *       200:
 *         description: Lấy dịch vụ thành công
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
 *                     title_en:
 *                       type: string
 *                       example: "Pilgrimage Journal"
 *                     content_en:
 *                       type: string
 *                       example: "Today's journey was wonderful!"
 *                     cached:
 *                       type: boolean
 *                       description: true nếu lấy từ cache, false nếu mới dịch
 *                       example: false
 *                 message:
 *                   type: string
 *                   example: "Post translated successfully"
 *       404:
 *         description: Không tìm thấy bài viết
 *       401:
 *         description: Chưa đăng nhập
 */

/**
 * @swagger
 * /api/posts/{id}/comments/{commentId}/translate:
 *   get:
 *     summary: AI phiên dịch comment
 *     description: Lấy bản dịch tiếng Anh của comment (content_en). 
 *     tags: [AI - Content Translator]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của bài viết
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của comment
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
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     content_en:
 *                       type: string
 *                       example: "This post is very interesting!"
 *                     cached:
 *                       type: boolean
 *                       description: true nếu lấy từ cache, false nếu mới dịch
 *                       example: false
 *                 message:
 *                   type: string
 *                   example: "Comment translated successfully"
 *       404:
 *         description: Không tìm thấy comment
 *       401:
 *         description: Chưa đăng nhập
 */

module.exports = {};
