const { body } = require('express-validator');

exports.registerToken = [
    body('expo_token')
        .notEmpty()
        .withMessage('Expo token is required')
        .isString()
        .withMessage('Expo token must be a string')
        .matches(/^ExponentPushToken\[.+\]$/)
        .withMessage('Invalid Expo push token format'),

    body('platform')
        .optional()
        .isIn(['ios', 'android', 'web'])
        .withMessage('Platform must be ios, android, or web'),

    body('device_id')
        .optional()
        .isString()
        .withMessage('Device ID must be a string')
];
