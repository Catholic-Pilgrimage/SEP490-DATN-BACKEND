const { body, query } = require('express-validator');

const WalletValidator = {
    // GET /wallet/transactions
    getTransactions: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        query('type')
            .optional()
            .isIn(['withdraw', 'escrow_lock', 'escrow_refund', 'penalty_applied', 'penalty_received', 'penalty_refunded'])
            .withMessage('Invalid transaction type'),
        query('status')
            .optional()
            .isIn(['pending', 'completed', 'failed', 'cancelled'])
            .withMessage('Invalid status')
    ],

    // POST /wallet/withdraw
    requestWithdrawal: [
        body('amount')
            .notEmpty()
            .withMessage('Số tiền là bắt buộc')
            .isFloat({ min: 2000, max: 50000000 })
            .withMessage('Số tiền phải từ 2,000 đến 50,000,000 VND'),
        body('account_number')
            .notEmpty()
            .withMessage('Số tài khoản là bắt buộc')
            .isString()
            .withMessage('Số tài khoản phải là chuỗi')
            .isLength({ min: 5, max: 30 })
            .withMessage('Số tài khoản phải từ 5-30 ký tự'),
        body('account_name')
            .notEmpty()
            .withMessage('Tên chủ tài khoản là bắt buộc')
            .isString()
            .withMessage('Tên phải là chuỗi')
            .isLength({ min: 2, max: 100 })
            .withMessage('Tên phải từ 2-100 ký tự'),
        body('bank_code')
            .notEmpty()
            .withMessage('Mã ngân hàng là bắt buộc')
            .isString()
            .withMessage('Mã ngân hàng phải là chuỗi')
            .isLength({ min: 2, max: 20 })
            .withMessage('Mã ngân hàng không hợp lệ')
    ]
};

module.exports = WalletValidator;
