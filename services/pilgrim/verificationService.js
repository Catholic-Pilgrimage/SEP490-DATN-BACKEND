const { VerificationRequest, User } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const NotificationService = require('../shared/notificationService');

class PilgrimVerificationService {
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
            const { Site } = require('../../models');

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
}

module.exports = PilgrimVerificationService;
