const { Friendship, User } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');

class FriendshipService {
    /**
     * Check if two users are friends (status = accepted)
     * Used by PlannerShareService for friend invite validation
     */
    static async areFriends(userId1, userId2) {
        const friendship = await Friendship.findOne({
            where: {
                status: 'accepted',
                [Op.or]: [
                    { requester_id: userId1, addressee_id: userId2 },
                    { requester_id: userId2, addressee_id: userId1 }
                ]
            }
        });
        return !!friendship;
    }

    /**
     * Send a friend request
     * Checks both directions to prevent duplicate
     */
    static async sendFriendRequest(requesterId, addresseeId) {
        try {
            // Cannot friend yourself
            if (requesterId === addresseeId) {
                throw new Error('Cannot send friend request to yourself');
            }

            // Check addressee exists
            const addressee = await User.findByPk(addresseeId, { attributes: ['id', 'full_name'] });
            if (!addressee) {
                throw new Error('User not found');
            }

            // Check both directions for existing friendship
            const existing = await Friendship.findOne({
                where: {
                    [Op.or]: [
                        { requester_id: requesterId, addressee_id: addresseeId },
                        { requester_id: addresseeId, addressee_id: requesterId }
                    ]
                }
            });

            if (existing) {
                if (existing.status === 'accepted') {
                    throw new Error('Already friends');
                }
                if (existing.status === 'pending') {
                    // If the other person already sent a request, auto-accept
                    if (existing.requester_id === addresseeId) {
                        existing.status = 'accepted';
                        await existing.save();
                        Logger.info(`Auto-accepted mutual friend request: ${requesterId} <-> ${addresseeId}`);

                        // Notify both users
                        const NotificationService = require('../shared/notificationService');
                        const requester = await User.findByPk(requesterId, { attributes: ['full_name'] });
                        NotificationService.createNotification('friend_accepted', requesterId, {
                            friendName: addressee.full_name
                        }).catch(() => { });
                        NotificationService.createNotification('friend_accepted', addresseeId, {
                            friendName: requester?.full_name || 'Người dùng'
                        }).catch(() => { });

                        return {
                            id: existing.id,
                            status: 'accepted',
                            message: 'Đã tự động chấp nhận vì đối phương cũng gửi lời mời'
                        };
                    }
                    throw new Error('Friend request already sent');
                }
                if (existing.status === 'blocked') {
                    throw new Error('Cannot send friend request');
                }
                if (existing.status === 'rejected') {
                    // Allow re-sending after rejection — update existing record
                    existing.requester_id = requesterId;
                    existing.addressee_id = addresseeId;
                    existing.status = 'pending';
                    await existing.save();
                    Logger.info(`Re-sent friend request: ${requesterId} -> ${addresseeId}`);

                    // Notify addressee
                    const NotificationService = require('../shared/notificationService');
                    const requester = await User.findByPk(requesterId, { attributes: ['full_name'] });
                    NotificationService.createNotification('friend_request', addresseeId, {
                        requesterName: requester?.full_name || 'Người dùng'
                    }).catch(() => { });

                    return {
                        id: existing.id,
                        status: 'pending',
                        message: 'Đã gửi lại lời mời kết bạn'
                    };
                }
            }

            // Create new friendship request
            const friendship = await Friendship.create({
                requester_id: requesterId,
                addressee_id: addresseeId,
                status: 'pending'
            });

            Logger.info(`Friend request sent: ${requesterId} -> ${addresseeId}`);

            // Notify addressee
            const NotificationService = require('../shared/notificationService');
            const requester = await User.findByPk(requesterId, { attributes: ['full_name'] });
            NotificationService.createNotification('friend_request', addresseeId, {
                requesterName: requester?.full_name || 'Người dùng'
            }).catch(() => { });

            return {
                id: friendship.id,
                status: friendship.status,
                addressee: {
                    id: addressee.id,
                    full_name: addressee.full_name
                }
            };
        } catch (error) {
            Logger.error('Send friend request error:', error);
            throw error;
        }
    }

