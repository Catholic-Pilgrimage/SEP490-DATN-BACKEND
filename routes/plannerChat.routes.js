const express = require('express');
const router = express.Router();
const PlannerChatController = require('../controllers/PlannerChatController');
const PlannerChatValidator = require('../validators/plannerChat.validator');
const authenticate = require('../middlewares/auth.middleware');
const { upload } = require('../config/cloudinary.config');

// GET /api/planners/:id/messages - Lấy tin nhắn
router.get(
    '/:id/messages',
    authenticate,
    PlannerChatValidator.getMessages,
    PlannerChatController.getMessages
);

// POST /api/planners/:id/messages - Gửi tin nhắn
router.post(
    '/:id/messages',
    authenticate,
    PlannerChatValidator.sendMessage,
    PlannerChatController.sendMessage
);

// POST /api/planners/:id/messages/upload-image - Upload ảnh
router.post(
    '/:id/messages/upload-image',
    authenticate,
    upload.single('image'),
    PlannerChatValidator.validatePlannerId,
    PlannerChatController.uploadImage
);

// DELETE /api/planners/:id/messages/:messageId - Xóa tin nhắn
router.delete(
    '/:id/messages/:messageId',
    authenticate,
    PlannerChatValidator.deleteMessage,
    PlannerChatController.deleteMessage
);

module.exports = router;
