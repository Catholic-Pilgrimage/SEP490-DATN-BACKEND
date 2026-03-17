const { Planner, User, PlannerItem, Site, PlannerInvite, PlannerMember, Wallet, Transaction } = require('../../models');
const { Op } = require('sequelize');
const EmailService = require('../shared/emailService');
const Logger = require('../../utils/logger.util');
const crypto = require('crypto');
const QRCode = require('qrcode');
const PlannerService = require('../plannerService');
const PayOSService = require('../shared/payosService');
const sequelize = require('../../config/database');

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
            const currentMemberCount = await PlannerMember.count({
                where: {
                    planner_id: plannerId,
                    join_status: 'joined',
                    user_id: {
                        [Op.ne]: planner.user_id
                    }
                }
            });
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
                const sequelize = require('../../config/database');
                const t = await sequelize.transaction();

                try {
                    // Check if planner still has slots
                    const currentMemberCount = await PlannerMember.count({
                        where: {
                            planner_id: planner.id,
                            join_status: 'joined',
                            user_id: {
                                [Op.ne]: planner.user_id
                            }
                        },
                        transaction: t
                    });
                    const totalSlots = planner.number_of_people;

                    // +1 for owner, +1 for the new member
                    if (currentMemberCount + 2 > totalSlots) {
                        throw new Error(`Planner is full. Max participants: ${totalSlots}`);
                    }

                    const memberData = {
                        planner_id: planner.id,
                        user_id: userId,
                        role: invite.role,
                        join_status: 'joined',
                        deposit_status: 'pending' // Luôn pending, thanh toán sau qua confirm-join
                    };

                    // Add user to planner members
                    await PlannerMember.create(memberData, { transaction: t });

                    // Update invite status
                    await invite.update({ status: 'accepted' }, { transaction: t });

                    await t.commit();

                    Logger.info(`User ${userId} accepted invite for planner ${planner.id} (deposit pending)`);
                    return PlannerService.formatPlannerResponse(planner);
                } catch (innerError) {
                    await t.rollback();
                    throw innerError;
                }
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
                        attributes: ['role', 'joined_at', 'deposit_status', 'join_status']
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
            const isMember = planner.members?.some(
                m => m.id === userId && m.id !== planner.user_id && m.PlannerMember.join_status === 'joined'
            );

            if (!isOwner && !isMember) {
                throw new Error('Forbidden');
            }

            const visibleMembers = (planner.members || []).filter(member => member.id !== planner.user_id);
            const joinedMembers = visibleMembers.filter(member => member.PlannerMember.join_status === 'joined');

            const members = [
                {
                    ...planner.owner.toJSON(),
                    role: 'owner',
                    joined_at: planner.created_at
                },
                ...visibleMembers.map(member => ({
                    ...member.toJSON(),
                    role: member.PlannerMember.role,
                    joined_at: member.PlannerMember.joined_at,
                    deposit_status: member.PlannerMember.deposit_status,
                    join_status: member.PlannerMember.join_status
                }))
            ];

            return {
                total_slots: planner.number_of_people,
                current_members: joinedMembers.length + 1,
                available_slots: Math.max(planner.number_of_people - (joinedMembers.length + 1), 0),
                members
            };
        } catch (error) {
            Logger.error('Get planner members error:', error);
            throw error;
        }
    }

    /**
     * Remove member from planner
     * Owner kick -> hoàn 100% cọc, không phạt
     * Member tự rời -> phạt n%, hoàn phần còn lại, penalty treo pending
     */
    static async removePlannerMember(plannerId, memberId, userId) {
        const sequelize = require('../../config/database');
        const t = await sequelize.transaction();
        try {
            const planner = await Planner.findByPk(plannerId, { transaction: t });

            if (!planner) {
                throw new Error('Planner not found');
            }

            // Owner can remove anyone, but members can only remove themselves
            if (planner.user_id !== userId && memberId !== userId) {
                throw new Error('Forbidden');
            }

            // Cannot remove during ongoing trip
            if (planner.status === 'ongoing') {
                throw new Error('Không thể rời nhóm khi chuyến đi đang diễn ra');
            }

            // Cannot remove owner
            if (memberId === planner.user_id) {
                throw new Error('Cannot remove owner');
            }

            const member = await PlannerMember.findOne({
                where: {
                    planner_id: plannerId,
                    user_id: memberId
                },
                transaction: t
            });

            if (!member) {
                throw new Error('Member not found');
            }

            const depositAmount = parseFloat(planner.deposit_amount) || 0;
            const penaltyPercentage = parseInt(planner.penalty_percentage) || 0;
            const isSelfLeave = (memberId === userId); // Tự rời nhóm
            const isKicked = (planner.user_id === userId && memberId !== userId); // Bị owner kick

            // Xử lý tài chính nếu member đã đóng cọc
            if (depositAmount > 0 && member.deposit_status === 'paid') {
                const WalletService = require('./walletService');

                if (isKicked) {
                    // BỊ KICK -> Hoàn 100%, không phạt
                    await WalletService.refundOnKick(memberId, depositAmount, plannerId, planner.name, t);
                    member.deposit_status = 'refunded';
                    member.join_status = 'kicked';
                } else if (isSelfLeave && penaltyPercentage > 0) {
                    // TỰ RỜI + CÓ PHẠT -> Phạt n%, hoàn phần còn lại
                    await WalletService.applyPenalty(
                        memberId,
                        planner.user_id, // Owner nhận penalty (pending)
                        depositAmount,
                        penaltyPercentage,
                        plannerId,
                        planner.name,
                        t
                    );
                    member.deposit_status = 'penalized';
                    member.join_status = 'dropped_out';
                } else {
                    // TỰ RỜI NHƯNG KHÔNG CÓ PHẠT -> Hoàn 100%
                    await WalletService.refundDeposit(
                        memberId,
                        depositAmount,
                        plannerId,
                        `Hoàn 100% cọc do rời khỏi nhóm: ${planner.name}`,
                        t
                    );
                    member.deposit_status = 'refunded';
                    member.join_status = 'dropped_out';
                }
            } else {
                // Không có tiền cọc
                member.join_status = isKicked ? 'kicked' : 'dropped_out';
            }

            await member.save({ transaction: t });

            await t.commit();

            const action = isKicked ? 'kicked from' : 'left';
            Logger.info(`Member ${memberId} ${action} planner ${plannerId}`);

            return { message: isKicked ? 'Đã xóa thành viên khỏi nhóm' : 'Đã rời khỏi nhóm thành công' };
        } catch (error) {
            await t.rollback();
            Logger.error('Remove planner member error:', error);
            throw error;
        }
    }

    // ===================== DEPOSIT PAYMENT (PayOS Thu) =====================

    /**
     * Tạo link thanh toán cọc qua PayOS khi member xác nhận tham gia
     * @param {string} userId - ID user muốn confirm join
     * @param {string} plannerId - ID planner
     */
    static async createDepositPayment(userId, plannerId) {
        try {
            const planner = await Planner.findByPk(plannerId);
            if (!planner) throw new Error('Planner not found');

            // Check user is a member with deposit pending
            const member = await PlannerMember.findOne({
                where: {
                    planner_id: plannerId,
                    user_id: userId,
                    join_status: 'joined'
                }
            });

            if (!member) throw new Error('Bạn chưa phải thành viên của planner này');
            if (member.deposit_status === 'paid') throw new Error('Bạn đã đóng cọc rồi');

            const depositAmount = parseFloat(planner.deposit_amount) || 0;

            // Nếu không yêu cầu cọc → paid ngay
            if (depositAmount <= 0) {
                await member.update({ deposit_status: 'paid' });
                Logger.info(`Deposit auto-paid (no deposit required): user=${userId}, planner=${plannerId}`);
                return { deposit_required: false, message: 'Planner không yêu cầu cọc. Đã xác nhận tham gia.' };
            }

            // Tạo wallet nếu chưa có
            const WalletService = require('./walletService');
            const wallet = await WalletService.getOrCreateWallet(userId);

            // Tạo order code và transaction pending
            const orderCode = PayOSService.generateOrderCode();

            const transaction = await Transaction.create({
                wallet_id: wallet.id,
                amount: depositAmount,
                type: 'escrow_lock',
                status: 'pending',
                reference_type: 'planner_deposit',
                reference_id: `${plannerId}:${userId}:${orderCode}`,
                description: `Đặt cọc ${depositAmount.toLocaleString('vi-VN')} VND cho kế hoạch: ${planner.name}`
            });

            // Tạo link PayOS
            const paymentLink = await PayOSService.createPaymentLink(
                depositAmount,
                orderCode,
                `Coc ${planner.name}`.substring(0, 25)
            );

            Logger.info(`Deposit payment created: user=${userId}, planner=${plannerId}, amount=${depositAmount}, orderCode=${orderCode}`);

            return {
                deposit_required: true,
                transaction_id: transaction.id,
                order_code: orderCode,
                checkout_url: paymentLink.checkoutUrl,
                qr_code: paymentLink.qrCode,
                amount: depositAmount,
                planner_name: planner.name
            };
        } catch (error) {
            Logger.error('Create deposit payment error:', error);
            throw error;
        }
    }

    /**
     * Xử lý webhook PayOS khi thanh toán cọc thành công
     * @param {object} webhookData - Dữ liệu webhook từ PayOS
     */
    static async handleDepositWebhook(webhookData) {
        const t = await sequelize.transaction();
        try {
            // Xác thực webhook signature
            const verifiedData = await PayOSService.verifyWebhookData(webhookData);

            if (!verifiedData || verifiedData.code !== '00') {
                Logger.warn('Deposit webhook: payment not successful', { code: verifiedData?.code });
                await t.rollback();
                return { success: false, message: 'Payment not successful' };
            }

            const orderCode = String(verifiedData.data?.orderCode || verifiedData.orderCode);

            // Tìm transaction tương ứng
            const transaction = await Transaction.findOne({
                where: {
                    reference_type: 'planner_deposit',
                    reference_id: { [Op.like]: `%:${orderCode}` },
                    type: 'escrow_lock',
                    status: 'pending'
                },
                transaction: t,
                lock: true
            });

            if (!transaction) {
                Logger.warn(`Deposit webhook: No pending deposit found for orderCode ${orderCode}`);
                await t.rollback();
                return { success: false, message: 'Transaction not found' };
            }

            // Parse reference_id: "plannerId:userId:orderCode"
            const [plannerId, userId] = transaction.reference_id.split(':');

            // 1. Cập nhật transaction completed
            transaction.status = 'completed';
            await transaction.save({ transaction: t });

            // 2. Cộng locked_balance (escrow)
            const wallet = await Wallet.findByPk(transaction.wallet_id, {
                transaction: t,
                lock: true
            });

            if (wallet) {
                wallet.locked_balance = parseFloat(wallet.locked_balance) + parseFloat(transaction.amount);
                await wallet.save({ transaction: t });
            }

            // 3. Cập nhật deposit_status = 'paid'
            await PlannerMember.update(
                { deposit_status: 'paid' },
                {
                    where: {
                        planner_id: plannerId,
                        user_id: userId,
                        deposit_status: 'pending'
                    },
                    transaction: t
                }
            );

            await t.commit();

            Logger.info(`Deposit paid: user=${userId}, planner=${plannerId}, amount=${transaction.amount}, orderCode=${orderCode}`);

            return { success: true, amount: parseFloat(transaction.amount) };
        } catch (error) {
            await t.rollback();
            Logger.error('Handle deposit webhook error:', error);
            throw error;
        }
    }
}

module.exports = PlannerShareService;
