const JournalService = require('../services/journalService');
const ResponseUtil = require('../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../utils/validation.util');

class JournalController {
    /**
     * POST /journals - Create a new journal
     */
    static async createJournal(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const imageFiles = req.files?.images || [];
            const audioFile = req.files?.audio ? req.files.audio[0] : null;
            const videoFile = req.files?.video ? req.files.video[0] : null;

            const result = await JournalService.createJournal(
                req.user.id,
                req.body,
                imageFiles,
                audioFile,
                videoFile
            );

            return ResponseUtil.created(res, result, req.__('journal.create_success'));
        } catch (error) {
            if (error.message === 'Title and content are required') {
                return ResponseUtil.badRequest(res, req.__('journal.title_content_required'));
            }
            if (error.message === 'Maximum 10 images allowed') {
                return ResponseUtil.badRequest(res, req.__('journal.max_images'));
            }
            if (error.message.includes('Planner item ID is required')) {
                return ResponseUtil.badRequest(res, req.__('journal.planner_item_required'));
            }
            if (error.message.includes('You must check-in at this location')) {
                return ResponseUtil.badRequest(res, req.__('journal.checkin_required'));
            }
            if (error.message.includes('This planner item is not associated with a site')) {
                return ResponseUtil.badRequest(res, req.__('journal.site_not_associated'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /journals/me - Get user's own journals
     */
    static async getUserJournals(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await JournalService.getUserJournals(req.user.id, req.query);
            return ResponseUtil.success(res, result, req.__('journal.list_success'));
        } catch (error) {
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /journals/public - Get public journals
     */
    static async getPublicJournals(req, res) {
        try {
            const result = await JournalService.getPublicJournals(req.query);
            return ResponseUtil.success(res, result, req.__('journal.list_success'));
        } catch (error) {
            // As per instruction, return success with an empty array on error
            return ResponseUtil.success(res, [], req.__('journal.list_success'));
        }
    }

    /**
     * POST /journals/:id/share - Share journal to community
     */
    static async shareToPost(req, res) {
        try {
            const journalId = req.params.id;
            const userId = req.user.id;

            const result = await JournalService.shareJournalToPost(journalId, userId);

            return ResponseUtil.created(res, result, req.__('journal.share_success') || 'Shared to community successfully');
        } catch (error) {
            if (error.message === 'Journal not found') {
                return ResponseUtil.notFound(res, req.__('journal.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('journal.forbidden'));
            }
            if (error.message === 'This journal has already been shared to the community') {
                return ResponseUtil.badRequest(res, error.message);
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /journals/:id - Get journal by ID
     */
    static async getJournalById(req, res) {
        try {
            const userId = req.user ? req.user.id : null;
            const result = await JournalService.getJournalById(req.params.id, userId);
            return ResponseUtil.success(res, result, req.__('journal.get_success'));
        } catch (error) {
            if (error.message === 'Journal not found') {
                return ResponseUtil.notFound(res, req.__('journal.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('journal.forbidden'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * PATCH /journals/:id - Update journal
     */
    static async updateJournal(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const imageFiles = req.files?.images || [];
            const audioFile = req.files?.audio ? req.files.audio[0] : null;
            const videoFile = req.files?.video ? req.files.video[0] : null;

            const result = await JournalService.updateJournal(
                req.params.id,
                req.user.id,
                req.body,
                imageFiles,
                audioFile,
                videoFile
            );

            return ResponseUtil.success(res, result, req.__('journal.update_success'));
        } catch (error) {
            if (error.message === 'Journal not found') {
                return ResponseUtil.notFound(res, req.__('journal.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('journal.forbidden'));
            }
            if (error.message === 'Maximum 10 images allowed') {
                return ResponseUtil.badRequest(res, req.__('journal.max_images'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * DELETE /journals/:id - Delete journal
     */
    static async deleteJournal(req, res) {
        try {
            const result = await JournalService.deleteJournal(req.params.id, req.user.id);
            return ResponseUtil.success(res, result, req.__('journal.delete_success'));
        } catch (error) {
            if (error.message === 'Journal not found') {
                return ResponseUtil.notFound(res, req.__('journal.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('journal.forbidden'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = JournalController;
