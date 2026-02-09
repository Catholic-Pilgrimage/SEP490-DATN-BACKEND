const groupService = require('../services/groupService');
const ResponseUtil = require('../utils/response.util');

class GroupController {
    /**
     * Create a new group
     * POST /groups
     */
    async createGroup(req, res) {
        try {
            const userId = req.user.id;

            // If avatar file was uploaded, use Cloudinary URL
            if (req.file) {
                req.body.avatar_url = req.file.path;
            }

            const group = await groupService.createGroup(userId, req.body);

            return ResponseUtil.created(res, group, req.__('group.created'));
        } catch (error) {
            console.error('GroupController.createGroup error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Get all groups user is a member of
     * GET /groups
     */
    async getUserGroups(req, res) {
        try {
            const userId = req.user.id;
            const groups = await groupService.getUserGroups(userId);

            return ResponseUtil.success(res, groups, req.__('group.list_retrieved'));
        } catch (error) {
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Get group by ID
     * GET /groups/:id
     */
    async getGroupById(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const group = await groupService.getGroupById(id, userId);

            return ResponseUtil.success(res, group, req.__('group.retrieved'));
        } catch (error) {
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Update group
     * PATCH /groups/:id
     */
    async updateGroup(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            // If avatar file was uploaded, use Cloudinary URL
            if (req.file) {
                req.body.avatar_url = req.file.path;
            }

            const group = await groupService.updateGroup(id, userId, req.body);

            return ResponseUtil.success(res, group, req.__('group.updated'));
        } catch (error) {
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Delete group
     * DELETE /groups/:id
     */
    async deleteGroup(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const result = await groupService.deleteGroup(id, userId);

            return ResponseUtil.success(res, result, req.__('group.deleted'));
        } catch (error) {
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Invite member via email
     * POST /groups/:id/invite
     */
    async inviteMember(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { email, role } = req.body;

            const result = await groupService.inviteMember(id, userId, email, role);

            return ResponseUtil.created(res, result, req.__('group.invitation_sent'));
        } catch (error) {
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Respond to invitation (accept or reject)
     * POST /groups/invitations/:token
     */
    async respondToInvitation(req, res) {
        try {
            const userId = req.user.id;
            const { token } = req.params;
            const { action } = req.body;

            let result;
            let message;

            if (action === 'accept') {
                result = await groupService.acceptInvitation(token, userId);
                message = req.__('group.invitation_accepted');
            } else {
                result = await groupService.rejectInvitation(token, userId);
                message = req.__('group.invitation_rejected');
            }

            return ResponseUtil.success(res, result, message);
        } catch (error) {
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Remove member from group
     * DELETE /groups/:id/members/:userId
     */
    async removeMember(req, res) {
        try {
            const adminId = req.user.id;
            const { id, userId } = req.params;

            const result = await groupService.removeMember(id, adminId, userId);

            return ResponseUtil.success(res, result, req.__('group.member_removed'));
        } catch (error) {
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Leave group
     * POST /groups/:id/leave
     */
    async leaveGroup(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const result = await groupService.leaveGroup(id, userId);

            return ResponseUtil.success(res, result, req.__('group.left'));
        } catch (error) {
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Request to join a group
     * POST /groups/:id/join-requests
     */
    async createJoinRequest(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { message } = req.body;

            const result = await groupService.requestToJoinGroup(id, userId, message);

            return ResponseUtil.created(res, result, req.__('group.join_request_sent'));
        } catch (error) {
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Get all pending join requests for a group (admin only)
     * GET /groups/:id/join-requests
     */
    async getGroupJoinRequests(req, res) {
        try {
            const adminId = req.user.id;
            const { id } = req.params;

            const requests = await groupService.getGroupJoinRequests(id, adminId);

            return ResponseUtil.success(res, requests, req.__('group.join_requests_retrieved'));
        } catch (error) {
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }

    /**
     * Respond to join request (approve or reject)
     * PUT /groups/:id/join-requests/:requestId
     */
    async respondToJoinRequest(req, res) {
        try {
            const adminId = req.user.id;
            const { id, requestId } = req.params;
            const { action } = req.body;

            let result;
            let message;

            if (action === 'approve') {
                result = await groupService.approveJoinRequest(id, adminId, requestId);
                message = req.__('group.join_request_approved');
            } else {
                result = await groupService.rejectJoinRequest(id, adminId, requestId);
                message = req.__('group.join_request_rejected');
            }

            return ResponseUtil.success(res, result, message);
        } catch (error) {
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }
}

module.exports = new GroupController();



