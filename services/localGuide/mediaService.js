const { User, SiteMedia } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const NotificationService = require('../shared/notificationService');

class LocalGuideMediaService {
    /**
     * Generate media code with format: [PREFIX][MMDD][SEQ]
     * Example: IMG0115001, VID0115002, PAN0115001
     */
    static async generateMediaCode(type) {
        const prefixMap = {
            image: 'IMG',
            video: 'VID',
            model_3d: 'MDL'
        };
        const prefix = prefixMap[type] || 'MED';

        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${month}${day}`;

        const latestMedia = await SiteMedia.findOne({
            where: {
                code: {
                    [Op.like]: `${prefix}${dateStr}%`
                }
            },
            order: [['code', 'DESC']]
        });

        let sequence = 1;
        if (latestMedia && latestMedia.code) {
            const lastSeq = parseInt(latestMedia.code.slice(-3), 10);
            if (!isNaN(lastSeq)) {
                sequence = lastSeq + 1;
            }
        }

        return `${prefix}${dateStr}${String(sequence).padStart(3, '0')}`;
    }

    /**
     * Local Guide: Upload Site Media (Image, Video only)
     * - File upload: image, video (via Cloudinary)
     * - URL: YouTube video link
     * - Note: model_3d can only be uploaded by Manager
     */
    static async uploadMedia(userId, fileData) {
        try {
            const user = await User.findByPk(userId);

            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            if (!user.site_id) {
                throw new Error('Local Guide has no site');
            }

            const { url, type, caption } = fileData;

            if (!['image', 'video'].includes(type)) {
                throw new Error('Invalid media type');
            }

            if (type === 'video' && url && !url.includes('cloudinary')) {
                const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/;
                if (!youtubeRegex.test(url)) {
                    throw new Error('Invalid YouTube URL');
                }
            }

            const code = await this.generateMediaCode(type);

            const media = await SiteMedia.create({
                site_id: user.site_id,
                code,
                url,
                type,
                caption,
                status: 'pending',
                created_by: userId
            });

            Logger.info(`Local Guide ${userId} uploaded media ${media.code} (${type}) for site ${user.site_id}`);

            // Notify Manager
            await NotificationService.notifySiteManager(user.site_id, 'media_submitted', {
                guideName: user.full_name || user.email
            });

            return media;
        } catch (error) {
            Logger.error('Upload media error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Get MY media with filter & pagination
     * Only shows media created by this user
     */
    static async getSiteMedia(userId, filters = {}) {
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

            if (filters.type && ['image', 'video', 'model_3d'].includes(filters.type)) {
                where.type = filters.type;
            }

            if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
                where.status = filters.status;
            }

            // Filter by narrative_status (for 3D models with narratives)
            if (filters.narrative_status) {
                if (filters.narrative_status === 'null') {
                    where.narrative_status = null;
                } else if (['pending', 'approved', 'rejected'].includes(filters.narrative_status)) {
                    where.narrative_status = filters.narrative_status;
                }
            }

            if (filters.is_active !== undefined) {
                where.is_active = filters.is_active === 'true' || filters.is_active === true;
            }

            const totalItems = await SiteMedia.count({ where });

            const mediaList = await SiteMedia.findAll({
                where,
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            return {
                data: mediaList,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit)
                }
            };
        } catch (error) {
            Logger.error('Get site media error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Get ALL approved media of their site
     */
    static async getAllSiteMedia(userId, filters = {}) {
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
                status: 'approved',
                is_active: true
            };

            if (filters.type && ['image', 'video', 'model_3d'].includes(filters.type)) {
                where.type = filters.type;
            }

            const totalItems = await SiteMedia.count({ where });

            const mediaList = await SiteMedia.findAll({
                where,
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            return {
                data: mediaList,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit)
                }
            };
        } catch (error) {
            Logger.error('Get all site media error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Update media (only own + pending/rejected)
     * - Can update: caption, type, url (if YouTube video)
     * - Can replace file (if file upload)
     * - Rejected media: update + reset to pending for re-approval
     */
    static async updateMedia(userId, mediaId, updateData) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const media = await SiteMedia.findOne({
                where: {
                    id: mediaId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!media) {
                throw new Error('Media not found');
            }

            if (media.status === 'approved') {
                throw new Error('Cannot update approved media');
            }

            const { url, type, caption } = updateData;

            const dataToUpdate = {};

            if (caption !== undefined) {
                dataToUpdate.caption = caption;
            }

            if (type && ['image', 'video'].includes(type)) {
                dataToUpdate.type = type;
            }

            if (url) {
                const mediaType = type || media.type;
                if (mediaType === 'video' && !url.includes('cloudinary')) {
                    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/;
                    if (!youtubeRegex.test(url)) {
                        throw new Error('Invalid YouTube URL');
                    }
                }
                dataToUpdate.url = url;
            }

            if (media.status === 'rejected') {
                dataToUpdate.status = 'pending';
                dataToUpdate.rejection_reason = null;
                dataToUpdate.reviewed_by = null;
                dataToUpdate.reviewed_at = null;
            }

            await media.update(dataToUpdate);

            Logger.info(`Local Guide ${userId} updated media ${mediaId}`);

            return media;
        } catch (error) {
            Logger.error('Update media error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Remove media (only own + pending/rejected) - Soft delete
     */
    static async deleteMedia(userId, mediaId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const media = await SiteMedia.findOne({
                where: {
                    id: mediaId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!media) {
                throw new Error('Media not found');
            }

            if (media.status === 'approved') {
                throw new Error('Cannot delete approved media');
            }

            // Soft delete
            await media.update({ is_active: false });

            Logger.info(`Local Guide ${userId} soft deleted media ${mediaId}`);

            return { message: 'Media deleted successfully' };
        } catch (error) {
            Logger.error('Delete media error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Restore media (only own + pending/rejected)
     */
    static async restoreMedia(userId, mediaId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const media = await SiteMedia.findOne({
                where: {
                    id: mediaId,
                    site_id: user.site_id,
                    created_by: userId
                }
            });

            if (!media) {
                throw new Error('Media not found');
            }

            if (media.status === 'approved') {
                throw new Error('Cannot restore approved media');
            }

            if (media.is_active) {
                throw new Error('Media is already active');
            }

            // Restore (with auto-deactivation for model_3d)
            if (media.type === 'model_3d') {
                // 1 site = 1 active model_3d → deactivate others first
                const sequelize = SiteMedia.sequelize;
                await sequelize.transaction(async (t) => {
                    await SiteMedia.update(
                        { is_active: false },
                        {
                            where: {
                                site_id: user.site_id,
                                type: 'model_3d',
                                is_active: true,
                                id: { [Op.ne]: mediaId }
                            },
                            transaction: t
                        }
                    );
                    await media.update({ is_active: true }, { transaction: t });
                });
            } else {
                await media.update({ is_active: true });
            }

            Logger.info(`Local Guide ${userId} restored media ${mediaId}${media.type === 'model_3d' ? ' (other model_3d auto-deactivated)' : ''}`);

            return media;
        } catch (error) {
            Logger.error('Restore media error:', error);
            throw error;
        }
    }
}

module.exports = LocalGuideMediaService;
