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
     * Guest/Pilgrim: Submit transition request to manage existing site
     */
    static async createTransitionRequest(userId, data) {
        try {
            const { Site } = require('../models');

            // Validate existing_site_id
            if (!data.existing_site_id) {
                throw new Error('existing_site_id is required');
            }

            // Check if site exists and is active
            const site = await Site.findOne({
                where: {
                    id: data.existing_site_id,
                    is_active: true
                }
            });

            if (!site) {
                throw new Error('Site not found or not active');
            }

            // Check if site has a current manager
            const currentManager = await User.findOne({
                where: {
                    site_id: data.existing_site_id,
                    role: 'manager',
                    status: 'active'
                }
            });

            if (!currentManager) {
                throw new Error('This site does not have a manager. Use normal verification request instead.');
            }

            let user = null;
            let applicantEmail = null;
            let applicantName = null;
            let applicantPhone = null;

            // Case 1: Logged in user (pilgrim)
            if (userId) {
                user = await User.findByPk(userId);
                if (!user) {
                    throw new Error('User not found');
                }
                if (user.role !== 'pilgrim') {
                    throw new Error('Only pilgrims can submit transition requests');
                }

                // Check if user already has a pending request
                const existingRequest = await VerificationRequest.findOne({
                    where: {
                        user_id: userId,
                        status: 'pending'
                    }
                });
                if (existingRequest) {
                    throw new Error('You already have a pending verification request');
                }
            }
            // Case 2: Guest
            else {
                if (!data.applicant_email || !data.applicant_name) {
                    throw new Error('applicant_email and applicant_name are required for guest');
                }

                applicantEmail = data.applicant_email.toLowerCase().trim();
                applicantName = data.applicant_name.trim();
                applicantPhone = data.applicant_phone?.trim();

                // Check if email already exists
                const existingUser = await User.findOne({ where: { email: applicantEmail } });
                if (existingUser) {
                    throw new Error('Email already registered. Please login first.');
                }

                // Check if guest already has a pending request
                const existingRequest = await VerificationRequest.findOne({
                    where: {
                        applicant_email: applicantEmail,
                        status: 'pending'
                    }
                });
                if (existingRequest) {
                    throw new Error('You already have a pending verification request with this email');
                }
            }

            // Check if this site already has a pending transition request
            const pendingTransition = await VerificationRequest.findOne({
                where: {
                    existing_site_id: data.existing_site_id,
                    status: 'pending'
                }
            });
            if (pendingTransition) {
                throw new Error('This site already has a pending transition request');
            }

            // Validate transition_reason
            if (!data.transition_reason) {
                throw new Error('transition_reason is required');
            }

            // Generate code
            const code = await this.generateCode();

            // Create transition request
            const request = await VerificationRequest.create({
                user_id: userId || null,
                code,
                applicant_email: applicantEmail,
                applicant_name: applicantName,
                applicant_phone: applicantPhone,
                // Site info from existing site
                site_name: site.name,
                site_address: site.address,
                site_province: site.province,
                site_type: site.type,
                site_region: site.region,
                // Transition specific fields
                existing_site_id: data.existing_site_id,
                transition_reason: data.transition_reason,
                certificate_url: data.certificate_url,
                introduction: data.introduction,
                status: 'pending'
            });

            Logger.info(`Transition request created: ${request.code} for site ${site.name}`);

            // Notify all admins
            await NotificationService.notifyAllAdmins('verification_submitted', {
                applicantName: user?.full_name || applicantName,
                isTransition: true,
                siteName: site.name
            });

            return {
                id: request.id,
                code: request.code,
                existing_site: {
                    id: site.id,
                    name: site.name,
                    current_manager: {
                        id: currentManager.id,
                        full_name: currentManager.full_name
                    }
                },
                transition_reason: request.transition_reason,
                certificate_url: request.certificate_url,
                introduction: request.introduction,
                status: request.status,
                created_at: request.created_at
            };
        } catch (error) {
            Logger.error('Create transition request error:', error);
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
                    certificate_url: r.certificate_url,
                    introduction: r.introduction,
                    status: r.status,
                    created_at: r.created_at,

                    // Transition request info
                    is_transition: !!r.existing_site_id,
                    existing_site_id: r.existing_site_id || null,
                    transition_reason: r.transition_reason || null,

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
            const { Site } = require('../models');

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

            // Build response
            const response = {
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

                // Transition request info
                is_transition: !!request.existing_site_id,
                existing_site_id: request.existing_site_id || null,
                transition_reason: request.transition_reason || null,

                applicant: request.user_id ? request.applicant : {
                    email: request.applicant_email,
                    full_name: request.applicant_name,
                    phone: request.applicant_phone,
                    is_guest: true
                },
                reviewer: request.reviewer
            };

            // If transition request, get old_manager info
            if (request.existing_site_id) {
                const site = await Site.findByPk(request.existing_site_id, {
                    include: [{
                        model: User,
                        as: 'siteStaff',
                        where: { role: 'manager' },
                        required: false,
                        attributes: ['id', 'full_name', 'email', 'phone']
                    }]
                });
                if (site && site.siteStaff && site.siteStaff.length > 0) {
                    response.old_manager = {
                        id: site.siteStaff[0].id,
                        full_name: site.siteStaff[0].full_name,
                        email: site.siteStaff[0].email,
                        phone: site.siteStaff[0].phone
                    };
                }
                response.existing_site = {
                    id: site?.id,
                    name: site?.name,
                    code: site?.code
                };
            }

            return response;
        } catch (error) {
            Logger.error('Get verification request by ID error:', error);
            throw error;
        }
    }

    /**
     * Admin: Approve verification request → Create Manager account (no site creation)
     */
    static async approveRequest(requestId, adminId) {
        const sequelize = require('../config/database');
        const transaction = await sequelize.transaction();

        try {
            const request = await VerificationRequest.findByPk(requestId, { transaction });

            if (!request) {
                throw new Error('Verification request not found');
            }

            if (request.status !== 'pending') {
                throw new Error('Request is not pending');
            }

            let user;
            let generatedPassword = null;
            let site;
            let oldManager = null;

            // ========== DETERMINE USER ==========
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
                }, { transaction });

                Logger.info(`Manager account created for guest: ${user.email}`);
            }
            // Case 2: Existing pilgrim user
            else {
                user = await User.findByPk(request.user_id, { transaction });
                if (!user) {
                    throw new Error('User not found');
                }

                // Upgrade pilgrim to manager
                await user.update({
                    role: 'manager',
                    verified_at: new Date()
                }, { transaction });

                Logger.info(`Pilgrim upgraded to manager: ${user.email}`);
            }

            // ========== CHECK FOR TRANSITION FLOW ==========
            if (request.existing_site_id) {
                // ===== TRANSITION FLOW =====
                const { Site } = require('../models');

                site = await Site.findByPk(request.existing_site_id, { transaction });
                if (!site) {
                    throw new Error('Existing site not found');
                }

                // Find and demote old manager
                oldManager = await User.findOne({
                    where: {
                        site_id: request.existing_site_id,
                        role: 'manager'
                    },
                    transaction
                });

                if (oldManager) {
                    // Demote old manager to pilgrim
                    await oldManager.update({
                        role: 'pilgrim',
                        site_id: null
                    }, { transaction });

                    Logger.info(`Old manager demoted: ${oldManager.email}`);

                    // Mark Local Guides as inherited
                    await User.update({
                        inherited_from: oldManager.id,
                        inherited_at: new Date()
                    }, {
                        where: {
                            site_id: request.existing_site_id,
                            role: 'local_guide',
                            status: 'active'
                        },
                        transaction
                    });

                    Logger.info(`Local Guides marked as inherited from ${oldManager.email}`);
                }

                // Record old manager in request for audit
                await request.update({
                    old_manager_id: oldManager?.id
                }, { transaction });

                // Assign new manager to existing site
                await user.update({ site_id: site.id }, { transaction });

                Logger.info(`New manager ${user.email} assigned to existing site ${site.name}`);

            } else {
                // ===== NEW SITE FLOW (existing behavior) =====
                const { Site } = require('../models');
                const SiteService = require('./siteService');

                const siteCode = await SiteService.generateSiteCode(
                    request.site_type || 'church',
                    request.site_region || 'Nam'
                );

                site = await Site.create({
                    code: siteCode,
                    name: request.site_name,
                    address: request.site_address,
                    province: request.site_province,
                    type: request.site_type || 'church',
                    region: request.site_region || 'Nam',
                    description: request.introduction,
                    created_by: user.id,
                    is_active: false
                }, { transaction });

                await user.update({ site_id: site.id }, { transaction });

                Logger.info(`Site created: ${site.code} - ${site.name} (is_active: false) for manager ${user.email}`);
            }

            // ========== UPDATE REQUEST STATUS ==========
            await request.update({
                status: 'approved',
                reviewed_by: adminId,
                verified_at: new Date()
            }, { transaction });

            // ========== COMMIT TRANSACTION ==========
            await transaction.commit();

            // ========== SEND EMAILS (after commit to avoid rollback issues) ==========
            try {
                if (request.existing_site_id && oldManager) {
                    // Transition: Send email to old manager
                    await EmailService.sendManagerReplacedNotification(
                        oldManager.email,
                        oldManager.full_name,
                        site.name,
                        user.full_name
                    );

                    // Notify Local Guides
                    const localGuides = await User.findAll({
                        where: {
                            site_id: site.id,
                            role: 'local_guide',
                            status: 'active'
                        }
                    });

                    for (const guide of localGuides) {
                        await NotificationService.createNotification(
                            guide.id,
                            'manager_changed',
                            { siteName: site.name, newManagerName: user.full_name }
                        );
                    }
                }

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
                } else if (!request.existing_site_id) {
                    // Pilgrim (new site): Send approval email with site info
                    await EmailService.sendVerificationApprovedWithSite(
                        user.email,
                        user.full_name,
                        request.code,
                        site.name,
                        site.code
                    );
                } else {
                    // Pilgrim (transition): Send transition approval email
                    await EmailService.sendTransitionApproved(
                        user.email,
                        user.full_name,
                        site.name
                    );
                }
            } catch (emailError) {
                Logger.error('Failed to send email:', emailError);
            }

            Logger.info(`Verification request ${request.code} approved by admin ${adminId}`);

            return {
                id: request.id,
                code: request.code,
                status: 'approved',
                verified_at: request.verified_at,
                is_transition: !!request.existing_site_id,
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
                },
                old_manager: oldManager ? {
                    id: oldManager.id,
                    email: oldManager.email,
                    full_name: oldManager.full_name
                } : null
            };
        } catch (error) {
            await transaction.rollback();
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
