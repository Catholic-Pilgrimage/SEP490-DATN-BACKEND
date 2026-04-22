const { Site, User, VerificationRequest } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const NotificationService = require('../shared/notificationService');

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

class ManagerSiteService {

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

      // Check readiness BEFORE update
      const checkReadiness = (s) => {
        return Boolean(
          s.name && s.province && s.address && s.latitude && s.longitude
          && s.cover_image && s.description && s.description.length >= 20
          && s.opening_hours && s.history && s.history.length >= 20
          && s.contact_info
        );
      };
      const wasReady = checkReadiness(site);

      await site.update(dataToUpdate);
      Logger.info(`Site updated by manager ${managerId}: ${site.code}`);

      // Check readiness AFTER update
      const isReadyNow = checkReadiness(site);

      // If it transitioned from not ready to ready AND is currently inactive, notify admins
      if (!site.is_active && !wasReady && isReadyNow) {
        await NotificationService.notifyAllAdmins('site_ready_for_publish', {
          siteName: site.name,
          siteCode: site.code,
          managerName: manager.full_name
        });
        Logger.info(`Site ${site.code} is now fully populated. Notifying admins for review.`);
      }

      // Notify users who favorited this site 
      const importantFields = ['opening_hours', 'address', 'contact_info'];
      const updatedImportantFields = importantFields.filter(f => dataToUpdate[f] !== undefined);

      if (updatedImportantFields.length > 0) {
        const updateTypeMap = {
          opening_hours: 'giờ hoạt động',
          address: 'địa chỉ',
          contact_info: 'thông tin liên hệ'
        };
        const updateType = updatedImportantFields.map(f => updateTypeMap[f]).join(', ');
        await NotificationService.notifyFavoriteSiteUsers(site.id, updateType);
      }

      // Get creator info
      const creator = await User.findByPk(site.created_by);
      return this.formatSiteResponse(site, creator);
    } catch (error) {
      Logger.error('Manager update site error:', error);
      throw error;
    }
  }
}

module.exports = ManagerSiteService;
