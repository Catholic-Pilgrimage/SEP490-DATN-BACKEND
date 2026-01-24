const { Journal, User, Site } = require('../models');
const { Op } = require('sequelize');
const Logger = require('../utils/logger.util');

class JournalService {

    /**
     * Create a new journal
     */
    static async createJournal(userId, journalData, imageFiles = [], audioFile = null, videoFile = null) {
        try {
            const { title, content, site_id, privacy = 'private' } = journalData;

            // Validate required fields
            if (!title || !content) {
                throw new Error('Title and content are required');
            }

            // Validate image limit (max 10)
            if (imageFiles && imageFiles.length > 10) {
                throw new Error('Maximum 10 images allowed');
            }

            // Handle finalSiteId pattern: validate site exists or set to null
            let finalSiteId = null;
            if (site_id) {
                const site = await Site.findByPk(site_id);
                if (site) {
                    finalSiteId = site_id;
                }
                // If site doesn't exist, finalSiteId remains null (no error thrown)
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
                title: title.trim(),
                content: content.trim(),
                audio_url: audioUrl,
                image_url: imageUrls,
                video_url: videoUrl,
                privacy
            });

            // Fetch journal with associations
            const result = await Journal.findByPk(journal.id, {
                include: [
                    { model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province'] }
                ]
            });

            Logger.info(`Journal created by user ${userId}: ${journal.id}`);
            return this.formatJournalResponse(result);
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
                where: { user_id: userId },
                include: [
                    { model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province'] }
                ],
                limit: parseInt(limit),
                offset,
                order: [['created_at', 'DESC']]
            });

            return {
                journals: journals.map(j => this.formatJournalResponse(j)),
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
        try {
            const { page = 1, limit = 10, site_id, keyword, date } = filters;
            const offset = (page - 1) * limit;

            const where = { privacy: 'public' };

            // Filter by site_id
            if (site_id) {
                where.site_id = site_id;
            }

            // Filter by keyword (search in title and content)
            if (keyword) {
                where[Op.or] = [
                    { title: { [Op.iLike]: `%${keyword}%` } },
                    { content: { [Op.iLike]: `%${keyword}%` } }
                ];
            }

            // Filter by date (YYYY-MM-DD)
            if (date) {
                const startOfDay = new Date(date);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(date);
                endOfDay.setHours(23, 59, 59, 999);

                where.created_at = {
                    [Op.between]: [startOfDay, endOfDay]
                };
            }

            const { rows: journals, count: total } = await Journal.findAndCountAll({
                where,
                include: [
                    { model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province'] }
                ],
                limit: parseInt(limit),
                offset,
                order: [['created_at', 'DESC']]
            });

            return {
                journals: journals.map(j => this.formatJournalResponse(j)),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            Logger.error('Get public journals error:', error);
            throw error;
        }
    }

    /**
     * Get journal by ID (check privacy and ownership)
     */
    static async getJournalById(journalId, userId = null) {
        try {
            const journal = await Journal.findByPk(journalId, {
                include: [
                    { model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
                    { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province'] }
                ]
            });

            if (!journal) {
                throw new Error('Journal not found');
            }

            // If journal is private, only owner can view
            if (journal.privacy === 'private' && journal.user_id !== userId) {
                throw new Error('Forbidden');
            }

            return this.formatJournalResponse(journal);
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
            const journal = await Journal.findByPk(journalId);

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

            if (updateData.privacy !== undefined) {
                dataToUpdate.privacy = updateData.privacy;
            }

            // Handle site_id with finalSiteId pattern
            if (updateData.site_id !== undefined) {
                if (updateData.site_id) {
                    const site = await Site.findByPk(updateData.site_id);
                    dataToUpdate.site_id = site ? updateData.site_id : null;
                } else {
                    dataToUpdate.site_id = null;
                }
            }

            // Handle image URLs (append new images to existing)
            if (imageFiles && imageFiles.length > 0) {
                const newImageUrls = imageFiles.map(file => file.path);
                const existingImages = journal.image_url || [];
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
            return this.formatJournalResponse(result);
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
            const journal = await Journal.findByPk(journalId);

            if (!journal) {
                throw new Error('Journal not found');
            }

            // Check ownership
            if (journal.user_id !== userId) {
                throw new Error('Forbidden');
            }

            await journal.destroy();

            Logger.info(`Journal deleted by user ${userId}: ${journalId}`);
            return { id: journalId, message: 'Journal deleted successfully' };
        } catch (error) {
            Logger.error('Delete journal error:', error);
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
