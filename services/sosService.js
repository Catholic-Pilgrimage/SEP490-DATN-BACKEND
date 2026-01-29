const { SOSRequest, User, Site, GuideShiftSubmission, GuideShift } = require('../models');
const { Op, Sequelize } = require('sequelize');
const Logger = require('../utils/logger.util');
const NotificationService = require('./notificationService');
const appConfig = require('../config/app.config');

class SOSService {
    /**
     * Generate SOS code: SOS[MMDD][SEQ]
     * Example: SOS0129001
     */
    static async generateSOSCode() {
        const prefix = 'SOS';
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${month}${day}`;

        const latestSOS = await SOSRequest.findOne({
            where: {
                code: { [Op.like]: `${prefix}${dateStr}%` }
            },
            order: [['code', 'DESC']]
        });

        let sequence = 1;
        if (latestSOS && latestSOS.code) {
            const lastSeq = parseInt(latestSOS.code.slice(-3), 10);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }

        return `${prefix}${dateStr}${String(sequence).padStart(3, '0')}`;
    }

    /**
     * Get week start date (Monday)
     */
    static getWeekStartDate(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setDate(diff));
        return weekStart.toISOString().split('T')[0];
    }

    /**
     * Find LocalGuides currently on shift at a site
     */
    static async findOnDutyGuides(siteId) {

        const now = new Date(new Date().toLocaleString('en-US', { timeZone: appConfig.timezone }));
        const currentDayOfWeek = now.getDay();
        const currentTime = now.toTimeString().slice(0, 5);
        const weekStart = this.getWeekStartDate(now);

        try {
            // Find approved submissions for this site, this week
            const submissions = await GuideShiftSubmission.findAll({
                where: {
                    site_id: siteId,
                    status: 'approved',
                    is_active: true,
                    week_start_date: weekStart
                },
                include: [{
                    model: GuideShift,
                    as: 'shifts',
                    where: {
                        day_of_week: currentDayOfWeek,
                        start_time: { [Op.lte]: currentTime },
                        end_time: { [Op.gt]: currentTime }
                    },
                    required: true
                }, {
                    model: User,
                    as: 'guide',
                    attributes: ['id', 'full_name', 'phone', 'avatar_url', 'status'],
                    where: { status: 'active' }
                }]
            });

            // Extract unique guide IDs
            const guides = submissions.map(sub => sub.guide);
            return guides;
        } catch (error) {
            Logger.error('Find on-duty guides error:', error);
            return [];
        }
    }

    // ===================== PILGRIM APIs =====================

    /**
     * Pilgrim: Create SOS request
     */
    static async createSOS(userId, data) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const { site_id, latitude, longitude, message, contact_phone } = data;


            if (site_id) {
                const site = await Site.findByPk(site_id);
                if (!site) {
                    throw new Error('Site not found');
                }
            }


            const existingSOS = await SOSRequest.findOne({
                where: {
                    user_id: userId,
                    status: 'pending'
                }
            });

            if (existingSOS) {
                throw new Error('already_pending');
            }


            const code = await this.generateSOSCode();


            const sos = await SOSRequest.create({
                code,
                user_id: userId,
                site_id: site_id || null,
                latitude,
                longitude,
                message,
                contact_phone: contact_phone || user.phone,
                status: 'pending'
            });

            Logger.info(`SOS created: ${sos.code} by user ${userId}`);

            // Notify LocalGuides on duty at this site
            if (site_id) {
                const onDutyGuides = await this.findOnDutyGuides(site_id);
                const site = await Site.findByPk(site_id);

                if (onDutyGuides.length > 0) {

                    const notificationPromises = onDutyGuides.map(guide =>
                        NotificationService.createNotification('sos_created', guide.id, {
                            siteName: site?.name || '',
                            sosCode: sos.code,
                            pilgrimName: user.full_name || 'Người hành hương',
                            message: message || ''
                        })
                    );

                    await Promise.all(notificationPromises);
                    Logger.info(`Notified ${onDutyGuides.length} on-duty guides for SOS ${sos.code}`);
                } else {
                    // No guides on duty, notify site manager as fallback
                    await NotificationService.notifySiteManager(site_id, 'sos_created', {
                        siteName: site?.name || '',
                        sosCode: sos.code,
                        pilgrimName: user.full_name || 'Người hành hương',
                        message: message || ''
                    });
                    Logger.warn(`No on-duty guides found for site ${site_id}, notified manager instead`);
                }
            }

            // Return with site info
            const result = await SOSRequest.findByPk(sos.id, {
                include: [{
                    model: Site,
                    as: 'site',
                    attributes: ['id', 'name', 'address']
                }]
            });

            return result;
        } catch (error) {
            Logger.error('Create SOS error:', error);
            throw error;
        }
    }

    /**
     * Pilgrim: Get my SOS requests
     */
    static async getMySOS(userId, filters = {}) {
        try {
            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const offset = (page - 1) * limit;

            const where = { user_id: userId };

            if (filters.status) {
                where.status = filters.status;
            }

            const { count, rows } = await SOSRequest.findAndCountAll({
                where,
                include: [
                    {
                        model: Site,
                        as: 'site',
                        attributes: ['id', 'name', 'address']
                    },
                    {
                        model: User,
                        as: 'assignedGuide',
                        attributes: ['id', 'full_name', 'phone', 'avatar_url']
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
            Logger.error('Get my SOS error:', error);
            throw error;
        }
    }

    /**
     * Pilgrim: Get SOS detail
     */
    static async getSOSDetail(userId, sosId) {
        try {
            const sos = await SOSRequest.findOne({
                where: { id: sosId, user_id: userId },
                include: [
                    {
                        model: Site,
                        as: 'site',
                        attributes: ['id', 'name', 'address', 'province']
                    },
                    {
                        model: User,
                        as: 'assignedGuide',
                        attributes: ['id', 'full_name', 'phone', 'avatar_url']
                    }
                ]
            });

            if (!sos) {
                throw new Error('not_found');
            }

            return sos;
        } catch (error) {
            Logger.error('Get SOS detail error:', error);
            throw error;
        }
    }

    /**
     * Pilgrim: Cancel SOS request (only pending)
     */
    static async cancelSOS(userId, sosId) {
        try {
            const sos = await SOSRequest.findOne({
                where: { id: sosId, user_id: userId }
            });

            if (!sos) {
                throw new Error('not_found');
            }

            if (sos.status !== 'pending') {
                throw new Error('cannot_cancel');
            }

            await sos.update({ status: 'cancelled' });

            Logger.info(`SOS ${sos.code} cancelled by user ${userId}`);

            return sos;
        } catch (error) {
            Logger.error('Cancel SOS error:', error);
            throw error;
        }
    }

    // ===================== LOCAL GUIDE APIs =====================

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

    // ===================== MANAGER APIs =====================

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

    // ===================== ADMIN APIs =====================

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

module.exports = SOSService;
