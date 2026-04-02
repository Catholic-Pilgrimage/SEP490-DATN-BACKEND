const { Journal, User, Site, SiteMedia, UserCheckin, PlannerItem, Planner, PlannerMember } = require('../models');
const { Op } = require('sequelize');
const Logger = require('../utils/logger.util');

class JournalService {
    static formatModel3D(media) {
        if (!media) {
            return null;
        }

        return {
            id: media.id,
            code: media.code,
            url: media.url,
            type: media.type,
            caption: media.caption,
            created_at: media.created_at
        };
    }

    static async getApprovedModel3DMap(siteIds = []) {
        const normalizedSiteIds = [...new Set(siteIds.filter(Boolean))];
        if (normalizedSiteIds.length === 0) {
            return new Map();
        }

        const mediaList = await SiteMedia.findAll({
            where: {
                site_id: normalizedSiteIds,
                type: 'model_3d',
                status: 'approved',
                is_active: true
            },
            attributes: ['id', 'site_id', 'code', 'url', 'type', 'caption', 'created_at'],
            order: [['created_at', 'DESC']]
        });

        const mediaMap = new Map();
        for (const media of mediaList) {
            if (!mediaMap.has(media.site_id)) {
                mediaMap.set(media.site_id, this.formatModel3D(media));
            }
        }

        return mediaMap;
    }

    static async getCheckedInPlannerSites(userId, plannerId) {
        const checkins = await UserCheckin.findAll({
            where: {
                user_id: userId,
                status: 'checked_in'
            },
            include: [{
                model: PlannerItem,
                as: 'plannerItem',
                required: true,
                where: { planner_id: plannerId },
                attributes: ['id', 'site_id', 'leg_number', 'order_index'],
                include: [{
                    model: Site,
                    as: 'site',
                    attributes: ['id', 'name', 'code', 'province', 'cover_image']
                }]
            }],
            order: [
                ['checkin_date', 'ASC'],
                [{ model: PlannerItem, as: 'plannerItem' }, 'leg_number', 'ASC'],
                [{ model: PlannerItem, as: 'plannerItem' }, 'order_index', 'ASC']
            ]
        });

        const model3DMap = await this.getApprovedModel3DMap(
            checkins.map(checkin => checkin.plannerItem?.site_id)
        );

        return checkins.map(checkin => ({
            planner_item_id: checkin.planner_item_id,
            site_id: checkin.plannerItem?.site_id || null,
            leg_number: checkin.plannerItem?.leg_number || null,
            order_index: checkin.plannerItem?.order_index || null,
            checkin_date: checkin.checkin_date,
            model_3d: model3DMap.get(checkin.plannerItem?.site_id) || null,
            site: checkin.plannerItem?.site ? {
                id: checkin.plannerItem.site.id,
                name: checkin.plannerItem.site.name,
                code: checkin.plannerItem.site.code,
                province: checkin.plannerItem.site.province,
                cover_image: checkin.plannerItem.site.cover_image
            } : null
        }));
    }

    static async buildJournalResponse(journal) {
        const response = this.formatJournalResponse(journal);

        if (response.site_id) {
            const model3DMap = await this.getApprovedModel3DMap([response.site_id]);
            response.model_3d = model3DMap.get(response.site_id) || null;
        }

        if (journal?.planner_id && !journal?.planner_item_id) {
            response.checked_in_sites = await this.getCheckedInPlannerSites(journal.user_id, journal.planner_id);
        }

        return response;
    }

