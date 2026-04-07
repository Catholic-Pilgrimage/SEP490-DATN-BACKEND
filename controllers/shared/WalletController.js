const WalletService = require('../../services/pilgrim/walletService');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

class WalletController {
    /**
     * GET /wallet - Xem thông tin ví
     */
    static async getWalletInfo(req, res) {
        try {
            const result = await WalletService.getWalletInfo(req.user.id);
            return ResponseUtil.success(res, result, req.__('wallet.get_wallet_success'));
        } catch (error) {
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /wallet/transactions - Lịch sử giao dịch
     */
    static async getTransactions(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await WalletService.getTransactions(req.user.id, req.query);
            return ResponseUtil.success(res, result, req.__('wallet.get_transactions_success'));
        } catch (error) {
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /wallet/topup - Tạo link nạp tiền qua PayOS
     */
    static async requestTopup(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const { amount } = req.body;
            const result = await WalletService.createTopup(req.user.id, amount);

            return ResponseUtil.created(res, result, req.__('wallet.topup_created'));
        } catch (error) {
            const businessErrorSnippets = ['at least', 'must not exceed', 'tối thiểu', 'tối đa', 'toi thieu', 'toi da'];
            if (businessErrorSnippets.some(snippet => error.message.includes(snippet))) {
                return ResponseUtil.badRequest(res, error.message);
            }

            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /wallet/withdraw - Rút tiền về tài khoản ngân hàng
     */
    static async requestWithdrawal(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const { amount, account_number, account_name, bank_code } = req.body;
            const result = await WalletService.requestWithdrawal(req.user.id, amount, {
                account_number,
                account_name,
                bank_code
            });

            return ResponseUtil.created(res, result, result.message);
        } catch (error) {
            const businessErrorSnippets = [
                'tối thiểu',
                'không đủ',
                'ngân hàng',
                'thất bại',
                'toi thieu',
                'khong du',
                'ngan hang',
                'that bai'
            ];

            if (businessErrorSnippets.some(snippet => error.message.includes(snippet))) {
                return ResponseUtil.badRequest(res, error.message);
            }

            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /wallet/banks - Lấy danh sách ngân hàng cho dropdown
     */
    static _bankCache = { data: null, fetchedAt: 0 };
    static async getBanks(req, res) {
        try {
            const ONE_DAY = 24 * 60 * 60 * 1000;
            if (WalletController._bankCache.data && Date.now() - WalletController._bankCache.fetchedAt < ONE_DAY) {
                return ResponseUtil.success(res, WalletController._bankCache.data, req.__('wallet.get_banks_success'));
            }

            const response = await fetch('https://api.vietqr.io/v2/banks');
            const result = await response.json();

            const banks = (result.data || []).filter(b => b.transferSupported).map(b => ({
                bin: b.bin,
                name: b.name,
                short_name: b.shortName,
                code: b.code,
                logo: b.logo
            }));

            WalletController._bankCache = { data: banks, fetchedAt: Date.now() };
            return ResponseUtil.success(res, banks, req.__('wallet.get_banks_success'));
        } catch (error) {
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /wallet/transactions/:id - Chi tiết giao dịch
     */
    static async getTransactionDetail(req, res) {
        try {
            const result = await WalletService.getTransactionDetail(req.user.id, req.params.id);
            return ResponseUtil.success(res, result, req.__('wallet.get_transactions_success'));
        } catch (error) {
            if (error.message === 'Transaction not found') {
                return ResponseUtil.notFound(res, req.__('wallet.transaction_not_found'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = WalletController;
