const express = require('express');
const router = express.Router();
const GroupController = require('../controllers/GroupController');
const groupValidator = require('../validators/group.validator');
const authenticate = require('../middlewares/auth.middleware');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary.config');

// Cloudinary storage for group avatars
const groupAvatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'catholic_pilgrimage/groups/avatars',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }]
    }
});

const uploadAvatar = multer({
    storage: groupAvatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
}).single('avatar');

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Quản lý nhóm cộng đồng
 */

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Tạo nhóm mới
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Tên nhóm (bắt buộc, không được để trống)
 *                 example: "Nhóm Hành Hương Sài Gòn"
 *               description:
 *                 type: string
 *                 description: Mô tả nhóm
 *                 example: "Nhóm dành cho những người hành hương tại Sài Gòn"
 *               privacy:
 *                 type: string
 *                 enum: [public, private]
 *                 default: public
 *                 description: Chế độ riêng tư
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh đại diện nhóm (jpg, png, jpeg, webp, max 5MB)
 *     responses:
 *       201:
 *         description: Tạo nhóm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 */
router.post(
    '/',
    authenticate,
    uploadAvatar,
    groupValidator.createGroup,
    GroupController.createGroup
);

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Lấy danh sách nhóm của người dùng
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy danh sách nhóm thành công
 *       401:
 *         description: Chưa đăng nhập
 */
router.get(
    '/',
    authenticate,
    GroupController.getUserGroups
);

/**
 * @swagger
 * /api/groups/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết nhóm
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của nhóm
 *     responses:
 *       200:
 *         description: Lấy thông tin nhóm thành công
 *       403:
 *         description: Không có quyền truy cập (nhóm riêng tư)
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.get(
    '/:id',
    authenticate,
    groupValidator.groupId,
    GroupController.getGroupById
);

/**
 * @swagger
 * /api/groups/{id}:
 *   patch:
 *     summary: Cập nhật thông tin nhóm (chỉ chủ nhóm)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của nhóm
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Tên nhóm mới
 *               description:
 *                 type: string
 *                 description: Mô tả nhóm mới
 *               privacy:
 *                 type: string
 *                 enum: [public, private]
 *                 description: Chế độ riêng tư mới
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Ảnh đại diện mới (jpg, png, jpeg, webp, max 5MB)
 *     responses:
 *       200:
 *         description: Cập nhật nhóm thành công
 *       403:
 *         description: Chỉ admin mới có quyền cập nhật
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.patch(
    '/:id',
    authenticate,
    uploadAvatar,
    groupValidator.updateGroup,
    GroupController.updateGroup
);

/**
 * @swagger
 * /api/groups/{id}:
 *   delete:
 *     summary: Xóa nhóm (chỉ chủ nhóm)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của nhóm
 *     responses:
 *       200:
 *         description: Xóa nhóm thành công
 *       403:
 *         description: Chỉ admin mới có quyền xóa
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.delete(
    '/:id',
    authenticate,
    groupValidator.groupId,
    GroupController.deleteGroup
);

/**
 * @swagger
 * /api/groups/{id}/invite:
 *   post:
 *     summary: Mời thành viên qua email (chỉ chủ nhóm)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của nhóm
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email người được mời
 *                 example: "nguoidung@example.com"
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *                 default: member
 *                 description: Vai trò trong nhóm
 *     responses:
 *       201:
 *         description: Gửi lời mời thành công
 *       400:
 *         description: Email đã là thành viên hoặc đã được mời
 *       403:
 *         description: Chỉ admin mới có quyền mời thành viên
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.post(
    '/:id/invite',
    authenticate,
    groupValidator.inviteMember,
    GroupController.inviteMember
);

/**
 * @swagger
 * /api/groups/invitations/{token}:
 *   post:
 *     summary: Phản hồi lời mời tham gia nhóm (chấp nhận hoặc từ chối)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token lời mời (từ email)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accept, reject]
 *                 description: Hành động (accept = chấp nhận, reject = từ chối)
 *                 example: "accept"
 *     responses:
 *       200:
 *         description: Phản hồi lời mời thành công
 *       400:
 *         description: Lời mời không hợp lệ hoặc đã hết hạn
 *       403:
 *         description: Email không khớp với lời mời
 *       404:
 *         description: Không tìm thấy lời mời
 */
