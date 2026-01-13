const { Site } = require('../models');
const Logger = require('../utils/logger.util');

// Site code constants
const TYPE_CODES = {
  'church': 'CH',
  'shrine': 'SH',
  'monastery': 'MO',
  'center': 'CE',
  'other': 'OT'
};

const REGION_CODES = {
  'Bac': 'BAC',
  'Trung': 'TRUNG',
  'Nam': 'NAM'
};

class SiteService {
  /**
   * Generate unique site code: CHNAM001, SHBAC001, etc.
   * Uses Find Last + Increment to avoid duplicates when sites are deleted
   */
  static async generateSiteCode(type, region) {
    const { Op } = require('sequelize');
    const typeCode = TYPE_CODES[type];
    const regionCode = REGION_CODES[region];
    const prefix = `${typeCode}${regionCode}`;

    
    const lastSite = await Site.findOne({
      where: {
        code: { [Op.like]: `${prefix}%` }
      },
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
   * Create new site (Admin only)
   */
  static async createSite(siteData, adminId) {
    try {
      const {
        name,
        description,
        history,
        address,
        province,
        district,
        latitude,
        longitude,
        region,
        type,
        patron_saint,
        cover_image,
        opening_hours,
        contact_info
      } = siteData;

      const existingSite = await Site.findOne({
        where: {
          name: name.trim(),
          province: province?.trim()
        }
      });

      if (existingSite) {
        throw new Error('Site already exists');
      }


      const code = await this.generateSiteCode(type, region);

      const site = await Site.create({
        code,
        name: name.trim(),
        description,
        history,
        address,
        province: province?.trim(),
        district: district?.trim(),
        latitude,
        longitude,
        region,
        type,
        patron_saint,
        cover_image,
        opening_hours,
        contact_info,
        created_by: adminId,
        status: 'approved',
        is_active: true
      });

      Logger.info(`Site created by admin: ${site.code} - ${site.name}`);

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
        status: site.status,
        is_active: site.is_active,
        created_by: site.created_by,
        created_at: site.created_at,
        updated_at: site.updated_at
      };
    } catch (error) {
      Logger.error('Create site error:', error);
      throw error;
    }
  }

  /**
   * Get all sites with pagination and filters (Admin)
   */
  static async getSites(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        region,
        type,
        status,
        is_active,
        search
      } = options;

      const where = {};


      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }

      // Filter by region
      if (region && ['Bac', 'Trung', 'Nam'].includes(region)) {
        where.region = region;
      }

      // Filter by type
      if (type && ['church', 'shrine', 'monastery', 'center', 'other'].includes(type)) {
        where.type = type;
      }

      // Filter by status
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        where.status = status;
      }

      // Search by name or code
      if (search) {
        const { Op } = require('sequelize');
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
          latitude: site.latitude,
          longitude: site.longitude,
          region: site.region,
          type: site.type,
          patron_saint: site.patron_saint,
          cover_image: site.cover_image,
          status: site.status,
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
   * Get site by ID (Admin)
   */
  static async getSiteById(siteId) {
    try {
      const site = await Site.findByPk(siteId);

      if (!site) {
        throw new Error('Site not found');
      }

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
        status: site.status,
        is_active: site.is_active,
        created_by: site.created_by,
        created_at: site.created_at,
        updated_at: site.updated_at
      };
    } catch (error) {
      Logger.error('Get site by ID error:', error);
      throw error;
    }
  }

  /**
   * Soft delete site (set is_active = false)
   */
  static async deleteSite(siteId) {
    try {
      const site = await Site.findByPk(siteId);

      if (!site) {
        throw new Error('Site not found');
      }

      if (!site.is_active) {
        throw new Error('Site already deleted');
      }

      await site.update({ is_active: false });

      Logger.info(`Site soft deleted: ${site.code} - ${site.name}`);

      return {
        id: site.id,
        code: site.code,
        name: site.name,
        is_active: site.is_active
      };
    } catch (error) {
      Logger.error('Delete site error:', error);
      throw error;
    }
  }

  /**
   * Restore soft deleted site (set is_active = true)
   */
  static async restoreSite(siteId) {
    try {
      const site = await Site.findByPk(siteId);

      if (!site) {
        throw new Error('Site not found');
      }

      if (site.is_active) {
        throw new Error('Site is not deleted');
      }

      await site.update({ is_active: true });

      Logger.info(`Site restored: ${site.code} - ${site.name}`);

      return {
        id: site.id,
        code: site.code,
        name: site.name,
        is_active: site.is_active
      };
    } catch (error) {
      Logger.error('Restore site error:', error);
      throw error;
    }
  }

  /**
   * Update site information (Admin only)
   */
  static async updateSite(siteId, updateData) {
    try {
      const site = await Site.findByPk(siteId);

      if (!site) {
        throw new Error('Site not found');
      }


      const allowedFields = [
        'name', 'description', 'history', 'address', 'province', 'district',
        'latitude', 'longitude', 'region', 'type', 'patron_saint',
        'cover_image', 'opening_hours', 'contact_info', 'status'
      ];


      const dataToUpdate = {};
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {

          if (typeof updateData[field] === 'string' && ['name', 'address', 'province', 'district', 'patron_saint'].includes(field)) {
            dataToUpdate[field] = updateData[field].trim();
          } else {
            dataToUpdate[field] = updateData[field];
          }
        }
      }


      if (dataToUpdate.name || dataToUpdate.province) {
        const { Op } = require('sequelize');
        const checkName = dataToUpdate.name || site.name;
        const checkProvince = dataToUpdate.province || site.province;

        const existingSite = await Site.findOne({
          where: {
            name: checkName,
            province: checkProvince,
            id: { [Op.ne]: siteId }
          }
        });

        if (existingSite) {
          throw new Error('Site already exists');
        }
      }

      await site.update(dataToUpdate);

      Logger.info(`Site updated: ${site.code} - ${site.name}`);

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
        status: site.status,
        is_active: site.is_active,
        created_by: site.created_by,
        created_at: site.created_at,
        updated_at: site.updated_at
      };
    } catch (error) {
      Logger.error('Update site error:', error);
      throw error;
    }
  }
}

module.exports = SiteService;
