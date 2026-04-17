const { Site, User, UserFavorite, SiteMedia, MassSchedule, Event, NearbyPlace, VerificationRequest } = require('../../models');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');
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

      const include = [];

      // Filter by has_events
      if (filters.has_events === 'true') {
        const eventWhere = {
          status: 'approved',
          is_active: true,
        };

        if (filters.start_date && filters.end_date) {
          // events that overlap with the date range
          eventWhere.start_date = { [Op.lte]: filters.end_date };
          eventWhere[Op.or] = [
            { end_date: { [Op.gte]: filters.start_date } },
            { end_date: null, start_date: { [Op.gte]: filters.start_date } }
          ];
        } else {
          eventWhere.time_state = { [Op.in]: ['upcoming', 'ongoing'] };
        }

        include.push({
          model: Event,
          as: 'events',
          attributes: [],
          where: eventWhere,
          required: true // INNER JOIN so only sites with events are returned
        });
      }

      const { count, rows } = await Site.findAndCountAll({
        where,
        include,
        attributes: [
          'id', 'code', 'name', 'description', 'address', 'province', 'district', 'region', 'type', 'patron_saint', 'cover_image', 'opening_hours', 'latitude', 'longitude',
          [sequelize.literal(`(
            SELECT ROUND(AVG(sr.rating)::numeric, 1)
            FROM site_reviews sr
            WHERE sr.site_id = "Site".id AND sr.is_active = true
          )`), 'average_rating'],
          [sequelize.literal(`(
            SELECT COUNT(sr.id)
            FROM site_reviews sr
            WHERE sr.site_id = "Site".id AND sr.is_active = true
          )`), 'review_count']
        ],
        order: [['name', 'ASC']],
        limit,
        offset,
        distinct: true // Required when using limit and offset with include
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
        attributes: [
          'id', 'code', 'name', 'description', 'history', 'address', 'province', 'district', 'region', 'type', 'patron_saint', 'cover_image', 'opening_hours', 'contact_info', 'latitude', 'longitude', 'created_at',
          [sequelize.literal(`(
            SELECT ROUND(AVG(sr.rating)::numeric, 1)
            FROM site_reviews sr
            WHERE sr.site_id = "Site".id AND sr.is_active = true
          )`), 'average_rating'],
          [sequelize.literal(`(
            SELECT COUNT(sr.id)
            FROM site_reviews sr
            WHERE sr.site_id = "Site".id AND sr.is_active = true
          )`), 'review_count']
        ]
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
      if (filters.type && ['image', 'video', 'model_3d'].includes(filters.type)) {
        where.type = filters.type;
      }

      const { count, rows } = await SiteMedia.findAndCountAll({
        where,
        attributes: ['id', 'code', 'url', 'type', 'caption', 'audio_url', 'narration_text', 'created_at'],
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

      // Filter by date range
      if (filters.start_date && filters.end_date) {
        where.start_date = { [Op.lte]: filters.end_date };
        where[Op.or] = [
          { end_date: { [Op.gte]: filters.start_date } },
          { end_date: null, start_date: { [Op.gte]: filters.start_date } }
        ];
      } else if (filters.upcoming === 'true') {
        where.time_state = { [Op.in]: ['upcoming', 'ongoing'] };
      }

      const { count, rows } = await Event.findAndCountAll({
        where,
        attributes: ['id', 'code', 'name', 'description', 'start_date', 'end_date', 'start_time', 'end_time', 'location', 'banner_url', 'category', 'created_at'],
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
   * Public: Get sites available for claim or manager transition
   * Returns:
   *   - Sites with a current active manager (claim_type = 'transition')
   *   - Sites with NO manager, created by admin (claim_type = 'unassigned')
   * Both types must have no pending claim/transition request.
   */
  static async getAvailableSites(filters = {}) {
    try {
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const offset = (page - 1) * limit;

      // Get all sites (active OR inactive pre-created) with optional manager via LEFT JOIN
      const allSites = await Site.findAll({
        attributes: ['id', 'code', 'name', 'address', 'province', 'region', 'type', 'cover_image', 'is_active'],
        include: [{
          model: User,
          as: 'siteStaff',
          where: { role: 'manager', status: 'active' },
          required: false, // LEFT JOIN: also return sites with no manager
          attributes: ['id', 'full_name', 'email']
        }]
      });

      // Separate sites:
      //   managed = active site that already has a manager (transition candidate)
      //   unassigned = inactive site with no manager (admin placeholder, claim candidate)
      const sitesWithManagers = allSites.filter(s => s.is_active && s.siteStaff && s.siteStaff.length > 0);
      const sitesWithoutManagers = allSites.filter(s => !s.siteStaff || s.siteStaff.length === 0);

      // For unassigned sites, only include those that are NOT already active
      // (is_active=false means admin-created placeholder awaiting a manager)
      const unassignedSites = sitesWithoutManagers.filter(s => !s.is_active);

      // Combine candidates
      const candidates = [...sitesWithManagers, ...unassignedSites];
      if (candidates.length === 0) {
        return { data: [], pagination: { page, limit, totalItems: 0, totalPages: 0 } };
      }

      const candidateIds = candidates.map(s => s.id);

      // Exclude any site that already has a pending claim/transition request
      const pendingTransitions = await VerificationRequest.findAll({
        where: {
          existing_site_id: { [Op.in]: candidateIds },
          status: 'pending'
        },
        attributes: ['existing_site_id']
      });
      const pendingSiteIds = new Set(pendingTransitions.map(r => r.existing_site_id));

      let available = candidates.filter(s => !pendingSiteIds.has(s.id));

      // Optional filters
      if (filters.province) available = available.filter(s => s.province === filters.province);
      if (filters.region) available = available.filter(s => s.region === filters.region);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        available = available.filter(s => s.name.toLowerCase().includes(q));
      }
      if (filters.claim_type) {
        if (filters.claim_type === 'transition') {
          available = available.filter(s => s.siteStaff && s.siteStaff.length > 0);
        } else if (filters.claim_type === 'unassigned') {
          available = available.filter(s => !s.siteStaff || s.siteStaff.length === 0);
        }
      }

      // Paginate
      const totalItems = available.length;
      const paginated = available.slice(offset, offset + limit);

      const data = paginated.map(site => {
        const manager = site.siteStaff && site.siteStaff.length > 0
          ? { id: site.siteStaff[0].id, full_name: site.siteStaff[0].full_name }
          : null;
        return {
          id: site.id,
          code: site.code,
          name: site.name,
          address: site.address,
          province: site.province,
          region: site.region,
          type: site.type,
          cover_image: site.cover_image,
          current_manager: manager,
          claim_type: manager ? 'transition' : 'unassigned'
        };
      });

      return {
        data,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit)
        }
      };
    } catch (error) {
      Logger.error('Get available sites for claim/transition error:', error);
      throw error;
    }
  }
}

module.exports = PilgrimSiteService;
