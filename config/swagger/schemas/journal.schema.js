/**
 * @swagger
 * components:
 *   schemas:
 *     CreateJournalRequest:
 *       type: object
 *       required:
 *         - title
 *         - content
 *         - planner_item_id
 *       properties:
 *         title:
 *           type: string
 *           example: "Chuyến hành hương đến Nhà thờ Đức Bà"
 *         content:
 *           type: string
 *           example: "Hôm nay tôi đã có một chuyến hành hương ý nghĩa"
 *         planner_item_id:
 *           type: string
 *           format: uuid
 *           description: "ID của planner item đã check-in (bắt buộc)"
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *           description: "Tối đa 10 ảnh (jpg, png, jpeg, webp), mỗi ảnh max 10MB"
 *         audio:
 *           type: string
 *           format: binary
 *           description: "File audio (mp3, wav, m4a, ogg, aac), max 100MB"
 *         video:
 *           type: string
 *           format: binary
 *           description: "File video (mp4, mov, avi, webm), max 100MB"
 *
 *     UpdateJournalRequest:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         title:
 *           type: string
 *           description: "Tiêu đề nhật ký. Bắt buộc."
 *           example: "Chuyến hành hương đến Nhà thờ Đức Bà (Cập nhật)"
 *         content:
 *           type: string
 *           description: "Nội dung nhật ký. Bắt buộc."
 *           example: "<p>Nội dung đã được cập nhật...</p>"
 *         images:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *           description: "Ảnh mới để thay thế toàn bộ danh sách ảnh hiện tại. Không gửi `images` và không gửi `image_url`/`image_urls` thì backend sẽ xóa toàn bộ ảnh."
 *         image_urls:
 *           type: array
 *           items:
 *             type: string
 *             format: uri
 *           description: "Danh sách URL ảnh muốn giữ lại. Nếu không gửi và cũng không upload `images` thì backend sẽ xóa toàn bộ ảnh."
 *         audio:
 *           type: string
 *           format: binary
 *           description: "Audio mới để thay thế audio hiện tại. Nếu không gửi `audio` và không gửi `audio_url` thì backend sẽ xóa audio hiện tại."
 *         audio_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: "URL audio muốn giữ lại. Để trống hoặc không gửi thì backend sẽ xóa audio nếu không có file `audio` mới."
 *         video:
 *           type: string
 *           format: binary
 *           description: "Video mới để thay thế video hiện tại. Nếu không gửi `video` và không gửi `video_url` thì backend sẽ xóa video hiện tại."
 *         video_url:
 *           type: string
 *           format: uri
 *           nullable: true
 *           description: "URL video muốn giữ lại. Để trống hoặc không gửi thì backend sẽ xóa video nếu không có file `video` mới."
 *
 *     JournalResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Tạo journal thành công"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             user_id:
 *               type: string
 *               format: uuid
 *             is_active:
 *               type: boolean
 *               example: true
 *             site_id:
 *               type: string
 *               format: uuid
 *               nullable: true
 *             title:
 *               type: string
 *             content:
 *               type: string
 *             audio_url:
 *               type: string
 *               format: uri
 *               nullable: true
 *             image_url:
 *               type: array
 *               items:
 *                 type: string
 *                 format: uri
 *               example: ["https://res.cloudinary.com/xxx/image/upload/v123/journal1.jpg", "https://res.cloudinary.com/xxx/image/upload/v123/journal2.jpg"]
 *             video_url:
 *               type: string
 *               format: uri
 *               nullable: true
 *             author:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 full_name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 avatar_url:
 *                   type: string
 *                   nullable: true
 *             site:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                 code:
 *                   type: string
 *                 province:
 *                   type: string
 *             created_at:
 *               type: string
 *               format: date-time
 *             updated_at:
 *               type: string
 *               format: date-time
 *
 *     JournalListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Lấy danh sách journal thành công"
 *         data:
 *           type: object
 *           properties:
 *             journals:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/JournalResponse/properties/data'
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 total:
 *                   type: integer
 *                   example: 50
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 */

module.exports = {};
