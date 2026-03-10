const { Planner, User, PlannerItem, Site, PlannerInvite, PlannerMember } = require('../../models');
const EmailService = require('../shared/emailService');
const Logger = require('../../utils/logger.util');
const crypto = require('crypto');
const QRCode = require('qrcode');
const PlannerService = require('../plannerService');

class PlannerShareService {
    /**
     * Get planner preview by invite token (public - no auth required)
     * Returns planner info + invite status so FE can show preview before login/register
     */
    static async getPlannerByInviteToken(token) {
        try {
            const invite = await PlannerInvite.findOne({
                where: { token },
                include: [{
                    model: Planner,
                    as: 'planner',
                    include: [
                        { model: User, as: 'owner', attributes: ['id', 'full_name', 'avatar_url'] },
                        {
                            model: PlannerItem,
                            as: 'items',
                            include: [
                                { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'cover_image'] }
                            ],
                            order: [['day_number', 'ASC'], ['order_index', 'ASC']]
                        }
                    ]
                }]
            });

            if (!invite) {
                throw new Error('Invite not found');
            }

            if (invite.status === 'expired' || new Date() > new Date(invite.expires_at)) {
                throw new Error('Invite has expired');
            }

            const plannerData = PlannerService.formatPlannerWithItems(invite.planner);

            return {
                invite: {
                    id: invite.id,
                    email: invite.email,
                    role: invite.role,
                    status: invite.status,
                    expires_at: invite.expires_at
                },
                planner: plannerData
            };
        } catch (error) {
            Logger.error('Get planner by invite token error:', error);
            throw error;
        }
    }


    /**
     * Invite user to planner via email
     */
    static async inviteUserToPlanner(plannerId, userId, email) {
        try {
            const planner = await Planner.findByPk(plannerId, {
                include: [{
                    model: User,
                    as: 'members'
                }]
            });

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Only owner can invite
            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Only allow inviting when planner is in planning status
            if (planner.status !== 'planning') {
                throw new Error('Can only invite when planner is in planning status');
            }

            // Role is always viewer (owner = null in DB, viewer for all invitees)
            const role = 'viewer';

            // Check current members count
            const currentMemberCount = planner.members ? planner.members.length : 0;
            const pendingInvites = await PlannerInvite.count({
                where: {
                    planner_id: plannerId,
                    status: 'pending'
                }
            });

            const totalSlots = planner.number_of_people;
            const availableSlots = totalSlots - currentMemberCount - pendingInvites - 1; // -1 for owner

            if (availableSlots <= 0) {
                throw new Error(`Planner is full. Max participants: ${totalSlots}`);
            }

            // Check if email has already been invited
            const existingInvite = await PlannerInvite.findOne({
                where: {
                    planner_id: plannerId,
                    email,
                    status: 'pending'
                }
            });

            if (existingInvite) {
                throw new Error('User already invited');
            }

            // If user exists, check if they are already a member
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                const existingMember = await PlannerMember.findOne({
                    where: {
                        planner_id: plannerId,
                        user_id: existingUser.id
                    }
                });
                if (existingMember) {
                    throw new Error('User is already a member');
                }
            }

            // Create invite token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

            const invite = await PlannerInvite.create({
                planner_id: plannerId,
                inviter_id: userId,
                email,
                token,
                role,
                status: 'pending',
                expires_at: expiresAt
            });

            // Send invitation email
            const inviter = await User.findByPk(userId, { attributes: ['full_name', 'email'] });
            const inviterName = inviter?.full_name || inviter?.email || '';

            try {
                await EmailService.sendPlannerInvitation(email, inviterName, planner.name, token, {
                    start_date: planner.start_date,
                    end_date: planner.end_date,
                    number_of_days: planner.number_of_days,
                    number_of_people: planner.number_of_people,
                    transportation: planner.transportation
                });
            } catch (emailError) {
                Logger.error('Failed to send planner invitation email:', emailError);
                // Still return invite even if email fails
            }

            Logger.info(`Invite sent to ${email} for planner ${plannerId}`);

            const baseUrl = process.env.FRONTEND_URL || 'pilgrimapp:/';
            const inviteLink = `${baseUrl}/planners/invite/${token}`;

            // Generate QR code for invite link
            const qrCodeDataUrl = await QRCode.toDataURL(inviteLink, {
                width: 400,
                margin: 2,
                color: {
                    dark: '#4a0e4e',
                    light: '#ffffff'
                }
            });

            return {
                id: invite.id,
                email: invite.email,
                role: invite.role,
                token: invite.token,
                expires_at: invite.expires_at,
                invite_link: inviteLink,
                qr_code: qrCodeDataUrl
            };
        } catch (error) {
            Logger.error('Invite user to planner error:', error);
            throw error;
        }
    }

    /**
     * Respond to planner invite (accept or reject)
     */
    static async respondToInvite(token, userId, action) {
        try {
            if (!['accept', 'reject'].includes(action)) {
                throw new Error('Invalid action. Must be "accept" or "reject"');
            }

            const invite = await PlannerInvite.findOne({
                where: { token },
                include: [{
                    model: Planner,
                    as: 'planner',
                    include: [{
                        model: User,
                        as: 'members'
                    }]
                }]
            });

            if (!invite) {
                throw new Error('Invite not found');
            }

            if (invite.status !== 'pending') {
                throw new Error('Invite already processed');
            }

            // Check if planner is still in planning status
            if (invite.planner.status !== 'planning') {
                await invite.update({ status: 'expired' });
                throw new Error('Cannot respond to invite. Trip has already started or completed');
            }

            // Check if invite has expired
            if (new Date() > new Date(invite.expires_at)) {
                await invite.update({ status: 'expired' });
                throw new Error('Invite has expired');
            }

            // Verify user email matches
            const user = await User.findByPk(userId);
            if (!user || user.email !== invite.email) {
                throw new Error('Email mismatch. This invite is for another user');
            }

            if (action === 'accept') {
                const planner = invite.planner;

                // Check if planner still has slots
                const currentMemberCount = planner.members ? planner.members.length : 0;
                const totalSlots = planner.number_of_people;

                // +1 for owner, +1 for the new member
                if (currentMemberCount + 2 > totalSlots) {
                    throw new Error(`Planner is full. Max participants: ${totalSlots}`);
                }

                // Add user to planner members
                await PlannerMember.create({
                    planner_id: planner.id,
                    user_id: userId,
                    role: invite.role
                });

                // Update invite status
                await invite.update({ status: 'accepted' });

                Logger.info(`User ${userId} accepted invite for planner ${planner.id}`);

                return PlannerService.formatPlannerResponse(planner);
            } else {
                // Reject
                await invite.update({ status: 'rejected' });

                Logger.info(`User ${userId} rejected invite for planner ${invite.planner_id}`);

                return { message: 'Invite rejected successfully' };
            }
        } catch (error) {
            Logger.error('Respond to invite error:', error);
            throw error;
        }
    }

    /**
     * Get pending invites for a planner
     */
    static async getPlannerInvites(plannerId, userId) {
        try {
            const planner = await Planner.findByPk(plannerId);

            if (!planner) {
                throw new Error('Planner not found');
            }

            if (planner.user_id !== userId) {
                throw new Error('Forbidden');
            }

            const invites = await PlannerInvite.findAll({
                where: {
                    planner_id: plannerId
                },
                include: [{
                    model: User,
                    as: 'inviter',
                    attributes: ['id', 'full_name', 'email', 'avatar_url']
                }],
                order: [['created_at', 'DESC']]
            });

            return invites.map(invite => ({
                id: invite.id,
                email: invite.email,
                role: invite.role,
                status: invite.status,
                expires_at: invite.expires_at,
                created_at: invite.created_at,
                inviter: invite.inviter
            }));
        } catch (error) {
            Logger.error('Get planner invites error:', error);
            throw error;
        }
    }

    /**
     * Get planner members
     */
    static async getPlannerMembers(plannerId, userId) {
        try {
            const planner = await Planner.findByPk(plannerId, {
                include: [{
                    model: User,
                    as: 'members',
                    through: {
                        attributes: ['role', 'joined_at']
                    },
                    attributes: ['id', 'full_name', 'email', 'avatar_url']
                }, {
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'full_name', 'email', 'avatar_url']
                }]
            });

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Check if user has access (owner or member)
            const isOwner = planner.user_id === userId;
            const isMember = planner.members?.some(m => m.id === userId);

            if (!isOwner && !isMember) {
                throw new Error('Forbidden');
            }

            const members = [
                {
                    ...planner.owner.toJSON(),
                    role: 'owner',
                    joined_at: planner.created_at
                },
                ...(planner.members || []).map(member => ({
                    ...member.toJSON(),
                    role: member.PlannerMember.role,
                    joined_at: member.PlannerMember.joined_at
                }))
            ];

            return {
                total_slots: planner.number_of_people,
                current_members: members.length,
                available_slots: planner.number_of_people - members.length,
                members
            };
        } catch (error) {
            Logger.error('Get planner members error:', error);
            throw error;
        }
    }

    /**
     * Remove member from planner
     */
    static async removePlannerMember(plannerId, memberId, userId) {
        try {
            const planner = await Planner.findByPk(plannerId);

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Owner can remove anyone, but members can only remove themselves
            if (planner.user_id !== userId && memberId !== userId) {
                throw new Error('Forbidden');
            }

            // Cannot remove during ongoing trip
            if (planner.status === 'ongoing') {
                throw new Error('Cannot remove members during ongoing trip');
            }

            // Cannot remove owner
            if (memberId === planner.user_id) {
                throw new Error('Cannot remove owner');
            }

            const deleted = await PlannerMember.destroy({
                where: {
                    planner_id: plannerId,
                    user_id: memberId
                }
            });

            if (deleted === 0) {
                throw new Error('Member not found');
            }

            Logger.info(`Member ${memberId} removed from planner ${plannerId}`);

            return { message: 'Member removed successfully' };
        } catch (error) {
            Logger.error('Remove planner member error:', error);
            throw error;
        }
    }
}

module.exports = PlannerShareService;
