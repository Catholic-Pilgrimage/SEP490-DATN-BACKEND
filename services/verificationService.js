const { VerificationRequest, User } = require('../models');
const { Op } = require('sequelize');
const Logger = require('../utils/logger.util');
const EmailService = require('./emailService');
const NotificationService = require('./notificationService');

class VerificationService {
    /**
     * Generate verification request code: VR + MMDD + # (VR01131, VR01132...)
     */
    static async generateCode() {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const prefix = `VR${month}${day}`;


        const lastRequest = await VerificationRequest.findOne({
            where: {
                code: { [Op.like]: `${prefix}%` }
            },
            order: [['code', 'DESC']]
        });

        let sequence = 1;
        if (lastRequest && lastRequest.code) {

            const lastSequence = parseInt(lastRequest.code.replace(prefix, ''));
            sequence = lastSequence + 1;
        }

        return `${prefix}${sequence}`;
    }

    /**
     * Guest: Submit verification request (no account needed)
     */
    static async createGuestRequest(data) {
        try {
            // Validate required fields
            if (!data.applicant_email || !data.applicant_name) {
                throw new Error('Email and name are required');
            }
            if (!data.site_name || !data.site_province) {
                throw new Error('Site name and province are required');
            }

            const normalizedEmail = data.applicant_email.toLowerCase().trim();

            // Check if email already exists in users table
            const existingUser = await User.findOne({ where: { email: normalizedEmail } });
            if (existingUser) {
                throw new Error('Email already registered. Please login and submit verification request.');
            }

            // Check if guest already has a pending request with this email
            const existingRequest = await VerificationRequest.findOne({
                where: {
                    applicant_email: normalizedEmail,
                    status: 'pending'
                }
            });
            if (existingRequest) {
                throw new Error('You already have a pending verification request with this email');
            }

            // Generate code
            const code = await this.generateCode();

            // Create request (user_id = NULL for guest)
            const request = await VerificationRequest.create({
                user_id: null,
                code,
                applicant_email: normalizedEmail,
                applicant_name: data.applicant_name.trim(),
                applicant_phone: data.applicant_phone?.trim(),
                site_name: data.site_name,
                site_address: data.site_address,
                site_province: data.site_province,
                site_type: data.site_type,
                site_region: data.site_region,
                certificate_url: data.certificate_url,
                introduction: data.introduction,
                status: 'pending'
            });

            Logger.info(`Guest verification request created: ${request.code} by ${normalizedEmail}`);

            // Notify all admins
            await NotificationService.notifyAllAdmins('verification_submitted', {
                applicantName: data.applicant_name.trim()
            });

            return {
                id: request.id,
                code: request.code,
                applicant_email: request.applicant_email,
                applicant_name: request.applicant_name,
                site_name: request.site_name,
                site_province: request.site_province,
                status: request.status,
                created_at: request.created_at
            };
        } catch (error) {
            Logger.error('Create guest verification request error:', error);
            throw error;
        }
    }

