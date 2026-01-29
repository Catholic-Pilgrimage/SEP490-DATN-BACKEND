const { User, Site, GuideShift, GuideShiftSubmission } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Logger = require('../utils/logger.util');
const EmailService = require('./emailService');
const NotificationService = require('./notificationService');

class ManagerLocalGuideService {

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

    // ===================== SHIFT SUBMISSIONS =====================

    /**
     * Manager: Get all submissions of site with filter & pagination
     */
    static async getSubmissions(managerId, filters = {}) {
        try {
            const manager = await User.findByPk(managerId);

            if (!manager) {
                throw new Error('Manager not found');
            }

            if (!manager.site_id) {
                throw new Error('Manager has no site');
            }

            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 20;
            const offset = (page - 1) * limit;

            const where = {
                site_id: manager.site_id,
                is_active: true
            };

            if (filters.guide_id) {
                where.guide_id = filters.guide_id;
            }

            if (filters.status) {
                where.status = filters.status;
            }

            if (filters.week_start_date) {
                where.week_start_date = filters.week_start_date;
            }

            const totalItems = await GuideShiftSubmission.count({ where });

            const submissions = await GuideShiftSubmission.findAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'guide',
                        attributes: ['id', 'full_name', 'email', 'avatar_url', 'phone']
                    },
                    {
                        model: GuideShift,
                        as: 'shifts'
                    }
                ],
                order: [['created_at', 'DESC']],
                limit,
                offset
            });

            return {
                data: submissions,
                pagination: {
                    page,
                    limit,
                    totalItems,
                    totalPages: Math.ceil(totalItems / limit)
                }
            };
        } catch (error) {
            Logger.error('Manager get submissions error:', error);
            throw error;
        }
    }

    /**
     * Manager: Get submission detail with diff (if update type)
     */
    static async getSubmissionDetail(managerId, submissionId) {
        try {
            const manager = await User.findByPk(managerId);

            if (!manager || !manager.site_id) {
                throw new Error('Manager not found');
            }

            const submission = await GuideShiftSubmission.findOne({
                where: {
                    id: submissionId,
                    site_id: manager.site_id
                },
                include: [
                    {
                        model: User,
                        as: 'guide',
                        attributes: ['id', 'full_name', 'email', 'avatar_url', 'phone']
                    },
                    {
                        model: GuideShift,
                        as: 'shifts'
                    }
                ]
            });

            if (!submission) {
                throw new Error('Submission not found');
            }

            // Calculate diff if this is an update type
            let changes = null;
            if (submission.submission_type === 'update' && submission.previous_submission_id) {
                const previousSubmission = await GuideShiftSubmission.findOne({
                    where: { id: submission.previous_submission_id },
                    include: [{
                        model: GuideShift,
                        as: 'shifts'
                    }]
                });

                if (previousSubmission) {
                    const oldShifts = previousSubmission.shifts || [];
                    const newShifts = submission.shifts || [];

                    changes = newShifts.map(newS => {
                        const oldS = oldShifts.find(s => s.day_of_week === newS.day_of_week);
                        return {
                            day_of_week: newS.day_of_week,
                            old: oldS ? { start_time: oldS.start_time, end_time: oldS.end_time } : null,
                            new: { start_time: newS.start_time, end_time: newS.end_time },
                            is_changed: oldS ? (oldS.start_time !== newS.start_time || oldS.end_time !== newS.end_time) : true,
                            is_new: !oldS
                        };
                    });

                    // Check for removed shifts
                    oldShifts.forEach(oldS => {
                        const existsInNew = newShifts.some(s => s.day_of_week === oldS.day_of_week);
                        if (!existsInNew) {
                            changes.push({
                                day_of_week: oldS.day_of_week,
                                old: { start_time: oldS.start_time, end_time: oldS.end_time },
                                new: null,
                                is_changed: true,
                                is_removed: true
                            });
                        }
                    });

                    changes.sort((a, b) => a.day_of_week - b.day_of_week);
                }
            }

            return {
                ...submission.toJSON(),
                changes
            };
        } catch (error) {
            Logger.error('Manager get submission detail error:', error);
            throw error;
        }
    }

    /**
     * Manager: Update submission status (approve/reject)
     */
    static async updateSubmissionStatus(managerId, submissionId, data) {
        try {
            const { status, rejection_reason } = data;

            const manager = await User.findByPk(managerId);
            if (!manager || !manager.site_id) {
                throw new Error('Manager not found');
            }

            const submission = await GuideShiftSubmission.findOne({
                where: {
                    id: submissionId,
                    site_id: manager.site_id
                }
            });

            if (!submission) {
                throw new Error('Submission not found');
            }

            if (submission.status === status) {
                throw new Error(`Submission is already ${status}`);
            }

            // Validate rejection reason
            if (status === 'rejected' && !rejection_reason) {
                throw new Error('Rejection reason is required when rejecting submission');
            }

            const updateData = {
                status,
                approved_by: managerId,
                approved_at: new Date()
            };

            if (status === 'rejected') {
                updateData.rejection_reason = rejection_reason;
            } else if (status === 'approved') {
                updateData.rejection_reason = null;


                if (submission.previous_submission_id) {
                    await GuideShiftSubmission.update(
                        { is_active: false },
                        { where: { id: submission.previous_submission_id } }
                    );
                }
            }

            await submission.update(updateData);

            // Send notification to LocalGuide
            const notificationType = status === 'approved' ? 'shift_assigned' : 'shift_rejected';
            const weekStart = submission.week_start_date;
            await NotificationService.createNotification(notificationType, submission.guide_id, {
                weekStart: weekStart ? new Date(weekStart).toLocaleDateString('vi-VN') : '',
                reason: rejection_reason || ''
            });

            Logger.info(`Submission ${submissionId} status changed to ${status} by Manager ${managerId}`);

            return submission;
        } catch (error) {
            Logger.error('Update submission status error:', error);
            throw error;
        }
    }
}

module.exports = ManagerLocalGuideService;
