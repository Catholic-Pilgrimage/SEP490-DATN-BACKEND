const { User, NearbyPlace, Site } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const HaversineUtil = require('../../utils/haversine.util');
const NotificationService = require('../shared/notificationService');

class LocalGuideNearbyPlaceService {
    /**
     * Generate nearby place code: NBP[MMDD][SEQ]
     * Example: NBP0122001
     */
    static async generateNearbyPlaceCode() {
        const prefix = 'NBP';
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${month}${day}`;

        const latestPlace = await NearbyPlace.findOne({
            where: {
                code: { [Op.like]: `${prefix}${dateStr}%` }
            },
            order: [['code', 'DESC']]
        });

        let sequence = 1;
        if (latestPlace && latestPlace.code) {
            const lastSeq = parseInt(latestPlace.code.slice(-3), 10);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }

        return `${prefix}${dateStr}${String(sequence).padStart(3, '0')}`;
    }

    /**
     * Local Guide: Create nearby place
     */
    static async createNearbyPlace(userId, data) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }
            if (!user.site_id) {
                throw new Error('Local Guide has no site');
            }

            const { name, category, address, latitude, longitude, phone, description } = data;

            // Auto-calculate distance from Site
            let calculatedDistance = null;
            const site = await Site.findByPk(user.site_id);
            if (site && site.latitude && site.longitude && latitude && longitude) {
                calculatedDistance = Math.round(
                    HaversineUtil.distance(
                        parseFloat(site.latitude), parseFloat(site.longitude),
                        parseFloat(latitude), parseFloat(longitude)
                    )
                );
            }

            const code = await this.generateNearbyPlaceCode();

            const nearbyPlace = await NearbyPlace.create({
                site_id: user.site_id,
                code,
                created_by: userId,
                name,
                category,
                address: address || null,
                latitude,
                longitude,
                distance_meters: calculatedDistance,
                phone: phone || null,
                description: description || null,
                status: 'pending'
            });

            Logger.info(`Local Guide ${userId} created nearby place ${nearbyPlace.code}`);

            // Notify Manager
            await NotificationService.notifySiteManager(user.site_id, 'nearby_place_submitted', {
                guideName: user.full_name || user.email,
                placeName: name
            });

            return nearbyPlace;
        } catch (error) {
            Logger.error('Create nearby place error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Get MY nearby places
     */
    static async getNearbyPlaces(userId, filters = {}) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide' || !user.site_id) {
                throw new Error('Unauthorized');
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const offset = (page - 1) * limit;

            const where = {
                site_id: user.site_id,
                created_by: userId
            };

            if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
                where.status = filters.status;
            }
            if (filters.category && ['food', 'lodging', 'medical'].includes(filters.category)) {
                where.category = filters.category;
            }


            if (filters.is_active !== undefined) {
                where.is_active = filters.is_active === 'true' || filters.is_active === true;
            }

            const { count, rows } = await NearbyPlace.findAndCountAll({
                where,
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            return {
                data: rows,
                pagination: {
                    page,
                    limit,
                    totalItems: count,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            Logger.error('Get nearby places error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Update nearby place (only own + pending/rejected)
     */
    static async updateNearbyPlace(userId, placeId, updateData) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const place = await NearbyPlace.findOne({
                where: {
                    id: placeId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!place) {
                throw new Error('Nearby place not found');
            }

            if (place.status === 'approved') {
                throw new Error('Cannot update approved nearby place');
            }

            const { name, category, address, latitude, longitude, phone, description } = updateData;

            const dataToUpdate = {};
            if (name !== undefined) dataToUpdate.name = name;
            if (category !== undefined) dataToUpdate.category = category;
            if (address !== undefined) dataToUpdate.address = address;
            if (latitude !== undefined) dataToUpdate.latitude = latitude;
            if (longitude !== undefined) dataToUpdate.longitude = longitude;
            if (phone !== undefined) dataToUpdate.phone = phone;
            if (description !== undefined) dataToUpdate.description = description;

            // Auto-recalculate distance if coordinates changed
            if (latitude !== undefined || longitude !== undefined) {
                const site = await Site.findByPk(user.site_id);
                const finalLat = parseFloat(latitude !== undefined ? latitude : place.latitude);
                const finalLng = parseFloat(longitude !== undefined ? longitude : place.longitude);
                if (site && site.latitude && site.longitude && finalLat && finalLng) {
                    dataToUpdate.distance_meters = Math.round(
                        HaversineUtil.distance(
                            parseFloat(site.latitude), parseFloat(site.longitude),
                            finalLat, finalLng
                        )
                    );
                }
            }

            if (place.status === 'rejected') {
                dataToUpdate.status = 'pending';
                dataToUpdate.rejection_reason = null;
            }

            await place.update(dataToUpdate);

            Logger.info(`Local Guide ${userId} updated nearby place ${placeId}`);

            return place;
        } catch (error) {
            Logger.error('Update nearby place error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Delete nearby place (only own + pending/rejected) - Soft delete
     */
    static async deleteNearbyPlace(userId, placeId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const place = await NearbyPlace.findOne({
                where: {
                    id: placeId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!place) {
                throw new Error('Nearby place not found');
            }

            if (place.status === 'approved') {
                throw new Error('Cannot delete approved nearby place');
            }

            // Soft delete
            await place.update({ is_active: false });

            Logger.info(`Local Guide ${userId} soft deleted nearby place ${placeId}`);

            return { message: 'Nearby place deleted successfully' };
        } catch (error) {
            Logger.error('Delete nearby place error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Restore nearby place (only own + pending/rejected)
     */
    static async restoreNearbyPlace(userId, placeId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const place = await NearbyPlace.findOne({
                where: {
                    id: placeId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!place) {
                throw new Error('Nearby place not found');
            }

            if (place.status === 'approved') {
                throw new Error('Cannot restore approved nearby place');
            }

            if (place.is_active) {
                throw new Error('Nearby place is already active');
            }

            // Restore
            await place.update({ is_active: true });

            Logger.info(`Local Guide ${userId} restored nearby place ${placeId}`);

            return place;
        } catch (error) {
            Logger.error('Restore nearby place error:', error);
            throw error;
        }
    }
}

module.exports = LocalGuideNearbyPlaceService;
