const { Site, User, SiteMedia, MassSchedule, Event, NearbyPlace, GuideShiftSubmission, GuideShift } = require('../../models');
const { Op, fn, col } = require('sequelize');
const Logger = require('../../utils/logger.util');

class AdminSiteService {
  /**
   * Format site response with creator info
   */
  static formatSiteResponse(site, creator = null) {
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
      created_by: creator ? {
        id: creator.id,
        full_name: creator.full_name,
        email: creator.email
      } : site.created_by,
      created_at: site.created_at,
      updated_at: site.updated_at
    };
  }

  /**
   * Admin: Get all sites with filters
   */
  static async getSites(options = {}) {
    try {
      const { page = 1, limit = 10, region, type, is_active, search } = options;
      const where = {};

      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }
      if (region && ['Bac', 'Trung', 'Nam'].includes(region)) {
        where.region = region;
      }
      if (type && ['church', 'shrine', 'monastery', 'center', 'other'].includes(type)) {
        where.type = type;
      }
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { code: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;
      const { rows: sites, count: total } = await Site.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']]
      });

      return {
        sites: sites.map(site => ({
          id: site.id,
          code: site.code,
          name: site.name,
          description: site.description,
          address: site.address,
          province: site.province,
          district: site.district,
          region: site.region,
          type: site.type,
          patron_saint: site.patron_saint,
          cover_image: site.cover_image,
          is_active: site.is_active,
          created_at: site.created_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      Logger.error('Get sites error:', error);
      throw error;
    }
  }

  /**
   * Admin: Get site by ID with stats
   */
  static async getSiteById(siteId) {
    try {
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');


      const creator = await User.findByPk(site.created_by);


      const manager = await User.findOne({
        where: { site_id: siteId, role: 'manager' },
        attributes: ['id', 'full_name', 'email', 'phone', 'avatar_url']
      });


      const stats = await this.getSiteStats(siteId);

      return {
        ...this.formatSiteResponse(site, creator),
        manager,
        stats
      };
    } catch (error) {
      Logger.error('Get site by ID error:', error);
      throw error;
    }
  }

  /**
   * Admin: Get site statistics
   */
  static async getSiteStats(siteId) {
    try {

      const localGuidesCount = await User.count({
        where: { site_id: siteId, role: 'local_guide' }
      });


      const mediaStats = await SiteMedia.findAll({
        where: { site_id: siteId },
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const media = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      };
      mediaStats.forEach(stat => {
        media[stat.status] = parseInt(stat.count);
        media.total += parseInt(stat.count);
      });


      const schedulesStats = await MassSchedule.findAll({
        where: { site_id: siteId },
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const schedules = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      };
      schedulesStats.forEach(stat => {
        schedules[stat.status] = parseInt(stat.count);
        schedules.total += parseInt(stat.count);
      });


      const eventsStats = await Event.findAll({
        where: { site_id: siteId },
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const events = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      };
      eventsStats.forEach(stat => {
        events[stat.status] = parseInt(stat.count);
        events.total += parseInt(stat.count);
      });

      const upcomingCount = await Event.count({
        where: {
          site_id: siteId,
          status: 'approved',
          time_state: 'upcoming'
        }
      });
      events.upcoming = upcomingCount;


      const nearbyStats = await NearbyPlace.findAll({
        where: { site_id: siteId },
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const nearby_places = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      };
      nearbyStats.forEach(stat => {
        nearby_places[stat.status] = parseInt(stat.count);
        nearby_places.total += parseInt(stat.count);
      });


      const shiftsStats = await GuideShiftSubmission.findAll({
        where: { site_id: siteId },
        attributes: [
          'status',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const shifts = {
        total_submissions: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      };
      shiftsStats.forEach(stat => {
        shifts[stat.status] = parseInt(stat.count);
        shifts.total_submissions += parseInt(stat.count);
      });

      return {
        local_guides: localGuidesCount,
        media,
        schedules,
        events,
        nearby_places,
        shifts
      };
    } catch (error) {
      Logger.error('Get site stats error:', error);
      throw error;
    }
  }

  /**
   * Admin: Update site (can change status)
   */
  static async updateSite(siteId, updateData) {
    try {
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');

      const allowedFields = [
        'name', 'description', 'history', 'address', 'province', 'district',
        'latitude', 'longitude', 'region', 'type', 'patron_saint',
        'cover_image', 'opening_hours', 'contact_info'
      ];

      const dataToUpdate = {};
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          if (typeof updateData[field] === 'string' &&
            ['name', 'address', 'province', 'district', 'patron_saint'].includes(field)) {
            dataToUpdate[field] = updateData[field].trim();
          } else {
            dataToUpdate[field] = updateData[field];
          }
        }
      }

      if (dataToUpdate.name || dataToUpdate.province) {
        const checkName = dataToUpdate.name || site.name;
        const checkProvince = dataToUpdate.province || site.province;
        const existingSite = await Site.findOne({
          where: {
            name: checkName,
            province: checkProvince,
            id: { [Op.ne]: siteId }
          }
        });
        if (existingSite) throw new Error('Site already exists');
      }

      await site.update(dataToUpdate);
      Logger.info(`Site updated by admin: ${site.code}`);

      const creator = await User.findByPk(site.created_by);
      return this.formatSiteResponse(site, creator);
    } catch (error) {
      Logger.error('Update site error:', error);
      throw error;
    }
  }

  /**
   * Admin: Soft delete site
   */
  static async deleteSite(siteId) {
    try {
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');
      if (!site.is_active) throw new Error('Site already deleted');

      await site.update({ is_active: false });
      Logger.info(`Site soft deleted: ${site.code}`);
      return { id: site.id, code: site.code, name: site.name, is_active: site.is_active };
    } catch (error) {
      Logger.error('Delete site error:', error);
      throw error;
    }
  }

  /**
   * Admin: Restore site
   */
  static async restoreSite(siteId) {
    try {
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');
      if (site.is_active) throw new Error('Site is not deleted');

      await site.update({ is_active: true });
      Logger.info(`Site restored: ${site.code}`);
      return { id: site.id, code: site.code, name: site.name, is_active: site.is_active };
    } catch (error) {
      Logger.error('Restore site error:', error);
      throw error;
    }
  }

  /**
   * Admin: Get local guides of a site
   */
  static async getSiteGuides(siteId, filters = {}) {
    try {
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const { count, rows } = await User.findAndCountAll({
        where: { site_id: siteId, role: 'local_guide' },
        attributes: ['id', 'full_name', 'email', 'phone', 'avatar_url', 'created_at'],
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
        guides: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      Logger.error('Get site guides error:', error);
      throw error;
    }
  }

  /**
   * Admin: Get shift submissions of a site
   */
  static async getSiteShifts(siteId, filters = {}) {
    try {
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const where = { site_id: siteId };
      if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
        where.status = filters.status;
      }


      const { count, rows } = await GuideShiftSubmission.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'guide',
            attributes: ['id', 'full_name', 'email']
          },
          {
            model: GuideShift,
            as: 'shifts',
            attributes: ['id', 'day_of_week', 'start_time', 'end_time']
          }
        ],
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
        submissions: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      Logger.error('Get site shifts error:', error);
      throw error;
    }
  }

  /**
   * Admin: Get media of a site (all status)
   */
  static async getSiteMedia(siteId, filters = {}) {
    try {
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const where = { site_id: siteId };
      if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
        where.status = filters.status;
      }
      if (filters.type && ['image', 'video', 'model_3d'].includes(filters.type)) {
        where.type = filters.type;
      }

      const { count, rows } = await SiteMedia.findAndCountAll({
        where,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name', 'email']
        }],
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
        media: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      Logger.error('Get site media error:', error);
      throw error;
    }
  }

  /**
   * Admin: Get schedules of a site (all status)
   */
  static async getSiteSchedules(siteId, filters = {}) {
    try {
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 50;
      const offset = (page - 1) * limit;

      const where = { site_id: siteId };
      if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
        where.status = filters.status;
      }

      const { count, rows } = await MassSchedule.findAndCountAll({
        where,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name', 'email']
        }],
        order: [['time', 'ASC']],
        limit,
        offset
      });

      return {
        site: {
          id: site.id,
          code: site.code,
          name: site.name
        },
        schedules: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      Logger.error('Get site schedules error:', error);
      throw error;
    }
  }

  /**
   * Admin: Get events of a site (all status)
   */
  static async getSiteEvents(siteId, filters = {}) {
    try {
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const where = { site_id: siteId };
      if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
        where.status = filters.status;
      }

      const { count, rows } = await Event.findAndCountAll({
        where,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name', 'email']
        }],
        order: [['start_date', 'DESC']],
        limit,
        offset
      });

      return {
        site: {
          id: site.id,
          code: site.code,
          name: site.name
        },
        events: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      Logger.error('Get site events error:', error);
      throw error;
    }
  }

  /**
   * Admin: Get nearby places of a site (all status)
   */
  static async getSiteNearbyPlaces(siteId, filters = {}) {
    try {
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');

      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      const where = { site_id: siteId };
      if (filters.status && ['pending', 'approved', 'rejected'].includes(filters.status)) {
        where.status = filters.status;
      }
      if (filters.category && ['food', 'lodging', 'medical'].includes(filters.category)) {
        where.category = filters.category;
      }

      const { count, rows } = await NearbyPlace.findAndCountAll({
        where,
        include: [{
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name', 'email']
        }],
        order: [['distance_meters', 'ASC']],
        limit,
        offset
      });

      return {
        site: {
          id: site.id,
          code: site.code,
          name: site.name
        },
        nearby_places: rows,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      Logger.error('Get site nearby places error:', error);
      throw error;
    }
  }
}

module.exports = AdminSiteService;
