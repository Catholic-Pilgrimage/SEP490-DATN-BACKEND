/**
 * @swagger
 * components:
 *   schemas:
 *     LocalGuideDashboardOverview:
 *       type: object
 *       properties:
 *         site:
 *           type: object
 *           description: Information about the assigned site
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             code:
 *               type: string
 *             name:
 *               type: string
 *             region:
 *               type: string
 *               enum: [Bac, Trung, Nam]
 *             type:
 *               type: string
 *               enum: [church, cathedral, basilica, shrine, monastery, convent, chapel, pilgrimage_site, other]
 *             cover_image:
 *               type: string
 *               nullable: true
 *         personal_stats:
 *           type: object
 *           description: Personal achievements of the Local Guide
 *           properties:
 *             shifts_completed:
 *               type: integer
 *               description: Total number of approved shifts completed
 *               example: 15
 *             sos_resolved:
 *               type: integer
 *               description: Total number of SOS requests resolved
 *               example: 8
 *         my_contributions:
 *           type: object
 *           description: Content contributions by this Local Guide
 *           properties:
 *             media:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 25
 *                 pending:
 *                   type: integer
 *                   example: 3
 *                 approved:
 *                   type: integer
 *                   example: 20
 *                 rejected:
 *                   type: integer
 *                   example: 2
 *             schedules:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 10
 *                 pending:
 *                   type: integer
 *                   example: 1
 *                 approved:
 *                   type: integer
 *                   example: 8
 *                 rejected:
 *                   type: integer
 *                   example: 1
 *             events:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 5
 *                 pending:
 *                   type: integer
 *                   example: 0
 *                 approved:
 *                   type: integer
 *                   example: 5
 *                 rejected:
 *                   type: integer
 *                   example: 0
 *             nearby_places:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   example: 12
 *                 pending:
 *                   type: integer
 *                   example: 2
 *                 approved:
 *                   type: integer
 *                   example: 9
 *                 rejected:
 *                   type: integer
 *                   example: 1
 *         site_overview:
 *           type: object
 *           description: General site status information
 *           properties:
 *             pending_sos:
 *               type: integer
 *               description: Number of pending SOS requests at this site
 *               example: 2
 *             checkins_today:
 *               type: integer
 *               description: Number of check-ins today at this site
 *               example: 45
 */

module.exports = {};
