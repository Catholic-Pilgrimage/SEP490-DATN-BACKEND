const { Transaction, Wallet, User, Planner, PlannerMember } = require('../../models');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');
const Logger = require('../../utils/logger.util');

class AdminFinanceService {

    /**
     * GET /admin/dashboard/finance
     */
    static async getFinanceDashboard() {
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const [
                totalEscrowLocked,
                // penalty_applied đã bỏ khỏi đây — dùng penalty_received pending thay thế
                totalWithdrawnToday,
                totalTransactionsToday,
                failedPayoutsToday,
                totalWalletBalance,
                totalWithdrawFailed,
                activeEscrowPlanners
            ] = await Promise.all([
                // Tổng tiền escrow đang lock (locked - refunded)
                Transaction.sum('amount', {
                    where: { type: 'escrow_lock', status: 'completed' }
                }),
                // Tổng tiền rút hôm nay (thành công)
                Transaction.sum('amount', {
                    where: {
                        type: 'withdraw',
                        status: 'completed',
                        created_at: { [Op.between]: [todayStart, todayEnd] }
                    }
                }),


                Transaction.count({
                    where: {
                        created_at: { [Op.between]: [todayStart, todayEnd] }
                    }
                }),

                Transaction.count({
                    where: {
                        type: 'withdraw',
                        status: 'failed',
                        created_at: { [Op.between]: [todayStart, todayEnd] }
                    }
                }),

                Wallet.sum('balance'),

                Transaction.sum('amount', {
                    where: { type: 'withdraw', status: 'failed' }
                }),

                // Số planner đang giữ tiền escrow thực sự (net_locked > 0)
                // net = lock - refund - penalty_applied (giống công thức dashboard)
                sequelize.query(
                    `SELECT COUNT(*) as cnt FROM (
                        SELECT SPLIT_PART(reference_id, ':', 1) AS pid
                        FROM (
                            SELECT
                                CASE
                                  WHEN reference_type IN ('planner_deposit','planner_penalty')
                                  THEN SPLIT_PART(reference_id, ':', 1)
                                  ELSE reference_id
                                END AS pid,
                                type, amount
                            FROM transactions
                            WHERE reference_type IN ('planner_deposit','planner','planner_penalty')
                              AND type IN ('escrow_lock','escrow_refund','penalty_applied')
                              AND status = 'completed'
                        ) sub
                        GROUP BY pid
                        HAVING SUM(CASE WHEN type = 'escrow_lock'     THEN amount ELSE 0 END)
                             - SUM(CASE WHEN type = 'escrow_refund'   THEN amount ELSE 0 END)
                             - SUM(CASE WHEN type = 'penalty_applied' THEN amount ELSE 0 END) > 0
                    ) counted`,
                    { type: sequelize.QueryTypes.SELECT }
                ).then(rows => parseInt(rows[0]?.cnt || 0, 10)).catch(() => 0)
            ]);

            const totalPendingPayouts = parseFloat(
                await Transaction.sum('amount', { where: { type: 'penalty_received', status: 'pending' } }) || 0
            );
            const [totalEscrowRefunded, totalPenaltyApplied] = await Promise.all([
                Transaction.sum('amount', { where: { type: 'escrow_refund', status: 'completed' } }),
                Transaction.sum('amount', { where: { type: 'penalty_applied', status: 'completed' } })
            ]);

            const escrowLocked = parseFloat(totalEscrowLocked || 0);
            const escrowRefunded = parseFloat(totalEscrowRefunded || 0);
            const penApplied = parseFloat(totalPenaltyApplied || 0);

            return {
                total_escrow_locked: Math.max(0, escrowLocked - escrowRefunded - penApplied),
                total_pending_payouts: totalPendingPayouts,
                total_withdrawn_today: parseFloat(totalWithdrawnToday || 0),
                total_transactions_today: totalTransactionsToday,
                failed_payouts_today: failedPayoutsToday,
                total_wallet_balance: parseFloat(totalWalletBalance || 0),
                total_withdraw_failed: parseFloat(totalWithdrawFailed || 0),
                active_escrow_planners: activeEscrowPlanners
            };
        } catch (error) {
            Logger.error('Admin getFinanceDashboard error:', error);
            throw error;
        }
    }

    /**
     * GET /admin/wallet/transactions
     */
    static async getAllTransactions(filters = {}) {
        try {
            const limit = parseInt(filters.limit) || 20;
            const page = parseInt(filters.page) || 1;
            const offset = (page - 1) * limit;

            const where = {};

            if (filters.type) where.type = filters.type;
            if (filters.status) where.status = filters.status;
            if (filters.reference_type) where.reference_type = filters.reference_type;
            if (filters.planner_id) {
                where[Op.or] = [
                    { reference_type: 'planner', reference_id: filters.planner_id },
                    { reference_type: 'planner_deposit', reference_id: { [Op.like]: `${filters.planner_id}:%` } },
                    { reference_type: 'planner_penalty', reference_id: { [Op.like]: `${filters.planner_id}:%` } }
                ];
            }
            if (filters.date_from || filters.date_to) {
                where.created_at = {};
                if (filters.date_from) where.created_at[Op.gte] = new Date(filters.date_from);
                if (filters.date_to) where.created_at[Op.lte] = new Date(filters.date_to);
            }

            const include = [{
                model: Wallet,
                as: 'wallet',
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'full_name', 'email', 'avatar_url'],
                    ...(filters.search ? {
                        where: {
                            [Op.or]: [
                                { full_name: { [Op.iLike]: `%${filters.search}%` } },
                                { email: { [Op.iLike]: `%${filters.search}%` } }
                            ]
                        }
                    } : {})
                }]
            }];

            const { rows, count } = await Transaction.findAndCountAll({
                where,
                include,
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
            Logger.error('Admin getAllTransactions error:', error);
            throw error;
        }
    }

    /**
     * GET /admin/wallet/transactions/:id - Chi tiết giao dịch
     */
    static async getTransactionDetail(transactionId) {
        try {
            const transaction = await Transaction.findByPk(transactionId, {
                include: [{
                    model: Wallet,
                    as: 'wallet',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'full_name', 'email', 'avatar_url']
                    }]
                }]
            });

            if (!transaction) {
                throw new Error('Transaction not found');
            }

            const json = transaction.toJSON();
            let bankInfo = null;
            try {
                bankInfo = typeof json.bank_info === 'string'
                    ? JSON.parse(json.bank_info)
                    : (json.bank_info || null);
            } catch (_) { bankInfo = null; }

            return {
                ...json,
                amount: parseFloat(json.amount),
                bank_info: bankInfo
            };
        } catch (error) {
            Logger.error('Admin getTransactionDetail error:', error);
            throw error;
        }
    }

    /**
     * GET /admin/wallet/escrow
     */
    static async getEscrowSummary(filters = {}) {
        try {
            const limit = parseInt(filters.limit) || 20;
            const page = parseInt(filters.page) || 1;
            const offset = (page - 1) * limit;



            const escrowGroupsRaw = await sequelize.query(
                `SELECT pid AS planner_id,
                        SUM(CASE WHEN type = 'escrow_lock'     THEN amount ELSE 0 END) AS total_locked,
                        SUM(CASE WHEN type = 'escrow_refund'   THEN amount ELSE 0 END) AS total_refunded,
                        SUM(CASE WHEN type = 'penalty_applied' THEN amount ELSE 0 END) AS total_penalty
                 FROM (
                     SELECT
                         CASE
                           WHEN reference_type = 'planner_deposit' OR reference_type = 'planner_penalty'
                           THEN SPLIT_PART(reference_id, ':', 1)
                           ELSE reference_id
                         END AS pid,
                         type, amount
                     FROM transactions
                     WHERE (reference_type IN ('planner_deposit', 'planner', 'planner_penalty'))
                       AND type IN ('escrow_lock', 'escrow_refund', 'penalty_applied')
                       AND status = 'completed'
                 ) sub
                 GROUP BY pid
                 HAVING SUM(CASE WHEN type = 'escrow_lock'     THEN amount ELSE 0 END)
                      - SUM(CASE WHEN type = 'escrow_refund'   THEN amount ELSE 0 END)
                      - SUM(CASE WHEN type = 'penalty_applied' THEN amount ELSE 0 END) > 0
                 ORDER BY total_locked DESC
                 LIMIT :limit OFFSET :offset`,
                { replacements: { limit, offset }, type: sequelize.QueryTypes.SELECT }
            );
            const escrowGroups = escrowGroupsRaw.map(r => ({
                reference_id: r.planner_id,
                total_locked: parseFloat(r.total_locked || 0),
                total_refunded: parseFloat(r.total_refunded || 0),
                total_penalty: parseFloat(r.total_penalty || 0)
            }));

            const plannerIds = escrowGroups.map(r => r.reference_id);
            if (plannerIds.length === 0) return { escrow: [], total: 0, totalPages: 0, currentPage: page };

            const penaltyGroupsRaw = await sequelize.query(
                `SELECT SPLIT_PART(reference_id, ':', 1) AS planner_id,
                        SUM(amount) AS penalty_pending
                 FROM transactions
                 WHERE reference_type = 'planner_penalty'
                   AND type = 'penalty_received'
                   AND status = 'pending'
                   AND SPLIT_PART(reference_id, ':', 1) IN (:plannerIds)
                 GROUP BY SPLIT_PART(reference_id, ':', 1)`,
                { replacements: { plannerIds }, type: sequelize.QueryTypes.SELECT }
            ).catch(() => []);

            const penaltyMap = {};
            penaltyGroupsRaw.forEach(r => {
                penaltyMap[r.planner_id] = parseFloat(r.penalty_pending || 0);
            });

            // Lấy thông tin planner + owner
            const planners = await Planner.findAll({
                where: { id: { [Op.in]: plannerIds } },
                include: [{
                    model: User,
                    as: 'owner',
                    attributes: ['id', 'full_name', 'email', 'avatar_url']
                }],
                attributes: ['id', 'name', 'status', 'start_date', 'end_date', 'deposit_amount', 'created_at']
            });

            const plannerMap = {};
            planners.forEach(p => { plannerMap[p.id] = p.toJSON(); });

            // Member count per planner — dùng join_status = 'joined' (không có cột id hay status)
            const memberCounts = await PlannerMember.findAll({
                attributes: [
                    'planner_id',
                    [sequelize.fn('COUNT', sequelize.col('user_id')), 'member_count']
                ],
                where: { planner_id: { [Op.in]: plannerIds }, join_status: 'joined' },
                group: ['planner_id'],
                raw: true
            });
            const memberCountMap = {};
            memberCounts.forEach(r => { memberCountMap[r.planner_id] = parseInt(r.member_count || 0); });

            const escrow = escrowGroups.map(r => {
                const pid = r.reference_id;
                const locked = r.total_locked;
                const refunded = r.total_refunded;
                const penApplied = r.total_penalty;
                const planner = plannerMap[pid] || {};
                return {
                    planner_id: pid,
                    planner_name: planner.name || null,
                    status: planner.status || null,
                    start_date: planner.start_date || null,
                    end_date: planner.end_date || null,
                    owner: planner.owner || null,
                    deposit_amount: planner.deposit_amount || 0,
                    member_count: memberCountMap[pid] || 0,
                    total_locked: locked,
                    net_locked: Math.max(0, locked - refunded - penApplied),
                    penalty_pending: penaltyMap[pid] || 0
                };
            });

            const totalCountRaw = await sequelize.query(
                `SELECT COUNT(*) as cnt FROM (
                    SELECT SPLIT_PART(reference_id, ':', 1) AS pid
                    FROM (
                        SELECT
                            CASE
                              WHEN reference_type = 'planner_deposit' OR reference_type = 'planner_penalty'
                              THEN SPLIT_PART(reference_id, ':', 1)
                              ELSE reference_id
                            END AS pid,
                            type, amount
                        FROM transactions
                        WHERE (reference_type IN ('planner_deposit', 'planner', 'planner_penalty'))
                          AND type IN ('escrow_lock', 'escrow_refund', 'penalty_applied')
                          AND status = 'completed'
                    ) sub
                    GROUP BY pid
                    HAVING SUM(CASE WHEN type = 'escrow_lock'     THEN amount ELSE 0 END)
                         - SUM(CASE WHEN type = 'escrow_refund'   THEN amount ELSE 0 END)
                         - SUM(CASE WHEN type = 'penalty_applied' THEN amount ELSE 0 END) > 0
                ) counted`,
                { type: sequelize.QueryTypes.SELECT }
            ).catch(() => [{ cnt: 0 }]);
            const totalCount = parseInt(totalCountRaw[0]?.cnt || 0, 10);

            return {
                escrow,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                currentPage: page
            };
        } catch (error) {
            Logger.error('Admin getEscrowSummary error:', error);
            throw error;
        }
    }

    /**
     * GET /admin/wallet/withdrawals
     */
    static async getWithdrawals(filters = {}) {
        try {
            const limit = parseInt(filters.limit) || 20;
            const page = parseInt(filters.page) || 1;
            const offset = (page - 1) * limit;

            const where = { type: 'withdraw' };
            if (filters.status) where.status = filters.status;
            if (filters.date_from || filters.date_to) {
                where.created_at = {};
                if (filters.date_from) where.created_at[Op.gte] = new Date(filters.date_from);
                if (filters.date_to) where.created_at[Op.lte] = new Date(filters.date_to);
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

            const withdrawals = rows.map(t => {
                const json = t.toJSON();
                let bankInfo = null;
                try {
                    bankInfo = typeof json.bank_info === 'string'
                        ? JSON.parse(json.bank_info)
                        : (json.bank_info || null);
                } catch (_) { bankInfo = null; }
                return {
                    id: json.id,
                    amount: json.amount,
                    status: json.status,
                    reference_id: json.reference_id,
                    description: json.description,
                    bank_info: bankInfo,         // { account_number, account_name, bank_code }
                    error_message: json.status === 'failed' ? json.description : null,
                    created_at: json.created_at,
                    updated_at: json.updated_at,
                    user: json.wallet?.user || null
                };
            });

            return {
                withdrawals,
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            };
        } catch (error) {
            Logger.error('Admin getWithdrawals error:', error);
            throw error;
        }
    }
}

module.exports = AdminFinanceService;
