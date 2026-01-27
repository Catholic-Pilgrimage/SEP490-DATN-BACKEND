const { Site, User, VerificationRequest, SiteMedia, MassSchedule, Event, NearbyPlace } = require('../models');
const { Op } = require('sequelize');
const Logger = require('../utils/logger.util');

// Site code constants
const TYPE_CODES = {
  church: 'CH',
  shrine: 'SH',
  monastery: 'MO',
  center: 'CE',
  other: 'OT'
};

const REGION_CODES = {
  Bac: 'BAC',
  Trung: 'TRUNG',
  Nam: 'NAM'
};

class SiteService {

  /**
   * Generate unique site code: CHNAM001, SHBAC001, etc.
   */
  static async generateSiteCode(type, region) {
    const typeCode = TYPE_CODES[type] || 'OT';
    const regionCode = REGION_CODES[region] || 'NAM';
    const prefix = `${typeCode}${regionCode}`;

    const lastSite = await Site.findOne({
      where: { code: { [Op.like]: `${prefix}%` } },
      order: [['code', 'DESC']]
    });

    let nextNumber = 1;
    if (lastSite && lastSite.code) {
      const lastNumber = parseInt(lastSite.code.replace(prefix, ''));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }

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
   * Manager: Create site (only if no site exists - for recovery)
   */
  static async createManagerSite(managerId, siteData) {
    try {
      const manager = await User.findByPk(managerId);
      if (!manager) {
        throw new Error('Manager not found');
      }
      if (manager.role !== 'manager') {
        throw new Error('Only managers can create sites');
      }
      
   
      if (manager.site_id) {
        const existingSite = await Site.findByPk(manager.site_id);
        if (existingSite) {
          throw new Error('Manager already has a site');
        }
        
        Logger.info(`Manager ${managerId} site was deleted, allowing new site creation`);
      }


      const verificationRequest = await VerificationRequest.findOne({
        where: { 
          [Op.or]: [
            { user_id: managerId },
            { applicant_email: manager.email }
          ],
          status: 'approved'
        }
      });

      const {
        name, description, history, address, province, district,
        latitude, longitude, region, type, patron_saint,
        cover_image, opening_hours, contact_info
      } = siteData;

      const siteName = name || verificationRequest?.site_name;
      const siteProvince = province || verificationRequest?.site_province;
      const siteAddress = address || verificationRequest?.site_address;
      const siteType = type || verificationRequest?.site_type || 'church';
      const siteRegion = region || verificationRequest?.site_region || 'Nam';

      if (!siteName) throw new Error('Site name is required');
      if (!siteProvince) throw new Error('Province is required');

    
      const existingSite = await Site.findOne({
        where: { name: siteName.trim(), province: siteProvince.trim() }
      });
      if (existingSite) {
        throw new Error('Site already exists in this province');
      }

      const code = await this.generateSiteCode(siteType, siteRegion);

      const site = await Site.create({
        code,
        name: siteName.trim(),
        description,
        history,
        address: siteAddress,
        province: siteProvince.trim(),
        district: district?.trim(),
        latitude,
        longitude,
        region: siteRegion,
        type: siteType,
        patron_saint,
        cover_image,
        opening_hours,
        contact_info,
        created_by: managerId,
        is_active: false 
      });

      
      await User.update({ site_id: site.id }, { where: { id: managerId } });

      Logger.info(`Site created by manager ${managerId}: ${site.code} - ${site.name}`);
      return this.formatSiteResponse(site, manager);
    } catch (error) {
      Logger.error('Manager create site error:', error);
      throw error;
    }
  }

  /**
   * Manager: Get my site
   */
  static async getManagerSite(managerId) {
    try {
      const manager = await User.findByPk(managerId);
      if (!manager) throw new Error('Manager not found');
      if (!manager.site_id) throw new Error('Manager has no site');

      const site = await Site.findByPk(manager.site_id);
      if (!site) throw new Error('Site not found');

      // Get creator info
      const creator = await User.findByPk(site.created_by);
      return this.formatSiteResponse(site, creator);
    } catch (error) {
      Logger.error('Get manager site error:', error);
      throw error;
    }
  }

  /**
   * Manager: Update my site
   */
  static async updateManagerSite(managerId, updateData) {
    try {
      const manager = await User.findByPk(managerId);
      if (!manager) throw new Error('Manager not found');
      if (!manager.site_id) throw new Error('Manager has no site');

      const site = await Site.findByPk(manager.site_id);
      if (!site) throw new Error('Site not found');

      // Manager can update these fields (not status)
      const allowedFields = [
        'name', 'description', 'history', 'address', 'province', 'district',
        'latitude', 'longitude', 'patron_saint', 'cover_image',
        'opening_hours', 'contact_info'
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

      // Check duplicate if name/province changed
      if (dataToUpdate.name || dataToUpdate.province) {
        const checkName = dataToUpdate.name || site.name;
        const checkProvince = dataToUpdate.province || site.province;
        const existingSite = await Site.findOne({
          where: {
            name: checkName,
            province: checkProvince,
            id: { [Op.ne]: site.id }
          }
        });
        if (existingSite) throw new Error('Site already exists');
      }

      await site.update(dataToUpdate);
      Logger.info(`Site updated by manager ${managerId}: ${site.code}`);

      // Get creator info
      const creator = await User.findByPk(site.created_by);
      return this.formatSiteResponse(site, creator);
    } catch (error) {
      Logger.error('Manager update site error:', error);
      throw error;
    }
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
   * Admin: Get site by ID
   */
  static async getSiteById(siteId) {
    try {
      const site = await Site.findByPk(siteId);
      if (!site) throw new Error('Site not found');

      // Get creator info
      const creator = await User.findByPk(site.created_by);
      return this.formatSiteResponse(site, creator);
    } catch (error) {
      Logger.error('Get site by ID error:', error);
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

      // Get creator info
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

      const { SiteMedia } = require('../models');
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

      const { MassSchedule } = require('../models');
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
        const today = new Date().toISOString().split('T')[0];
        where.start_date = { [Op.gte]: today };
      }

      const { Event } = require('../models');
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
}

module.exports = SiteService;
