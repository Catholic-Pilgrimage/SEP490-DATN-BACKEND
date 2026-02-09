const { SOSRequest, User, Site } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const NotificationService = require('../shared/notificationService');

class LocalGuideSOSService {
    /**
     * LocalGuide: Get SOS requests at my site
     */
    static async getSiteSOS(userId, filters = {}) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide' || !user.site_id) {
                throw new Error('unauthorized');
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const offset = (page - 1) * limit;

            const where = { site_id: user.site_id };

            if (filters.status) {
                where.status = filters.status;
            }

            // By default, show pending and accepted (active SOS)
            if (!filters.status && !filters.show_all) {
                where.status = { [Op.in]: ['pending', 'accepted'] };
            }

            const { count, rows } = await SOSRequest.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'pilgrim',
                        attributes: ['id', 'full_name', 'phone', 'avatar_url']
                    },
                    {
                        model: User,
                        as: 'assignedGuide',
                        attributes: ['id', 'full_name', 'phone']
                    },
                    {
                        model: Site,
                        as: 'site',
                        attributes: ['id', 'name']
                    }
                ],
                order: [
                    ['status', 'ASC'], // pending first
                    ['created_at', 'DESC']
                ],
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
            Logger.error('Get site SOS error:', error);
            throw error;
        }
    }

    /**
     * LocalGuide: Get SOS detail
     */
    static async getSOSDetailForGuide(userId, sosId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide' || !user.site_id) {
                throw new Error('unauthorized');
            }

            const sos = await SOSRequest.findOne({
                where: { id: sosId, site_id: user.site_id },
                include: [
                    {
                        model: User,
                        as: 'pilgrim',
                        attributes: ['id', 'full_name', 'phone', 'avatar_url', 'email']
                    },
                    {
                        model: User,
                        as: 'assignedGuide',
                        attributes: ['id', 'full_name', 'phone', 'avatar_url']
                    },
                    {
                        model: Site,
                        as: 'site',
                        attributes: ['id', 'name', 'address']
                    }
                ]
            });

            if (!sos) {
                throw new Error('not_found');
            }

            return sos;
        } catch (error) {
            Logger.error('Get SOS detail for guide error:', error);
            throw error;
        }
    }

    /**
     * LocalGuide: Assign (accept) SOS request
     */
    static async assignSOS(userId, sosId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide' || !user.site_id) {
                throw new Error('unauthorized');
            }

            const sos = await SOSRequest.findOne({
                where: { id: sosId, site_id: user.site_id }
            });

            if (!sos) {
                throw new Error('not_found');
            }

            if (sos.status !== 'pending') {
                if (sos.status === 'accepted') {
                    throw new Error('already_accepted');
                }
                throw new Error('not_pending');
            }

            // Assign to this guide
            await sos.update({
                status: 'accepted',
                assigned_to: userId,
                assigned_at: new Date()
            });

            Logger.info(`SOS ${sos.code} assigned to guide ${userId}`);

            // Notify pilgrim
            await NotificationService.createNotification('sos_assigned', sos.user_id, {
                guideName: user.full_name,
                guidePhone: user.phone || ''
            });

            // Return with full info
            const result = await SOSRequest.findByPk(sos.id, {
                include: [
                    {
                        model: User,
                        as: 'pilgrim',
                        attributes: ['id', 'full_name', 'phone']
                    },
                    {
                        model: User,
                        as: 'assignedGuide',
                        attributes: ['id', 'full_name', 'phone', 'avatar_url']
                    },
                    {
                        model: Site,
                        as: 'site',
                        attributes: ['id', 'name']
                    }
                ]
            });

            return result;
        } catch (error) {
            Logger.error('Assign SOS error:', error);
            throw error;
        }
    }

    /**
     * LocalGuide: Resolve SOS request
     */
    static async resolveSOS(userId, sosId, notes = null) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide' || !user.site_id) {
                throw new Error('unauthorized');
            }

            const sos = await SOSRequest.findOne({
                where: { id: sosId, site_id: user.site_id }
            });

            if (!sos) {
                throw new Error('not_found');
            }

            if (sos.status === 'resolved') {
                throw new Error('already_resolved');
            }

            if (sos.status === 'cancelled') {
                throw new Error('was_cancelled');
            }

            // Only the assigned guide or any guide if unassigned can resolve
            if (sos.assigned_to && sos.assigned_to !== userId) {
                throw new Error('only_assigned_can_resolve');
            }

            // Resolve
            await sos.update({
                status: 'resolved',
                notes: notes || sos.notes,
                resolved_at: new Date(),
                // If not assigned yet, assign to resolver
                assigned_to: sos.assigned_to || userId,
                assigned_at: sos.assigned_at || new Date()
            });

            Logger.info(`SOS ${sos.code} resolved by guide ${userId}`);

            // Notify pilgrim
            await NotificationService.createNotification('sos_resolved', sos.user_id, {
                sosCode: sos.code
            });

            return sos;
        } catch (error) {
            Logger.error('Resolve SOS error:', error);
            throw error;
        }
    }
}

module.exports = LocalGuideSOSService;
