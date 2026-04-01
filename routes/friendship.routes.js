const express = require('express');
const router = express.Router();
const FriendshipController = require('../controllers/pilgrim/FriendshipController');
const FriendshipValidator = require('../validators/friendship.validator');
const authenticate = require('../middlewares/auth.middleware');

// POST /api/friendships/request - Gửi lời mời kết bạn
router.post(
    '/request',
    authenticate,
    FriendshipValidator.sendFriendRequest,
    FriendshipController.sendFriendRequest
);

// POST /api/friendships/:id/respond - Chấp nhận/từ chối lời mời
router.post(
    '/:id/respond',
    authenticate,
    FriendshipValidator.respondToFriendRequest,
    FriendshipController.respondToFriendRequest
);

// GET /api/friendships - Danh sách bạn bè
router.get(
    '/',
    authenticate,
    FriendshipValidator.listPagination,
    FriendshipController.getFriendsList
);

// GET /api/friendships/pending - Lời mời chờ
router.get(
    '/pending',
    authenticate,
    FriendshipValidator.listPagination,
    FriendshipController.getPendingRequests
);

// DELETE /api/friendships/:friendId - Hủy kết bạn
router.delete(
    '/:friendId',
    authenticate,
    FriendshipValidator.removeFriend,
    FriendshipController.removeFriend
);

module.exports = router;
