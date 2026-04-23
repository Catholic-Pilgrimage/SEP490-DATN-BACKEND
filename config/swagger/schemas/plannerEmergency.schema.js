/**
 * @swagger
 * components:
 *   schemas:
 *     EmergencyStopPlannerRequest:
 *       type: object
 *       required:
 *         - cancelled_reason
 *       properties:
 *         cancelled_reason:
 *           type: string
 *           minLength: 5
 *           maxLength: 1000
 *           example: "Mua lon va duong sat lo, doan buoc phai dung ngay"
 *           description: "Ly do dung khan cap khi hanh trinh dang ongoing"
 */
