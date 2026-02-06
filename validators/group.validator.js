const { body, param } = require('express-validator');

const groupValidator = {
    /**
     * Validation for creating a group
     */
    createGroup: [
        body('name')
            .trim()
            .notEmpty()
            .withMessage('Group name is required')
            .isLength({ min: 1, max: 255 })
            .withMessage('Group name must be between 1 and 255 characters'),

        body('description')
            .optional()
            .trim(),

        body('privacy')
            .optional()
            .isIn(['public', 'private'])
            .withMessage('Privacy must be either public or private')
    ],

    /**
     * Validation for updating a group
     */
    updateGroup: [
        param('id')
            .isUUID()
            .withMessage('Invalid group ID'),

        body('name')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Group name cannot be empty')
            .isLength({ min: 1, max: 255 })
            .withMessage('Group name must be between 1 and 255 characters'),

        body('description')
            .optional()
            .trim(),

        body('privacy')
            .optional()
            .isIn(['public', 'private'])
            .withMessage('Privacy must be either public or private')
    ],

    /**
     * Validation for inviting a member
     */
    inviteMember: [
        param('id')
            .isUUID()
            .withMessage('Invalid group ID'),

        body('email')
            .trim()
            .notEmpty()
            .withMessage('Email is required')
            .isEmail()
            .withMessage('Invalid email address'),

        body('role')
            .optional()
            .isIn(['admin', 'member'])
            .withMessage('Role must be either admin or member')
    ],

    /**
     * Validation for group ID parameter
     */
    groupId: [
        param('id')
            .isUUID()
            .withMessage('Invalid group ID')
    ],

    /**
     * Validation for invitation token and action
     */
    respondToInvitation: [
        param('token')
            .trim()
            .notEmpty()
            .withMessage('Invalid invitation token'),

        body('action')
            .trim()
            .notEmpty()
            .withMessage('Action is required')
            .isIn(['accept', 'reject'])
            .withMessage('Action must be either accept or reject')
    ],

    /**
     * Validation for removing member
     */
    removeMember: [
        param('id')
            .isUUID()
            .withMessage('Invalid group ID'),

        param('userId')
            .isUUID()
            .withMessage('Invalid user ID')
    ],

    /**
     * Validation for requesting to join a group
     */
    requestToJoin: [
        param('id')
            .isUUID()
            .withMessage('Invalid group ID'),

        body('message')
            .optional()
            .trim()
    ],

    /**
     * Validation for responding to join request (approve/reject)
     */
    respondToJoinRequest: [
        param('id')
            .isUUID()
            .withMessage('Invalid group ID'),

        param('requestId')
            .isUUID()
            .withMessage('Invalid request ID'),

        body('action')
            .trim()
            .notEmpty()
            .withMessage('Action is required')
            .isIn(['approve', 'reject'])
            .withMessage('Action must be either approve or reject')
    ]
};

module.exports = groupValidator;
