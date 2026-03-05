const { adminUserService } = require('../../services/admin');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

// Get list of users
exports.getUsers = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formattedErrors = formatValidationErrors(errors.array());
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
        }

        const { page, limit, role, status, search } = req.query;
        
        const result = await adminUserService.getUsers({
            page,
            limit,
            role,
            status,
            search
        });

        return ResponseUtil.success(res, result, req.__('admin.get_users_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Get user details by ID
exports.getUserById = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formattedErrors = formatValidationErrors(errors.array());
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
        }

        const { id } = req.params;
        const result = await adminUserService.getUserById(id);
        
        if (!result) {
            return ResponseUtil.notFound(res, req.__('admin.user_not_found'));
        }

        return ResponseUtil.success(res, result, req.__('admin.get_user_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Update user status (block/unblock)
exports.updateUserStatus = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formattedErrors = formatValidationErrors(errors.array());
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
        }

        const { id } = req.params;
        const { status } = req.body;

        const result = await adminUserService.updateUserStatus(id, status);
        
        if (!result) {
            return ResponseUtil.notFound(res, req.__('admin.user_not_found'));
        }

        const message = status === 'banned' 
            ? req.__('admin.user_blocked') 
            : req.__('admin.user_unblocked');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Cannot change admin status') {
            return ResponseUtil.forbidden(res, req.__('admin.cannot_change_admin_status'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// Update user information (including role)
exports.updateUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formattedErrors = formatValidationErrors(errors.array());
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
        }

        const { id } = req.params;
        const result = await adminUserService.updateUser(id, req.body);
        
        if (!result) {
            return ResponseUtil.notFound(res, req.__('admin.user_not_found'));
        }

        return ResponseUtil.success(res, result, req.__('admin.user_updated'));
    } catch (error) {
        if (error.message === 'Cannot update admin info') {
            return ResponseUtil.forbidden(res, req.__('admin.cannot_change_admin_role'));
        }
        if (error.message === 'Cannot change user role') {
            return ResponseUtil.badRequest(res, req.__('admin.cannot_change_role'));
        }
        if (error.message === 'Cannot change user site') {
            return ResponseUtil.badRequest(res, req.__('admin.cannot_change_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
