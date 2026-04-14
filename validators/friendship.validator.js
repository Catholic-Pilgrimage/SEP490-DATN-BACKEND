const { body, param, query } = require('express-validator');

class FriendshipValidator {
    // Validate send friend request
    static sendFriendRequest = [
        body('addressee_id')
            .notEmpty().withMessage('ID người nhận không được để trống')
            .isUUID().withMessage('ID người nhận không hợp lệ')
    ];

    // Validate respond to friend request
    static respondToFriendRequest = [
        param('id')
            .isUUID().withMessage('ID lời mời không hợp lệ'),

        body('action')
            .notEmpty().withMessage('Hành động không được để trống')
            .isIn(['accept', 'reject']).withMessage('Hành động phải là accept hoặc reject')
    ];

    // Validate remove friend
    static removeFriend = [
        param('friendId')
            .isUUID().withMessage('ID bạn bè không hợp lệ')
    ];

    // Validate pagination + status filter
    static listPagination = [
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1-100'),

        query('status')
            .optional()
            .isIn(['accepted', 'pending']).withMessage('Status phải là accepted hoặc pending')
    ];

    // Validate search by email
    static searchByEmail = [
        query('email')
            .notEmpty().withMessage('Email không được để trống')
            .isEmail().withMessage('Email không hợp lệ')
            .normalizeEmail()
    ];
}

module.exports = FriendshipValidator;
