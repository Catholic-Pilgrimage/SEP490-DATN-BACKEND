/**
 * @swagger
 * components:
 *   schemas:
 *     PilgrimDashboardOverview:
 *       type: object
 *       properties:
 *         journey_overview:
 *           type: object
 *           description: Overall journey statistics
 *           properties:
 *             total_checkins:
 *               type: integer
 *               description: Total number of check-ins
 *               example: 25
 *             total_journals:
 *               type: integer
 *               description: Total number of journal entries
 *               example: 15
 *             total_favorites:
 *               type: integer
 *               description: Total number of favorite sites
 *               example: 8
 *             pilgrimage_days:
 *               type: integer
 *               description: Number of days since first check-in
 *               example: 45
 *             first_checkin_date:
 *               type: string
 *               format: date
 *               nullable: true
 *               description: Date of first check-in
 *               example: "2024-01-15"
 *         current_plans:
 *           type: object
 *           description: Current and upcoming pilgrimage plans
 *           properties:
 *             ongoing:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                   example: "Hành hương Miền Trung"
 *                 start_date:
 *                   type: string
 *                   format: date
 *                 end_date:
 *                   type: string
 *                   format: date
 *                 total_sites:
 *                   type: integer
 *                   example: 10
 *                 checked_in_sites:
 *                   type: integer
 *                   example: 6
 *                 progress_percentage:
 *                   type: integer
 *                   example: 60
 *             upcoming:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *                   example: "Hành hương Miền Nam"
 *                 start_date:
 *                   type: string
 *                   format: date
 *                 total_sites:
 *                   type: integer
 *                   example: 8
 *         recent_activity:
 *           type: object
 *           description: Recent check-ins and journals
 *           properties:
 *             recent_checkins:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   site_name:
 *                     type: string
 *                     example: "Nhà thờ Đức Bà"
 *                   checkin_date:
 *                     type: string
 *                     format: date
 *                   has_journal:
 *                     type: boolean
 *                     example: true
 *             recent_journals:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   title:
 *                     type: string
 *                     example: "Cảm xúc tại Đức Bà"
 *                   site_name:
 *                     type: string
 *                     nullable: true
 *                     example: "Nhà thờ Đức Bà"
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *         stats_by_region:
 *           type: object
 *           description: Number of unique sites visited by region
 *           properties:
 *             Bac:
 *               type: integer
 *               example: 8
 *             Trung:
 *               type: integer
 *               example: 10
 *             Nam:
 *               type: integer
 *               example: 7
 *         stats_by_type:
 *           type: object
 *           description: Number of unique sites visited by type
 *           properties:
 *             church:
 *               type: integer
 *               example: 15
 *             shrine:
 *               type: integer
 *               example: 5
 *             monastery:
 *               type: integer
 *               example: 3
 *             center:
 *               type: integer
 *               example: 2
 *             other:
 *               type: integer
 *               example: 0
 */

module.exports = {};
