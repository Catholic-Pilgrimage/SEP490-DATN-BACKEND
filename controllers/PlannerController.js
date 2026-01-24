const PlannerService = require('../services/plannerService');
const ResponseUtil = require('../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../utils/validation.util');

class PlannerController {
    /**
     * POST /planners - Create a new planner
     */
    static async createPlanner(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.createPlanner(req.user.id, req.body);
            return ResponseUtil.created(res, result, req.__('planner.create_success'));
        } catch (error) {
            if (error.message === 'Name is required') {
                return ResponseUtil.badRequest(res, req.__('planner.name_required'));
            }
            if (error.message === 'Number of days must be at least 1') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_days'));
            }
            if (error.message === 'Number of people must be at least 1') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_people'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /planners - Get user's planners
     */
    static async getUserPlanners(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.getUserPlanners(req.user.id, req.query);
            return ResponseUtil.success(res, result, req.__('planner.list_success'));
        } catch (error) {
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * GET /planners/:id - Get planner by ID
     */
    static async getPlannerById(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.getPlannerById(req.params.id, req.user?.id);
            return ResponseUtil.success(res, result, req.__('planner.get_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * PATCH /planners/:id - Update planner
     */
    static async updatePlanner(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.updatePlanner(req.params.id, req.user.id, req.body);
            return ResponseUtil.success(res, result, req.__('planner.update_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Number of days must be at least 1') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_days'));
            }
            if (error.message === 'Number of people must be at least 1') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_people'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * DELETE /planners/:id - Delete planner
     */
    static async deletePlanner(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.deletePlanner(req.params.id, req.user.id);
            return ResponseUtil.success(res, result, req.__('planner.delete_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /planners/:id/items - Add item to planner
     */
    static async addPlannerItem(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.addPlannerItem(req.params.id, req.user?.id, req.body);

            // If there's a warning, include it in the response
            if (result.warning) {
                return ResponseUtil.created(res, result, req.__('planner.item_add_success_with_warning'));
            }

            return ResponseUtil.created(res, result, req.__('planner.item_add_success'));
        } catch (error) {
            console.error('Add planner item error:', error.message);

            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Site not found') {
                return ResponseUtil.notFound(res, req.__('planner.site_not_found'));
            }
            if (error.message === 'Invalid day number') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_day_number'));
            }
            if (error.message.includes('Quãng đường quá xa')) {
                return ResponseUtil.badRequest(res, error.message);
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * PATCH /planners/:id/items/reorder - Reorder items
     */
    static async reorderPlannerItems(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.reorderPlannerItems(
                req.params.id,
                req.user?.id,
                req.body.day_number,
                req.body.item_ids
            );

            return ResponseUtil.success(res, result, req.__('planner.reorder_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Invalid day number') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_day_number'));
            }
            if (error.message === 'Invalid item ID in reorder list') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_item_id'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * DELETE /planners/:id/items/:itemId - Delete item
     */
    static async deletePlannerItem(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.deletePlannerItem(
                req.params.id,
                req.user.id,
                req.params.itemId
            );

            return ResponseUtil.success(res, result, req.__('planner.item_delete_success'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Item not found') {
                return ResponseUtil.notFound(res, req.__('planner.item_not_found'));
            }
            if (error.message === 'Item does not belong to this planner') {
                return ResponseUtil.badRequest(res, req.__('planner.item_not_belong'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * POST /planners/:id/share-token - Create/update share token
     */
    static async createShareToken(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.createShareToken(
                req.params.id,
                req.user.id,
                req.body.role
            );

            return ResponseUtil.success(res, result, req.__('planner.share_token_created'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            if (error.message === 'Invalid role') {
                return ResponseUtil.badRequest(res, req.__('planner.invalid_role'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }

    /**
     * DELETE /planners/:id/share - Disable sharing
     */
    static async disableShare(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return ResponseUtil.badRequest(res, req.__('validation.failed'), formatValidationErrors(errors.array()));
            }

            const result = await PlannerService.disableShare(req.params.id, req.user.id);
            return ResponseUtil.success(res, result, req.__('planner.share_disabled'));
        } catch (error) {
            if (error.message === 'Planner not found') {
                return ResponseUtil.notFound(res, req.__('planner.not_found'));
            }
            if (error.message === 'Forbidden') {
                return ResponseUtil.forbidden(res, req.__('planner.forbidden'));
            }
            return ResponseUtil.error(res, req.__('error.server_error'));
        }
    }
}

module.exports = PlannerController;
