const { SOSRequest, User, Site } = require('../../models');
const { Op, Sequelize } = require('sequelize');
const Logger = require('../../utils/logger.util');

class ManagerSOSService {
    /**
     * Manager: Get all SOS at site with stats
     */
    static async getManagerSOS(userId, filters = {}) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'manager' || !user.site_id) {
                throw new Error('unauthorized');
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 20;
            const offset = (page - 1) * limit;

            const where = { site_id: user.site_id };

            if (filters.status) {
                where.status = filters.status;
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
            Logger.error('Get manager SOS error:', error);
            throw error;
        }
    }

    /**
     * Manager: Get SOS statistics
     */
    static async getSOSStats(userId, filters = {}) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'manager' || !user.site_id) {
                throw new Error('unauthorized');
            }

            const where = { site_id: user.site_id };

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
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
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

            // Average resolution time (only resolved ones)
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
                average_resolution_minutes: avgMinutes
            };
        } catch (error) {
            Logger.error('Get SOS stats error:', error);
            throw error;
        }
    }
}

module.exports = ManagerSOSService;
