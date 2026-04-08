const { SOSRequest, User, Site, GuideShiftSubmission, GuideShift, Planner, PlannerMember, PlannerMessage } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const NotificationService = require('../shared/notificationService');
const appConfig = require('../../config/app.config');
const PlannerChatService = require('./plannerChatService');

class PilgrimSOSService {
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

            // GFind if the user is currently in an ongoing Planner trip
            // If they are, broadcast this SOS to their planner chat group
            const currentTrips = await PlannerMember.findAll({
                where: { user_id: userId, join_status: 'joined' },
                include: [{
                    model: Planner,
                    as: 'planner',
                    where: { status: 'ongoing' }
                }]
            });

            // Also check if the user is the owner of an ongoing planner
            const ownedTrips = await Planner.findAll({
                where: { user_id: userId, status: 'ongoing' }
            });

            // Combine all unique ongoing planner IDs
            const activePlannerIds = new Set();
            currentTrips.forEach(member => activePlannerIds.add(member.planner.id));
            ownedTrips.forEach(planner => activePlannerIds.add(planner.id));

            // Broadcast SOS message to all active planner group chats
            for (const plannerId of activePlannerIds) {
                try {
                    // Send an automated system message to the chat
                    const sosMessageContent = JSON.stringify({
                        code: sos.code,
                        sender_name: user.full_name || 'N/A',
                        message: message || null,
                        default_message: {
                            vi: 'Tôi cần hỗ trợ khẩn cấp, xin hãy giúp đỡ!',
                            en: 'I need urgent help, please assist me!'
                        },
                        latitude,
                        longitude,
                        contact_phone: contact_phone || user.phone
                    });


                    await PlannerMessage.create({
                        planner_id: plannerId,
                        user_id: userId,
                        message_type: 'sos_alert',
                        content: sosMessageContent,
                    });

                    Logger.info(`SOS alert broadcasted to planner: ${plannerId}`);

                    // Optionally notify planner members via push notification here
                    const plannerMembers = await PlannerMember.findAll({
                        where: { planner_id: plannerId, join_status: 'joined' }
                    });

                    const planner = await Planner.findByPk(plannerId);
                    const memberIdsToNotify = new Set();
                    if (planner.user_id !== userId) memberIdsToNotify.add(planner.user_id);
                    plannerMembers.forEach(m => {
                        if (m.user_id !== userId) memberIdsToNotify.add(m.user_id);
                    });

                    const memberNotificationPromises = Array.from(memberIdsToNotify).map(memberId =>
                        NotificationService.createNotification('sos_planner_alert', memberId, {
                            sosCode: sos.code,
                            pilgrimName: user.full_name || 'Đồng đội',
                            message: message || 'Đang chờ giải cứu!'
                        })
                    );
                    await Promise.all(memberNotificationPromises);

                } catch (chatError) {
                    Logger.error(`Failed to broadcast SOS to planner ${plannerId}:`, chatError);
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

            // Quick broadcast to planner chat to let them know it's cancelled
            try {
                const currentTrips = await PlannerMember.findAll({
                    where: { user_id: userId, join_status: 'joined' },
                    include: [{ model: Planner, as: 'planner', where: { status: 'ongoing' } }]
                });
                const ownedTrips = await Planner.findAll({
                    where: { user_id: userId, status: 'ongoing' }
                });

                const activePlannerIds = new Set();
                currentTrips.forEach(member => activePlannerIds.add(member.planner.id));
                ownedTrips.forEach(planner => activePlannerIds.add(planner.id));

                const { PlannerMessage, User } = require('../../models');
                const user = await User.findByPk(userId);

                const cancelMessage = JSON.stringify({
                    message_key: 'sos.sos_cancelled_message',
                    params: {
                        pilgrimName: user?.full_name || 'N/A'
                    },
                    default_message: {
                        vi: `Tín hiệu SOS từ ${user?.full_name} đã được hủy.`,
                        en: `SOS signal from ${user?.full_name} has been cancelled.`
                    }
                });

                for (const plannerId of activePlannerIds) {
                    await PlannerMessage.create({
                        planner_id: plannerId,
                        user_id: userId,
                        message_type: 'text',
                        content: cancelMessage
                    });
                }
            } catch (chatError) {
                Logger.error('Failed to broadcast cancel message to planner chat:', chatError);
            }

            return sos;
        } catch (error) {
            Logger.error('Cancel SOS error:', error);
            throw error;
        }
    }
}

module.exports = PilgrimSOSService;
