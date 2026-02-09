const { Planner, PlannerMember, PlannerMessage, User } = require('../../models');
const Logger = require('../../utils/logger.util');

/**
 * Check if user can access planner chat (owner or member)
 */
exports.canAccessChat = async (plannerId, userId) => {
    const planner = await Planner.findByPk(plannerId);
    if (!planner) return false;

    if (planner.user_id === userId) return true;

    const member = await PlannerMember.findOne({
        where: { planner_id: plannerId, user_id: userId }
    });

    return !!member;
};

/**
 * Get messages for a planner
 */
exports.getMessages = async (plannerId, userId, filters = {}) => {
    try {
        // Check access
        const canAccess = await exports.canAccessChat(plannerId, userId);
        if (!canAccess) {
            throw new Error('Forbidden');
        }

        const { page = 1, limit = 50 } = filters;
        const offset = (page - 1) * limit;

        const { rows: messages, count: total } = await PlannerMessage.findAndCountAll({
            where: { planner_id: plannerId },
            include: [{
                model: User,
                as: 'sender',
                attributes: ['id', 'full_name', 'avatar_url']
            }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });

        return {
            messages: messages.reverse().map(msg => ({
                id: msg.id,
                message_type: msg.message_type,
                content: msg.content,
                image_url: msg.image_url,
                sender: msg.sender ? {
                    id: msg.sender.id,
                    full_name: msg.sender.full_name,
                    avatar_url: msg.sender.avatar_url
                } : null,
                created_at: msg.created_at
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        Logger.error('Get planner messages error:', error);
        throw error;
    }
};

/**
 * Send a message to planner chat
 */
exports.sendMessage = async (plannerId, userId, messageData) => {
    try {
        const canAccess = await exports.canAccessChat(plannerId, userId);
        if (!canAccess) {
            throw new Error('Forbidden');
        }

        const planner = await Planner.findByPk(plannerId);
        if (planner.status === 'completed') {
            throw new Error('Cannot send messages to completed planner');
        }

        const { message_type = 'text', content, image_url } = messageData;

        // Validate based on message type
        if (message_type === 'text' && !content) {
            throw new Error('Content is required for text messages');
        }
        if (message_type === 'image' && !image_url) {
            throw new Error('Image URL is required for image messages');
        }

        const message = await PlannerMessage.create({
            planner_id: plannerId,
            user_id: userId,
            message_type,
            content: message_type === 'text' ? content : null,
            image_url: message_type === 'image' ? image_url : null
        });

        const result = await PlannerMessage.findByPk(message.id, {
            include: [{
                model: User,
                as: 'sender',
                attributes: ['id', 'full_name', 'avatar_url']
            }]
        });

        // Auto-cleanup old messages (keep last 100)
        const messageCount = await PlannerMessage.count({ where: { planner_id: plannerId } });
        if (messageCount > 100) {
            const oldMessages = await PlannerMessage.findAll({
                where: { planner_id: plannerId },
                order: [['created_at', 'ASC']],
                limit: messageCount - 100
            });
            const oldIds = oldMessages.map(m => m.id);
            await PlannerMessage.destroy({ where: { id: oldIds } });
            Logger.info(`Cleaned up ${oldIds.length} old messages from planner ${plannerId}`);
        }

        Logger.info(`Message sent to planner ${plannerId} by user ${userId}`);

        return {
            id: result.id,
            message_type: result.message_type,
            content: result.content,
            image_url: result.image_url,
            sender: result.sender ? {
                id: result.sender.id,
                full_name: result.sender.full_name,
                avatar_url: result.sender.avatar_url
            } : null,
            created_at: result.created_at
        };
    } catch (error) {
        Logger.error('Send planner message error:', error);
        throw error;
    }
};

/**
 * Upload image for chat
 * Note: File is already uploaded to Cloudinary via multer-storage-cloudinary middleware
 */
exports.uploadImage = async (plannerId, userId, file) => {
    try {
        // Check access
        const canAccess = await exports.canAccessChat(plannerId, userId);
        if (!canAccess) {
            throw new Error('Forbidden');
        }

        // File already uploaded by cloudinary middleware
        // file.path contains the Cloudinary URL
        Logger.info(`Image uploaded to Cloudinary for planner ${plannerId}`);

        return {
            image_url: file.path
        };
    } catch (error) {
        Logger.error('Upload chat image error:', error);
        throw error;
    }
};

/**
 * Delete a message
 */
exports.deleteMessage = async (plannerId, userId, messageId) => {
    try {
        const message = await PlannerMessage.findByPk(messageId);

        if (!message || message.planner_id !== plannerId) {
            throw new Error('Message not found');
        }

        // Only message sender or planner owner can delete
        const planner = await Planner.findByPk(plannerId);
        if (message.user_id !== userId && planner.user_id !== userId) {
            throw new Error('Forbidden');
        }

        await message.destroy();

        Logger.info(`Message ${messageId} deleted from planner ${plannerId}`);

        return { message: 'Message deleted successfully' };
    } catch (error) {
        Logger.error('Delete planner message error:', error);
        throw error;
    }
};

/**
 * Clear all messages when planner is completed
 */
exports.clearMessages = async (plannerId) => {
    try {
        const deleted = await PlannerMessage.destroy({
            where: { planner_id: plannerId }
        });
        Logger.info(`Cleared ${deleted} messages from planner ${plannerId}`);
        return { deleted };
    } catch (error) {
        Logger.error('Clear planner messages error:', error);
        throw error;
    }
};
