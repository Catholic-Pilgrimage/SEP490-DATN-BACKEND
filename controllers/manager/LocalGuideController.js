const ManagerLocalGuideService = require('../../services/manager/localGuideService');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');


/**
 * Manager: Create Local Guide
 */
exports.createLocalGuide = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formattedErrors = formatValidationErrors(errors.array());
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
        }

        const result = await ManagerLocalGuideService.createLocalGuide(req.user.id, req.body);

        return ResponseUtil.created(res, result, req.__('local_guide.create_success'));
    } catch (error) {
        if (error.message === 'Manager not found') {
            return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
        }
        if (error.message === 'Only managers can create local guides') {
            return ResponseUtil.forbidden(res, req.__('local_guide.only_manager'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager_site.no_site'));
        }
        if (error.message === 'Email already exists') {
            return ResponseUtil.conflict(res, req.__('auth.email_already_registered'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Get all Local Guides
 */
exports.getLocalGuides = async (req, res) => {
    try {
        const { page, limit, status, search } = req.query;
        const result = await ManagerLocalGuideService.getLocalGuides(req.user.id, {
            page, limit, status, search
        });

        return ResponseUtil.success(res, result, req.__('local_guide.list_success'));
    } catch (error) {
        if (error.message === 'Manager not found') {
            return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager_site.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Update Local Guide Status (block/unblock)
 */
exports.updateLocalGuideStatus = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const formattedErrors = formatValidationErrors(errors.array());
            return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
        }

        const { status } = req.body;
        const result = await ManagerLocalGuideService.updateLocalGuideStatus(req.user.id, req.params.id, status);

        const message = status === 'banned'
            ? req.__('local_guide.block_success')
            : req.__('local_guide.unblock_success');

        return ResponseUtil.success(res, result, message);
    } catch (error) {
        if (error.message === 'Manager not found') {
            return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager_site.no_site'));
        }
        if (error.message === 'Local Guide not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.not_found'));
        }
        if (error.message === 'Invalid status') {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_status'));
        }
        if (error.message.includes('already')) {
            return ResponseUtil.badRequest(res, error.message);
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// ===================== SHIFT SUBMISSIONS =====================

/**
 * Manager: Get Site Submissions
 */
exports.getSubmissions = async (req, res) => {
    try {
        const { page, limit, guide_id, status, week_start_date } = req.query;
        const result = await ManagerLocalGuideService.getSubmissions(req.user.id, {
            page, limit, guide_id, status, week_start_date
        });
        return ResponseUtil.success(res, result, req.__('manager.get_submissions_success'));
    } catch (error) {
        if (error.message === 'Manager not found') {
            return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
        }
        if (error.message === 'Manager has no site') {
            return ResponseUtil.badRequest(res, req.__('manager_site.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Get Submission Detail
 */
exports.getSubmissionDetail = async (req, res) => {
    try {
        const result = await ManagerLocalGuideService.getSubmissionDetail(req.user.id, req.params.id);
        return ResponseUtil.success(res, result);
    } catch (error) {
        if (error.message === 'Manager not found') {
            return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
        }
        if (error.message === 'Submission not found') {
            return ResponseUtil.notFound(res, req.__('manager.submission_not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Manager: Update Submission Status (approve/reject)
 */
exports.updateSubmissionStatus = async (req, res) => {
    try {
        const result = await ManagerLocalGuideService.updateSubmissionStatus(
            req.user.id,
            req.params.id,
            req.body
        );
        return ResponseUtil.success(res, result, req.__('manager.update_submission_status_success'));
    } catch (error) {
        if (error.message === 'Manager not found') {
            return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
        }
        if (error.message === 'Submission not found') {
            return ResponseUtil.notFound(res, req.__('manager.submission_not_found'));
        }
        if (error.message.includes('already')) {
            return ResponseUtil.badRequest(res, error.message);
        }
        if (error.message.includes('Rejection reason is required')) {
            return ResponseUtil.badRequest(res, req.__('manager.rejection_reason_required'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
