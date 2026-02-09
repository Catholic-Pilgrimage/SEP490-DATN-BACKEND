const { Site, User, UserFavorite, SiteMedia, MassSchedule, Event, NearbyPlace, VerificationRequest } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');

class PilgrimSiteService {

  /**
   * User: Get favorite sites
   */
  static async getFavorites(userId, filters = {}) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows } = await Site.findAndCountAll({
        include: [
          {
            model: User,
            as: 'favoritedBy',
            where: { id: userId },
            attributes: [],
            through: { attributes: ['created_at'] }
          }
        ],
        where: { is_active: true },
        order: [['name', 'ASC']],
        limit,
        offset
      });

      Logger.info(`User ${userId} retrieved ${rows.length} favorite sites`);

      return {
        sites: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      Logger.error('Get favorites error:', error);
      throw error;
    }
  }

  /**
   * User: Add site to favorites
   */
  static async addFavorite(userId, siteId) {
    try {
      // Check if site exists and is active
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');
      if (!site.is_active) throw new Error('Site not active');

      // Check if already favorited
      const existingFavorite = await UserFavorite.findOne({
        where: { user_id: userId, site_id: siteId }
      });
      if (existingFavorite) throw new Error('Already favorited');

      // Create favorite
      await UserFavorite.create({
        user_id: userId,
        site_id: siteId
      });

      Logger.info(`User ${userId} favorited site ${siteId}`);
      return { site_id: siteId, site_name: site.name };
    } catch (error) {
      Logger.error('Add favorite error:', error);
      throw error;
    }
  }

  /**
   * User: Remove site from favorites
   */
  static async removeFavorite(userId, siteId) {
    try {
      // Check if site exists
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');

      // Check if favorite exists
      const favorite = await UserFavorite.findOne({
        where: { user_id: userId, site_id: siteId }
      });
      if (!favorite) throw new Error('Not favorited');

      // Delete favorite
      await favorite.destroy();

      Logger.info(`User ${userId} unfavorited site ${siteId}`);
      return { site_id: siteId, site_name: site.name };
    } catch (error) {
      Logger.error('Remove favorite error:', error);
      throw error;
    }
  }

  // ===================== PUBLIC APIs =====================

  /**
   * Public: Get all active sites with pagination and filters
   * For pilgrim and guest users
   */
  static async getPublicSites(filters = {}) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      const where = {
        is_active: true
      };

      // Optional filters
      if (filters.province) where.province = filters.province;
      if (filters.region) where.region = filters.region;
      if (filters.type) where.type = filters.type;
      if (filters.search) {
        where.name = { [Op.iLike]: `%${filters.search}%` };
      }

      const { count, rows } = await Site.findAndCountAll({
        where,
        attributes: ['id', 'code', 'name', 'description', 'address', 'province', 'district', 'region', 'type', 'patron_saint', 'cover_image', 'opening_hours', 'latitude', 'longitude'],
        order: [['name', 'ASC']],
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
      Logger.error('Get public sites error:', error);
      throw error;
    }
  }

  /**
   * Public: Get site detail by ID or code
   * For pilgrim and guest users
   */
  static async getPublicSiteById(siteIdOrCode) {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(siteIdOrCode);

      const where = isUUID
        ? { id: siteIdOrCode, is_active: true }
        : { code: siteIdOrCode, is_active: true };

      const site = await Site.findOne({
        where,
        attributes: ['id', 'code', 'name', 'description', 'history', 'address', 'province', 'district', 'region', 'type', 'patron_saint', 'cover_image', 'opening_hours', 'contact_info', 'latitude', 'longitude', 'created_at']
      });

      if (!site) {
        throw new Error('Site not found');
      }

      return site;
    } catch (error) {
      Logger.error('Get public site by ID error:', error);
      throw error;
    }
  }

  /**
   * Public: Get site media (approved only)
   * For pilgrim and guest users to view site gallery
   */
  static async getPublicSiteMedia(siteId, filters = {}) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      // Check if site exists and is active
      const site = await Site.findOne({
        where: { id: siteId, is_active: true }
      });

      if (!site) {
        throw new Error('Site not found');
      }

      const where = {
        site_id: siteId,
        status: 'approved',
        is_active: true
      };

      // Filter by media type
      if (filters.type && ['image', 'video', 'panorama'].includes(filters.type)) {
        where.type = filters.type;
      }

      const { count, rows } = await SiteMedia.findAndCountAll({
        where,
        attributes: ['id', 'code', 'url', 'type', 'caption', 'created_at'],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      return {
        site: {
          id: site.id,
          code: site.code,
          name: site.name
        },
        data: rows,
        pagination: {
          page,
          limit,
          totalItems: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      Logger.error('Get public site media error:', error);
      throw error;
    }
  }

  /**
   * Public: Get site mass schedules (approved only)
   * For pilgrim and guest users to view mass schedules
   */
  static async getPublicSiteMassSchedules(siteId, filters = {}) {
    try {
      // Check if site exists and is active
      const site = await Site.findOne({
        where: { id: siteId, is_active: true }
      });

      if (!site) {
        throw new Error('Site not found');
      }

      const where = {
        site_id: siteId,
        status: 'approved',
        is_active: true
      };

      // Filter by day_of_week
      if (filters.day_of_week !== undefined && filters.day_of_week !== null) {
        const dayNum = parseInt(filters.day_of_week);
        if (dayNum >= 0 && dayNum <= 6) {
          where.days_of_week = { [Op.contains]: [dayNum] };
        }
      }

      const schedules = await MassSchedule.findAll({
        where,
        attributes: ['id', 'code', 'days_of_week', 'time', 'note', 'created_at'],
        order: [['time', 'ASC']]
      });

      return {
        site: {
          id: site.id,
          code: site.code,
          name: site.name
        },
        data: schedules
      };
    } catch (error) {
      Logger.error('Get public site mass schedules error:', error);
      throw error;
    }
  }

  /**
   * Public: Get site events (approved only)
   * For pilgrim and guest users to view events
   */
  static async getPublicSiteEvents(siteId, filters = {}) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      // Check if site exists and is active
      const site = await Site.findOne({
        where: { id: siteId, is_active: true }
      });

      if (!site) {
        throw new Error('Site not found');
      }

      const where = {
        site_id: siteId,
        status: 'approved',
        is_active: true
      };

      // Filter by date range (upcoming events)
      if (filters.upcoming === 'true') {
        const appConfig = require('../../config/app.config');
        const today = new Date(new Date().toLocaleString('en-US', { timeZone: appConfig.timezone })).toISOString().split('T')[0];
        where.start_date = { [Op.gte]: today };
      }

      const { count, rows } = await Event.findAndCountAll({
        where,
        attributes: ['id', 'code', 'name', 'description', 'start_date', 'end_date', 'start_time', 'end_time', 'location', 'banner_url', 'created_at'],
        order: [['start_date', 'ASC'], ['start_time', 'ASC']],
        limit,
        offset
      });

      return {
        site: {
          id: site.id,
          code: site.code,
          name: site.name
        },
        data: rows,
        pagination: {
          page,
          limit,
          totalItems: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      Logger.error('Get public site events error:', error);
      throw error;
    }
  }

  /**
   * Public: Get nearby places of a site (approved only)
   */
  static async getPublicSiteNearbyPlaces(siteId, filters = {}) {
    try {
      const site = await Site.findOne({
        where: {
          id: siteId,
          is_active: true
        },
        attributes: ['id', 'code', 'name']
      });

      if (!site) {
        throw new Error('Site not found');
      }

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const where = {
        site_id: siteId,
        status: 'approved',
        is_active: true
      };

      if (filters.category && ['food', 'lodging', 'medical'].includes(filters.category)) {
        where.category = filters.category;
      }

      const { count, rows } = await NearbyPlace.findAndCountAll({
        where,
        attributes: ['id', 'code', 'name', 'category', 'address', 'latitude', 'longitude', 'distance_meters', 'phone', 'description'],
        order: [['distance_meters', 'ASC'], ['created_at', 'DESC']],
        limit,
        offset
      });

      return {
        site: {
          id: site.id,
          code: site.code,
          name: site.name
        },
        data: rows,
        pagination: {
          page,
          limit,
          totalItems: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      Logger.error('Get public site nearby places error:', error);
      throw error;
    }
  }

  /**
   * Public: Get sites available for manager transition
   * Criteria:
   * - Site is active
   * - Site has a current manager
   * - No pending transition request for this site
   */
  static async getAvailableSites(filters = {}) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      // Get sites with active managers (using 'siteStaff' association)
      const sitesWithManagers = await Site.findAll({
        where: { is_active: true },
        attributes: ['id'],
        include: [{
          model: User,
          as: 'siteStaff',
          where: {
            role: 'manager',
            status: 'active'
          },
          required: true,
          attributes: ['id']
        }]
      });

      const siteIdsWithManagers = sitesWithManagers.map(s => s.id);

      if (siteIdsWithManagers.length === 0) {
        return {
          data: [],
          pagination: { page, limit, totalItems: 0, totalPages: 0 }
        };
      }

      // Exclude sites that already have pending transition requests
      const pendingTransitions = await VerificationRequest.findAll({
        where: {
          existing_site_id: { [Op.ne]: null },
          status: 'pending'
        },
        attributes: ['existing_site_id']
      });

      const excludeSiteIds = pendingTransitions.map(r => r.existing_site_id);
      const availableSiteIds = siteIdsWithManagers.filter(id => !excludeSiteIds.includes(id));

      if (availableSiteIds.length === 0) {
        return {
          data: [],
          pagination: { page, limit, totalItems: 0, totalPages: 0 }
        };
      }

      // Build where clause
      const where = {
        id: { [Op.in]: availableSiteIds },
        is_active: true
      };

      // Optional filters
      if (filters.province) where.province = filters.province;
      if (filters.region) where.region = filters.region;
      if (filters.search) {
        where.name = { [Op.iLike]: `%${filters.search}%` };
      }

      // Fetch available sites with manager info
      const { count, rows } = await Site.findAndCountAll({
        where,
        attributes: ['id', 'code', 'name', 'address', 'province', 'region', 'type', 'cover_image'],
        include: [{
          model: User,
          as: 'siteStaff',
          where: { role: 'manager', status: 'active' },
          required: true,
          attributes: ['id', 'full_name', 'email']
        }],
        order: [['name', 'ASC']],
        limit,
        offset
      });

      // Format response (siteStaff is array, get first manager)
      const data = rows.map(site => {
        const manager = site.siteStaff && site.siteStaff.find(u => u.role === 'manager');
        return {
          id: site.id,
          code: site.code,
          name: site.name,
          address: site.address,
          province: site.province,
          region: site.region,
          type: site.type,
          cover_image: site.cover_image,
          current_manager: manager ? {
            id: manager.id,
            full_name: manager.full_name
          } : null
        };
      });

      return {
        data,
        pagination: {
          page,
          limit,
          totalItems: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      Logger.error('Get available sites for transition error:', error);
      throw error;
    }
  }
}

module.exports = PilgrimSiteService;
