const { User, Site } = require('../../models');
const Logger = require('../../utils/logger.util');

class LocalGuideSiteService {
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
}

module.exports = LocalGuideSiteService;
