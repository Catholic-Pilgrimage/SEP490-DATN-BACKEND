const express = require('express');
const router = express.Router();
const PlannerChatController = require('../controllers/pilgrim/PlannerChatController');
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
// POST /api/planners/:id/messages - Gửi tin nhắn
router.post(
    '/:id/messages',
    authenticate,
    upload.single('image'),
    PlannerChatValidator.sendMessage,
    PlannerChatController.sendMessage
);

// DELETE /api/planners/:id/messages/:messageId - Xóa tin nhắn
router.delete(
    '/:id/messages/:messageId',
    authenticate,
    PlannerChatValidator.deleteMessage,
    PlannerChatController.deleteMessage
);

module.exports = router;
