const VerificationService = require('../services/verificationService');
const ResponseUtil = require('../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../utils/validation.util');

/**
 * Pilgrim: Submit verification request
 */


exports.createRequest = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formattedErrors = formatValidationErrors(errors.array());
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
        }


        if (req.file) {
            req.body.certificate_url = req.file.path;
        }

        const result = await VerificationService.createRequest(req.user.id, req.body);

        return ResponseUtil.created(res, result, req.__('verification.create_success'));
    } catch (error) {
        if (error.message === 'User not found') {
            return ResponseUtil.notFound(res, req.__('user.not_found'));
        }
        if (error.message === 'Only pilgrims can submit verification requests') {
            return ResponseUtil.forbidden(res, req.__('verification.only_pilgrim'));
        }
        if (error.message === 'You already have a pending verification request') {
            return ResponseUtil.conflict(res, req.__('verification.already_pending'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Pilgrim: Get my verification request
 */
exports.getMyRequest = async (req, res) => {
    try {
        const result = await VerificationService.getMyRequest(req.user.id);

        if (!result) {
            return ResponseUtil.notFound(res, req.__('verification.not_found'));
        }

        return ResponseUtil.success(res, result, req.__('verification.get_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Admin: Get all verification requests
 */
exports.getRequests = async (req, res) => {
    try {
        const { page, limit, status, search } = req.query;

        const result = await VerificationService.getRequests({
            page,
            limit,
            status,
            search
        });

        return ResponseUtil.success(res, result, req.__('verification.list_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Admin: Get verification request by ID
 */
exports.getRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await VerificationService.getRequestById(id);

        return ResponseUtil.success(res, result, req.__('verification.get_success'));
    } catch (error) {
        if (error.message === 'Verification request not found') {
            return ResponseUtil.notFound(res, req.__('verification.not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Admin: Update verification request status (approve/reject)
 * RESTful: PATCH /api/admin/verification-requests/:id
 */
exports.updateStatus = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formattedErrors = formatValidationErrors(errors.array());
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
        }

        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        let result;
        if (status === 'approved') {
            result = await VerificationService.approveRequest(id, req.user.id);
            return ResponseUtil.success(res, result, req.__('verification.approve_success'));
        } else if (status === 'rejected') {
            result = await VerificationService.rejectRequest(id, req.user.id, rejection_reason);
            return ResponseUtil.success(res, result, req.__('verification.reject_success'));
        }
    } catch (error) {
        if (error.message === 'Verification request not found') {
            return ResponseUtil.notFound(res, req.__('verification.not_found'));
        }
        if (error.message === 'Request is not pending') {
            return ResponseUtil.badRequest(res, req.__('verification.not_pending'));
        }
        if (error.message === 'Rejection reason is required') {
            return ResponseUtil.badRequest(res, req.__('verification.rejection_reason_required'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
