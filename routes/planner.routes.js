const express = require('express');
const router = express.Router();
const PlannerController = require('../controllers/PlannerController');
const PlannerValidator = require('../validators/planner.validator');
const authenticate = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *   name: Planners
 *   description: Travel planner management endpoints
 */

/**
 * @swagger
 * /api/planners:
 *   post:
 *     summary: Create a new planner
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePlannerRequest'
 *     responses:
 *       201:
 *         description: Planner created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
    '/',
    authenticate,
    PlannerValidator.createPlanner,
    PlannerController.createPlanner
);

/**
 * @swagger
 * /api/planners:
 *   get:
 *     summary: Get user's planners
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Planners retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerListResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
    '/',
    authenticate,
    PlannerValidator.getUserPlanners,
    PlannerController.getUserPlanners
);

/**
 * @swagger
 * /api/planners/{id}:
 *   get:
 *     summary: Get planner by ID
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Planner ID
 *     responses:
 *       200:
 *         description: Planner retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PlannerWithItems'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Planner not found
 */
router.get(
    '/:id',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.getPlannerById
);

/**
 * @swagger
 * /api/planners/{id}:
 *   patch:
 *     summary: Update planner
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Planner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePlannerRequest'
 *     responses:
 *       200:
 *         description: Planner updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlannerResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Planner not found
 */
router.patch(
    '/:id',
    authenticate,
    PlannerValidator.updatePlanner,
    PlannerController.updatePlanner
);

/**
 * @swagger
 * /api/planners/{id}:
 *   delete:
 *     summary: Delete planner
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Planner ID
 *     responses:
 *       200:
 *         description: Planner deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Planner not found
 */
router.delete(
    '/:id',
    authenticate,
    PlannerValidator.validatePlannerId,
    PlannerController.deletePlanner
);

/**
 * @swagger
 * /api/planners/{id}/items:
 *   post:
 *     summary: Add item to planner
 *     description: Add a site to a specific day in the planner. Distance validation applies for 2nd+ items in same day.
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Planner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddPlannerItemRequest'
 *     responses:
 *       201:
 *         description: Item added successfully (may include distance warning)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AddItemResponse'
 *       400:
 *         description: Validation error or distance too far (>500km)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Planner or site not found
 */
router.post(
    '/:id/items',
    authenticate,
    PlannerValidator.addPlannerItem,
    PlannerController.addPlannerItem
);

/**
 * @swagger
 * /api/planners/{id}/items/reorder:
 *   patch:
 *     summary: Reorder items within a day
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Planner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReorderItemsRequest'
 *     responses:
 *       200:
 *         description: Items reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PlannerItem'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Planner not found
 */
router.patch(
    '/:id/items/reorder',
    authenticate,
    PlannerValidator.reorderItems,
    PlannerController.reorderPlannerItems
);

/**
 * @swagger
 * /api/planners/{id}/items/{itemId}:
 *   delete:
 *     summary: Delete item from planner
 *     description: Delete an item and automatically reorder remaining items in the same day
 *     tags: [Planners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Planner ID
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the owner
 *       404:
 *         description: Planner or item not found
 */
router.delete(
    '/:id/items/:itemId',
    authenticate,
    PlannerValidator.deleteItem,
    PlannerController.deletePlannerItem
);

module.exports = router;
