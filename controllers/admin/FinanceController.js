const AdminFinanceService = require('../../services/admin/financeService');
const ResponseUtil = require('../../utils/response.util');
const Logger = require('../../utils/logger.util');

/**
 * GET /api/admin/dashboard/finance
 */
exports.getFinanceDashboard = async (req, res) => {
    try {
        const data = await AdminFinanceService.getFinanceDashboard();
        return ResponseUtil.success(res, data, req.__('admin.finance_dashboard_success'));
    } catch (error) {
        Logger.error('Admin getFinanceDashboard controller error:', error);
        return ResponseUtil.error(res, req.__('admin.finance_error'));
    }
};

/**
 * GET /api/admin/wallet/transactions
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const data = await AdminFinanceService.getAllTransactions(req.query);
        return ResponseUtil.success(res, data, req.__('admin.get_transactions_success'));
    } catch (error) {
        Logger.error('Admin getAllTransactions controller error:', error);
        return ResponseUtil.error(res, req.__('admin.finance_error'));
    }
};

/**
 * GET /api/admin/wallet/escrow
 */
exports.getEscrowSummary = async (req, res) => {
    try {
        const data = await AdminFinanceService.getEscrowSummary(req.query);
        return ResponseUtil.success(res, data, req.__('admin.get_escrow_success'));
    } catch (error) {
        Logger.error('Admin getEscrowSummary controller error:', error);
        return ResponseUtil.error(res, req.__('admin.finance_error'));
    }
};

/**
 * GET /api/admin/wallet/withdrawals
 */
exports.getWithdrawals = async (req, res) => {
    try {
        const data = await AdminFinanceService.getWithdrawals(req.query);
        return ResponseUtil.success(res, data, req.__('admin.get_withdrawals_success'));
    } catch (error) {
        Logger.error('Admin getWithdrawals controller error:', error);
        return ResponseUtil.error(res, req.__('admin.finance_error'));
    }
};

/**
 * GET /api/admin/wallet/transactions/:id
 */
exports.getTransactionDetail = async (req, res) => {
    try {
        const data = await AdminFinanceService.getTransactionDetail(req.params.id);
        return ResponseUtil.success(res, data, req.__('admin.get_transactions_success'));
    } catch (error) {
        if (error.message === 'Transaction not found') {
            return ResponseUtil.notFound(res, req.__('wallet.transaction_not_found'));
        }
        Logger.error('Admin getTransactionDetail controller error:', error);
        return ResponseUtil.error(res, req.__('admin.finance_error'));
    }
};
