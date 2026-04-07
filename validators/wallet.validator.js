const { body, query, param } = require('express-validator');

const WalletValidator = {
    // GET /wallet/transactions/:id
    getTransactionDetail: [
        param('id')
            .isUUID()
            .withMessage('Định dạng mã giao dịch không hợp lệ')
    ],

    // GET /wallet/transactions
    getTransactions: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Số trang phải là số nguyên dương'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Giới hạn phải nằm trong khoảng từ 1 đến 100'),
        query('type')
            .optional()
            .isIn(['topup', 'withdraw', 'escrow_lock', 'escrow_refund', 'penalty_applied', 'penalty_received', 'penalty_refunded'])
            .withMessage('Loại giao dịch không hợp lệ'),
        query('status')
            .optional()
            .isIn(['pending', 'completed', 'failed', 'cancelled'])
            .withMessage('Trạng thái giao dịch không hợp lệ')
    ],

    // POST /wallet/topup
    requestTopup: [
        body('amount')
            .notEmpty()
            .withMessage('Số tiền là bắt buộc')
            .isFloat({ min: 2000, max: 50000000 })
            .withMessage('Số tiền phải từ 2,000 đến 50,000,000 VND')
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
            .withMessage('Số tài khoản phải từ 5 đến 30 ký tự'),
        body('account_name')
            .notEmpty()
            .withMessage('Tên chủ tài khoản là bắt buộc')
            .isString()
            .withMessage('Tên chủ tài khoản phải là chuỗi')
            .isLength({ min: 2, max: 100 })
            .withMessage('Tên chủ tài khoản phải từ 2 đến 100 ký tự'),
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
