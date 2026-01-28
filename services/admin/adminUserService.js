const { User } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');

class AdminUserService {
  /**
   * Lấy danh sách users với pagination, filter, search
   * @param {Object} options - { page, limit, role, status, search }
   * @returns {Object} - { users, pagination }
   */
  static async getUsers(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        role,
        status,
        search
      } = options;

      const offset = (page - 1) * limit;
      const where = {};

      if (role && ['admin', 'pilgrim', 'local_guide', 'manager'].includes(role)) {
        where.role = role;
      }

      if (status && ['active', 'banned'].includes(status)) {
        where.status = status;
      }

      if (search) {
        where[Op.or] = [
          { email: { [Op.iLike]: `%${search}%` } },
          { full_name: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password_hash'] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      const totalPages = Math.ceil(count / limit);

      Logger.info(`Admin fetched users: page ${page}, total ${count}`);

      return {
        users: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      };
    } catch (error) {
      Logger.error('Get users error:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết 1 user theo ID
   * @param {string} userId - ID của user
   * @returns {Object} - User info
   */
  static async getUserById(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        return null;
      }

      Logger.info(`Admin fetched user: ${userId}`);
      return user;
    } catch (error) {
      Logger.error('Get user by ID error:', error);
      throw error;
    }
  }

  /**
   * Cập nhật status của user (block/unblock)
   * @param {string} userId - ID của user
   * @param {string} status - 'active' hoặc 'banned'
   * @returns {Object} - Updated user
   */
  static async updateUserStatus(userId, status) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return null;
      }

      if (user.role === 'admin') {
        throw new Error('Cannot change admin status');
      }

      await user.update({ status });

      Logger.info(`Admin updated user status: ${userId} -> ${status}`);

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status
      };
    } catch (error) {
      Logger.error('Update user status error:', error);
      throw error;
    }
  }

  /**
   * Admin cập nhật thông tin user (bao gồm cả role)
   * @param {string} userId - ID của user
   * @param {Object} updateData - Dữ liệu cần cập nhật
   * @returns {Object} - Updated user
   */
  static async updateUser(userId, updateData) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        return null;
      }

      const allowedFields = ['full_name', 'phone', 'date_of_birth', 'role', 'site_id'];
      const dataToUpdate = {};

      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          dataToUpdate[field] = updateData[field];
        }
      });

      if (dataToUpdate.role && !['pilgrim', 'local_guide', 'manager'].includes(dataToUpdate.role)) {
        throw new Error('Invalid role');
      }

      if (dataToUpdate.role && user.role === 'admin') {
        throw new Error('Cannot change admin role');
      }

      // Validate role-site_id relationship
      if (dataToUpdate.role) {
        if (['manager', 'local_guide'].includes(dataToUpdate.role)) {
          const finalSiteId = dataToUpdate.site_id !== undefined ? dataToUpdate.site_id : user.site_id;
          if (!finalSiteId) {
            throw new Error('Manager and Local Guide must be assigned to a site');
          }
        }
        if (dataToUpdate.role === 'pilgrim') {
          dataToUpdate.site_id = null;
        }
      }

      if (dataToUpdate.site_id !== undefined) {
        const finalRole = dataToUpdate.role || user.role;
        if (finalRole === 'pilgrim' && dataToUpdate.site_id !== null) {
          throw new Error('Pilgrim cannot be assigned to a site');
        }
        if (['manager', 'local_guide'].includes(finalRole) && !dataToUpdate.site_id) {
          throw new Error('Manager and Local Guide must be assigned to a site');
        }
      }

      await user.update(dataToUpdate);

      Logger.info(`Admin updated user: ${userId}`);

      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        date_of_birth: user.date_of_birth,
        role: user.role,
        status: user.status,
        site_id: user.site_id,
        verified_at: user.verified_at
      };
    } catch (error) {
      Logger.error('Update user error:', error);
      throw error;
    }
  }
}

module.exports = AdminUserService;
