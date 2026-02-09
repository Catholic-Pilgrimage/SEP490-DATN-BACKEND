const { VerificationRequest, User } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const EmailService = require('../shared/emailService');
const NotificationService = require('../shared/notificationService');
const { ManagerSiteService } = require('../manager');

class AdminVerificationService {
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
            const { Site } = require('../../models');

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
        const sequelize = require('../../config/database');
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
                const { Site } = require('../../models');

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
                const { Site } = require('../../models');
                const siteCode = await ManagerSiteService.generateSiteCode(
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

module.exports = AdminVerificationService;
