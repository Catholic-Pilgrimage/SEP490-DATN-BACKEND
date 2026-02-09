const PlannerChatService = require('../services/plannerChatService');
const ResponseUtil = require('../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../utils/validation.util');
const { emitPlannerChatMessage, emitPlannerChatMessageDeleted } = require('../websockets/socket');

class PlannerChatController {
    /**
     * GET /api/planners/:id/messages - Get chat messages
     */
    static async getMessages(req, res) {
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

            return ResponseUtil.success(res, result, 'Lấy tin nhắn thành công');
        } catch (error) {
            if (error.message === 'Forbidden') {
                return ResponseUtil.error(res, 'Bạn không có quyền truy cập chat này', 403);
            }
            return ResponseUtil.error(res, error.message, 500);
        }
    }

    /**
     * POST /api/planners/:id/messages - Send a message
     */
    static async sendMessage(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.error(res, formatValidationErrors(errors.array()), 400);
            }

            const { id: plannerId } = req.params;
            const userId = req.user.id;
            const messageData = req.body;

            const result = await PlannerChatService.sendMessage(plannerId, userId, messageData);

            // Emit WebSocket event to planner chat room
            emitPlannerChatMessage(plannerId, result);

            return ResponseUtil.success(res, result, 'Gửi tin nhắn thành công', 201);
        } catch (error) {
            if (error.message === 'Forbidden') {
                return ResponseUtil.error(res, 'Bạn không có quyền gửi tin nhắn', 403);
            }
            if (error.message === 'Cannot send messages to completed planner') {
                return ResponseUtil.error(res, 'Không thể gửi tin nhắn cho planner đã hoàn thành', 400);
            }
            if (error.message === 'Content is required for text messages') {
                return ResponseUtil.error(res, 'Nội dung tin nhắn không được để trống', 400);
            }
            if (error.message === 'Image URL is required for image messages') {
                return ResponseUtil.error(res, 'URL ảnh không được để trống', 400);
            }
            return ResponseUtil.error(res, error.message, 500);
        }
    }

    /**
     * POST /api/planners/:id/messages/upload-image - Upload image for chat
     */
    static async uploadImage(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.error(res, formatValidationErrors(errors.array()), 400);
            }

            const { id: plannerId } = req.params;
            const userId = req.user.id;

            if (!req.file) {
                return ResponseUtil.error(res, 'Vui lòng chọn ảnh để upload', 400);
            }

            const result = await PlannerChatService.uploadImage(plannerId, userId, req.file);

            return ResponseUtil.success(res, result, 'Upload ảnh thành công', 201);
        } catch (error) {
            if (error.message === 'Forbidden') {
                return ResponseUtil.error(res, 'Bạn không có quyền upload ảnh', 403);
            }
            return ResponseUtil.error(res, error.message, 500);
        }
    }

    /**
     * DELETE /api/planners/:id/messages/:messageId - Delete a message
     */
    static async deleteMessage(req, res) {
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

            return ResponseUtil.success(res, null, 'Xóa tin nhắn thành công');
        } catch (error) {
            if (error.message === 'Forbidden') {
                return ResponseUtil.error(res, 'Bạn không có quyền xóa tin nhắn này', 403);
            }
            if (error.message === 'Message not found') {
                return ResponseUtil.error(res, 'Tin nhắn không tồn tại', 404);
            }
            return ResponseUtil.error(res, error.message, 500);
        }
    }
}

module.exports = PlannerChatController;
