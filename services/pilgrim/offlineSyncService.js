const { OfflineSyncLog, UserCheckin, Journal, PlannerItem, Planner, PlannerMember, Site, sequelize } = require('../../models');
const { cloudinary } = require('../../config/cloudinary.config');
const Logger = require('../../utils/logger.util');

class OfflineSyncService {
    static normalizeString(value) {
        return typeof value === 'string' ? value.trim() : '';
    }

    static async resolveCheckinPhotoUrl(action, userId, plannerItemId) {
        const photoUrl = this.normalizeString(action.photo_url);
        if (photoUrl) {
            return photoUrl;
        }

        const photoBase64 = this.normalizeString(action.photo_base64);
        if (!photoBase64) {
            throw new Error('Check-in photo is required');
        }

        try {
            const uploadResult = await cloudinary.uploader.upload(photoBase64, {
                folder: 'catholic_pilgrimage/checkins',
                resource_type: 'image',
                public_id: `offline_${userId}_${plannerItemId}_${Date.now()}`
            });

            return uploadResult.secure_url;
        } catch (error) {
            Logger.error('Offline check-in photo upload error:', error);
            throw new Error('Failed to upload check-in photo');
        }
    }

    /**
     * Process offline actions from mobile
     * Handles CHECK_IN and CREATE_JOURNAL actions with idempotency
     */
    static async processActions(actions, userId) {
        try {
            // Sort actions by offline_time to maintain chronological order
            const sortedActions = actions.sort((a, b) =>
                new Date(a.offline_time) - new Date(b.offline_time)
            );

            const results = [];

            for (const action of sortedActions) {
                const result = await this.processAction(action, userId);
                results.push(result);
            }

            Logger.info(`Processed ${results.length} offline actions for user ${userId}`);

            return results;
        } catch (error) {
            Logger.error('Process offline actions error:', error);
            throw error;
        }
    }

    /**
     * Process a single action with idempotency check
     */
    static async processAction(action, userId) {
        const { client_action_id, type } = action;

        try {
            // 1. Check if action already processed (idempotency)
            const existingLog = await OfflineSyncLog.findOne({
                where: { client_action_id }
            });

            if (existingLog) {
                return {
                    client_action_id,
                    status: 'already_synced',
                    message: 'Action already processed'
                };
            }

            // 2. Process based on action type
            let result;
            switch (type) {
                case 'CHECK_IN':
                    result = await this.handleCheckIn(action, userId);
                    break;
                case 'CREATE_JOURNAL':
                    result = await this.handleCreateJournal(action, userId);
                    break;
                default:
                    throw new Error(`Unknown action type: ${type}`);
            }

            // 3. Log successful sync
            await OfflineSyncLog.create({
                user_id: userId,
                client_action_id,
                action_type: type,
                status: 'synced'
            });

            return {
                client_action_id,
                status: 'synced',
                ...result
            };

        } catch (error) {
            // Log failed sync
            await OfflineSyncLog.create({
                user_id: userId,
                client_action_id,
                action_type: type,
                status: 'failed',
                error_message: error.message
            });

            return {
                client_action_id,
                status: 'failed',
                error: error.message
            };
        }
    }

    /**
     * Handle CHECK_IN action
     */
    static async handleCheckIn(action, userId) {
        const { planner_item_id, offline_time, latitude, longitude, note } = action;

        // Validate planner_item exists and user has access
        const plannerItem = await PlannerItem.findByPk(planner_item_id, {
            include: [
                { model: Planner, as: 'planner' },
                { model: Site, as: 'site' }
            ]
        });

        if (!plannerItem) {
            throw new Error('Planner item not found');
        }

        // Check if user is owner or member
        const planner = plannerItem.planner;
        if (planner.user_id !== userId) {
            const isMember = await PlannerMember.findOne({
                where: { planner_id: planner.id, user_id: userId }
            });
            if (!isMember) {
                throw new Error('No permission to check-in this planner item');
            }
        }

        // Check if already checked in
        const existingCheckin = await UserCheckin.findOne({
            where: { user_id: userId, planner_item_id }
        });

        if (existingCheckin) {
            throw new Error('Already checked in to this planner item');
        }

        const photo_url = await this.resolveCheckinPhotoUrl(action, userId, planner_item_id);

        // Calculate distance if coordinates provided
        let distance_meters = null;
        let is_valid = false;

        if (latitude && longitude && plannerItem.site) {
            const site = plannerItem.site;
            if (site.latitude && site.longitude) {
                distance_meters = this.calculateDistance(
                    latitude, longitude,
                    parseFloat(site.latitude), parseFloat(site.longitude)
                );
                is_valid = distance_meters <= 500; // Valid if within 500m
            }
        }

        // Create check-in with offline_time
        const checkin = await UserCheckin.create({
            user_id: userId,
            planner_item_id,
            latitude,
            longitude,
            distance_meters,
            is_valid,
            checkin_date: offline_time, // Use offline time, not server time
            note,
            photo_url
        });

        return {
            checkin_id: checkin.id,
            is_valid,
            distance_meters,
            photo_url
        };
    }

    /**
     * Handle CREATE_JOURNAL action
     */
    static async handleCreateJournal(action, userId) {
        const { planner_item_id, title, content, privacy, offline_time } = action;

        // Validate planner_item exists
        const plannerItem = await PlannerItem.findByPk(planner_item_id);
        if (!plannerItem) {
            throw new Error('Planner item not found');
        }

        // Check if user has checked in (optional validation)
        const checkin = await UserCheckin.findOne({
            where: { user_id: userId, planner_item_id }
        });

        if (!checkin) {
            Logger.warn(`User ${userId} creating journal without check-in for planner_item ${planner_item_id}`);
        }

        // Create journal with offline_time
        const journal = await Journal.create({
            user_id: userId,
            site_id: plannerItem.site_id,
            title,
            content,
            privacy: privacy || 'private',
            created_at: offline_time, // Use offline time
            updated_at: offline_time
        });

        return {
            journal_id: journal.id
        };
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     * Returns distance in meters
     */
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round(R * c); // Distance in meters
    }
}

module.exports = OfflineSyncService;
