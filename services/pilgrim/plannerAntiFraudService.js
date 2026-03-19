const { Planner, PlannerMember, UserCheckin, Wallet, Transaction, User } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const sequelize = require('../../config/database');
const WalletService = require('./walletService');

class PlannerAntiFraudService {
    static async verifyAndSettlePlanner(plannerId, existingTransaction = null) {
        const ownsTransaction = !existingTransaction;
        const t = existingTransaction || await sequelize.transaction();

        try {
            const planner = await Planner.findByPk(plannerId, {
                include: [{
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'full_name', 'email']
                }],
                transaction: t,
                lock: true
            });

            if (!planner) {
                throw new Error('Planner not found');
            }

            if (planner.status !== 'completed') {
                throw new Error('Planner must be completed before settlement');
            }

            const members = await PlannerMember.findAll({
                where: {
                    planner_id: plannerId,
                    user_id: {
                        [Op.ne]: planner.user_id
                    }
                },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'email']
                }],
                transaction: t
            });

            const validCheckins = await UserCheckin.findAll({
                include: [{
                    model: require('../../models/PlannerItem'),
                    as: 'plannerItem',
                    where: { planner_id: plannerId },
                    required: true
                }],
                where: {
                    is_valid: true,
                    checkin_date: {
                        [Op.between]: [planner.start_date, planner.end_date || planner.start_date]
                    }
                },
                transaction: t
            });

            const checkedInUserIds = new Set(validCheckins.map(checkin => checkin.user_id));
            const totalParticipants = members.length + 1;

            Logger.info(`Settlement: planner=${plannerId}, total_participants=${totalParticipants}, checked_in=${checkedInUserIds.size}`);

            if (checkedInUserIds.size > 0) {
                for (const member of members) {
                    if (member.join_status !== 'joined' || member.deposit_status !== 'paid') {
                        continue;
                    }

                    const depositAmount = parseFloat(planner.deposit_amount || 0);
                    if (depositAmount <= 0) {
                        continue;
                    }

                    await this._refundDeposit(
                        member.user_id,
                        depositAmount,
                        plannerId,
                        `Hoàn cọc ${depositAmount.toLocaleString('vi-VN')} VND sau khi hoàn thành chuyến đi: ${planner.name}`,
                        t
                    );

                    await PlannerMember.update(
                        { deposit_status: 'refunded' },
                        {
                            where: {
                                planner_id: plannerId,
                                user_id: member.user_id
                            },
                            transaction: t
                        }
                    );
                }

                const ownerWallet = await Wallet.findOne({
                    where: { user_id: planner.user_id },
                    transaction: t,
                    lock: true
                });

                if (ownerWallet) {
                    const pendingPenalties = await Transaction.findAll({
                        where: {
                            wallet_id: ownerWallet.id,
                            type: 'penalty_received',
                            status: 'pending',
                            reference_type: 'planner_penalty',
                            reference_id: {
                                [Op.like]: `${plannerId}:%`
                            }
                        },
                        transaction: t,
                        lock: true
                    });

                    let totalPenalty = 0;
                    for (const penaltyTxn of pendingPenalties) {
                        penaltyTxn.status = 'completed';
                        await penaltyTxn.save({ transaction: t });
                        totalPenalty += parseFloat(penaltyTxn.amount);
                    }

                    if (totalPenalty > 0) {
                        ownerWallet.balance = parseFloat(ownerWallet.balance) + totalPenalty;
                        await ownerWallet.save({ transaction: t });

                        Logger.info(`Penalty released to owner: owner=${planner.user_id}, amount=${totalPenalty}`);
                    }
                }

                if (ownsTransaction) {
                    await t.commit();
                }

                return {
                    status: 'verified',
                    message: 'Chuyến đi đã được xác minh. Tiền cọc đã hoàn trả và tiền phạt đã giải ngân.',
                    checked_in_count: checkedInUserIds.size,
                    total_participants: totalParticipants
                };
            }

            for (const member of members) {
                if (member.deposit_status !== 'paid') {
                    continue;
                }

                const depositAmount = parseFloat(planner.deposit_amount || 0);
                if (depositAmount <= 0) {
                    continue;
                }

                await this._refundDeposit(
                    member.user_id,
                    depositAmount,
                    plannerId,
                    `Hoàn cọc ${depositAmount.toLocaleString('vi-VN')} VND do chuyến đi không diễn ra (không có check-in): ${planner.name}`,
                    t
                );

                await PlannerMember.update(
                    { deposit_status: 'refunded' },
                    {
                        where: {
                            planner_id: plannerId,
                            user_id: member.user_id
                        },
                        transaction: t
                    }
                );
            }

            const pendingPenalties = await Transaction.findAll({
                where: {
                    type: 'penalty_received',
                    status: 'pending',
                    reference_type: 'planner_penalty',
                    reference_id: {
                        [Op.like]: `${plannerId}:%`
                    }
                },
                transaction: t,
                lock: true
            });

            for (const penaltyTxn of pendingPenalties) {
                penaltyTxn.status = 'cancelled';
                penaltyTxn.description = `${penaltyTxn.description} | HUY: Chuyến đi không diễn ra`;
                await penaltyTxn.save({ transaction: t });

                const penaltyAmount = parseFloat(penaltyTxn.amount);
                const [, memberUserId] = String(penaltyTxn.reference_id || '').split(':');

                if (!memberUserId) {
                    continue;
                }

                const memberWallet = await Wallet.findOne({
                    where: { user_id: memberUserId },
                    transaction: t,
                    lock: true
                });

                if (!memberWallet) {
                    Logger.warn(`Wallet not found for penalty refund: user=${memberUserId}`);
                    continue;
                }

                memberWallet.balance = parseFloat(memberWallet.balance) + penaltyAmount;
                await memberWallet.save({ transaction: t });

                await Transaction.create({
                    wallet_id: memberWallet.id,
                    amount: penaltyAmount,
                    type: 'penalty_refunded',
                    status: 'completed',
                    reference_type: 'planner_penalty',
                    reference_id: penaltyTxn.reference_id,
                    description: `Hoàn tiền phạt ${penaltyAmount.toLocaleString('vi-VN')} VND do chuyến đi không diễn ra: ${planner.name}`,
                    code: WalletService.generateTxnCode()
                }, { transaction: t });

                Logger.info(`Penalty refunded: user=${memberWallet.user_id}, amount=${penaltyAmount}`);
            }

            if (ownsTransaction) {
                await t.commit();
            }

            return {
                status: 'suspicious',
                message: 'Chuyến đi không có check-in. Tất cả tiền cọc và tiền phạt đã được hoàn trả.',
                checked_in_count: 0,
                total_participants: totalParticipants
            };
        } catch (error) {
            if (ownsTransaction) {
                await t.rollback();
            }
            Logger.error('Verify and settle planner error:', error);
            throw error;
        }
    }

    static async _refundDeposit(userId, amount, plannerId, description, dbTransaction) {
        const wallet = await Wallet.findOne({
            where: { user_id: userId },
            transaction: dbTransaction,
            lock: true
        });

        if (!wallet) {
            Logger.warn(`Wallet not found for user ${userId} during refund`);
            return;
        }

        wallet.locked_balance = parseFloat(wallet.locked_balance) - amount;
        wallet.balance = parseFloat(wallet.balance) + amount;
        await wallet.save({ transaction: dbTransaction });

        await Transaction.create({
            wallet_id: wallet.id,
            amount,
            type: 'escrow_refund',
            status: 'completed',
            reference_type: 'planner',
            reference_id: plannerId,
            description,
            code: WalletService.generateTxnCode()
        }, { transaction: dbTransaction });

        Logger.info(`Deposit refunded: user=${userId}, amount=${amount}`);
    }
}

module.exports = PlannerAntiFraudService;
