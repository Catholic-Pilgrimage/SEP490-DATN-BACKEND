const { User, Site } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Logger = require('../utils/logger.util');
const EmailService = require('./emailService');

class LocalGuideService {

    /**
     * Generate random password (12 characters)
     */
    static generatePassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    /**
     * Manager: Create Local Guide account
     * - Auto-generate password
     * - Assign to Manager's site
     * - Send email with credentials
     */
    static async createLocalGuide(managerId, data) {
        try {

            const manager = await User.findByPk(managerId, {
                include: [{ model: Site, as: 'assignedSite' }]
            });

            if (!manager) {
                throw new Error('Manager not found');
            }

            if (manager.role !== 'manager') {
                throw new Error('Only managers can create local guides');
            }

            if (!manager.site_id) {
                throw new Error('Manager has no site');
            }


            const { email, full_name, phone } = data;

            const existingUser = await User.findOne({
                where: { email: email.toLowerCase().trim() }
            });

            if (existingUser) {
                throw new Error('Email already exists');
            }


            const plainPassword = this.generatePassword();
            const hashedPassword = await bcrypt.hash(plainPassword, 10);


            const localGuide = await User.create({
                email: email.toLowerCase().trim(),
                password_hash: hashedPassword,
                full_name: full_name.trim(),
                phone: phone?.trim() || null,
                role: 'local_guide',
                site_id: manager.site_id,
                status: 'active',
                language: 'vi'
            });


            try {
                await EmailService.sendLocalGuideCredentials(
                    localGuide.email,
                    localGuide.full_name,
                    plainPassword,
                    manager.assignedSite.name
                );
            } catch (emailError) {
                Logger.error('Failed to send Local Guide credentials email:', emailError);

            }

            Logger.info(`Local Guide ${localGuide.email} created by Manager ${managerId}`);

            return {
                id: localGuide.id,
                email: localGuide.email,
                full_name: localGuide.full_name,
                phone: localGuide.phone,
                role: localGuide.role,
                status: localGuide.status,
                site: {
                    id: manager.assignedSite.id,
                    code: manager.assignedSite.code,
                    name: manager.assignedSite.name
                },
                created_at: localGuide.created_at
            };
        } catch (error) {
            Logger.error('Create Local Guide error:', error);
            throw error;
        }
    }

    /**
     * Manager: Get all Local Guides of their site with filter & pagination
     */
    static async getLocalGuides(managerId, filters = {}) {
        try {
            const manager = await User.findByPk(managerId);

            if (!manager) {
                throw new Error('Manager not found');
            }

            if (!manager.site_id) {
                throw new Error('Manager has no site');
            }


            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 10;
            const offset = (page - 1) * limit;


            const where = {
                site_id: manager.site_id,
                role: 'local_guide'
            };


            if (filters.status) {
                where.status = filters.status;
            }


            if (filters.search) {
                where[Op.or] = [
                    { full_name: { [Op.iLike]: `%${filters.search}%` } },
                    { email: { [Op.iLike]: `%${filters.search}%` } },
                    { phone: { [Op.iLike]: `%${filters.search}%` } }
                ];
            }


            const totalItems = await User.count({ where });


            const localGuides = await User.findAll({
                where,
                attributes: ['id', 'email', 'full_name', 'phone', 'status', 'created_at'],
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            return {
                data: localGuides,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit)
                }
            };
        } catch (error) {
            Logger.error('Get Local Guides error:', error);
            throw error;
        }
    }

    /**
     * Manager: Update Local Guide Status (block/unblock)
     */
    static async updateLocalGuideStatus(managerId, localGuideId, status) {
        try {
            const manager = await User.findByPk(managerId);

            if (!manager) {
                throw new Error('Manager not found');
            }

            if (!manager.site_id) {
                throw new Error('Manager has no site');
            }

            // Validate status
            if (!['active', 'banned'].includes(status)) {
                throw new Error('Invalid status');
            }

            const localGuide = await User.findOne({
                where: {
                    id: localGuideId,
                    site_id: manager.site_id,
                    role: 'local_guide'
                }
            });

            if (!localGuide) {
                throw new Error('Local Guide not found');
            }


            if (localGuide.status === status) {
                throw new Error(`Local Guide is already ${status}`);
            }

            await localGuide.update({ status });

            Logger.info(`Local Guide ${localGuide.email} status changed to ${status} by Manager ${managerId}`);

            return {
                id: localGuide.id,
                email: localGuide.email,
                full_name: localGuide.full_name,
                status: localGuide.status
            };
        } catch (error) {
            Logger.error('Update Local Guide Status error:', error);
            throw error;
        }
    }
}

module.exports = LocalGuideService;
