const { Journal, User, Site, SiteMedia, UserCheckin, PlannerItem, Planner, PlannerMember } = require('../models');
const { Op } = require('sequelize');
const Logger = require('../utils/logger.util');

class JournalService {
    static getPlannerItemInput(journalData = {}) {
        if (journalData?.planner_item_id !== undefined) {
            return journalData.planner_item_id;
        }

        if (journalData?.['planner_item_id[]'] !== undefined) {
            return journalData['planner_item_id[]'];
        }

        if (journalData?.planner_item_ids !== undefined) {
            return journalData.planner_item_ids;
        }

        return journalData?.['planner_item_ids[]'];
    }

    static getJournalImageInput(journalData = {}) {
        if (journalData?.image_url !== undefined) {
            return journalData.image_url;
        }

        if (journalData?.['image_url[]'] !== undefined) {
            return journalData['image_url[]'];
        }

        if (journalData?.image_urls !== undefined) {
            return journalData.image_urls;
        }

        return journalData?.['image_urls[]'];
    }

    static normalizeStringArrayInput(rawValue) {
        const normalizedValues = [];

        const pushValue = (value) => {
            if (typeof value !== 'string') {
                return;
            }

            const trimmed = value.trim();
            if (!trimmed || trimmed.toLowerCase() === 'null') {
                return;
            }

            normalizedValues.push(trimmed);
        };

        if (Array.isArray(rawValue)) {
            rawValue.forEach(pushValue);
        } else if (typeof rawValue === 'string') {
            const trimmed = rawValue.trim();
            if (!trimmed || trimmed.toLowerCase() === 'null') {
                return [];
            }

            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(pushValue);
                    }
                } catch (error) {
                    pushValue(trimmed);
                }
            } else {
                pushValue(trimmed);
            }
        }

        return normalizedValues;
    }

    static normalizeNullableStringInput(value) {
        if (value === undefined || value === null) {
            return null;
        }

        const trimmed = String(value).trim();
        if (!trimmed || trimmed.toLowerCase() === 'null') {
            return null;
        }

        return trimmed;
    }

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

    static getJournalInclude() {
        return [
            { model: User, as: 'author', attributes: ['id', 'full_name', 'email', 'avatar_url'] },
            { model: Site, as: 'site', attributes: ['id', 'name', 'code', 'province', 'cover_image'] }
        ];
    }

    static formatSite(site) {
        if (!site) {
            return null;
        }

        return {
            id: site.id || null,
            name: site.name || null,
            code: site.code || null,
            province: site.province || null,
            cover_image: site.cover_image || null
        };
    }

    static getJournalType(journal) {
        const plannerItemIds = this.normalizePlannerItemIds(journal?.planner_item_id);

        if (plannerItemIds.length > 0) {
            return 'point';
        }

        if (journal?.planner_id) {
            return 'summary';
        }

        return 'general';
    }

    static formatPlannerItem(plannerItem) {
        if (!plannerItem) {
            return null;
        }

        return {
            id: plannerItem.id,
            site_id: plannerItem.site_id || null,
            planner_id: plannerItem.planner_id || null,
            leg_number: plannerItem.leg_number || null,
            order_index: plannerItem.order_index || null,
            site: this.formatSite(plannerItem.site)
        };
    }

    static async getPlannerItemsByIds(plannerItemIds = [], options = {}) {
        const normalizedPlannerItemIds = this.normalizePlannerItemIds(plannerItemIds);
        if (normalizedPlannerItemIds.length === 0) {
            return [];
        }

        const include = [{
            model: Site,
            as: 'site',
            attributes: ['id', 'name', 'code', 'province', 'cover_image']
        }];

        if (options.includePlanner) {
            include.push({
                model: Planner,
                as: 'planner',
                attributes: ['id', 'status']
            });
        }

        const plannerItems = await PlannerItem.findAll({
            where: { id: normalizedPlannerItemIds },
            attributes: ['id', 'site_id', 'planner_id', 'leg_number', 'order_index'],
            include
        });

        const plannerItemMap = new Map(plannerItems.map(item => [item.id, item]));
        return normalizedPlannerItemIds
            .map(id => plannerItemMap.get(id))
            .filter(Boolean);
    }

    static resolveJournalSite(journal, plannerItems = [], checkedInSites = []) {
        const directSite = this.formatSite(journal?.site);
        if (directSite) {
            return {
                site: directSite,
                siteId: journal.site_id || directSite.id,
                source: 'journal',
                locationScope: 'single_site'
            };
        }

        const uniquePlannerSites = [...new Map(
            plannerItems
                .map(item => item?.site)
                .filter(site => site?.id)
                .map(site => [site.id, site])
        ).values()];

        if (uniquePlannerSites.length === 1) {
            const plannerItemSite = this.formatSite(uniquePlannerSites[0]);
            return {
                site: plannerItemSite,
                siteId: plannerItemSite.id,
                source: 'planner_item',
                locationScope: 'single_site'
            };
        }

        if (uniquePlannerSites.length > 1) {
            return {
                site: null,
                siteId: null,
                source: null,
                locationScope: 'multi_site'
            };
        }

        const uniqueCheckedInSites = [...new Map(
            checkedInSites
                .filter(item => item?.site?.id)
                .map(item => [item.site.id, item.site])
        ).values()];

        if (uniqueCheckedInSites.length === 1) {
            const derivedSite = this.formatSite(uniqueCheckedInSites[0]);
            return {
                site: derivedSite,
                siteId: derivedSite?.id || checkedInSites[0]?.site_id || null,
                source: 'checked_in_sites',
                locationScope: 'single_site'
            };
        }

        if (uniqueCheckedInSites.length > 1) {
            return {
                site: null,
                siteId: null,
                source: null,
                locationScope: 'multi_site'
            };
        }

        return {
            site: null,
            siteId: journal?.site_id || plannerItems[0]?.site_id || null,
            source: null,
            locationScope: 'none'
        };
    }

    static normalizePlannerItemIds(rawPlannerItemIds, fallbackPlannerItemId = null) {
        const normalizedIds = [];

        const pushId = (value) => {
            if (typeof value !== 'string') {
                return;
            }

            const trimmed = value.trim();
            if (trimmed) {
                normalizedIds.push(trimmed);
            }
        };

        if (Array.isArray(rawPlannerItemIds)) {
            rawPlannerItemIds.forEach(pushId);
        } else if (typeof rawPlannerItemIds === 'string') {
            const trimmed = rawPlannerItemIds.trim();
            if (trimmed) {
                if (trimmed.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(trimmed);
                        if (Array.isArray(parsed)) {
                            parsed.forEach(pushId);
                        } else {
                            return [];
                        }
                    } catch (error) {
                        if (!trimmed.includes(',')) {
                            pushId(trimmed);
                        }
                    }
                } else {
                    pushId(trimmed);
                }
            }
        }

        pushId(fallbackPlannerItemId);

        return [...new Set(normalizedIds)];
    }

    static resolveJournalPlannerItemIds(journal, checkedInSites = []) {
        return [...new Set([
            ...this.normalizePlannerItemIds(journal?.planner_item_id),
            ...((checkedInSites || []).map(item => item?.planner_item_id).filter(Boolean))
        ])];
    }

    static selectPreferredJournal(journals = []) {
        return [...journals]
            .sort((left, right) => {
                const activeDiff = Number(Boolean(right?.is_active)) - Number(Boolean(left?.is_active));
                if (activeDiff !== 0) {
                    return activeDiff;
                }

                const rightUpdatedAt = new Date(right?.updated_at || right?.created_at || 0).getTime();
                const leftUpdatedAt = new Date(left?.updated_at || left?.created_at || 0).getTime();
                return rightUpdatedAt - leftUpdatedAt;
            })[0] || null;
    }

    static createJournalConflictError(message, journal = null) {
        const error = new Error(message);

        if (journal?.id) {
            error.details = {
                journal_id: journal.id,
                is_active: Boolean(journal.is_active),
                can_restore: !journal.is_active
            };
        }

        return error;
    }

    static async findExistingPointJournal(userId, plannerItemIds = [], options = {}) {
        const normalizedPlannerItemIds = this.normalizePlannerItemIds(plannerItemIds);
        if (normalizedPlannerItemIds.length === 0) {
            return null;
        }

        const where = {
            user_id: userId,
            planner_item_id: {
                [Op.overlap]: normalizedPlannerItemIds
            }
        };

        if (options.excludeJournalId) {
            where.id = { [Op.ne]: options.excludeJournalId };
        }

        if (options.activeOnly) {
            where.is_active = true;
        }

        const journals = await Journal.findAll({
            where,
            attributes: ['id', 'planner_item_id', 'is_active', 'created_at', 'updated_at']
        });

        return this.selectPreferredJournal(journals);
    }

    static async findExistingSummaryJournal(userId, plannerId, options = {}) {
        if (!plannerId) {
            return null;
        }

        const where = {
            user_id: userId,
            planner_id: plannerId
        };

        if (options.excludeJournalId) {
            where.id = { [Op.ne]: options.excludeJournalId };
        }

        if (options.activeOnly) {
            where.is_active = true;
        }

        const journals = await Journal.findAll({
            where,
            attributes: ['id', 'planner_item_id', 'is_active', 'created_at', 'updated_at']
        });

        return this.selectPreferredJournal(
            journals.filter(journal => this.resolveJournalPlannerItemIds(journal).length === 0)
        );
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
            site: this.formatSite(checkin.plannerItem?.site)
        }));
    }

    static async buildJournalResponse(journal) {
        const journalType = this.getJournalType(journal);
        const checkedInSites = journalType === 'summary'
            ? await this.getCheckedInPlannerSites(journal.user_id, journal.planner_id)
            : null;
        const resolvedPlannerItemIds = this.resolveJournalPlannerItemIds(journal, checkedInSites || []);
        const plannerItems = resolvedPlannerItemIds.length > 0
            ? await this.getPlannerItemsByIds(resolvedPlannerItemIds)
            : [];
        const resolvedSite = this.resolveJournalSite(journal, plannerItems, checkedInSites || []);
        const response = this.formatJournalResponse(journal, {
            journalType,
            resolvedSite,
            plannerItemIds: resolvedPlannerItemIds,
            plannerItems
        });

        if (response.resolved_site_id) {
            const model3DMap = await this.getApprovedModel3DMap([response.resolved_site_id]);
            response.model_3d = model3DMap.get(response.resolved_site_id) || null;
        }

        if (checkedInSites) {
            response.checked_in_sites = checkedInSites;
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
            const requestedPlannerItemIds = this.normalizePlannerItemIds(
                this.getPlannerItemInput(journalData),
                Array.isArray(planner_item_id) ? null : planner_item_id
            );

            // Validate required fields
            if (!title || !content) {
                throw new Error('Title and content are required');
            }

            let finalSiteId = null;
            let finalPlannerId = planner_id;
            let finalPlannerItemIds = requestedPlannerItemIds;

            if (requestedPlannerItemIds.length > 0) {
                // Point Journal logic: Validate selected check-ins and uniqueness
                const plannerItems = await this.getPlannerItemsByIds(requestedPlannerItemIds, { includePlanner: true });

                if (plannerItems.length !== requestedPlannerItemIds.length) {
                    throw new Error('Planner item not found');
                }

                const plannerItemMap = new Map(plannerItems.map(item => [item.id, item]));
                const orderedPlannerItems = requestedPlannerItemIds.map(id => plannerItemMap.get(id)).filter(Boolean);
                const plannerIds = [...new Set(orderedPlannerItems.map(item => item.planner_id).filter(Boolean))];

                if (plannerIds.length !== 1) {
                    throw new Error('Planner items must belong to the same journey.');
                }

                const resolvedPlanner = orderedPlannerItems[0].planner;
                if (!resolvedPlanner) {
                    throw new Error('Associated planner not found.');
                }

                if (planner_id && planner_id !== plannerIds[0]) {
                    throw new Error('Selected planner items do not belong to the selected journey.');
                }

                const checkins = await UserCheckin.findAll({
                    where: {
                        user_id: userId,
                        planner_item_id: requestedPlannerItemIds,
                        status: 'checked_in'
                    },
                    attributes: ['planner_item_id']
                });

                const checkedInItemIds = new Set(checkins.map(checkin => checkin.planner_item_id));
                if (requestedPlannerItemIds.some(id => !checkedInItemIds.has(id))) {
                    throw new Error('You must check-in at all selected locations before creating a journal.');
                }

                if (resolvedPlanner.status !== 'completed') {
                    throw new Error('You can only create a journal for a completed journey.');
                }

                // Check for existing point journal
                const existingPoint = await this.findExistingPointJournal(userId, requestedPlannerItemIds);
                if (existingPoint) {
                    throw this.createJournalConflictError(
                        existingPoint.is_active ? 'Already exists' : 'Archived journal exists',
                        existingPoint
                    );
                }

                const resolvedSiteIds = [...new Set(orderedPlannerItems.map(item => item.site_id).filter(Boolean))];

                finalSiteId = resolvedSiteIds.length === 1 ? resolvedSiteIds[0] : null;
                finalPlannerId = plannerIds[0];
                finalPlannerItemIds = requestedPlannerItemIds;
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

                const existingSummary = await this.findExistingSummaryJournal(userId, planner_id);
                if (existingSummary) {
                    throw this.createJournalConflictError(
                        existingSummary.is_active ? 'Summary already exists' : 'Archived summary exists',
                        existingSummary
                    );
                }

                finalPlannerId = planner_id;
                finalSiteId = null; // Summary can be site-independent
                finalPlannerItemIds = [];
            } else {
                throw new Error('Planner Item ID or Planner ID is required');
            }


            // Validate image limit (max 10)
            if (imageFiles && imageFiles.length > 10) {
                throw new Error('Maximum 10 images allowed');
            }

            // Prepare image URLs array - Cloudinary returns URL in 'path' property
            const imageUrls = imageFiles ? imageFiles.map(file => file.path) : [];

            // Prepare audio URL - check both 'path' and 'url' properties
            const audioUrl = audioFile ? (audioFile.path || audioFile.url) : null;

            // Prepare video URL - check both 'path' and 'url' properties  
            const videoUrl = videoFile ? (videoFile.path || videoFile.url) : null;

            // Create journal
            const journal = await Journal.create({
                user_id: userId,
                site_id: finalSiteId,
                planner_id: finalPlannerId,
                planner_item_id: finalPlannerItemIds,
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
                include: this.getJournalInclude()
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
            const { page = 1, limit = 10, is_active = 'true' } = filters;
            const offset = (page - 1) * limit;
            const normalizedIsActive = String(is_active).trim().toLowerCase();
            const where = {
                user_id: userId
            };

            if (normalizedIsActive === 'true') {
                where.is_active = true;
            } else if (normalizedIsActive === 'false') {
                where.is_active = false;
            }

            const { rows: journals, count: total } = await Journal.findAndCountAll({
                where,
                include: this.getJournalInclude(),
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
                include: this.getJournalInclude()
            });

            if (!journal) {
                throw new Error('Journal not found');
            }

            // Permission check: owner or shared publicly
            if (journal.user_id !== userId) {
                const { Post } = require('../models');
                // 1. Check if shared directly as a post
                const directPost = await Post.findOne({
                    where: {
                        journal_id: journal.id,
                        status: 'published',
                        is_active: true
                    }
                });

                if (!directPost) {
                    // 2. Check if this journal belongs to a journey that was shared publicly.
                    // Match by planner_id to avoid false positives across different planners
                    // that happen to contain the same site, and to support summary journals
                    // whose site_id is NULL.
                    const journeyPost = journal.planner_id ? await Post.findOne({
                        where: {
                            user_id: journal.user_id,
                            status: 'published',
                            planner_id: journal.planner_id,
                            is_active: true
                        }
                    }) : null;

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

            const normalizedTitle = typeof updateData.title === 'string' ? updateData.title.trim() : '';
            const normalizedContent = typeof updateData.content === 'string' ? updateData.content.trim() : '';

            if (!normalizedTitle || !normalizedContent) {
                throw new Error('Title and content are required');
            }

            const requestedImageUrls = this.normalizeStringArrayInput(this.getJournalImageInput(updateData));
            const requestedAudioUrl = this.normalizeNullableStringInput(updateData.audio_url);
            const requestedVideoUrl = this.normalizeNullableStringInput(updateData.video_url);

            let finalImageUrls = requestedImageUrls;
            if (imageFiles && imageFiles.length > 0) {
                const uploadedImageUrls = imageFiles.map(file => file.path || file.url).filter(Boolean);
                finalImageUrls = [...new Set([...requestedImageUrls, ...uploadedImageUrls])];
            }

            if (finalImageUrls.length > 10) {
                throw new Error('Maximum 10 images allowed');
            }

            let finalAudioUrl = requestedAudioUrl;
            if (audioFile) {
                finalAudioUrl = audioFile.path || audioFile.url || null;
            }

            let finalVideoUrl = requestedVideoUrl;
            if (videoFile) {
                finalVideoUrl = videoFile.path || videoFile.url || null;
            }

            // Prepare update data
            const dataToUpdate = {
                title: normalizedTitle,
                content: normalizedContent,
                image_url: finalImageUrls,
                audio_url: finalAudioUrl,
                video_url: finalVideoUrl,
                privacy: 'private'
            };

            // Update journal
            await journal.update(dataToUpdate);

            // Fetch updated journal with associations
            const result = await Journal.findByPk(journalId, {
                include: this.getJournalInclude()
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
                throw new Error('Journal not found');
            }

            // Check ownership
            if (journal.user_id !== userId) {
                throw new Error('Forbidden');
            }

            // Soft delete
            await journal.update({ is_active: false });

            Logger.info(`Journal logically deleted by user ${userId}: ${journalId}`);
            return {
                id: journalId,
                message: 'Journal deleted successfully'
            };
        } catch (error) {
            Logger.error('Delete journal error:', error);
            throw error;
        }
    }

    /**
     * Restore journal (owner only)
     */
    static async restoreJournal(journalId, userId) {
        try {
            const journal = await Journal.findOne({
                where: { id: journalId }
            });

            if (!journal) {
                throw new Error('Journal not found');
            }

            if (journal.user_id !== userId) {
                throw new Error('Forbidden');
            }

            if (journal.is_active) {
                throw new Error('Journal is already active');
            }

            const plannerItemIds = this.normalizePlannerItemIds(journal.planner_item_id);

            if (plannerItemIds.length > 0) {
                const existingPoint = await this.findExistingPointJournal(userId, plannerItemIds, {
                    activeOnly: true,
                    excludeJournalId: journalId
                });

                if (existingPoint) {
                    const error = new Error('Another active journal already exists for this visit.');
                    error.details = { journal_id: existingPoint.id };
                    throw error;
                }
            } else if (journal.planner_id) {
                const existingSummary = await this.findExistingSummaryJournal(userId, journal.planner_id, {
                    activeOnly: true,
                    excludeJournalId: journalId
                });

                if (existingSummary) {
                    const error = new Error('Another active summary already exists for this journey.');
                    error.details = { journal_id: existingSummary.id };
                    throw error;
                }
            }

            await journal.update({ is_active: true });

            const result = await Journal.findByPk(journalId, {
                include: this.getJournalInclude()
            });

            Logger.info(`Journal restored by user ${userId}: ${journalId}`);
            return this.buildJournalResponse(result);
        } catch (error) {
            Logger.error('Restore journal error:', error);
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
                    journal_id: journalId,
                    is_active: true
                }
            });

            if (existingPost) {
                throw new Error('This journal has already been shared to the community');
            }

            // Create post as a reference to the journal
            const post = await Post.create({
                user_id: userId,
                journal_id: journalId,
                site_id: journal.site_id || null,
                title: journal.title,
                content: journal.content,
                image_urls: journal.image_url || [],
                audio_url: journal.audio_url || null,
                video_url: journal.video_url || null,
                status: 'published'
            });

            Logger.info(`Journal ${journalId} shared to community by user ${userId}: Post ${post.id}`);
            return post;
        } catch (error) {
            if (error?.name === 'SequelizeUniqueConstraintError') {
                throw new Error('This journal has already been shared to the community');
            }
            Logger.error('Share journal error:', error);
            throw error;
        }
    }

    /**
     * Format journal response
     */
    static formatJournalResponse(journal, options = {}) {
        const plannerItems = options.plannerItems || [];
        const resolvedSite = options.resolvedSite || this.resolveJournalSite(journal, plannerItems);
        const journalType = options.journalType || this.getJournalType(journal);
        const plannerItemIds = options.plannerItemIds || this.resolveJournalPlannerItemIds(journal);

        return {
            id: journal.id,
            user_id: journal.user_id,
            is_active: journal.is_active,
            site_id: journal.site_id,
            resolved_site_id: resolvedSite.siteId,
            planner_id: journal.planner_id,
            planner_item_id: plannerItemIds,
            journal_type: journalType,
            location_scope: resolvedSite.locationScope,
            site_source: resolvedSite.source,
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
            site: resolvedSite.site,
            planner_items: plannerItems.map(item => this.formatPlannerItem(item)),
            created_at: journal.created_at,
            updated_at: journal.updated_at
        };
    }

    /**
     * Resolve and validate journal context for AI Prayer Suggestion.
     * Reuses the same authorization rules as createJournal:
     * - planner_item_id: user must have checked-in, planner must be completed
     * - planner_id: user must be owner or joined member, planner must be completed, user must have ≥1 check-in
     *
     * @param {string} userId
     * @param {{ planner_item_id?: string, planner_id?: string }} params
     * @returns {Promise<{ contextType: string, planner: object, site?: object, checkedInSites?: object[] }>}
     */
    static async resolveJournalContextForAi(userId, { planner_item_id, planner_id }) {
        if (planner_item_id) {
            // --- Point context (same rules as point journal) ---
            const checkin = await UserCheckin.findOne({
                where: {
                    user_id: userId,
                    planner_item_id,
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
                            attributes: ['id', 'name', 'type', 'patron_saint', 'province', 'description']
                        },
                        {
                            model: Planner,
                            as: 'planner',
                            attributes: ['id', 'name', 'status']
                        }
                    ]
                }]
            });

            if (!checkin) {
                throw new Error('You must check-in at this location before using AI prayer suggestion.');
            }
            if (!checkin.plannerItem?.planner) {
                throw new Error('Associated planner not found.');
            }
            if (checkin.plannerItem.planner.status !== 'completed') {
                throw new Error('Journey must be completed before using AI prayer suggestion.');
            }

            return {
                contextType: 'planner_item',
                planner: checkin.plannerItem.planner,
                site: checkin.plannerItem.site || null
            };
        }

        if (planner_id) {
            // --- Trip summary context (same rules as summary journal) ---
            const planner = await Planner.findByPk(planner_id, {
                attributes: ['id', 'name', 'status', 'user_id']
            });
            if (!planner) {
                throw new Error('Planner not found');
            }

            // Owner or joined member
            if (planner.user_id !== userId) {
                const member = await PlannerMember.findOne({
                    where: { planner_id, user_id: userId, join_status: 'joined' }
                });
                if (!member) {
                    throw new Error('Forbidden');
                }
            }

            if (planner.status !== 'completed') {
                throw new Error('Journey must be completed before using AI prayer suggestion.');
            }

            // Must have at least 1 check-in
            const checkedInSites = await this.getCheckedInPlannerSites(userId, planner_id);
            if (checkedInSites.length === 0) {
                throw new Error('You must check-in at least one location in this journey before using AI prayer suggestion.');
            }

            return {
                contextType: 'planner',
                planner,
                checkedInSites
            };
        }

        throw new Error('Either planner_item_id or planner_id is required');
    }
}

module.exports = JournalService;
