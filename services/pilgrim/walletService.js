const { Wallet, Transaction, User } = require('../../models');
const Logger = require('../../utils/logger.util');
const sequelize = require('../../config/database');

class WalletService {
    /**
     * Lấy hoặc tạo ví cho user
     */
    static async getOrCreateWallet(userId, dbTransaction = null, lock = false) {
        try {
            let wallet = await Wallet.findOne({
                where: { user_id: userId },
                transaction: dbTransaction,
                lock: dbTransaction && lock ? true : undefined
            });

            if (!wallet) {
                wallet = await Wallet.create({
                    user_id: userId,
                    balance: 0,
                    locked_balance: 0
                }, {
                    transaction: dbTransaction
                });
                Logger.info(`Wallet created for user ${userId}`);
            }

            return wallet;
        } catch (error) {
            Logger.error('Get/create wallet error:', error);
            throw error;
        }
    }

    /**
     * Xem thông tin ví
     */
    static async getWalletInfo(userId) {
        try {
            const wallet = await this.getOrCreateWallet(userId);
            return {
                id: wallet.id,
                balance: parseFloat(wallet.balance),
                locked_balance: parseFloat(wallet.locked_balance),
                total_balance: parseFloat(wallet.balance) + parseFloat(wallet.locked_balance),
                status: wallet.status
            };
        } catch (error) {
            Logger.error('Get wallet info error:', error);
            throw error;
        }
    }

