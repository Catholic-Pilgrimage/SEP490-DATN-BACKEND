const PlannerChatService = require('../../services/pilgrim/plannerChatService');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');
const { emitPlannerChatMessage, emitPlannerChatMessageDeleted } = require('../../websockets/socket');

/**
 * GET /api/planners/:id/messages - Get chat messages
 */
exports.getMessages = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseUtil.error(res, formatValidationErrors(errors.array()), 400);
        }

        const { id: plannerId } = req.params;
        const userId = req.user.id;
        const filters = {
            page: req.query.page,
            limit: req.query.limit
        };

        const result = await PlannerChatService.getMessages(plannerId, userId, filters);

        return ResponseUtil.success(res, result, req.__('planner.chat.get_messages_success'));
    } catch (error) {
        if (error.message === 'NO_ACCESS') {
            return ResponseUtil.error(res, req.__('planner.chat.no_access'), 403);
        }
        if (error.message === 'NO_MEMBERS') {
            return ResponseUtil.error(res, req.__('planner.chat.no_members'), 403);
        }
        if (error.message === 'PLANNER_NOT_FOUND') {
            return ResponseUtil.error(res, req.__('planner.chat.planner_not_found'), 404);
        }
        return ResponseUtil.error(res, error.message, 500);
    }
};

/**
 * POST /api/planners/:id/messages - Send a message
 */
exports.sendMessage = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseUtil.error(res, formatValidationErrors(errors.array()), 400);
        }

        const { id: plannerId } = req.params;
        const userId = req.user.id;
        const messageData = req.body;

        // If an image was uploaded via multipart/form-data
        if (req.file) {
            messageData.message_type = 'image';
            messageData.image_url = req.file.path;
        }

        const result = await PlannerChatService.sendMessage(plannerId, userId, messageData);

        // Emit WebSocket event to planner chat room
        emitPlannerChatMessage(plannerId, result);

        return ResponseUtil.success(res, result, req.__('planner.chat.send_message_success'), 201);
    } catch (error) {
        if (error.message === 'NO_ACCESS') {
            return ResponseUtil.error(res, req.__('planner.chat.no_access'), 403);
        }
        if (error.message === 'NO_MEMBERS') {
            return ResponseUtil.error(res, req.__('planner.chat.no_members'), 403);
        }
        if (error.message === 'PLANNER_NOT_FOUND') {
            return ResponseUtil.error(res, req.__('planner.chat.planner_not_found'), 404);
        }
        if (error.message === 'Cannot send messages to completed planner') {
            return ResponseUtil.error(res, req.__('planner.chat.cannot_send_completed'), 400);
        }
        if (error.message === 'Content is required for text messages') {
            return ResponseUtil.error(res, req.__('planner.chat.content_required'), 400);
        }
        if (error.message === 'Image URL is required for image messages') {
            return ResponseUtil.error(res, req.__('planner.chat.image_url_required'), 400);
        }
        return ResponseUtil.error(res, error.message, 500);
    }
};

/**
 * DELETE /api/planners/:id/messages/:messageId - Delete a message
 */
exports.deleteMessage = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return ResponseUtil.error(res, formatValidationErrors(errors.array()), 400);
        }

        const { id: plannerId, messageId } = req.params;
        const userId = req.user.id;

        await PlannerChatService.deleteMessage(plannerId, userId, messageId);

        // Emit WebSocket event to planner chat room
        emitPlannerChatMessageDeleted(plannerId, messageId);

        return ResponseUtil.success(res, null, req.__('planner.chat.delete_message_success'));
    } catch (error) {
        if (error.message === 'Forbidden') {
            return ResponseUtil.error(res, req.__('planner.chat.forbidden_delete'), 403);
        }
        if (error.message === 'Message not found') {
            return ResponseUtil.error(res, req.__('planner.chat.message_not_found'), 404);
        }
        return ResponseUtil.error(res, error.message, 500);
    }
};
