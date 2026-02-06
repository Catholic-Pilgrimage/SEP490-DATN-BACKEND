const { Group, GroupMember, GroupInvite, GroupJoinRequest, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const emailService = require('./emailService');
const crypto = require('crypto');

class GroupService {
    /**
     * Create a new group
     */
    async createGroup(userId, data) {
        const transaction = await sequelize.transaction();

        try {
            const { name, description, privacy, avatar_url } = data;

            // Create group
            const group = await Group.create({
                name,
                description,
                privacy: privacy || 'public',
                avatar_url,
                created_by: userId
            }, { transaction });

            // Add creator as admin member
            await GroupMember.create({
                group_id: group.id,
                user_id: userId,
                role: 'admin'
            }, { transaction });

            await transaction.commit();

            // Fetch complete group with creator info
            return await this.getGroupById(group.id, userId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Get all groups user is a member of
     */
    async getUserGroups(userId) {
        const groups = await Group.findAll({
            include: [
                {
                    model: User,
                    as: 'members',
                    where: { id: userId },
                    attributes: [],
                    through: { attributes: [] }
                },
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'full_name', 'avatar_url']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Get member count and user role for each group
        const groupsWithDetails = await Promise.all(
            groups.map(async (group) => {
                const memberCount = await GroupMember.count({
                    where: { group_id: group.id }
                });

                const membership = await GroupMember.findOne({
                    where: { group_id: group.id, user_id: userId }
                });

                return {
                    ...group.toJSON(),
                    member_count: memberCount,
                    user_role: membership?.role
                };
            })
        );

        return groupsWithDetails;
    }

    /**
     * Get group by ID with permission check
     */
    async getGroupById(groupId, userId) {
        const group = await Group.findByPk(groupId, {
            include: [
                {
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'full_name', 'avatar_url']
                },
                {
                    model: User,
                    as: 'members',
                    attributes: ['id', 'full_name', 'avatar_url', 'email'],
                    through: {
                        attributes: ['role', 'joined_at']
                    }
                }
            ]
        });

        if (!group) {
            const error = new Error('Group not found');
            error.statusCode = 404;
            throw error;
        }

        // Check if user is a member
        const isMember = group.members.some(member => member.id === userId);

        // If group is private and user is not a member, deny access
        if (group.privacy === 'private' && !isMember) {
            const error = new Error('Access denied');
            error.statusCode = 403;
            throw error;
        }

        // Get user's role if they're a member
        const membership = await GroupMember.findOne({
            where: { group_id: groupId, user_id: userId }
        });

        return {
            ...group.toJSON(),
            user_role: membership?.role || null
        };
    }

    /**
     * Update group (admin only)
     */
    async updateGroup(groupId, userId, data) {
        const group = await Group.findByPk(groupId);

        if (!group) {
            const error = new Error('Group not found');
            error.statusCode = 404;
            throw error;
        }

        // Check if user is admin
        const membership = await GroupMember.findOne({
            where: { group_id: groupId, user_id: userId, role: 'admin' }
        });

        if (!membership) {
            const error = new Error('Only group admins can update the group');
            error.statusCode = 403;
            throw error;
        }

        // Update group
        const { name, description, privacy, avatar_url } = data;
        await group.update({
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(privacy && { privacy }),
            ...(avatar_url !== undefined && { avatar_url })
        });

        return await this.getGroupById(groupId, userId);
    }

    /**
     * Delete group (admin only)
     */
    async deleteGroup(groupId, userId) {
        const group = await Group.findByPk(groupId);

        if (!group) {
            const error = new Error('Group not found');
            error.statusCode = 404;
            throw error;
        }

        // Check if user is admin
        const membership = await GroupMember.findOne({
            where: { group_id: groupId, user_id: userId, role: 'admin' }
        });

        if (!membership) {
            const error = new Error('Only group admins can delete the group');
            error.statusCode = 403;
            throw error;
        }

        await group.destroy();
        return { message: 'Group deleted successfully' };
    }

    /**
     * Invite member via email
     */
    async inviteMember(groupId, userId, email, role = 'member') {
        const group = await Group.findByPk(groupId);

        if (!group) {
            const error = new Error('Group not found');
            error.statusCode = 404;
            throw error;
        }

        // Check if user is admin
        const membership = await GroupMember.findOne({
            where: { group_id: groupId, user_id: userId, role: 'admin' }
        });

        if (!membership) {
            const error = new Error('Only group admins can invite members');
            error.statusCode = 403;
            throw error;
        }

        // Check if user with this email already exists and is a member
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            const existingMember = await GroupMember.findOne({
                where: { group_id: groupId, user_id: existingUser.id }
            });

            if (existingMember) {
                const error = new Error('User is already a member of this group');
                error.statusCode = 400;
                throw error;
            }
        }

        // Check for existing pending invitation
        const existingInvite = await GroupInvite.findOne({
            where: {
                group_id: groupId,
                email,
                status: 'pending',
                expires_at: { [Op.gt]: new Date() }
            }
        });

        if (existingInvite) {
            const error = new Error('An invitation has already been sent to this email');
            error.statusCode = 400;
            throw error;
        }

        // Create invitation
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invite = await GroupInvite.create({
            group_id: groupId,
            inviter_id: userId,
            email,
            token,
            role,
            expires_at: expiresAt
        });

        // Get inviter info
        const inviter = await User.findByPk(userId, {
            attributes: ['full_name']
        });

        // Send invitation email
        await emailService.sendGroupInvitation(
            email,
            inviter.full_name,
            group.name,
            token
        );

        return {
            message: 'Invitation sent successfully',
            invite: {
                id: invite.id,
                email: invite.email,
                role: invite.role,
                expires_at: invite.expires_at
            }
        };
    }

    /**
     * Accept invitation
     */
    async acceptInvitation(token, userId) {
        const invite = await GroupInvite.findOne({
            where: { token },
            include: [
                {
                    model: Group,
                    as: 'group'
                }
            ]
        });

        if (!invite) {
            const error = new Error('Invalid invitation token');
            error.statusCode = 404;
            throw error;
        }

        if (invite.status !== 'pending') {
            const error = new Error('This invitation has already been processed');
            error.statusCode = 400;
            throw error;
        }

        if (new Date() > invite.expires_at) {
            await invite.update({ status: 'expired' });
            const error = new Error('This invitation has expired');
            error.statusCode = 400;
            throw error;
        }

        // Get user email
        const user = await User.findByPk(userId);
        if (user.email !== invite.email) {
            const error = new Error('This invitation was sent to a different email address');
            error.statusCode = 403;
            throw error;
        }

        // Check if already a member
        const existingMember = await GroupMember.findOne({
            where: { group_id: invite.group_id, user_id: userId }
        });

        if (existingMember) {
            await invite.update({ status: 'accepted' });
            const error = new Error('You are already a member of this group');
            error.statusCode = 400;
            throw error;
        }

        const transaction = await sequelize.transaction();

        try {
            // Add user to group
            await GroupMember.create({
                group_id: invite.group_id,
                user_id: userId,
                role: invite.role
            }, { transaction });

            // Update invite status
            await invite.update({ status: 'accepted' }, { transaction });

            await transaction.commit();

            return {
                message: 'Invitation accepted successfully',
                group: invite.group
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Reject invitation
     */
    async rejectInvitation(token, userId) {
        const invite = await GroupInvite.findOne({
            where: { token }
        });

        if (!invite) {
            const error = new Error('Invalid invitation token');
            error.statusCode = 404;
            throw error;
        }

        if (invite.status !== 'pending') {
            const error = new Error('This invitation has already been processed');
            error.statusCode = 400;
            throw error;
        }

        // Get user email
        const user = await User.findByPk(userId);
        if (user.email !== invite.email) {
            const error = new Error('This invitation was sent to a different email address');
            error.statusCode = 403;
            throw error;
        }

        await invite.update({ status: 'rejected' });

        return { message: 'Invitation rejected successfully' };
    }

    /**
     * Remove member (admin only)
     */
    async removeMember(groupId, adminId, memberId) {
        const group = await Group.findByPk(groupId);

        if (!group) {
            const error = new Error('Group not found');
            error.statusCode = 404;
            throw error;
        }

        // Check if requester is admin
        const adminMembership = await GroupMember.findOne({
            where: { group_id: groupId, user_id: adminId, role: 'admin' }
        });

        if (!adminMembership) {
            const error = new Error('Only group admins can remove members');
            error.statusCode = 403;
            throw error;
        }

        // Cannot remove yourself
        if (adminId === memberId) {
            const error = new Error('Admins cannot remove themselves. Use leave group instead');
            error.statusCode = 400;
            throw error;
        }

        // Check if member exists
        const memberToRemove = await GroupMember.findOne({
            where: { group_id: groupId, user_id: memberId }
        });

        if (!memberToRemove) {
            const error = new Error('User is not a member of this group');
            error.statusCode = 404;
            throw error;
        }

        await memberToRemove.destroy();

        return { message: 'Member removed successfully' };
    }

    /**
     * Leave group (members only, not admin)
     */
    async leaveGroup(groupId, userId) {
        const membership = await GroupMember.findOne({
            where: { group_id: groupId, user_id: userId }
        });

        if (!membership) {
            const error = new Error('You are not a member of this group');
            error.statusCode = 404;
            throw error;
        }

        if (membership.role === 'admin') {
            const error = new Error('Group admins cannot leave. Please transfer ownership or delete the group');
            error.statusCode = 400;
            throw error;
        }

        await membership.destroy();

        return { message: 'You have left the group successfully' };
    }

    /**
     * Request to join a group (for public groups)
     */
    async requestToJoinGroup(groupId, userId, message = null) {
        const group = await Group.findByPk(groupId);

        if (!group) {
            const error = new Error('Group not found');
            error.statusCode = 404;
            throw error;
        }

        // Only allow join requests for public groups
        if (group.privacy !== 'public') {
            const error = new Error('Join requests are only allowed for public groups');
            error.statusCode = 400;
            throw error;
        }

        // Check if user is already a member
        const existingMember = await GroupMember.findOne({
            where: { group_id: groupId, user_id: userId }
        });

        if (existingMember) {
            const error = new Error('You are already a member of this group');
            error.statusCode = 400;
            throw error;
        }

        // Check for existing pending request
        const existingRequest = await GroupJoinRequest.findOne({
            where: {
                group_id: groupId,
                user_id: userId,
                status: 'pending'
            }
        });

        if (existingRequest) {
            const error = new Error('You already have a pending join request for this group');
            error.statusCode = 400;
            throw error;
        }

        // Create join request
        const joinRequest = await GroupJoinRequest.create({
            group_id: groupId,
            user_id: userId,
            message,
            status: 'pending'
        });

        return {
            message: 'Join request sent successfully',
            request: {
                id: joinRequest.id,
                group_id: joinRequest.group_id,
                status: joinRequest.status,
                created_at: joinRequest.created_at
            }
        };
    }

    /**
     * Approve join request (admin only)
     */
    async approveJoinRequest(groupId, adminId, requestId) {
        const group = await Group.findByPk(groupId);

        if (!group) {
            const error = new Error('Group not found');
            error.statusCode = 404;
            throw error;
        }

        // Check if requester is admin
        const adminMembership = await GroupMember.findOne({
            where: { group_id: groupId, user_id: adminId, role: 'admin' }
        });

        if (!adminMembership) {
            const error = new Error('Only group admins can approve join requests');
            error.statusCode = 403;
            throw error;
        }

        // Find join request
        const joinRequest = await GroupJoinRequest.findOne({
            where: { id: requestId, group_id: groupId }
        });

        if (!joinRequest) {
            const error = new Error('Join request not found');
            error.statusCode = 404;
            throw error;
        }

        if (joinRequest.status !== 'pending') {
            const error = new Error('This join request has already been processed');
            error.statusCode = 400;
            throw error;
        }

        const transaction = await sequelize.transaction();

        try {
            // Add user to group
            await GroupMember.create({
                group_id: groupId,
                user_id: joinRequest.user_id,
                role: 'member'
            }, { transaction });

            // Update request status
            await joinRequest.update({ status: 'accepted' }, { transaction });

            await transaction.commit();

            return {
                message: 'Join request approved successfully',
                group_id: groupId
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Reject join request (admin only)
     */
    async rejectJoinRequest(groupId, adminId, requestId) {
        const group = await Group.findByPk(groupId);

        if (!group) {
            const error = new Error('Group not found');
            error.statusCode = 404;
            throw error;
        }

        // Check if requester is admin
        const adminMembership = await GroupMember.findOne({
            where: { group_id: groupId, user_id: adminId, role: 'admin' }
        });

        if (!adminMembership) {
            const error = new Error('Only group admins can reject join requests');
            error.statusCode = 403;
            throw error;
        }

        // Find join request
        const joinRequest = await GroupJoinRequest.findOne({
            where: { id: requestId, group_id: groupId }
        });

        if (!joinRequest) {
            const error = new Error('Join request not found');
            error.statusCode = 404;
            throw error;
        }

        if (joinRequest.status !== 'pending') {
            const error = new Error('This join request has already been processed');
            error.statusCode = 400;
            throw error;
        }

        await joinRequest.update({ status: 'rejected' });

        return { message: 'Join request rejected successfully' };
    }

    /**
     * Get all pending join requests for a group (admin only)
     */
    async getGroupJoinRequests(groupId, adminId) {
        const group = await Group.findByPk(groupId);

        if (!group) {
            const error = new Error('Group not found');
            error.statusCode = 404;
            throw error;
        }

        // Check if requester is admin
        const adminMembership = await GroupMember.findOne({
            where: { group_id: groupId, user_id: adminId, role: 'admin' }
        });

        if (!adminMembership) {
            const error = new Error('Only group admins can view join requests');
            error.statusCode = 403;
            throw error;
        }

        // Get all pending join requests
        const joinRequests = await GroupJoinRequest.findAll({
            where: {
                group_id: groupId,
                status: 'pending'
            },
            include: [
                {
                    model: User,
                    as: 'requester',
                    attributes: ['id', 'full_name', 'avatar_url', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return joinRequests;
    }

}

module.exports = new GroupService();
