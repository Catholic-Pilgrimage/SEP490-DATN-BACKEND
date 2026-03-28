const { Planner, User, PlannerItem, Site, PlannerInvite, PlannerMember, Wallet, Transaction } = require('../../models');
const { Op } = require('sequelize');
const EmailService = require('../shared/emailService');
const Logger = require('../../utils/logger.util');
const crypto = require('crypto');
const QRCode = require('qrcode');
const PlannerService = require('../plannerService');
const PayOSService = require('../shared/payosService');
const WalletService = require('./walletService');
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
                            order: [['leg_number', 'ASC'], ['order_index', 'ASC']]
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

            // Sweep ALL expired active invites (pending + awaiting_payment) before counting slots
            // Prevents stale invites from falsely blocking available slots or re-inviting same email
            const now = new Date();
            const expiredActiveInvites = await PlannerInvite.findAll({
                where: {
                    planner_id: plannerId,
                    status: { [Op.in]: ['pending', 'awaiting_payment'] },
                    expires_at: { [Op.lt]: now }
                }
            });
            for (const expiredInvite of expiredActiveInvites) {
                if (expiredInvite.status === 'awaiting_payment') {
                    // Cancel pending transaction precisely by invitee userId
                    const invitee = await User.findOne({ where: { email: expiredInvite.email }, attributes: ['id'] });
                    if (invitee) {
                        const staleTx = await Transaction.findOne({
                            where: {
                                reference_type: 'planner_deposit',
                                reference_id: { [Op.like]: `${plannerId}:${invitee.id}:%` },
                                type: 'escrow_lock',
                                status: 'pending'
                            }
                        });
                        if (staleTx) {
                            try { await PayOSService.cancelPaymentLink(staleTx.reference_id.split(':')[2]); } catch { }  // best-effort
                            await staleTx.update({ status: 'cancelled' });
                        }
                    }
                }
                await expiredInvite.update({ status: 'expired' });
                Logger.info(`Slot sweep: expired ${expiredInvite.status} invite ${expiredInvite.id} for planner ${plannerId}`);
            }

            const plannerState = await PlannerService.getPlannerState(plannerId, planner);
            if (plannerState.finalLocked) {
                throw new Error('Planner is locked');
            }
            if (plannerState.joinWindowClosed) {
                throw new Error('Planner join window is closed');
            }
            if (!planner.start_date || !planner.end_date) {
                throw new Error('Planner must have start_date and end_date before inviting members');
            }
            if (!plannerState.scheduleComplete) {
                throw new Error('Planner schedule must be complete before inviting members');
            }

            // Slot counting: joined members (excluding owner) + active non-expired invites
            const currentMemberCount = await PlannerMember.count({
                where: {
                    planner_id: plannerId,
                    join_status: 'joined',
                    user_id: { [Op.ne]: planner.user_id }
                }
            });
            const activeInviteCount = await PlannerInvite.count({
                where: {
                    planner_id: plannerId,
                    status: { [Op.in]: ['pending', 'awaiting_payment'] },
                    [Op.or]: [
                        { expires_at: null },
                        { expires_at: { [Op.gte]: now } }
                    ]
                }
            });

            const totalSlots = planner.number_of_people;
            const usedSlots = currentMemberCount + activeInviteCount + 1; // +1 for owner

            if (usedSlots >= totalSlots) {
                throw new Error(`Planner is full. Max participants: ${totalSlots}`);
            }

            // Prevent duplicate active invite for same email (only non-expired)
            const existingInvite = await PlannerInvite.findOne({
                where: {
                    planner_id: plannerId,
                    email,
                    status: { [Op.in]: ['pending', 'awaiting_payment'] },
                    [Op.or]: [
                        { expires_at: null },
                        { expires_at: { [Op.gte]: now } }
                    ]
                }
            });

            if (existingInvite) {
                throw new Error('User already invited');
            }

            // If user exists, check if they are already an active member
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                const existingMember = await PlannerMember.findOne({
                    where: {
                        planner_id: plannerId,
                        user_id: existingUser.id
                    }
                });
                // Only block if member is currently joined — allow re-invite for dropped_out/kicked
                if (existingMember && existingMember.join_status === 'joined') {
                    throw new Error('User is already a member');
                }
            }

            // Create invite token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const invite = await PlannerInvite.create({
                planner_id: plannerId,
                inviter_id: userId,
                email,
                token,
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

            if (invite.status === 'awaiting_payment') {
                // Lazy cleanup: if this invite is stuck in awaiting_payment and has expired,
                // cancel the pending transaction for the CORRECT user and reset invite to expired
                const isExpired = invite.expires_at && new Date() > new Date(invite.expires_at);
                if (isExpired) {
                    // Resolve the invitee by email to get their userId for a precise transaction match
                    const invitee = await User.findOne({ where: { email: invite.email }, attributes: ['id'] });
                    if (invitee) {
                        const staleTransaction = await Transaction.findOne({
                            where: {
                                reference_type: 'planner_deposit',
                                reference_id: { [Op.like]: `${invite.planner_id}:${invitee.id}:%` },
                                type: 'escrow_lock',
                                status: 'pending'
                            }
                        });
                        if (staleTransaction) {
                            try {
                                const orderCode = staleTransaction.reference_id.split(':')[2];
                                await PayOSService.cancelPaymentLink(orderCode);
                            } catch (e) {
                                Logger.warn(`Could not cancel stale PayOS order during expiry cleanup: ${e.message}`);
                            }
                            await staleTransaction.update({ status: 'cancelled' });
                        }
                    }
                    await invite.update({ status: 'expired' });
                    throw new Error('Invite has expired');
                }

                // Not expired — user is re-requesting the payment link
                // Since PayOS getPaymentInfo() doesn't return checkoutUrl,
                // cancel old order + tx and fall through to create a fresh link
                if (action === 'accept') {
                    const existingTx = await Transaction.findOne({
                        where: {
                            reference_type: 'planner_deposit',
                            reference_id: { [Op.like]: `${invite.planner_id}:${userId}:%` },
                            type: 'escrow_lock',
                            status: 'pending'
                        },
                        include: [{ model: require('../../models').Wallet, as: 'wallet', where: { user_id: userId }, required: true }]
                    });

                    if (existingTx) {
                        const existingOrderCode = Number(existingTx.reference_id.split(':')[2]);
                        try {
                            await PayOSService.cancelPaymentLink(existingOrderCode);
                        } catch (e) {
                            Logger.warn(`Could not cancel old PayOS order ${existingOrderCode}: ${e.message}`);
                        }
                        await existingTx.update({ status: 'cancelled' });
                    }

                    // Reset invite to pending so the main accept flow below creates a fresh link
                    await invite.update({ status: 'pending' });
                    Logger.info(`Re-accept: cancelled old payment, reset invite to pending for user=${userId}`);
                    // Fall through to the main accept flow below (invite.status is now 'pending')
                }

                if (invite.status === 'awaiting_payment') {
                    // Only reach here if action was 'reject' on an awaiting_payment invite
                    throw new Error('Invite already processed');
                }
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
            if (invite.expires_at && new Date() > new Date(invite.expires_at)) {
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
                const plannerState = await PlannerService.getPlannerState(planner.id, planner);

                if (plannerState.finalLocked) {
                    throw new Error('Planner is locked');
                }

                if (plannerState.joinWindowClosed) {
                    await invite.update({ status: 'expired' });
                    throw new Error('Planner join window is closed');
                }
                if (!planner.start_date || !planner.end_date) {
                    await invite.update({ status: 'expired' });
                    throw new Error('Planner must have start_date and end_date before inviting members');
                }
                if (!plannerState.scheduleComplete) {
                    await invite.update({ status: 'expired' });
                    throw new Error('Planner schedule must be complete before inviting members');
                }

                try {
                    // Check slots again using invite-based counting
                    const currentMemberCount = await PlannerMember.count({
                        where: {
                            planner_id: planner.id,
                            join_status: 'joined',
                            user_id: { [Op.ne]: planner.user_id }
                        }
                    });
                    const activeInviteCount = await PlannerInvite.count({
                        where: {
                            planner_id: planner.id,
                            status: { [Op.in]: ['pending', 'awaiting_payment'] },
                            id: { [Op.ne]: invite.id } // exclude this invite
                        }
                    });

                    const totalSlots = planner.number_of_people;
                    if (currentMemberCount + activeInviteCount + 1 >= totalSlots) {
                        throw new Error(`Planner is full. Max participants: ${totalSlots}`);
                    }

                    // Move invite to awaiting_payment — NOT creating PlannerMember yet
                    await invite.update({ status: 'awaiting_payment' });

                    const depositAmount = parseFloat(planner.deposit_amount) || 0;

                    // Business rule: share planners MUST have deposit_amount > 0
                    // If deposit = 0 on a share planner, it's a data inconsistency — reject
                    if (depositAmount <= 0) {
                        await invite.update({ status: 'pending' }); // roll back
                        throw new Error('Share planner must have a deposit amount configured. Contact the planner owner.');
                    }

                    // Solo planner guard (should not reach here, but belt-and-suspenders)
                    if (parseInt(planner.number_of_people) <= 1) {
                        await invite.update({ status: 'pending' });
                        throw new Error('Solo planner does not support invites.');
                    }

                    // Check wallet balance first — if sufficient, auto-deduct (no PayOS needed)
                    const WalletService = require('./walletService');
                    const wallet = await WalletService.getOrCreateWallet(userId);
                    let walletBalance = parseFloat(wallet.balance) || 0;

                    if (walletBalance >= depositAmount) {
                        // AUTO-DEDUCT from wallet — atomic transaction with row lock
                        const t = await sequelize.transaction();
                        try {
                            // Lock wallet row to prevent double-spend
                            const lockedWallet = await Wallet.findByPk(wallet.id, { transaction: t, lock: true });
                            const confirmedBalance = parseFloat(lockedWallet.balance) || 0;
                            walletBalance = confirmedBalance; 

                            // Re-check balance inside transaction (could have changed)
                            if (confirmedBalance < depositAmount) {
                                await t.rollback();
                            } else {
                                const walletTx = await Transaction.create({
                                    wallet_id: lockedWallet.id,
                                    amount: depositAmount,
                                    type: 'escrow_lock',
                                    status: 'completed',
                                    reference_type: 'planner_deposit',
                                    reference_id: `${planner.id}:${userId}:wallet`,
                                    description: `Cọc ${depositAmount.toLocaleString('vi-VN')} VND từ ví cho kế hoạch: ${planner.name}`,
                                    code: WalletService.generateTxnCode()
                                }, { transaction: t });

                                // Deduct from balance, add to locked_balance
                                lockedWallet.balance = confirmedBalance - depositAmount;
                                lockedWallet.locked_balance = parseFloat(lockedWallet.locked_balance) + depositAmount;
                                await lockedWallet.save({ transaction: t });

                                // Create or reactivate PlannerMember immediately
                                const existingMember = await PlannerMember.findOne({
                                    where: { planner_id: planner.id, user_id: userId },
                                    transaction: t
                                });
                                if (existingMember) {
                                    existingMember.join_status = 'joined';
                                    existingMember.deposit_status = 'paid';
                                    existingMember.joined_at = new Date();
                                    await existingMember.save({ transaction: t });
                                } else {
                                    await PlannerMember.create({
                                        planner_id: planner.id,
                                        user_id: userId,
                                        join_status: 'joined',
                                        deposit_status: 'paid'
                                    }, { transaction: t });
                                }

                                await invite.update({ status: 'accepted' }, { transaction: t });
                                await t.commit();

                                Logger.info(`User ${userId} auto-paid deposit from wallet for planner ${planner.id}`);

                                // System chat message (fire-and-forget)
                                const memberUser = await User.findByPk(userId, { attributes: ['full_name'] });
                                const PlannerChatService = require('./plannerChatService');
                                PlannerChatService.sendSystemMessage(planner.id,
                                    `💰 ${memberUser?.full_name || 'Thành viên'} đã đóng cọc ${depositAmount.toLocaleString('vi-VN')} VND từ ví và tham gia nhóm`
                                ).catch(() => { });

                                // Push notifications (fire-and-forget)
                                const NotificationService = require('../shared/notificationService');
                                NotificationService.createNotification('planner_joined', planner.user_id, {
                                    memberName: memberUser?.full_name || 'Thành viên',
                                    plannerName: planner.name
                                }).catch(() => { });

                                return {
                                    deposit_required: false,
                                    paid_from_wallet: true,
                                    transaction_id: walletTx.id,
                                    amount: depositAmount,
                                    wallet_balance_after: confirmedBalance - depositAmount,
                                    planner_name: planner.name,
                                    message: 'Đã trừ tiền cọc từ ví và tham gia thành công'
                                };
                            }
                        } catch (txError) {
                            await t.rollback();
                            Logger.error(`Wallet auto-deduct failed for user=${userId}:`, txError);
                            // Fall through to PayOS path
                        }
                    }

                    // WALLET INSUFFICIENT — create PayOS link
                    // Wrap in try/catch: if PayOS fails, roll back invite to 'pending'
                    let paymentLink;
                    let orderCode;
                    let pendingTx;
                    try {
                        orderCode = PayOSService.generateOrderCode();

                        pendingTx = await Transaction.create({
                            wallet_id: wallet.id,
                            amount: depositAmount,
                            type: 'escrow_lock',
                            status: 'pending',
                            reference_type: 'planner_deposit',
                            reference_id: `${planner.id}:${userId}:${orderCode}`,
                            description: `Deposit ${depositAmount.toLocaleString('vi-VN')} VND for planner: ${planner.name}`,
                            code: WalletService.generateTxnCode()
                        });

                        paymentLink = await PayOSService.createPaymentLink(
                            depositAmount,
                            orderCode,
                            `Coc ${planner.name}`.substring(0, 25)
                        );
                    } catch (payosError) {
                        // Roll back invite to 'pending' so user can try again
                        await invite.update({ status: 'pending' });
                        if (pendingTx) await pendingTx.update({ status: 'cancelled' });
                        Logger.error(`Payment link creation failed for user=${userId}, planner=${planner.id}:`, payosError);
                        throw new Error('Failed to create payment link. Please try again.');
                    }

                    Logger.info(`User ${userId} accepted invite, awaiting payment for planner ${planner.id}`);

                    return {
                        deposit_required: true,
                        order_code: orderCode,
                        checkout_url: paymentLink.checkoutUrl,
                        qr_code: paymentLink.qrCode,
                        amount: depositAmount,
                        wallet_balance: walletBalance,
                        planner_name: planner.name
                    };
                } catch (innerError) {
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
                        attributes: ['joined_at', 'deposit_status', 'join_status']
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
                    joined_at: planner.created_at
                },
                ...visibleMembers.map(member => {
                    const { PlannerMember: pm, ...userData } = member.toJSON();
                    return {
                        ...userData,
                        joined_at: pm.joined_at,
                        deposit_status: pm.deposit_status,
                        join_status: pm.join_status
                    };
                })
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

            // Cannot remove during ongoing, completed, or cancelled trip
            if (['ongoing', 'completed', 'cancelled'].includes(planner.status)) {
                if (planner.status === 'ongoing') {
                    throw new Error('Cannot leave ongoing journey');
                } else {
                    throw new Error('Cannot leave cancelled plan');
                }
            }

            const plannerState = await PlannerService.getPlannerState(plannerId, planner, { transaction: t });

            // Check final lock
            if (plannerState.finalLocked) {
                throw new Error('Planner is locked');
            }

            if (plannerState.joinWindowClosed) {
                throw new Error('Planner member changes are closed');
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

            // Guard: cannot remove a member who already left or was kicked
            if (member.join_status !== 'joined') {
                throw new Error('Member already left or kicked');
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

            // System chat message (fire-and-forget)
            const chatMemberUser = await User.findByPk(memberId, { attributes: ['full_name'] });
            const PlannerChatService = require('./plannerChatService');
            if (isKicked) {
                const chatMsg = member.deposit_status === 'refunded' && depositAmount > 0
                    ? `🚫 ${chatMemberUser?.full_name || 'Thành viên'} đã bị xóa khỏi nhóm. Hoàn ${depositAmount.toLocaleString('vi-VN')} VND tiền cọc`
                    : `🚫 ${chatMemberUser?.full_name || 'Thành viên'} đã bị xóa khỏi nhóm`;
                PlannerChatService.sendSystemMessage(plannerId, chatMsg).catch(() => { });
            } else {
                const chatMsg = member.deposit_status === 'penalized'
                    ? `👋 ${chatMemberUser?.full_name || 'Thành viên'} đã rời khỏi nhóm. Phạt ${penaltyPercentage}% tiền cọc`
                    : member.deposit_status === 'refunded' && depositAmount > 0
                        ? `👋 ${chatMemberUser?.full_name || 'Thành viên'} đã rời khỏi nhóm. Hoàn ${depositAmount.toLocaleString('vi-VN')} VND tiền cọc`
                        : `👋 ${chatMemberUser?.full_name || 'Thành viên'} đã rời khỏi nhóm`;
                PlannerChatService.sendSystemMessage(plannerId, chatMsg).catch(() => { });
            }

            // Send notifications (fire-and-forget, don't block response)
            const NotificationService = require('../shared/notificationService');
            if (isKicked) {
                NotificationService.createNotification('planner_kicked', memberId, {
                    plannerName: planner.name
                }).catch(e => Logger.warn(`Failed to send kicked notification: ${e.message}`));

                if (member.deposit_status === 'refunded' && depositAmount > 0) {
                    NotificationService.createNotification('planner_deposit_refunded', memberId, {
                        plannerName: planner.name,
                        amount: depositAmount.toLocaleString('vi-VN')
                    }).catch(e => Logger.warn(`Failed to send refund notification: ${e.message}`));
                }
            } else if (isSelfLeave) {
                // Notify owner that member left
                const memberUser = await User.findByPk(memberId, { attributes: ['full_name'] });
                NotificationService.createNotification('planner_member_left', planner.user_id, {
                    memberName: memberUser?.full_name || 'Thành viên',
                    plannerName: planner.name
                }).catch(e => Logger.warn(`Failed to send member-left notification: ${e.message}`));

                // Notify member about refund/penalty
                if (member.deposit_status === 'refunded' && depositAmount > 0) {
                    NotificationService.createNotification('planner_deposit_refunded', memberId, {
                        plannerName: planner.name,
                        amount: depositAmount.toLocaleString('vi-VN')
                    }).catch(e => Logger.warn(`Failed to send refund notification: ${e.message}`));
                }
            }

            // Build detailed response
            const response = {
                planner_name: planner.name,
                member_id: memberId,
                action: isKicked ? 'kicked' : 'left',
                deposit_status: member.deposit_status,
                join_status: member.join_status
            };

            if (depositAmount > 0 && (member.deposit_status === 'refunded' || member.deposit_status === 'penalized')) {
                response.deposit_amount = depositAmount;

                if (isKicked) {
                    response.refund_amount = depositAmount;
                    response.message = `Đã xóa thành viên khỏi nhóm "${planner.name}". Hoàn ${depositAmount.toLocaleString('vi-VN')} VND tiền cọc vào ví thành viên`;
                } else if (member.deposit_status === 'penalized') {
                    const penaltyAmount = Math.round(depositAmount * penaltyPercentage / 100);
                    const refundAmount = depositAmount - penaltyAmount;
                    response.penalty_percentage = penaltyPercentage;
                    response.penalty_amount = penaltyAmount;
                    response.refund_amount = refundAmount;
                    response.message = `Đã rời khỏi nhóm "${planner.name}". Phạt ${penaltyPercentage}% (${penaltyAmount.toLocaleString('vi-VN')} VND), hoàn lại ${refundAmount.toLocaleString('vi-VN')} VND`;
                } else {
                    response.refund_amount = depositAmount;
                    response.message = `Đã rời khỏi nhóm "${planner.name}". Hoàn ${depositAmount.toLocaleString('vi-VN')} VND tiền cọc vào ví`;
                }
            } else {
                response.message = isKicked
                    ? `Đã xóa thành viên khỏi nhóm "${planner.name}"`
                    : `Đã rời khỏi nhóm "${planner.name}" thành công`;
            }

            return response;
        } catch (error) {
            await t.rollback();
            Logger.error('Remove planner member error:', error);
            throw error;
        }
    }




    /**
     * Handle PayOS webhook for deposit payment
     * Fully idempotent — safe to call multiple times for the same orderCode
     */
    static async handleDepositWebhook(webhookData) {
        const t = await sequelize.transaction();
        try {
            // Verify webhook signature
            const verifiedData = await PayOSService.verifyWebhookData(webhookData);

            if (!verifiedData || verifiedData.code !== '00') {
                Logger.warn('Deposit webhook: payment not successful', { code: verifiedData?.code });
                await t.rollback();
                return { success: false, message: 'Payment not successful' };
            }

            const orderCode = String(verifiedData.data?.orderCode || verifiedData.orderCode);

            // Lock the transaction row first
            const transaction = await Transaction.findOne({
                where: {
                    reference_type: 'planner_deposit',
                    reference_id: { [Op.like]: `%:${orderCode}` },
                    type: 'escrow_lock'
                },
                transaction: t,
                lock: true
            });

            if (!transaction) {
                Logger.warn(`Deposit webhook: No deposit transaction found for orderCode ${orderCode}`);
                await t.rollback();
                return { success: false, message: 'Transaction not found' };
            }

            // Idempotency: if already completed, return success immediately
            if (transaction.status === 'completed') {
                Logger.info(`Deposit webhook: already processed for orderCode ${orderCode} — no-op`);
                await t.rollback();
                return { success: true, message: 'Already processed' };
            }

            // Block cancelled transactions — prevent resurrection of intentionally cancelled payments
            if (transaction.status === 'cancelled') {
                Logger.warn(`Deposit webhook: orderCode ${orderCode} was cancelled — ignoring late webhook`);
                await t.rollback();
                return { success: false, message: 'Transaction was cancelled' };
            }

            // Parse reference_id: "plannerId:userId:orderCode"
            const [plannerId, userId] = transaction.reference_id.split(':');

            // 1. Mark transaction completed
            transaction.status = 'completed';
            await transaction.save({ transaction: t });

            // 2. Add to wallet locked_balance (escrow)
            const wallet = await Wallet.findByPk(transaction.wallet_id, {
                transaction: t,
                lock: true
            });
            if (wallet) {
                wallet.locked_balance = parseFloat(wallet.locked_balance) + parseFloat(transaction.amount);
                await wallet.save({ transaction: t });
            }

            // 3. Create PlannerMember if not already exists (idempotent)
            const existingMember = await PlannerMember.findOne({
                where: { planner_id: plannerId, user_id: userId },
                transaction: t
            });

            // Find invite via email match
            const user = await User.findByPk(userId);
            const inviteByEmail = user
                ? await PlannerInvite.findOne({
                    where: { planner_id: plannerId, email: user.email, status: 'awaiting_payment' },
                    transaction: t
                })
                : null;

            if (!inviteByEmail) {
                // No valid invite — money received but invite expired/cancelled.
                // STILL commit transaction as completed to track the payment.
                // Do NOT create member — handle refund separately.
                await t.commit();
                Logger.warn(`Webhook: No awaiting_payment invite found for user=${userId}, planner=${plannerId}. Transaction marked completed but member NOT created — needs manual refund.`);
                return { success: true, message: 'Payment received but invite expired. Refund needed.' };
            }

            const currentPlanner = await Planner.findByPk(plannerId, { transaction: t });
            const plannerState = currentPlanner
                ? await PlannerService.getPlannerState(plannerId, currentPlanner, { transaction: t })
                : null;

            if (
                !currentPlanner ||
                currentPlanner.status !== 'planning' ||
                !currentPlanner.start_date ||
                !currentPlanner.end_date ||
                !plannerState.scheduleComplete ||
                plannerState.joinWindowClosed ||
                plannerState.finalLocked
            ) {
                await inviteByEmail.update({ status: 'expired' }, { transaction: t });
                await t.commit();
                Logger.warn(`Webhook: payment received after planner closed for user=${userId}, planner=${plannerId}. Member NOT created - needs manual refund.`);
                return { success: true, message: 'Payment received but planner is closed. Refund needed.' };
            }

            if (!existingMember) {
                await PlannerMember.create({
                    planner_id: plannerId,
                    user_id: userId,
                    role: inviteByEmail.role,
                    join_status: 'joined',
                    deposit_status: 'paid'
                }, { transaction: t });

                // Mark invite as accepted
                await inviteByEmail.update({ status: 'accepted' }, { transaction: t });
            } else if (existingMember.join_status !== 'joined') {
                // Re-invite flow: member was kicked/dropped_out, re-activate them
                existingMember.join_status = 'joined';
                existingMember.deposit_status = 'paid';
                existingMember.role = inviteByEmail.role;
                existingMember.joined_at = new Date();
                await existingMember.save({ transaction: t });

                await inviteByEmail.update({ status: 'accepted' }, { transaction: t });
                Logger.info(`Re-invite: reactivated member ${userId} in planner ${plannerId}`);
            }

            await t.commit();

            Logger.info(`Deposit paid: user=${userId}, planner=${plannerId}, amount=${transaction.amount}, orderCode=${orderCode}`);

            // System chat message (fire-and-forget)
            const paidUser = await User.findByPk(userId, { attributes: ['full_name'] });
            const PlannerChatService = require('./plannerChatService');
            PlannerChatService.sendSystemMessage(plannerId,
                `💰 ${paidUser?.full_name || 'Thành viên'} đã thanh toán cọc ${parseFloat(transaction.amount).toLocaleString('vi-VN')} VND và tham gia nhóm`
            ).catch(() => { });

            // Push notifications (fire-and-forget)
            const NotificationService = require('../shared/notificationService');
            const plannerInfo = await Planner.findByPk(plannerId, { attributes: ['user_id', 'name'] });
            if (plannerInfo) {
                NotificationService.createNotification('planner_joined', plannerInfo.user_id, {
                    memberName: paidUser?.full_name || 'Thành viên',
                    plannerName: plannerInfo.name
                }).catch(() => { });
            }

            return { success: true, amount: parseFloat(transaction.amount) };
        } catch (error) {
            await t.rollback();
            Logger.error('Handle deposit webhook error:', error);
            throw error;
        }
    }

    /**
     * Cancel a pending deposit payment
     * @param {string} userId - User requesting the cancel
     * @param {string} plannerId - Planner ID
     * @param {boolean} reject - If true, reject the invite permanently; if false, reset to pending for retry
     */
    static async cancelDeposit(userId, plannerId, reject = false) {
        const t = await sequelize.transaction();
        try {
            const user = await User.findByPk(userId, { transaction: t });
            if (!user) throw new Error('User not found');

            // Find invite in awaiting_payment for this user (match by email)
            const invite = await PlannerInvite.findOne({
                where: {
                    planner_id: plannerId,
                    email: user.email,
                    status: 'awaiting_payment'
                },
                transaction: t
            });

            if (!invite) throw new Error('No pending deposit found for this invite');

            // Find and cancel the pending escrow_lock transaction
            const pendingTx = await Transaction.findOne({
                where: {
                    reference_type: 'planner_deposit',
                    reference_id: { [Op.like]: `${plannerId}:${userId}:%` },
                    type: 'escrow_lock',
                    status: 'pending'
                },
                include: [{ model: require('../../models').Wallet, as: 'wallet', where: { user_id: userId }, required: true }],
                transaction: t
            });

            if (pendingTx) {
                try {
                    const orderCode = pendingTx.reference_id.split(':')[2];
                    await PayOSService.cancelPaymentLink(orderCode);
                } catch (e) {
                    Logger.warn(`Could not cancel PayOS order: ${e.message}`);
                }
                await pendingTx.update({ status: 'cancelled' }, { transaction: t });
            }

            // Reset or reject invite — atomic with transaction cancel above
            const newStatus = reject ? 'rejected' : 'pending';
            await invite.update({ status: newStatus }, { transaction: t });

            await t.commit();
            Logger.info(`Deposit cancelled: user=${userId}, planner=${plannerId}, invite=${newStatus}`);

            return {
                messageKey: reject ? 'invite_rejected' : 'deposit_cancelled'
            };
        } catch (error) {
            await t.rollback();
            Logger.error('Cancel deposit error:', error);
            throw error;
        }
    }
}

module.exports = PlannerShareService;
