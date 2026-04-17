/**
 * @swagger
 * tags:
 *   name: Admin - AI Prompts
 *   description: Quản lý AI prompt instructions (chỉ dành cho Admin)
 */

/**
 * @swagger
 * /api/admin/ai-prompts:
 *   get:
 *     summary: Lấy danh sách tất cả AI prompts (Admin only)
 *     tags: [Admin - AI Prompts]
 *     security:
 *       - bearerAuth: []
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
 *                 message:
 *                   type: string
 *                   example: "AI prompts retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AiPromptResponse'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/ai-prompts/{key}:
 *   get:
 *     summary: Lấy chi tiết 1 AI prompt theo key (Admin only)
 *     tags: [Admin - AI Prompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *           enum: [route, article, review_summary, events, prayer, translation_post_vi_en, translation_comment_vi_en]
 *         description: Prompt key
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
 *                 message:
 *                   type: string
 *                   example: "AI prompt retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AiPromptResponse'
 *       400:
 *         description: Prompt key không hợp lệ
 *       404:
 *         description: Không tìm thấy prompt
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * /api/admin/ai-prompts/{key}:
 *   put:
 *     summary: Cập nhật instruction text của 1 AI prompt (Admin only)
 *     tags: [Admin - AI Prompts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *           enum: [route, article, review_summary, events, prayer, translation_post_vi_en, translation_comment_vi_en]
 *         description: Prompt key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - instruction_text
 *             properties:
 *               instruction_text:
 *                 type: string
 *                 description: Nội dung instruction mới cho AI prompt
 *                 example: "You are a Catholic content writer specializing in pilgrimage sites..."
 *               description:
 *                 type: string
 *                 description: Mô tả ngắn gọn về prompt (tuỳ chọn)
 *                 example: "AI Article Writer"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
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
 *                   example: "AI prompt updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AiPromptResponse'
 *       400:
 *         description: Dữ liệu không hợp lệ (key sai hoặc instruction_text rỗng)
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền admin
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AiPromptResponse:
 *       type: object
 *       properties:
 *         prompt_key:
 *           type: string
 *           example: "article"
 *         description:
 *           type: string
 *           example: "AI Article Writer — generates devotional article for pilgrimage sites"
 *         instruction_text:
 *           type: string
 *           example: "You are a Catholic content writer specializing in pilgrimage sites in Vietnam..."
 *         version:
 *           type: integer
 *           example: 2
 *         source:
 *           type: string
 *           enum: [db, default]
 *           example: "db"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: "2026-04-16T10:00:00.000Z"
 */

module.exports = {};
