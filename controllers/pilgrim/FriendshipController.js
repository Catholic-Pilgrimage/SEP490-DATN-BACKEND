const FriendshipService = require('../../services/pilgrim/friendshipService');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

class FriendshipController {
    /**
     * POST /friendships/request - Send a friend request
     */
    static async sendFriendRequest(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const { addressee_id } = req.body;
            const result = await FriendshipService.sendFriendRequest(req.user.id, addressee_id);
            return ResponseUtil.success(res, result, 'Đã gửi lời mời kết bạn');
        } catch (error) {
            if (error.message === 'Cannot send friend request to yourself') {
                return ResponseUtil.badRequest(res, 'Không thể kết bạn với chính mình');
            }
            if (error.message === 'User not found') {
                return ResponseUtil.notFound(res, 'Không tìm thấy người dùng');
            }
            if (error.message === 'Already friends') {
                return ResponseUtil.badRequest(res, 'Hai người đã là bạn bè');
            }
            if (error.message === 'Friend request already sent') {
                return ResponseUtil.badRequest(res, 'Đã gửi lời mời kết bạn trước đó');
            }
            if (error.message === 'Cannot send friend request') {
                return ResponseUtil.badRequest(res, 'Không thể gửi lời mời kết bạn');
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /friendships/:id/respond - Respond to friend request
     */
    static async respondToFriendRequest(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const { action } = req.body;
            const result = await FriendshipService.respondToFriendRequest(req.params.id, req.user.id, action);

            const message = action === 'accept' ? 'Đã chấp nhận lời mời kết bạn' : 'Đã từ chối lời mời kết bạn';
            return ResponseUtil.success(res, result, message);
        } catch (error) {
            if (error.message === 'Invalid action. Must be "accept" or "reject"') {
                return ResponseUtil.badRequest(res, 'Hành động không hợp lệ');
            }
            if (error.message === 'Friend request not found') {
                return ResponseUtil.notFound(res, 'Không tìm thấy lời mời kết bạn');
            }
            if (error.message === 'Friend request already processed') {
                return ResponseUtil.badRequest(res, 'Lời mời kết bạn đã được xử lý');
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, 'Chỉ người nhận mới có thể phản hồi');
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /friendships - Get friendships (filter by status)
     */
    static async getFriendsList(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const status = req.query.status || 'accepted';
            const result = await FriendshipService.getFriendships(req.user.id, status, page, limit);
            return ResponseUtil.success(res, result, 'Lấy danh sách thành công');
        } catch (error) {
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * DELETE /friendships/:friendId - Remove a friend
     */
    static async removeFriend(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await FriendshipService.removeFriend(req.user.id, req.params.friendId);
            return ResponseUtil.success(res, result, 'Đã hủy kết bạn thành công');
        } catch (error) {
            if (error.message === 'Friendship not found') {
                return ResponseUtil.notFound(res, 'Không tìm thấy quan hệ bạn bè');
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = FriendshipController;
