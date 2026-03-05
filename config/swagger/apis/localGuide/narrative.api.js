/**
 * @swagger
 * tags:
 *   - name: Local Guide - Narrative
 *     description: API quản lý thuyết minh âm thanh cho Model 3D (Text-to-Speech & Audio Upload)
 */

/**
 * @swagger
 * /api/local-guide/media/voices:
 *   get:
 *     summary: Danh sách giọng đọc AI (VBee TTS)
 *     description: |
 *       Trả về danh sách các giọng đọc AI có sẵn từ VBee Text-to-Speech.
 *       Mỗi giọng bao gồm: id, tên, giới tính, vùng miền, chất lượng.
 *       Dùng để hiển thị dropdown cho Local Guide chọn giọng đọc.
 *     tags: [Local Guide - Narrative]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách giọng đọc thành công
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
 *                   example: "Lấy danh sách giọng đọc thành công"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "hn_female_thutrang_full_48k-fhg"
 *                       name:
 *                         type: string
 *                         example: "Thu Trang"
 *                       gender:
 *                         type: string
 *                         enum: [female, male]
 *                         example: "female"
 *                       region:
 *                         type: string
 *                         example: "Bắc"
 *                       quality:
 *                         type: string
 *                         example: "high"
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không phải Local Guide
 */

/**
 * @swagger
 * /api/local-guide/media/{id}/narrative:
 *   put:
 *     summary: Cập nhật thuyết minh cho Model 3D (Local Guide)
 *     description: |
 *       Thêm hoặc cập nhật đoạn thuyết minh âm thanh cho Model 3D.
 *       Hỗ trợ 2 phương thức:
 *
 *       **Phương thức A - Text-to-Speech (AI - VBee):**
 *       - Gửi `narration_text` (3-5000 ký tự)
 *       - Hệ thống tự động chọn giọng đọc theo vùng miền của Site (Bắc/Trung/Nam)
 *       - Có thể ghi đè giọng bằng tham số `voice` (tùy chọn)
 *       - Backend gọi VBee TTS → tải audio → upload Cloudinary → lưu DB
 *
 *       **Phương thức B - Upload Audio trực tiếp:**
 *       - Gửi file `audio_file` (.mp3, .wav, .m4a, .aac, .ogg)
 *       - File size tối đa: 50MB
 *       - Backend upload thẳng lên Cloudinary
 *
 *       **Lưu ý:**
 *       - Sau khi cập nhật, `narrative_status` sẽ chuyển về `pending` để Manager duyệt
 *       - Không thể sửa thuyết minh đã được duyệt (`narrative_status = approved`)
 *       - `status` và `is_active` của media KHÔNG bị thay đổi
 *     tags: [Local Guide - Narrative]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của SiteMedia (phải là type model_3d)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               narration_text:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 5000
 *                 example: "Kính chào quý khách hành hương, trước mắt quý khách là nhà thờ Đức Bà Sài Gòn..."
 *                 description: Văn bản thuyết minh (sẽ được chuyển thành giọng nói AI)
 *               voice:
 *                 type: string
 *                 example: "hn_female_thutrang_full_48k-fhg"
 *                 description: Giọng đọc VBee (tùy chọn, mặc định theo vùng miền Site). Gọi GET /media/voices để lấy danh sách
 *               audio_file:
 *                 type: string
 *                 format: binary
 *                 description: File audio upload trực tiếp (.mp3, .wav, .m4a, .aac, .ogg). Tối đa 50MB
 *     responses:
 *       200:
 *         description: Cập nhật thuyết minh thành công
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
 *                   example: "Cập nhật thuyết minh thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     audio_url:
 *                       type: string
 *                       example: "https://res.cloudinary.com/.../narration_xxx.mp3"
 *                     narration_text:
 *                       type: string
 *                       example: "Kính chào quý khách hành hương..."
 *                     status:
 *                       type: string
 *                       example: "approved"
 *                       description: Trạng thái của media (KHÔNG thay đổi)
 *                     narrative_status:
 *                       type: string
 *                       example: "pending"
 *                       description: Trạng thái duyệt thuyết minh
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: |
 *           - Thiếu narration_text hoặc audio_file
 *           - Media không phải model_3d
 *           - Text quá ngắn (< 3 ký tự) hoặc quá dài (> 5000 ký tự)
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: |
 *           - Không có quyền (khác site)
 *           - Thuyết minh đã được duyệt (approved), không thể sửa
 *       404:
 *         description: Media không tồn tại
 *       500:
 *         description: Lỗi server hoặc VBee TTS thất bại
 *
 *   delete:
 *     summary: Xóa thuyết minh (Local Guide)
 *     description: |
 *       Xóa đoạn thuyết minh âm thanh của Model 3D.
 *       - Chỉ xóa được khi `narrative_status` là `pending` hoặc `rejected`
 *       - Không thể xóa thuyết minh đã được duyệt (approved)
 *       - Tất cả fields sẽ reset về NULL
 *     tags: [Local Guide - Narrative]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của SiteMedia
 *     responses:
 *       200:
 *         description: Xóa thuyết minh thành công
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
 *                   example: "Xóa thuyết minh thành công"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     audio_url:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     narration_text:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     narrative_status:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *       400:
 *         description: |
 *           - Media không phải model_3d
 *           - Không có thuyết minh để xóa
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: |
 *           - Không có quyền (khác site)
 *           - Không thể xóa thuyết minh đã duyệt
 *       404:
 *         description: Media không tồn tại
 */