router.post(
    '/invitations/:token',
    authenticate,
    groupValidator.respondToInvitation,
    GroupController.respondToInvitation
);

/**
 * @swagger
 * /api/groups/{id}/members/{userId}:
 *   delete:
 *     summary: Xóa thành viên khỏi nhóm (chỉ chủ nhóm)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của nhóm
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của thành viên cần xóa
 *     responses:
 *       200:
 *         description: Xóa thành viên thành công
 *       400:
 *         description: Không thể tự xóa mình
 *       403:
 *         description: Chỉ admin mới có quyền xóa thành viên
 *       404:
 *         description: Không tìm thấy nhóm hoặc thành viên
 */
router.delete(
    '/:id/members/:userId',
    authenticate,
    groupValidator.removeMember,
    GroupController.removeMember
);

/**
 * @swagger
 * /api/groups/{id}/leave:
 *   post:
 *     summary: Rời khỏi nhóm (thành viên thường)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của nhóm
 *     responses:
 *       200:
 *         description: Rời nhóm thành công
 *       400:
 *         description: Admin không thể rời nhóm
 *       404:
 *         description: Không tìm thấy nhóm hoặc bạn không phải thành viên
 */
router.post(
    '/:id/leave',
    authenticate,
    groupValidator.groupId,
    GroupController.leaveGroup
);

/**
 * @swagger
 * /api/groups/{id}/join-requests:
 *   post:
 *     summary: Yêu cầu tham gia nhóm (cho nhóm public)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của nhóm
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Lời nhắn kèm theo yêu cầu tham gia
 *                 example: "Tôi muốn tham gia nhóm để cùng hành hương"
 *     responses:
 *       201:
 *         description: Gửi yêu cầu tham gia thành công
 *       400:
 *         description: Đã là thành viên hoặc đã có yêu cầu chờ duyệt
 *       401:
 *         description: Chưa đăng nhập
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.post(
    '/:id/join-requests',
    authenticate,
    groupValidator.requestToJoin,
    GroupController.createJoinRequest
);

/**
 * @swagger
 * /api/groups/{id}/join-requests:
 *   get:
 *     summary: Lấy danh sách yêu cầu tham gia nhóm (chỉ chủ nhóm)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của nhóm
 *     responses:
 *       200:
 *         description: Lấy danh sách yêu cầu thành công
 *       403:
 *         description: Chỉ admin mới có quyền xem yêu cầu
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.get(
    '/:id/join-requests',
    authenticate,
    groupValidator.groupId,
    GroupController.getGroupJoinRequests
);

/**
 * @swagger
 * /api/groups/{id}/join-requests/{requestId}:
 *   put:
 *     summary: Phản hồi yêu cầu tham gia nhóm (chấp nhận hoặc từ chối - chỉ admin)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của nhóm
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của yêu cầu tham gia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *                 description: Hành động (approve = chấp nhận, reject = từ chối)
 *                 example: "approve"
 *     responses:
 *       200:
 *         description: Xử lý yêu cầu thành công
 *       400:
 *         description: Yêu cầu đã được xử lý trước đó
 *       403:
 *         description: Chỉ admin mới có quyền xử lý yêu cầu
 *       404:
 *         description: Không tìm thấy nhóm hoặc yêu cầu
 */
router.put(
    '/:id/join-requests/:requestId',
    authenticate,
    groupValidator.respondToJoinRequest,
    GroupController.respondToJoinRequest
);

/**
 * @swagger
 * /api/groups/{id}/posts:
 *   get:
 *     summary: Lấy danh sách bài viết trong nhóm
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID của nhóm
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
 *         description: Số lượng bài viết mỗi trang
 *     responses:
 *       200:
 *         description: Lấy danh sách bài viết thành công
 *       403:
 *         description: Không có quyền truy cập (nhóm riêng tư)
 *       404:
 *         description: Không tìm thấy nhóm
 */
const PostController = require('../controllers/PostController');
router.get(
    '/:id/posts',
    authenticate,
    groupValidator.groupId,
    (req, res) => {
        // Forward to PostController with group_id from params
        req.query.group_id = req.params.id;
        return PostController.getPosts(req, res);
    }
);

module.exports = router;
