const { PilgrimVerificationService } = require('../../services/pilgrim');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

/**
 * Guest: Submit verification request (no account needed)
 */
exports.createGuestRequest = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formattedErrors = formatValidationErrors(errors.array());
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
        }

        if (req.file) {
            req.body.certificate_url = req.file.path;
        }

        const result = await PilgrimVerificationService.createGuestRequest(req.body);

        return ResponseUtil.created(res, result, req.__('verification.guest_create_success'));
    } catch (error) {
        if (error.message === 'Email and name are required') {
            return ResponseUtil.badRequest(res, req.__('verification.email_name_required'));
        }
        if (error.message === 'Site name and province are required') {
            return ResponseUtil.badRequest(res, req.__('verification.site_info_required'));
        }
        if (error.message === 'Email already registered. Please login and submit verification request.') {
            return ResponseUtil.conflict(res, req.__('verification.email_already_registered'));
        }
        if (error.message === 'You already have a pending verification request with this email') {
            return ResponseUtil.conflict(res, req.__('verification.guest_already_pending'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

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

        const result = await PilgrimVerificationService.createRequest(req.user.id, req.body);

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
        const result = await PilgrimVerificationService.getMyRequest(req.user.id);

        if (!result) {
            return ResponseUtil.notFound(res, req.__('verification.not_found'));
        }

        return ResponseUtil.success(res, result, req.__('verification.get_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Guest/Pilgrim: Submit transition request to manage existing site
 */
exports.createTransitionRequest = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formattedErrors = formatValidationErrors(errors.array());
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
        }

        if (req.file) {
            req.body.certificate_url = req.file.path;
        }

        // Get user id if logged in (optional)
        const userId = req.user?.id || null;

        const result = await PilgrimVerificationService.createTransitionRequest(userId, req.body);

        const messageKey = result.claim_type === 'unassigned'
            ? 'verification.claim_success'
            : 'verification.transition_create_success';

        return ResponseUtil.created(res, result, req.__(messageKey));
    } catch (error) {
        if (error.message === 'existing_site_id is required') {
            return ResponseUtil.badRequest(res, req.__('verification.existing_site_required'));
        }
        if (error.message === 'Site not found or not active') {
            return ResponseUtil.notFound(res, req.__('site.not_found'));
        }
        if (error.message === 'This site does not have a manager. Use normal verification request instead.') {
            return ResponseUtil.badRequest(res, req.__('verification.site_no_manager'));
        }
        if (error.message === 'User not found') {
            return ResponseUtil.notFound(res, req.__('user.not_found'));
        }
        if (error.message === 'Only pilgrims can submit transition requests') {
            return ResponseUtil.forbidden(res, req.__('verification.only_pilgrim'));
        }
        if (error.message === 'You already have a pending verification request') {
            return ResponseUtil.conflict(res, req.__('verification.already_pending'));
        }
        if (error.message.includes('applicant_email and applicant_name are required')) {
            return ResponseUtil.badRequest(res, req.__('verification.guest_info_required'));
        }
        if (error.message === 'Email already registered. Please login first.') {
            return ResponseUtil.conflict(res, req.__('verification.email_already_registered'));
        }
        if (error.message === 'You already have a pending verification request with this email') {
            return ResponseUtil.conflict(res, req.__('verification.guest_already_pending'));
        }
        if (error.message === 'This site already has a pending transition request') {
            return ResponseUtil.conflict(res, req.__('verification.site_transition_pending'));
        }
        if (error.message === 'transition_reason is required') {
            return ResponseUtil.badRequest(res, req.__('verification.transition_reason_required'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
