const { SOSRequest, User, Site } = require('../../models');
const { Op, Sequelize } = require('sequelize');
const Logger = require('../../utils/logger.util');

class AdminSOSService {
    /**
     * Admin: Get all SOS requests (all sites)
     */
    static async getAdminSOS(userId, filters = {}) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'admin') {
                throw new Error('unauthorized');
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 20;
            const offset = (page - 1) * limit;

            const where = {};

            if (filters.status) {
                where.status = filters.status;
            }

            if (filters.site_id) {
                where.site_id = filters.site_id;
            }

            if (filters.from_date) {
                where.created_at = { [Op.gte]: new Date(filters.from_date) };
            }

            if (filters.to_date) {
                where.created_at = {
                    ...where.created_at,
                    [Op.lte]: new Date(filters.to_date)
                };
            }

            const { count, rows } = await SOSRequest.findAndCountAll({
                where,
                include: [
                    {
                        model: Site,
                        as: 'site',
                        attributes: ['id', 'name', 'province']
                    },
                    {
                        model: User,
                        as: 'pilgrim',
                        attributes: ['id', 'full_name', 'phone']
                    },
                    {
                        model: User,
                        as: 'assignedGuide',
                        attributes: ['id', 'full_name']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            return {
                sosRequests: rows,
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            Logger.error('Get admin SOS error:', error);
            throw error;
        }
    }

    /**
     * Admin: Get SOS statistics (all sites)
     */
    static async getAdminSOSStats(userId, filters = {}) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'admin') {
                throw new Error('unauthorized');
            }

            const where = {};

            if (filters.site_id) {
                where.site_id = filters.site_id;
            }

            if (filters.from_date) {
                where.created_at = { [Op.gte]: new Date(filters.from_date) };
            }

            if (filters.to_date) {
                where.created_at = {
                    ...where.created_at,
                    [Op.lte]: new Date(filters.to_date)
                };
            }

            // Count by status
            const statusCounts = await SOSRequest.findAll({
                where,
                attributes: [
                    'status',
                    [Sequelize.fn('COUNT', Sequelize.col('SOSRequest.id')), 'count']
                ],
                group: ['status'],
                raw: true
            });

            const stats = {
                total: 0,
                pending: 0,
                accepted: 0,
                resolved: 0,
                cancelled: 0
            };

            statusCounts.forEach(item => {
                stats[item.status] = parseInt(item.count);
                stats.total += parseInt(item.count);
            });

            // Count by site
            const siteCounts = await SOSRequest.findAll({
                where,
                attributes: [
                    'site_id',
                    [Sequelize.fn('COUNT', Sequelize.col('SOSRequest.id')), 'count']
                ],
                include: [{
                    model: Site,
                    as: 'site',
                    attributes: ['name']
                }],
                group: ['site_id', 'site.id', 'site.name'],
                raw: true
            });

            // Average resolution time
            const avgResolution = await SOSRequest.findOne({
                where: {
                    ...where,
                    status: 'resolved',
                    resolved_at: { [Op.ne]: null }
                },
                attributes: [
                    [Sequelize.fn('AVG',
                        Sequelize.literal("EXTRACT(EPOCH FROM (resolved_at - created_at))")
                    ), 'avg_seconds']
                ],
                raw: true
            });

            const avgMinutes = avgResolution?.avg_seconds
                ? Math.round(avgResolution.avg_seconds / 60)
                : null;

            return {
                ...stats,
                by_site: siteCounts.map(s => ({
                    site_id: s.site_id,
                    site_name: s['site.name'],
                    count: parseInt(s.count)
                })),
                average_resolution_minutes: avgMinutes
            };
        } catch (error) {
            Logger.error('Get admin SOS stats error:', error);
            throw error;
        }
    }
}

module.exports = AdminSOSService;
