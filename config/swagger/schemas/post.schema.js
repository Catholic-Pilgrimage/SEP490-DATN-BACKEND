/**
 * @swagger
 * components:
 *   schemas:
 *     PostAuthor:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         full_name:
 *           type: string
 *           example: "Nguyễn Văn A"
 *         avatar_url:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/avatar.jpg"
 *
 *     Post:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         user_id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         content:
 *           type: string
 *           example: "Hành trình hôm nay thật tuyệt vời!"
 *         image_urls:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
 *         journal_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: "ID của nhật ký tâm linh (nếu share từ nhật ký)"
 *         site_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: "ID của địa điểm gắn liền với bài viết"
 *         planner_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           description: "ID của hành trình (nếu share từ planner)"
 *         likes_count:
 *           type: integer
 *           example: 25
 *         comments_count:
 *           type: integer
 *           example: 10
 *           description: "Tổng số comment của bài viết"
 *         status:
 *           type: string
 *           enum: [draft, published, pending, approved, rejected]
 *           example: "published"
 *         is_liked:
 *           type: boolean
 *           example: true
 *           description: "User hiện tại đã like bài viết này chưa"
 *         author:
 *           $ref: '#/components/schemas/PostAuthor'
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2024-03-18T10:30:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: "2024-03-18T10:30:00Z"
 *
 *     CommentAuthor:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         full_name:
 *           type: string
 *           example: "Trần Thị B"
 *         avatar_url:
 *           type: string
 *           nullable: true
 *           example: "https://example.com/avatar.jpg"
 *         role:
 *           type: string
 *           enum: [admin, pilgrim, local_guide, manager]
 *           example: "pilgrim"
 *           description: "Role của người comment để biết là pilgrim hay local guide"
 *
 *     PostComment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         post_id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         user_id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         content:
 *           type: string
 *           example: "Bài viết hay quá!"
 *         status:
 *           type: string
 *           enum: [draft, published, pending, approved, rejected]
 *           example: "published"
 *         author:
 *           $ref: '#/components/schemas/CommentAuthor'
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2024-03-18T10:30:00Z"
 *
 *     PostListResponse:
 *       type: object
 *       properties:
 *         posts:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Post'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               example: 100
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 20
 *             totalPages:
 *               type: integer
 *               example: 5
 *
 *     CommentListResponse:
 *       type: object
 *       properties:
 *         comments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PostComment'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               example: 50
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 20
 *             totalPages:
 *               type: integer
 *               example: 3
 */

module.exports = {};
