const LocalGuideService = require('../../services/localGuide');
const ResponseUtil = require('../../utils/response.util');

/**
 * Local Guide: Create Shift Submission
 * POST /api/local-guide/shift-submissions
 */
exports.createSubmission = async (req, res) => {
    try {
        const result = await LocalGuideService.createSubmission(req.user.id, req.body);

        if (result.errors && result.errors.length > 0) {
            return ResponseUtil.success(res, result, req.__('local_guide.create_submission_partial'));
        }

        return ResponseUtil.created(res, result, req.__('local_guide.create_submission_success'));
    } catch (error) {
        if (error.message === 'Local Guide not assigned to any site') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_site'));
        }
        if (error.message.includes('pending submission')) {
            return ResponseUtil.badRequest(res, req.__('local_guide.pending_submission_exists'));
        }
        if (error.message.includes('Change reason is required')) {
            return ResponseUtil.badRequest(res, req.__('local_guide.change_reason_required'));
        }
        if (error.message === 'No valid shifts provided') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_valid_shifts'));
        }
        if (error.message.includes('already have an approved schedule')) {
            return ResponseUtil.badRequest(res, req.__('local_guide.approved_submission_exists'));
        }
        if (error.message.includes('Shift conflicts detected') || error.message.includes('overlaps with another Local Guide')) {
            let conflictDetails = null;
            try {
                const jsonMatch = error.message.match(/\[.*\]/);
                if (jsonMatch) {
                    conflictDetails = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                // If parsing fails, just use the raw message
            }

            return ResponseUtil.conflict(res, req.__('local_guide.shift_conflict'), conflictDetails);
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Get My Submissions
 * GET /api/local-guide/shift-submissions
 */
exports.getSubmissions = async (req, res) => {
    try {
        const { status, week_start_date } = req.query;
        const result = await LocalGuideService.getMySubmissions(req.user.id, {
            status,
            week_start_date
        });
        return ResponseUtil.success(res, result, req.__('local_guide.get_submissions_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Get Submission Detail
 * GET /api/local-guide/shift-submissions/:id
 */
exports.getSubmissionDetail = async (req, res) => {
    try {
        const result = await LocalGuideService.getSubmissionDetail(req.user.id, req.params.id);
        return ResponseUtil.success(res, result);
    } catch (error) {
        if (error.message === 'Submission not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.submission_not_found'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Update Submission (pending/rejected only)
 * PUT /api/local-guide/shift-submissions/:id
 */
exports.updateSubmission = async (req, res) => {
    try {
        const result = await LocalGuideService.updateSubmission(req.user.id, req.params.id, req.body);
        return ResponseUtil.success(res, result, req.__('local_guide.update_submission_success'));
    } catch (error) {
        if (error.message === 'Submission not found or already approved') {
            return ResponseUtil.notFound(res, req.__('local_guide.submission_not_found_or_approved'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Delete Submission (pending only)
 * DELETE /api/local-guide/shift-submissions/:id
 */
exports.deleteSubmission = async (req, res) => {
    try {
        const result = await LocalGuideService.deleteSubmission(req.user.id, req.params.id);
        return ResponseUtil.success(res, result, req.__('local_guide.delete_submission_success'));
    } catch (error) {
        if (error.message === 'Submission not found or not pending') {
            return ResponseUtil.notFound(res, req.__('local_guide.submission_not_found_or_not_pending'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Get Site Schedule (calendar view)
 * GET /api/local-guide/site-schedule
 */
exports.getSiteSchedule = async (req, res) => {
    try {
        const { week_start_date } = req.query;

        if (!week_start_date) {
            return ResponseUtil.badRequest(res, req.__('local_guide.week_start_date_required'));
        }

        const result = await LocalGuideService.getSiteSchedule(req.user.id, week_start_date);
        return ResponseUtil.success(res, result, req.__('local_guide.get_site_schedule_success'));
    } catch (error) {
        if (error.message === 'Local Guide not assigned to any site') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
