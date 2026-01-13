const { VerificationRequest, User } = require('../models');
const { Op } = require('sequelize');
const Logger = require('../utils/logger.util');
const EmailService = require('./emailService');

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
                    { site_name: { [Op.iLike]: `%${search}%` } }
                ];
            }

            const offset = (page - 1) * limit;

            const { rows: requests, count: total } = await VerificationRequest.findAndCountAll({
                where,
                include: [{
                    model: User,
                    as: 'applicant',
                    attributes: ['id', 'full_name', 'email', 'avatar_url']
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
                    site_province: r.site_province,
                    site_type: r.site_type,
                    site_region: r.site_region,
                    status: r.status,
                    created_at: r.created_at,
                    applicant: r.applicant
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
                        attributes: ['id', 'full_name', 'email', 'phone', 'avatar_url']
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
                applicant: request.applicant,
                reviewer: request.reviewer
            };
        } catch (error) {
            Logger.error('Get verification request by ID error:', error);
            throw error;
        }
    }

    /**
     * Admin: Approve verification request → User becomes Manager
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

            // Update request status
            await request.update({
                status: 'approved',
                reviewed_by: adminId,
                verified_at: new Date()
            });

           
            const user = await User.findByPk(request.user_id);

           
            await User.update(
                {
                    role: 'manager',
                    verified_at: new Date()
                },
                { where: { id: request.user_id } }
            );

           
            try {
                await EmailService.sendVerificationApproved(
                    user.email,
                    user.full_name,
                    request.code
                );
            } catch (emailError) {
                Logger.error('Failed to send approval email:', emailError);
               
            }

            Logger.info(`Verification request ${request.code} approved by admin ${adminId}`);

            return {
                id: request.id,
                code: request.code,
                status: request.status,
                verified_at: request.verified_at
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

            
            try {
                const user = await User.findByPk(request.user_id);
                await EmailService.sendVerificationRejected(
                    user.email,
                    user.full_name,
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
