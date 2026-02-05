const express = require('express');
const router = express.Router();
const JournalController = require('../controllers/JournalController');
const JournalValidator = require('../validators/journal.validator');
const authenticate = require('../middlewares/auth.middleware');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary.config');

// Combined storage for journal uploads
const journalStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Determine folder and settings based on field name
        if (file.fieldname === 'images') {
            return {
                folder: 'catholic_pilgrimage/journals/images',
                allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
                transformation: [{ width: 2000, height: 2000, crop: 'limit' }]
            };
        } else if (file.fieldname === 'audio') {
            return {
                folder: 'catholic_pilgrimage/journals/audio',
                resource_type: 'video' // Cloudinary uses 'video' for audio files
            };
        } else if (file.fieldname === 'video') {
            return {
                folder: 'catholic_pilgrimage/journals/videos',
                resource_type: 'video'
            };
        }
    }
});

const uploadJournal = multer({
    storage: journalStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
}).fields([
    { name: 'images', maxCount: 10 },
    { name: 'audio', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]);

/**
 * @swagger
 * tags:
 *   name: Journals - Pilgrim
 *   description: Nhật ký tâm linh
 */

/**
 * @swagger
 * /api/journals:
 *   post:
 *     summary: Tạo nhật ký tâm linh mới (yêu cầu check-in trước)
 *     tags: [Journals - Pilgrim]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - planner_item_id
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 500
 *                 description: Tiêu đề nhật ký
 *                 example: "Chuyến hành hương đến Nhà thờ Đức Bà"
 *               content:
 *                 type: string
 *                 description: Nội dung nhật ký
 *                 example: "Hôm nay tôi đã có một chuyến hành hương ý nghĩa..."
 *               planner_item_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID của planner item đã check-in (bắt buộc)
 *                 example: "abc-123-def-456"
 *               privacy:
 *                 type: string
 *                 enum: [private, public]
 *                 default: private
 *                 description: Chế độ riêng tư
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 10
 *                 description: Tối đa 10 ảnh (jpg, png, jpeg, webp), mỗi ảnh max 10MB
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: File audio (mp3, wav, m4a, ogg, aac), max 100MB
 *               video:
 *                 type: string
 *                 format: binary
 *                 description: File video, max 100MB
 *     responses:
 *       201:
 *         description: Tạo nhật ký thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc chưa check-in
 *       401:
 *         description: Chưa đăng nhập
 */
router.post(
    '/',
    authenticate,
    uploadJournal,
    JournalValidator.createJournal,
    JournalController.createJournal
);

/**
 * GET /journals/me - Get user's own journals (authenticated)
 */
router.get(
    '/me',
    authenticate,
    JournalValidator.getUserJournals,
    JournalController.getUserJournals
);

/**
 * GET /journals/public - Get public journals (no auth required)
 */
router.get(
    '/public',
    JournalValidator.getPublicJournals,
    JournalController.getPublicJournals
);

/**
 * GET /journals/:id - Get journal by ID
 */
router.get(
    '/:id',
    JournalController.getJournalById
);

/**
 * PATCH /journals/:id - Update journal (authenticated, owner only)
 */
router.patch(
    '/:id',
    authenticate,
    uploadJournal,
    JournalValidator.updateJournal,
    JournalController.updateJournal
);

/**
 * DELETE /journals/:id - Delete journal (authenticated, owner only)
 */
router.delete(
    '/:id',
    authenticate,
    JournalController.deleteJournal
);

module.exports = router;
