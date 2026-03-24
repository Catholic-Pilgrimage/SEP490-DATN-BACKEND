const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/shared/WalletController');
const WalletValidator = require('../validators/wallet.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const { handleValidationErrors } = require('../utils/validation.util');

// ===================== USER ENDPOINTS =====================

// Xem thông tin ví
router.get(
    '/',
    authMiddleware,
    WalletController.getWalletInfo
);

// Lịch sử giao dịch
router.get(
    '/transactions',
    authMiddleware,
    WalletValidator.getTransactions,
    handleValidationErrors,
    WalletController.getTransactions
);

// Chi tiết giao dịch
router.get(
    '/transactions/:id',
    authMiddleware,
    WalletValidator.getTransactionDetail,
    handleValidationErrors,
    WalletController.getTransactionDetail
);

// Rút tiền qua PayOS Chi (tự động chuyển)
router.post(
    '/withdraw',
    authMiddleware,
    WalletValidator.requestWithdrawal,
    WalletController.requestWithdrawal
);

// Danh sách ngân hàng (BIN code) - public, không cần auth
router.get(
    '/banks',
    WalletController.getBanks
);

module.exports = router;