    /**
     * Respond to a friend request (accept or reject)
     * Only the addressee can respond
     */
    static async respondToFriendRequest(friendshipId, userId, action) {
        try {
            if (!['accept', 'reject'].includes(action)) {
                throw new Error('Invalid action. Must be "accept" or "reject"');
            }

            const friendship = await Friendship.findByPk(friendshipId, {
                include: [
                    { model: User, as: 'requester', attributes: ['id', 'full_name'] },
                    { model: User, as: 'addressee', attributes: ['id', 'full_name'] }
                ]
            });

            if (!friendship) {
                throw new Error('Friend request not found');
            }

            if (friendship.status !== 'pending') {
                throw new Error('Friend request already processed');
            }

            // Only addressee can respond
            if (friendship.addressee_id !== userId) {
                throw new Error('Forbidden');
            }

            friendship.status = action === 'accept' ? 'accepted' : 'rejected';
            await friendship.save();

            Logger.info(`Friend request ${action}ed: ${friendship.requester_id} <-> ${friendship.addressee_id}`);

            // Notify requester
            const NotificationService = require('../shared/notificationService');
            if (action === 'accept') {
                NotificationService.createNotification('friend_accepted', friendship.requester_id, {
                    friendName: friendship.addressee?.full_name || 'Người dùng'
                }).catch(() => { });
            }

            return {
                id: friendship.id,
                status: friendship.status,
                requester: friendship.requester,
                addressee: friendship.addressee
            };
        } catch (error) {
            Logger.error('Respond to friend request error:', error);
            throw error;
        }
    }

    /**
     * Get friendships filtered by status
     * @param {string} userId
     * @param {string} status - 'accepted' or 'pending'
     * @param {number} page
     * @param {number} limit
     */
    static async getFriendships(userId, status = 'accepted', page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;

            // Build where clause based on status
            const whereClause = { status };

            if (status === 'accepted') {
                // Both directions
                whereClause[Op.or] = [
                    { requester_id: userId },
                    { addressee_id: userId }
                ];
            } else {
                // Pending: only where user is addressee (incoming requests)
                whereClause.addressee_id = userId;
            }

            const { count, rows } = await Friendship.findAndCountAll({
                where: whereClause,
                include: [
                    { model: User, as: 'requester', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
                    { model: User, as: 'addressee', attributes: ['id', 'full_name', 'email', 'avatar_url'] }
                ],
                order: [[status === 'accepted' ? 'updated_at' : 'created_at', 'DESC']],
                limit,
                offset
            });

            // Map to unified structure — "user" is always the other person
            const items = rows.map(f => {
                const user = f.requester_id === userId ? f.addressee : f.requester;
                return {
                    friendship_id: f.id,
                    status: f.status,
                    user: {
                        id: user.id,
                        full_name: user.full_name,
                        email: user.email,
                        avatar_url: user.avatar_url
                    },
                    created_at: f.created_at,
                    updated_at: f.updated_at
                };
            });

            return {
                items,
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            };
        } catch (error) {
            Logger.error('Get friendships error:', error);
            throw error;
        }
    }

    /**
     * Remove a friend (unfriend)
     * Either party can remove the friendship
     */
    static async removeFriend(userId, friendId) {
        try {
            const friendship = await Friendship.findOne({
                where: {
                    status: 'accepted',
                    [Op.or]: [
                        { requester_id: userId, addressee_id: friendId },
                        { requester_id: friendId, addressee_id: userId }
                    ]
                }
            });

            if (!friendship) {
                throw new Error('Friendship not found');
            }

            await friendship.destroy();

            Logger.info(`Friendship removed: ${userId} <-> ${friendId}`);

            return { message: 'Đã hủy kết bạn thành công' };
        } catch (error) {
            Logger.error('Remove friend error:', error);
            throw error;
        }
    }
}

module.exports = FriendshipService;
