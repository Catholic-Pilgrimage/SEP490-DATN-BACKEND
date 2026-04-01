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
     * Get friends list (accepted friendships)
     */
    static async getFriendsList(userId, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;

            const { count, rows } = await Friendship.findAndCountAll({
                where: {
                    status: 'accepted',
                    [Op.or]: [
                        { requester_id: userId },
                        { addressee_id: userId }
                    ]
                },
                include: [
                    { model: User, as: 'requester', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
                    { model: User, as: 'addressee', attributes: ['id', 'full_name', 'email', 'avatar_url'] }
                ],
                order: [['updated_at', 'DESC']],
                limit,
                offset
            });

            // Map to return the friend (not self)
            const friends = rows.map(f => {
                const friend = f.requester_id === userId ? f.addressee : f.requester;
                return {
                    friendship_id: f.id,
                    friend: {
                        id: friend.id,
                        full_name: friend.full_name,
                        email: friend.email,
                        avatar_url: friend.avatar_url
                    },
                    since: f.updated_at
                };
            });

            return {
                friends,
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            };
        } catch (error) {
            Logger.error('Get friends list error:', error);
            throw error;
        }
    }

    /**
     * Get pending friend requests (where user is addressee)
     */
    static async getPendingRequests(userId, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;

            const { count, rows } = await Friendship.findAndCountAll({
                where: {
                    addressee_id: userId,
                    status: 'pending'
                },
                include: [
                    { model: User, as: 'requester', attributes: ['id', 'full_name', 'email', 'avatar_url'] }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            const requests = rows.map(f => ({
                id: f.id,
                requester: {
                    id: f.requester.id,
                    full_name: f.requester.full_name,
                    email: f.requester.email,
                    avatar_url: f.requester.avatar_url
                },
                created_at: f.created_at
            }));

            return {
                requests,
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            };
        } catch (error) {
            Logger.error('Get pending requests error:', error);
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
