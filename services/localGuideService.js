const { User, Site, SiteMedia } = require('../models');
const Logger = require('../utils/logger.util');

class LocalGuideService {

    /**
     * Generate media code with format: [PREFIX][MMDD][SEQ]
     * Example: IMG0115001, VID0115002, PAN0115001
     */
    static async generateMediaCode(type) {
        const prefixMap = {
            image: 'IMG',
            video: 'VID',
            panorama: 'PAN'
        };
        const prefix = prefixMap[type] || 'MED';


        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${month}${day}`;


        const latestMedia = await SiteMedia.findOne({
            where: {
                code: {
                    [require('sequelize').Op.like]: `${prefix}${dateStr}%`
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
     * Local Guide: Get my site details
     */
    static async getMySite(userId) {
        try {
            const user = await User.findByPk(userId, {
                include: [{ model: Site, as: 'assignedSite' }]
            });

            if (!user) {
                throw new Error('User not found');
            }

            if (user.role !== 'local_guide') {
                throw new Error('Only local guides can access this');
            }

            if (!user.site_id || !user.assignedSite) {
                throw new Error('Local Guide has no site assigned');
            }

            const site = user.assignedSite;

            return {
                id: site.id,
                code: site.code,
                name: site.name,
                description: site.description,
                history: site.history,
                address: site.address,
                province: site.province,
                district: site.district,
                latitude: site.latitude,
                longitude: site.longitude,
                region: site.region,
                type: site.type,
                patron_saint: site.patron_saint,
                cover_image: site.cover_image,
                opening_hours: site.opening_hours,
                contact_info: site.contact_info,
                is_active: site.is_active,
                created_at: site.created_at,
                updated_at: site.updated_at
            };
        } catch (error) {
            Logger.error('Get Local Guide site error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Upload Site Media (Image, Video, Panorama)
     * - File upload: image, video, panorama (via Cloudinary)
     * - URL: YouTube video link
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


            if (!['image', 'video', 'panorama'].includes(type)) {
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

            return media;
        } catch (error) {
            Logger.error('Upload media error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Get all media of my site with filter & pagination
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


            const where = { site_id: user.site_id };


            if (filters.type && ['image', 'video', 'panorama'].includes(filters.type)) {
                where.type = filters.type;
            }


            if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
                where.status = filters.status;
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
     * Local Guide: Remove media (only pending)
     */
    static async deleteMedia(userId, mediaId) {
        try {
            const user = await User.findByPk(userId);
            if (!user || user.role !== 'local_guide') {
                throw new Error('Unauthorized');
            }

            const media = await SiteMedia.findOne({
                where: { id: mediaId, site_id: user.site_id }
            });

            if (!media) {
                throw new Error('Media not found');
            }

            if (media.status === 'approved') {
                throw new Error('Cannot delete approved media');
            }

            await media.destroy();

            Logger.info(`Local Guide ${userId} deleted media ${mediaId}`);

            return { message: 'Media deleted successfully' };
        } catch (error) {
            Logger.error('Delete media error:', error);
            throw error;
        }
    }

    /**
     * Local Guide: Update media (pending or rejected)
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
                where: { id: mediaId, site_id: user.site_id }
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

            if (type && ['image', 'video', 'panorama'].includes(type)) {
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
            }

            await media.update(dataToUpdate);

            Logger.info(`Local Guide ${userId} updated media ${mediaId}`);

            return media;
        } catch (error) {
            Logger.error('Update media error:', error);
            throw error;
        }
    }
}

module.exports = LocalGuideService;