    /**
     * Lịch sử giao dịch có phân trang
     */
    static async getTransactions(userId, filters = {}) {
        try {
            const wallet = await this.getOrCreateWallet(userId);

            const limit = parseInt(filters.limit) || 20;
            const page = parseInt(filters.page) || 1;
            const offset = (page - 1) * limit;

            const where = { wallet_id: wallet.id };

            // Filter by type
            if (filters.type) {
                where.type = filters.type;
            }

            // Filter by status
            if (filters.status) {
                where.status = filters.status;
            }

            const { rows, count } = await Transaction.findAndCountAll({
                where,
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            return {
                transactions: rows,
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            };
        } catch (error) {
            Logger.error('Get transactions error:', error);
            throw error;
        }
    }

    /**
     * Lấy lịch sử giao dịch quỹ nhóm của một planner (Sao kê)
     */
    static async getPlannerTransactions(plannerId, filters = {}) {
        try {
            const limit = parseInt(filters.limit) || 20;
            const page = parseInt(filters.page) || 1;
            const offset = (page - 1) * limit;

            const where = {
                reference_type: 'planner',
                reference_id: plannerId
            };

            if (filters.type) {
                where.type = filters.type;
            }
            if (filters.status) {
                where.status = filters.status;
            }

            const { rows, count } = await Transaction.findAndCountAll({
                where,
                include: [{
                    model: Wallet,
                    as: 'wallet',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'full_name', 'email', 'avatar_url']
                    }]
                }],
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            // Calculate total fund (có thể nạp/rút phức tạp, nhưng đơn giản là lấy những cái đã lock/applied/refunded)
            // Lấy tổng số dư đã cọc đang khóa
            const totalEscrowLocked = await Transaction.sum('amount', {
                where: {
                    reference_type: 'planner',
                    reference_id: plannerId,
                    type: 'escrow_lock',
                    status: 'completed'
                }
            }) || 0;

            const totalEscrowRefunded = await Transaction.sum('amount', {
                where: {
                    reference_type: 'planner',
                    reference_id: plannerId,
                    type: 'escrow_refund',
                    status: 'completed'
                }
            }) || 0;

            return {
                summary: {
                    total_fund_locked: totalEscrowLocked - totalEscrowRefunded
                },
                transactions: rows,
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            };
        } catch (error) {
            Logger.error('Get planner transactions error:', error);
            throw error;
        }
    }

    // ===================== RÚT TIỀN (PayOS Chi - Tự động) =====================

    /**
     * User yêu cầu rút tiền — PayOS Chi tự động chuyển
     * @param {string} userId
     * @param {number} amount - Số tiền rút (VND)
     * @param {object} bankInfo - { account_number, account_name, bank_code }
     */
    static async requestWithdrawal(userId, amount, bankInfo) {
        const PayOSService = require('../shared/payosService');
        const t = await sequelize.transaction();
        try {
            if (amount < 2000) throw new Error('Số tiền rút tối thiểu là 2,000 VND');
            if (!bankInfo?.account_number || !bankInfo?.account_name || !bankInfo?.bank_code) {
                throw new Error('Vui lòng điền đầy đủ thông tin ngân hàng');
            }

            const wallet = await Wallet.findOne({
                where: { user_id: userId },
                transaction: t,
                lock: true
            });

            if (!wallet) throw new Error('Wallet not found');
            if (parseFloat(wallet.balance) < amount) {
                throw new Error('Số dư khả dụng không đủ');
            }

            // Trừ balance ngay (tránh double spending)
            wallet.balance = parseFloat(wallet.balance) - amount;
            await wallet.save({ transaction: t });

            // Tạo transaction pending
            const payoutId = PayOSService.generatePayoutId();
            const transaction = await Transaction.create({
                wallet_id: wallet.id,
                amount: amount,
                type: 'withdraw',
                status: 'pending',
                reference_type: 'payos_payout',
                reference_id: payoutId,
                description: `Rút ${amount.toLocaleString('vi-VN')} VND → ${bankInfo.bank_code} - ${bankInfo.account_number}`,
                bank_info: JSON.stringify(bankInfo)
            }, { transaction: t });

            // Gọi PayOS Chi để chuyển tiền
            try {
                const payoutResult = await PayOSService.createPayout(
                    amount,
                    payoutId,
                    bankInfo.account_number,
                    bankInfo.account_name,
                    bankInfo.bank_code,
                    `Rut tien vi CatholicPilgrimage`
                );

                // PayOS Chi thành công
                transaction.status = 'completed';
                await transaction.save({ transaction: t });

                await t.commit();

                Logger.info(`Withdrawal completed via PayOS Chi: user=${userId}, amount=${amount}, payoutId=${payoutId}`);
                return {
                    transaction_id: transaction.id,
                    amount,
                    bank_info: bankInfo,
                    payout_status: payoutResult.status || 'completed',
                    message: 'Rút tiền thành công! Tiền sẽ được chuyển vào tài khoản ngân hàng trong vài phút.'
                };
            } catch (payosError) {
                // PayOS Chi thất bại → hoàn tiền lại balance
                Logger.error('PayOS payout failed, refunding balance:', payosError);

                wallet.balance = parseFloat(wallet.balance) + amount;
                await wallet.save({ transaction: t });

                transaction.status = 'failed';
                transaction.description = `${transaction.description} | PayOS Chi error: ${payosError.message}`;
                await transaction.save({ transaction: t });

                await t.commit();

                throw new Error(`Chuyển tiền thất bại: ${payosError.message}. Số dư đã được hoàn lại.`);
            }
        } catch (error) {
            if (!t.finished) await t.rollback();
            Logger.error('Request withdrawal error:', error);
            throw error;
        }
    }

    // ===================== ESCROW OPERATIONS (Cho Planner) =====================


    /**
     * Khóa tiền cọc (balance → locked_balance)
     * Dùng khi Owner tạo planner hoặc Member accept invite
     */
    static async lockDeposit(userId, amount, plannerId, plannerName, dbTransaction) {
        try {
            const wallet = await Wallet.findOne({
                where: { user_id: userId },
                transaction: dbTransaction,
                lock: true
            });

            if (!wallet) throw new Error('Wallet not found. Vui lòng tạo ví trước.');
            if (parseFloat(wallet.balance) < amount) {
                throw new Error(`Số dư không đủ. Cần ${amount.toLocaleString('vi-VN')} VND, hiện có ${parseFloat(wallet.balance).toLocaleString('vi-VN')} VND. Vui lòng nạp thêm tiền.`);
            }

            // Chuyển từ balance sang locked_balance
            wallet.balance = parseFloat(wallet.balance) - amount;
            wallet.locked_balance = parseFloat(wallet.locked_balance) + amount;
            await wallet.save({ transaction: dbTransaction });

            // Ghi nhận giao dịch
            await Transaction.create({
                wallet_id: wallet.id,
                amount: amount,
                type: 'escrow_lock',
                status: 'completed',
                reference_type: 'planner',
                reference_id: plannerId,
                description: `Đặt cọc ${amount.toLocaleString('vi-VN')} VND cho kế hoạch: ${plannerName}`
            }, { transaction: dbTransaction });

            Logger.info(`Deposit locked: user=${userId}, amount=${amount}, planner=${plannerId}`);
            return wallet;
        } catch (error) {
            Logger.error('Lock deposit error:', error);
            throw error;
        }
    }

    /**
     * Hoàn trả cọc (locked_balance → balance)
     * Dùng khi planner completed, bị cancel, hoặc member bị kick
     */
    static async refundDeposit(userId, amount, plannerId, description, dbTransaction) {
        try {
            const wallet = await Wallet.findOne({
                where: { user_id: userId },
                transaction: dbTransaction,
                lock: true
            });

            if (!wallet) throw new Error('Wallet not found');

            wallet.locked_balance = parseFloat(wallet.locked_balance) - amount;
            wallet.balance = parseFloat(wallet.balance) + amount;
            await wallet.save({ transaction: dbTransaction });

            await Transaction.create({
                wallet_id: wallet.id,
                amount: amount,
                type: 'escrow_refund',
                status: 'completed',
                reference_type: 'planner',
                reference_id: plannerId,
                description: description
            }, { transaction: dbTransaction });

            Logger.info(`Deposit refunded: user=${userId}, amount=${amount}, planner=${plannerId}`);
            return wallet;
        } catch (error) {
            Logger.error('Refund deposit error:', error);
            throw error;
        }
    }

    /**
     * Áp dụng phạt khi member TỰ rời nhóm
     * - Trừ penalty từ locked_balance
     * - Hoàn phần còn lại về balance
     * - Tạo pending transaction cho Owner
     */
    static async applyPenalty(memberUserId, ownerUserId, depositAmount, penaltyPercentage, plannerId, plannerName, dbTransaction) {
        try {
            const penaltyAmount = depositAmount * (penaltyPercentage / 100);
            const refundAmount = depositAmount - penaltyAmount;

            // === Xử lý ví Member ===
            const memberWallet = await Wallet.findOne({
                where: { user_id: memberUserId },
                transaction: dbTransaction,
                lock: true
            });

            if (!memberWallet) throw new Error('Member wallet not found');

            // Trừ locked_balance toàn bộ deposit
            memberWallet.locked_balance = parseFloat(memberWallet.locked_balance) - depositAmount;
            // Hoàn phần còn lại (sau khi trừ phạt) về balance
            memberWallet.balance = parseFloat(memberWallet.balance) + refundAmount;
            await memberWallet.save({ transaction: dbTransaction });

            // Transaction: Phạt bị trừ cho member
            await Transaction.create({
                wallet_id: memberWallet.id,
                amount: penaltyAmount,
                type: 'penalty_applied',
                status: 'completed',
                reference_type: 'planner_penalty',
                reference_id: `${plannerId}:${memberUserId}`,
                description: `Phạt ${penaltyPercentage}% (${penaltyAmount.toLocaleString('vi-VN')} VND) vì tự rời kế hoạch: ${plannerName}`
            }, { transaction: dbTransaction });

            // Transaction: Hoàn phần còn lại cho member
            if (refundAmount > 0) {
                await Transaction.create({
                    wallet_id: memberWallet.id,
                    amount: refundAmount,
                    type: 'escrow_refund',
                    status: 'completed',
                    reference_type: 'planner',
                    reference_id: plannerId,
                    description: `Hoàn lại ${refundAmount.toLocaleString('vi-VN')} VND sau khi trừ phạt`
                }, { transaction: dbTransaction });
            }

            // === Ghi nhận tiền phạt PENDING cho Owner ===
            const ownerWallet = await this.getOrCreateWallet(ownerUserId, dbTransaction, true);

            // Transaction: penalty_received PENDING (chưa cộng tiền thật cho owner)
            const penaltyTxn = await Transaction.create({
                wallet_id: ownerWallet.id,
                amount: penaltyAmount,
                type: 'penalty_received',
                status: 'pending', // QUAN TRỌNG: PENDING cho đến khi chốt sổ anti-fraud
                reference_type: 'planner_penalty',
                reference_id: `${plannerId}:${memberUserId}`,
                description: `Tiền phạt từ thành viên rời nhóm (chờ xác minh chuyến đi): ${plannerName}`
            }, { transaction: dbTransaction });

            Logger.info(`Penalty applied: member=${memberUserId}, owner=${ownerUserId}, penalty=${penaltyAmount}, refund=${refundAmount}`);

            return { penaltyAmount, refundAmount, penaltyTransactionId: penaltyTxn.id };
        } catch (error) {
            Logger.error('Apply penalty error:', error);
            throw error;
        }
    }

    /**
     * Hoàn cọc khi bị KICK (100%, không phạt)
     */
    static async refundOnKick(userId, depositAmount, plannerId, plannerName, dbTransaction) {
        return this.refundDeposit(
            userId,
            depositAmount,
            plannerId,
            `Hoàn 100% cọc ${depositAmount.toLocaleString('vi-VN')} VND do bị đuổi khỏi nhóm: ${plannerName}`,
            dbTransaction
        );
    }
}

module.exports = WalletService;