    /**
     * Pilgrim: Submit verification request
     */
    static async createRequest(userId, data) {
        try {

            const user = await User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }
            if (user.role !== 'pilgrim') {
                throw new Error('Only pilgrims can submit verification requests');
            }


            const existingRequest = await VerificationRequest.findOne({
                where: {
                    user_id: userId,
                    status: 'pending'
                }
            });
            if (existingRequest) {
                throw new Error('You already have a pending verification request');
            }


            const code = await this.generateCode();


            const request = await VerificationRequest.create({
                user_id: userId,
                code,
                site_name: data.site_name,
                site_address: data.site_address,
                site_province: data.site_province,
                site_type: data.site_type,
                site_region: data.site_region,
                certificate_url: data.certificate_url,
                introduction: data.introduction,
                status: 'pending'
            });

            Logger.info(`Verification request created: ${request.code} by user ${userId}`);

            // Notify all admins
            await NotificationService.notifyAllAdmins('verification_submitted', {
                applicantName: user.full_name || user.email
            });

            return {
                id: request.id,
                code: request.code,
                site_name: request.site_name,
                site_address: request.site_address,
                site_province: request.site_province,
                site_type: request.site_type,
                site_region: request.site_region,
                certificate_url: request.certificate_url,
                introduction: request.introduction,
                status: request.status,
                created_at: request.created_at
            };
        } catch (error) {
            Logger.error('Create verification request error:', error);
            throw error;
        }
    }

    /**
     * Pilgrim: Get my verification request
     */
    static async getMyRequest(userId) {
        try {
            const request = await VerificationRequest.findOne({
                where: { user_id: userId },
                order: [['created_at', 'DESC']]
            });

            if (!request) {
                return null;
            }

            return {
                id: request.id,
                code: request.code,
                site_name: request.site_name,
                site_address: request.site_address,
                site_province: request.site_province,
                site_type: request.site_type,
                site_region: request.site_region,
                certificate_url: request.certificate_url,
                introduction: request.introduction,
                status: request.status,
                rejection_reason: request.rejection_reason,
                verified_at: request.verified_at,
                created_at: request.created_at
            };
        } catch (error) {
            Logger.error('Get my verification request error:', error);
            throw error;
        }
    }

    /**
     * Admin: Get all verification requests with filters
     */
    static async getRequests(options = {}) {
        try {
            const { page = 1, limit = 10, status, search } = options;
            const where = {};

            if (status && ['pending', 'approved', 'rejected'].includes(status)) {
                where.status = status;
            }

            if (search) {
                where[Op.or] = [
                    { code: { [Op.iLike]: `%${search}%` } },
                    { site_name: { [Op.iLike]: `%${search}%` } },
                    { applicant_email: { [Op.iLike]: `%${search}%` } },
                    { applicant_name: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const offset = (page - 1) * limit;

            const { rows: requests, count: total } = await VerificationRequest.findAndCountAll({
                where,
                include: [{
                    model: User,
                    as: 'applicant',
                    attributes: ['id', 'full_name', 'email', 'avatar_url'],
                    required: false
                }],
                limit: parseInt(limit),
                offset,
                order: [['created_at', 'DESC']]
            });

            return {
                requests: requests.map(r => ({
                    id: r.id,
                    code: r.code,
                    site_name: r.site_name,
                    site_address: r.site_address,
                    site_province: r.site_province,
                    site_type: r.site_type,
                    site_region: r.site_region,
                    status: r.status,
                    created_at: r.created_at,

                    applicant: r.user_id ? r.applicant : {
                        email: r.applicant_email,
                        full_name: r.applicant_name,
                        phone: r.applicant_phone,
                        is_guest: true
                    }
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            Logger.error('Get verification requests error:', error);
            throw error;
        }
    }

    /**
     * Admin: Get verification request by ID
     */
    static async getRequestById(requestId) {
        try {
            const request = await VerificationRequest.findByPk(requestId, {
                include: [
                    {
                        model: User,
                        as: 'applicant',
                        attributes: ['id', 'full_name', 'email', 'phone', 'avatar_url'],
                        required: false
                    },
                    {
                        model: User,
                        as: 'reviewer',
                        attributes: ['id', 'full_name', 'email']
                    }
                ]
            });

            if (!request) {
                throw new Error('Verification request not found');
            }

            return {
                id: request.id,
                code: request.code,
                site_name: request.site_name,
                site_address: request.site_address,
                site_province: request.site_province,
                site_type: request.site_type,
                site_region: request.site_region,
                certificate_url: request.certificate_url,
                introduction: request.introduction,
                status: request.status,
                rejection_reason: request.rejection_reason,
                verified_at: request.verified_at,
                created_at: request.created_at,
                updated_at: request.updated_at,

                applicant: request.user_id ? request.applicant : {
                    email: request.applicant_email,
                    full_name: request.applicant_name,
                    phone: request.applicant_phone,
                    is_guest: true
                },
                reviewer: request.reviewer
            };
        } catch (error) {
            Logger.error('Get verification request by ID error:', error);
            throw error;
        }
    }

    /**
     * Admin: Approve verification request → Create Manager account (no site creation)
     */
    static async approveRequest(requestId, adminId) {
        try {
            const request = await VerificationRequest.findByPk(requestId);

            if (!request) {
                throw new Error('Verification request not found');
            }

            if (request.status !== 'pending') {
                throw new Error('Request is not pending');
            }

            let user;
            let generatedPassword = null;

            // Case 1: Guest registration
            if (!request.user_id) {
                const bcrypt = require('bcryptjs');

                // Generate random password (8 characters)
                generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
                const password_hash = await bcrypt.hash(generatedPassword, 10);

                // Create manager account
                user = await User.create({
                    email: request.applicant_email,
                    password_hash,
                    full_name: request.applicant_name,
                    phone: request.applicant_phone,
                    role: 'manager',
                    status: 'active',
                    language: 'vi',
                    verified_at: new Date()
                });

                Logger.info(`Manager account created for guest: ${user.email}`);
            }
            // Case 2: Existing pilgrim user
            else {
                user = await User.findByPk(request.user_id);
                if (!user) {
                    throw new Error('User not found');
                }

                // Upgrade pilgrim to manager
                await user.update({
                    role: 'manager',
                    verified_at: new Date()
                });

                Logger.info(`Pilgrim upgraded to manager: ${user.email}`);
            }


            const { Site } = require('../models');
            const SiteService = require('./siteService');


            const siteCode = await SiteService.generateSiteCode(
                request.site_type || 'church',
                request.site_region || 'Nam'
            );

            const site = await Site.create({
                code: siteCode,
                name: request.site_name,
                address: request.site_address,
                province: request.site_province,
                type: request.site_type || 'church',
                region: request.site_region || 'Nam',
                description: request.introduction,
                created_by: user.id,
                is_active: false
            });


            await user.update({ site_id: site.id });

            Logger.info(`Site created: ${site.code} - ${site.name} (is_active: false) for manager ${user.email}`);


            try {
                if (generatedPassword) {
                    // Guest: Send welcome email with credentials + site info
                    await EmailService.sendManagerWelcome(
                        user.email,
                        user.full_name,
                        request.code,
                        generatedPassword,
                        site.name,
                        site.code,
                        site.address
                    );
                } else {
                    // Pilgrim: Send approval email with site info
                    await EmailService.sendVerificationApprovedWithSite(
                        user.email,
                        user.full_name,
                        request.code,
                        site.name,
                        site.code
                    );
                }
            } catch (emailError) {
                Logger.error('Failed to send email:', emailError);
            }


            await request.update({
                status: 'approved',
                reviewed_by: adminId,
                verified_at: new Date()
            });

            Logger.info(`Verification request ${request.code} approved by admin ${adminId}`);

            return {
                id: request.id,
                code: request.code,
                status: request.status,
                verified_at: request.verified_at,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role
                },
                site: {
                    id: site.id,
                    name: site.name,
                    is_active: site.is_active
                }
            };
        } catch (error) {
            Logger.error('Approve verification request error:', error);
            throw error;
        }
    }

    /**
     * Admin: Reject verification request
     */
    static async rejectRequest(requestId, adminId, rejectionReason) {
        try {
            const request = await VerificationRequest.findByPk(requestId);

            if (!request) {
                throw new Error('Verification request not found');
            }

            if (request.status !== 'pending') {
                throw new Error('Request is not pending');
            }

            if (!rejectionReason) {
                throw new Error('Rejection reason is required');
            }

            await request.update({
                status: 'rejected',
                reviewed_by: adminId,
                rejection_reason: rejectionReason
            });


            // Send rejection email
            try {
                let email, fullName;

                if (request.user_id) {
                    // Existing user (Pilgrim request)
                    const user = await User.findByPk(request.user_id);
                    email = user.email;
                    fullName = user.full_name;
                } else {
                    // Guest request
                    email = request.applicant_email;
                    fullName = request.applicant_name;
                }

                await EmailService.sendVerificationRejected(
                    email,
                    fullName,
                    request.code,
                    rejectionReason
                );
            } catch (emailError) {
                Logger.error('Failed to send rejection email:', emailError);
            }

            Logger.info(`Verification request ${request.code} rejected by admin ${adminId}`);

            return {
                id: request.id,
                code: request.code,
                status: request.status,
                rejection_reason: request.rejection_reason
            };
        } catch (error) {
            Logger.error('Reject verification request error:', error);
            throw error;
        }
    }
}

module.exports = VerificationService;
