const express = require('express');
const router = express.Router();
const PostController = require('../controllers/PostController');
const postValidator = require('../validators/post.validator');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary.config');

// Cloudinary storage for post images
const postImageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'catholic_pilgrimage/posts',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }]
    }
});

const uploadImages = multer({
    storage: postImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max per image
}).array('images', 10); // Max 10 images per post

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Quản lý bài viết trong nhóm
 */

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Tạo bài viết mới
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Nội dung bài viết
 *               group_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID nhóm (nếu post trong nhóm)
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Tối đa 10 ảnh
 *     responses:
 *       201:
 *         description: Tạo bài viết thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền post trong nhóm
 */
router.post('/',
    authenticate,
    uploadImages,
    postValidator.createPost,
    validate,
    PostController.createPost
);

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Lấy danh sách bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: group_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lọc theo nhóm
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
 *     responses:
 *       200:
 *         description: Danh sách bài viết
 */
router.get('/',
    authenticate,
    postValidator.getPosts,
    validate,
    PostController.getPosts
);

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Lấy chi tiết bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Chi tiết bài viết
 *       404:
 *         description: Không tìm thấy bài viết
 */
router.get('/:id',
    authenticate,
    postValidator.postId,
    validate,
    PostController.getPostById
);

/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Cập nhật bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Chỉ chủ bài viết mới có thể cập nhật
 */
router.put('/:id',
    authenticate,
    uploadImages,
    postValidator.updatePost,
    validate,
    PostController.updatePost
);

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Xóa bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền xóa
 */
router.delete('/:id',
    authenticate,
    postValidator.postId,
    validate,
    PostController.deletePost
);

/**
 * @swagger
 * /api/posts/{id}/like:
 *   post:
 *     summary: Like bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Like thành công
 *       400:
 *         description: Đã like rồi
 */
router.post('/:id/like',
    authenticate,
    postValidator.postId,
    validate,
    PostController.likePost
);

/**
 * @swagger
 * /api/posts/{id}/like:
 *   delete:
 *     summary: Unlike bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Unlike thành công
 *       400:
 *         description: Chưa like
 */
router.delete('/:id/like',
    authenticate,
    postValidator.postId,
    validate,
    PostController.unlikePost
);

/**
 * @swagger
 * /api/posts/{id}/comments:
 *   post:
 *     summary: Thêm comment vào bài viết
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Nội dung comment
 *     responses:
 *       201:
 *         description: Comment thành công
 */
router.post('/:id/comments',
    authenticate,
    postValidator.createComment,
    validate,
    PostController.addComment
);

/**
 * @swagger
 * /api/posts/{id}/comments:
 *   get:
 *     summary: Lấy danh sách comment
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     responses:
 *       200:
 *         description: Danh sách comment
 */
router.get('/:id/comments',
    authenticate,
    postValidator.getComments,
    validate,
    PostController.getComments
);

/**
 * @swagger
 * /api/posts/{id}/comments/{commentId}:
 *   put:
 *     summary: Cập nhật comment
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Chỉ chủ comment mới có thể cập nhật
 */
router.put('/:id/comments/:commentId',
    authenticate,
    postValidator.updateComment,
    validate,
    PostController.updateComment
);

/**
 * @swagger
 * /api/posts/{id}/comments/{commentId}:
 *   delete:
 *     summary: Xóa comment
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền xóa
 */
router.delete('/:id/comments/:commentId',
    authenticate,
    postValidator.commentId,
    validate,
    PostController.deleteComment
);

module.exports = router;