    /**
     * Create a new journal
     * User must check-in at a planner_item before creating journal
     */
    static async createJournal(userId, journalData, imageFiles = [], audioFile = null, videoFile = null) {
        try {
            const { title, content, planner_item_id, planner_id } = journalData;
            const privacy = 'private'; // Always private

            // Validate required fields
            if (!title || !content) {
                throw new Error('Title and content are required');
            }

            let finalSiteId = null;
            let finalPlannerId = planner_id;
            let finalPlannerItemId = planner_item_id;

            if (planner_item_id) {
                // Point Journal logic: Validate check-in and uniqueness
                const checkin = await UserCheckin.findOne({
                    where: {
                        user_id: userId,
                        planner_item_id: planner_item_id,
                        status: 'checked_in'
                    },
                    include: [{
                        model: PlannerItem,
                        as: 'plannerItem',
                        attributes: ['id', 'site_id', 'planner_id'],
                        include: [
                            {
                                model: Site,
                                as: 'site',
                                attributes: ['id', 'name', 'code']
                            },
                            {
                                model: Planner,
                                as: 'planner',
                                attributes: ['id', 'status']
                            }
                        ]
                    }]
                });

                if (!checkin) {
                    throw new Error('You must check-in at this location before creating a journal.');
                }

                if (!checkin.plannerItem || !checkin.plannerItem.planner) {
                    throw new Error('Associated planner not found.');
                }

                if (checkin.plannerItem.planner.status !== 'completed') {
                    throw new Error('You can only create a journal for a completed journey.');
                }

                // Check for existing point journal
                const existingPoint = await Journal.findOne({
                    where: { 
                        planner_item_id: planner_item_id,
                        user_id: userId,
                        is_active: true
                    }
                });
                if (existingPoint) {
                    throw new Error('Already exists');
                }

                finalSiteId = checkin.plannerItem.site_id;
                finalPlannerId = checkin.plannerItem.planner_id;
            } else if (planner_id) {
                // Trip Summary Journal logic: Validate completion and uniqueness
                const planner = await Planner.findByPk(planner_id);
                if (!planner) {
                    throw new Error('Planner not found');
                }

                if (planner.user_id !== userId) {
                    const member = await PlannerMember.findOne({
                        where: {
                            planner_id,
                            user_id: userId,
                            join_status: 'joined'
                        }
                    });

                    if (!member) {
                        throw new Error('Forbidden');
                    }
                }

                if (planner.status !== 'completed') {
                    throw new Error('You need to complete the journey before writing a summary.');
                }

                const checkedInSites = await this.getCheckedInPlannerSites(userId, planner_id);
                if (checkedInSites.length === 0) {
                    throw new Error('You must check-in at least one location in this journey before creating a summary.');
                }

                // Check for existing summary journal (planner_id exists but planner_item_id is NULL)
                const existingSummary = await Journal.findOne({
                    where: {
                        planner_id: planner_id,
                        planner_item_id: null,
                        user_id: userId,
                        is_active: true
                    }
                });
                if (existingSummary) {
                    throw new Error('Summary already exists');
                }
                
                finalPlannerId = planner_id;
                finalSiteId = null; // Summary can be site-independent
                finalPlannerItemId = null;
            } else {
                throw new Error('Planner Item ID or Planner ID is required');
            }


            // Validate image limit (max 10)
            if (imageFiles && imageFiles.length > 10) {
                throw new Error('Maximum 10 images allowed');
            }

            // Debug: Log file objects
            console.log('Audio file:', audioFile);
            console.log('Video file:', videoFile);

            // Prepare image URLs array - Cloudinary returns URL in 'path' property
            const imageUrls = imageFiles ? imageFiles.map(file => file.path) : [];

            // Prepare audio URL - check both 'path' and 'url' properties
            const audioUrl = audioFile ? (audioFile.path || audioFile.url) : null;

            // Prepare video URL - check both 'path' and 'url' properties  
            const videoUrl = videoFile ? (videoFile.path || videoFile.url) : null;

            console.log('Audio URL:', audioUrl);
            console.log('Video URL:', videoUrl);

            // Create journal
            const journal = await Journal.create({
                user_id: userId,
                site_id: finalSiteId,
                planner_id: finalPlannerId,
                planner_item_id: finalPlannerItemId,
                title: title.trim(),
                content: content.trim(),
                audio_url: audioUrl,
                image_url: imageUrls,
                video_url: videoUrl,
                privacy,
                is_active: true
            });

            // Fetch journal with associations
            const result = await Journal.findByPk(journal.id, {
                include: [
                    { model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province'] }
                ]
            });

            Logger.info(`Journal created by user ${userId} at site ${finalSiteId}: ${journal.id}`);
            return this.buildJournalResponse(result);
        } catch (error) {
            Logger.error('Create journal error:', error);
            throw error;
        }
    }

    /**
     * Get user's own journals (both private and public)
     */
    static async getUserJournals(userId, filters = {}) {
        try {
            const { page = 1, limit = 10 } = filters;
            const offset = (page - 1) * limit;

            const { rows: journals, count: total } = await Journal.findAndCountAll({
                where: { 
                    user_id: userId,
                    is_active: true
                },
                include: [
                    { model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province'] }
                ],
                limit: parseInt(limit),
                offset,
                order: [['created_at', 'DESC']]
            });

            return {
                journals: await Promise.all(journals.map(j => this.buildJournalResponse(j))),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            Logger.error('Get user journals error:', error);
            throw error;
        }
    }

    /**
     * Get public journals with filters
     */
    static async getPublicJournals(filters = {}) {
        return {
            journals: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
        };
    }

    /**
     * Get journal by ID (check privacy and ownership)
     */
    static async getJournalById(journalId, userId = null) {
        try {
            const journal = await Journal.findOne({
                where: { 
                    id: journalId,
                    is_active: true
                },
                include: [
                    { model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province'] }
                ]
            });

            if (!journal) {
                throw new Error('Journal not found');
            }

            // Permission check: owner or shared publicly
            if (journal.user_id !== userId) {
                const { Post, Planner, PlannerItem } = require('../models');
                
                // 1. Check if shared directly as a post
                const directPost = await Post.findOne({
                    where: { 
                        journal_id: journal.id, 
                        status: 'published',
                        is_active: true 
                    }
                });

                if (!directPost) {
                    // 2. Check if part of a shared journey
                    const journeyPost = await Post.findOne({
                        where: { 
                            user_id: journal.user_id, 
                            status: 'published',
                            planner_id: { [Op.ne]: null },
                            is_active: true
                        },
                        include: [{
                            model: Planner,
                            as: 'planner',
                            required: true,
                            include: [{
                                model: PlannerItem,
                                as: 'items',
                                where: { site_id: journal.site_id },
                                required: true
                            }]
                        }]
                    });

                    if (!journeyPost) {
                        throw new Error('Forbidden');
                    }
                }
            }

            return this.buildJournalResponse(journal);
        } catch (error) {
            Logger.error('Get journal by ID error:', error);
            throw error;
        }
    }

    /**
     * Update journal (owner only)
     */
    static async updateJournal(journalId, userId, updateData, imageFiles = [], audioFile = null, videoFile = null) {
        try {
            const journal = await Journal.findOne({
                where: { 
                    id: journalId,
                    is_active: true
                }
            });

            if (!journal) {
                throw new Error('Journal not found');
            }

            // Check ownership
            if (journal.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Validate image limit if adding new images
            if (imageFiles && imageFiles.length > 0) {
                const currentImageCount = journal.image_url ? journal.image_url.length : 0;
                const newImageCount = imageFiles.length;
                if (currentImageCount + newImageCount > 10) {
                    throw new Error('Maximum 10 images allowed');
                }
            }

            // Prepare update data
            const dataToUpdate = {};

            if (updateData.title !== undefined) {
                dataToUpdate.title = updateData.title.trim();
            }

            if (updateData.content !== undefined) {
                dataToUpdate.content = updateData.content.trim();
            }

            // Note: privacy cannot be changed
            dataToUpdate.privacy = 'private';

            // Note: site_id cannot be changed after creation

            // Handle image URLs (append new images to existing)
            if (imageFiles && imageFiles.length > 0) {
                const newImageUrls = imageFiles.map(file => file.path);
                const existingImages = journal.image_url || [];
                if (existingImages.length + newImageUrls.length > 10) {
                    throw new Error('Maximum 10 images allowed');
                }
                dataToUpdate.image_url = [...existingImages, ...newImageUrls];
            }

            // Handle audio URL
            if (audioFile) {
                dataToUpdate.audio_url = audioFile.path;
            }

            // Handle video URL
            if (videoFile) {
                dataToUpdate.video_url = videoFile.path;
            }

            // Update journal
            await journal.update(dataToUpdate);

            // Fetch updated journal with associations
            const result = await Journal.findByPk(journalId, {
                include: [
                    { model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province'] }
                ]
            });

            Logger.info(`Journal updated by user ${userId}: ${journalId}`);
            return this.buildJournalResponse(result);
        } catch (error) {
            Logger.error('Update journal error:', error);
            throw error;
        }
    }

    /**
     * Delete journal (owner only)
     */
    static async deleteJournal(journalId, userId) {
        try {
            const journal = await Journal.findOne({
                where: { 
                    id: journalId,
                    is_active: true
                }
            });

            if (!journal) {
                throw new Error('Journal not found or already deleted');
            }

            // Check ownership
            if (journal.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Soft delete
            await journal.update({ is_active: false });

            Logger.info(`Journal logically deleted by user ${userId}: ${journalId}`);
            return { id: journalId, message: 'Journal deleted successfully' };
        } catch (error) {
            Logger.error('Delete journal error:', error);
            throw error;
        }
    }

    /**
     * Share journal to post (community)
     */
    static async shareJournalToPost(journalId, userId) {
        try {
            const journal = await Journal.findOne({
                where: { 
                    id: journalId,
                    is_active: true
                }
            });

            if (!journal) {
                throw new Error('Journal not found');
            }

            // Check ownership
            if (journal.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Check if already shared (optional, but good to have)
            const { Post } = require('../models');
            const existingPost = await Post.findOne({
                where: {
                    user_id: userId,
                    journal_id: journalId
                }
            });

            if (existingPost) {
                throw new Error('This journal has already been shared to the community');
            }

            // Create post as a reference to the journal
            const post = await Post.create({
                user_id: userId,
                journal_id: journalId,
                site_id: journal.site_id,
                content: journal.title, // Use title as fallback or default content
                status: 'published'
            });

            Logger.info(`Journal ${journalId} shared to community by user ${userId}: Post ${post.id}`);
            return post;
        } catch (error) {
            Logger.error('Share journal error:', error);
            throw error;
        }
    }

    /**
     * Format journal response
     */
    static formatJournalResponse(journal) {
        return {
            id: journal.id,
            user_id: journal.user_id,
            site_id: journal.site_id,
            planner_id: journal.planner_id,
            planner_item_id: journal.planner_item_id,
            title: journal.title,
            content: journal.content,
            audio_url: journal.audio_url,
            image_url: journal.image_url || [],
            video_url: journal.video_url,
            privacy: journal.privacy,
            author: journal.author ? {
                id: journal.author.id,
                full_name: journal.author.full_name,
                email: journal.author.email,
                avatar_url: journal.author.avatar_url
            } : null,
            site: journal.site ? {
                id: journal.site.id,
                name: journal.site.name,
                code: journal.site.code,
                province: journal.site.province
            } : null,
            created_at: journal.created_at,
            updated_at: journal.updated_at
        };
    }
}

module.exports = JournalService;
