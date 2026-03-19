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
            return ResponseUtil.success(res, result, 'Lấy thông tin ví thành công');
        } catch (error) {
            return ResponseUtil.error(res, 'Lỗi khi lấy thông tin ví');
        }
    }

    /**
     * GET /wallet/transactions - Lịch sử giao dịch
     */
    static async getTransactions(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, 'Dữ liệu không hợp lệ', formatValidationErrors(errors.array()));
            }

            const result = await WalletService.getTransactions(req.user.id, req.query);
            return ResponseUtil.success(res, result, 'Lấy lịch sử giao dịch thành công');
        } catch (error) {
            return ResponseUtil.error(res, 'Lỗi khi lấy lịch sử giao dịch');
        }
    }

    /**
     * POST /wallet/withdraw - Rút tiền qua PayOS Chi (tự động)
     */
    static async requestWithdrawal(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, 'Dữ liệu không hợp lệ', formatValidationErrors(errors.array()));
            }

            const { amount, account_number, account_name, bank_code } = req.body;
            const result = await WalletService.requestWithdrawal(req.user.id, amount, {
                account_number,
                account_name,
                bank_code
            });

            return ResponseUtil.created(res, result, result.message);
        } catch (error) {
            if (error.message.includes('tối thiểu') || error.message.includes('không đủ') || error.message.includes('ngân hàng') || error.message.includes('thất bại')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            return ResponseUtil.error(res, 'Lỗi khi rút tiền');
        }
    }

    /**
     * GET /wallet/banks - Lấy danh sách ngân hàng (BIN code) cho FE dropdown
     */
    static _bankCache = { data: null, fetchedAt: 0 };
    static async getBanks(req, res) {
        try {
            const ONE_DAY = 24 * 60 * 60 * 1000;
            // Cache 24h
            if (WalletController._bankCache.data && Date.now() - WalletController._bankCache.fetchedAt < ONE_DAY) {
                return ResponseUtil.success(res, WalletController._bankCache.data, 'Lấy danh sách ngân hàng thành công');
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
            return ResponseUtil.success(res, banks, 'Lấy danh sách ngân hàng thành công');
        } catch (error) {
            return ResponseUtil.error(res, 'Lỗi khi lấy danh sách ngân hàng');
        }
    }
}

module.exports = WalletController;
