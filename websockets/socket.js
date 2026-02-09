const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Logger = require('../utils/logger.util');

let io = null;

/**
 * Initialize Socket.io server
 */
function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : ['*'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Authentication middleware
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

            if (!token) {
                return next(new Error('Authentication required'));
            }


            const cleanToken = token.replace('Bearer ', '');

            const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
            socket.userId = decoded.userId; // Fix: use userId instead of id
            socket.userRole = decoded.role;

            next();
        } catch (error) {
            Logger.error('Socket auth error:', error.message);
            next(new Error('Invalid token'));
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        Logger.info(`User ${socket.userId} connected via WebSocket`);

        // Join user's personal room for notifications
        const userRoom = `user_${socket.userId}`;
        socket.join(userRoom);
        Logger.info(`User ${socket.userId} joined room: ${userRoom}`);

        // Handle disconnect
        socket.on('disconnect', () => {
            Logger.info(`User ${socket.userId} disconnected`);
        });

        // Optional: Handle custom events
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date() });
        });

        // ===================== SOS TRACKING =====================

        /**
         * Join SOS tracking room
         * Used by both Pilgrim and Guide when viewing SOS detail
         */
        socket.on('join_sos_tracking', ({ sosId }) => {
            if (!sosId) return;
            const room = `sos_track_${sosId}`;
            socket.join(room);
            Logger.info(`User ${socket.userId} joined SOS tracking room: ${room}`);
        });

        /**
         * Leave SOS tracking room
         * Used when leaving SOS detail screen or SOS is resolved
         */
        socket.on('leave_sos_tracking', ({ sosId }) => {
            if (!sosId) return;
            const room = `sos_track_${sosId}`;
            socket.leave(room);
            Logger.info(`User ${socket.userId} left SOS tracking room: ${room}`);
        });

        /**
         * Guide sends location update
         * Server broadcasts to all others in the SOS room (Pilgrim)
         */
        socket.on('update_guide_location', ({ sosId, latitude, longitude }) => {
            if (!sosId || !latitude || !longitude) return;

            const room = `sos_track_${sosId}`;

            // Broadcast to others in room (not sender)
            socket.to(room).emit('guide_location_update', {
                sosId,
                guideId: socket.userId,
                latitude,
                longitude,
                timestamp: new Date()
            });

            Logger.info(`Guide ${socket.userId} location update for SOS ${sosId}: ${latitude}, ${longitude}`);
        });

        /**
         * Pilgrim sends location update (optional - if Guide needs to see Pilgrim position)
         */
        socket.on('update_pilgrim_location', ({ sosId, latitude, longitude }) => {
            if (!sosId || !latitude || !longitude) return;

            const room = `sos_track_${sosId}`;

            socket.to(room).emit('pilgrim_location_update', {
                sosId,
                pilgrimId: socket.userId,
                latitude,
                longitude,
                timestamp: new Date()
            });

            Logger.info(`Pilgrim ${socket.userId} location update for SOS ${sosId}: ${latitude}, ${longitude}`);
        });

        // ===================== PLANNER CHAT =====================

        /**
         * Join planner chat room
         * Used by owner and members when viewing planner
         */
        socket.on('join_planner_chat', ({ plannerId }) => {
            if (!plannerId) return;
            const room = `planner_chat_${plannerId}`;
            socket.join(room);
            Logger.info(`User ${socket.userId} joined planner chat room: ${room}`);
        });

        /**
         * Leave planner chat room
         */
        socket.on('leave_planner_chat', ({ plannerId }) => {
            if (!plannerId) return;
            const room = `planner_chat_${plannerId}`;
            socket.leave(room);
            Logger.info(`User ${socket.userId} left planner chat room: ${room}`);
        });
    });

    Logger.info('WebSocket server initialized');
    return io;
}

/**
 * Get Socket.io instance
 */
function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
}

/**
 * Emit notification to specific user
 */
function emitNotification(userId, notification) {
    if (!io) {
        Logger.warn('Socket.io not initialized, skipping emit');
        return;
    }

    const userRoom = `user_${userId}`;
    io.to(userRoom).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        created_at: notification.created_at
    });

    Logger.info(`Emitted notification to ${userRoom}`);
}

/**
 * Emit to users by role
 * @param {string} role - User role (admin, manager.)
 */
function emitToRole(role, event, data) {
    if (!io) return;
    io.to(`role_${role}`).emit(event, data);
}

/**
 * Emit chat message to planner room
 * @param {string} plannerId - Planner ID
 * @param {object} message - Message data
 */
function emitPlannerChatMessage(plannerId, message) {
    if (!io) {
        Logger.warn('Socket.io not initialized, skipping emit');
        return;
    }

    const room = `planner_chat_${plannerId}`;
    io.to(room).emit('planner_chat_message', message);
    Logger.info(`Emitted chat message to ${room}`);
}

/**
 * Emit chat message deleted event
 * @param {string} plannerId - Planner ID
 * @param {string} messageId - Message ID
 */
function emitPlannerChatMessageDeleted(plannerId, messageId) {
    if (!io) {
        Logger.warn('Socket.io not initialized, skipping emit');
        return;
    }

    const room = `planner_chat_${plannerId}`;
    io.to(room).emit('planner_chat_message_deleted', { messageId });
    Logger.info(`Emitted message deleted to ${room}`);
}

module.exports = {
    initSocket,
    getIO,
    emitNotification,
    emitToRole,
    emitPlannerChatMessage,
    emitPlannerChatMessageDeleted
};
