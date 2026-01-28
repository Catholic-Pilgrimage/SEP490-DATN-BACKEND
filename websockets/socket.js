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
            socket.userId = decoded.id;
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
    io.to(userRoom).emit('new_notification', {
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

module.exports = {
    initSocket,
    getIO,
    emitNotification,
    emitToRole
};
