/**
 * @swagger
 * components:
 *   schemas:
 *     SiteReview:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         site_id:
 *           type: string
 *           format: uuid
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         feedback:
 *           type: string
 *           nullable: true
 *         image_urls:
 *           type: array
 *           items:
 *             type: string
 *         verified_visit:
 *           type: boolean
 *           description: Tự động phát hiện từ check-in data
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         reviewer:
 *           $ref: '#/components/schemas/ReviewUser'
 *         reply:
 *           $ref: '#/components/schemas/ReviewReply'
 *
 *
 *     ReviewUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         full_name:
 *           type: string
 *         avatar_url:
 *           type: string
 *           nullable: true
 *
 *     ReviewReply:
 *       type: object
 *       nullable: true
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         content:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         replier:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             full_name:
 *               type: string
 *             avatar_url:
 *               type: string
 *               nullable: true
 *             role:
 *               type: string
 *               enum: [local_guide, manager]
 *
 *     ReviewSummary:
 *       type: object
 *       properties:
 *         avg_rating:
 *           type: number
 *           format: float
 *           example: 4.5
 *         total_reviews:
 *           type: integer
 *           example: 25
 *         rating_distribution:
 *           type: object
 *           properties:
 *             1:
 *               type: integer
 *               example: 2
 *             2:
 *               type: integer
 *               example: 1
 *             3:
 *               type: integer
 *               example: 3
 *             4:
 *               type: integer
 *               example: 8
 *             5:
 *               type: integer
 *               example: 11
 *
 *     Pagination:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         total:
 *           type: integer
 *         total_pages:
 *           type: integer
 */

module.exports = {};
