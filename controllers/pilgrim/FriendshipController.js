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
            return ResponseUtil.success(res, result, req.__('friendship.request_sent'));
        } catch (error) {
            if (error.message === 'Cannot send friend request to yourself') {
                return ResponseUtil.badRequest(res, req.__('friendship.cannot_send_self'));
            }
            if (error.message === 'User not found') {
                return ResponseUtil.notFound(res, req.__('friendship.user_not_found'));
            }
            if (error.message === 'Already friends') {
                return ResponseUtil.badRequest(res, req.__('friendship.already_friends'));
            }
            if (error.message === 'Friend request already sent') {
                return ResponseUtil.badRequest(res, req.__('friendship.already_sent'));
            }
            if (error.message === 'Cannot send friend request') {
                return ResponseUtil.badRequest(res, req.__('friendship.cannot_send'));
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

            const message = action === 'accept' ? req.__('friendship.request_accepted') : req.__('friendship.request_rejected');
            return ResponseUtil.success(res, result, message);
        } catch (error) {
            if (error.message === 'Invalid action. Must be "accept" or "reject"') {
                return ResponseUtil.badRequest(res, req.__('friendship.invalid_action'));
            }
            if (error.message === 'Friend request not found') {
                return ResponseUtil.notFound(res, req.__('friendship.request_not_found'));
            }
            if (error.message === 'Friend request already processed') {
                return ResponseUtil.badRequest(res, req.__('friendship.already_processed'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('friendship.forbidden_respond'));
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
            return ResponseUtil.success(res, result, req.__('friendship.list_success'));
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
            return ResponseUtil.success(res, result, req.__('friendship.removed'));
        } catch (error) {
            if (error.message === 'Friendship not found') {
                return ResponseUtil.notFound(res, req.__('friendship.friendship_not_found'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /friendships/search?email=... - Search user by email
     */
    static async searchByEmail(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const { email } = req.query;
            const result = await FriendshipService.searchByEmail(req.user.id, email);
            return ResponseUtil.success(res, result, req.__('friendship.search_success'));
        } catch (error) {
            if (error.message === 'User not found') {
                return ResponseUtil.notFound(res, req.__('friendship.not_found'));
            }
            if (error.message === 'Cannot search yourself') {
                return ResponseUtil.badRequest(res, req.__('friendship.cannot_search_yourself'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = FriendshipController;
