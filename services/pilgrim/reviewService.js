const {
    Site, User, UserCheckin, PlannerItem,
    SiteReview, NearbyPlaceReview, NearbyPlace,
    SiteReviewReply, NearbyPlaceReviewReply,
    sequelize
} = require('../../models');
const { Op } = require('sequelize');
const NotificationService = require('../shared/notificationService');

class PilgrimReviewService {

    // ===================== SITE REVIEWS =====================

    async createSiteReview(userId, siteId, { rating, feedback, image_urls }) {
        const site = await Site.findOne({
            where: { id: siteId, is_active: true }
        });
        if (!site) {
            const error = new Error('Site not found');
            error.statusCode = 404;
            throw error;
        }

        const existing = await SiteReview.findOne({
            where: { site_id: siteId, user_id: userId, is_active: true }
        });
        if (existing) {
            const error = new Error('You already have a review for this site. Please update your existing review.');
            error.statusCode = 409;
            throw error;
        }

        // Check-in required to review
        const checkin = await UserCheckin.findOne({
            where: {
                user_id: userId,
                status: 'checked_in',
                is_valid: true
            },
            include: [{
                model: PlannerItem,
                as: 'plannerItem',
                where: { site_id: siteId },
                attributes: ['id']
            }],
            order: [['checkin_date', 'DESC']]
        });

        if (!checkin) {
            const error = new Error('You must check in at this site before you can leave a review');
            error.statusCode = 403;
            throw error;
        }

        const review = await SiteReview.create({
            site_id: siteId,
            user_id: userId,
            checkin_id: checkin.id,
            rating,
            feedback: feedback || null,
            image_urls: image_urls || [],
            verified_visit: true
        });

        // Notify LG/Manager (fire-and-forget)
        const reviewer = await User.findByPk(userId, { attributes: ['full_name'] });
        this._notifyNewSiteReview(siteId, reviewer?.full_name || 'Pilgrim', rating, site.name);

        return this._formatSiteReview(review);
    }

    /**
     * Send notification to LG + Manager when new site review is created
     */
    async _notifyNewSiteReview(siteId, reviewerName, rating, siteName) {
        try {
            // Notify all LG + Manager of this site
            const staffUsers = await User.findAll({
                where: { site_id: siteId, role: { [Op.in]: ['local_guide', 'manager'] }, status: 'active' },
                attributes: ['id']
            });
            for (const staff of staffUsers) {
                await NotificationService.createNotification('new_site_review', staff.id, {
                    reviewerName, siteName, rating: String(rating)
                });
            }
        } catch (err) {
            console.error('Notification error (new_site_review):', err.message);
        }
    }

    async _notifyNewNearbyPlaceReview(siteId, reviewerName, rating, placeName) {
        try {
            const staffUsers = await User.findAll({
                where: { site_id: siteId, role: { [Op.in]: ['local_guide', 'manager'] }, status: 'active' },
                attributes: ['id']
            });
            for (const staff of staffUsers) {
                await NotificationService.createNotification('new_nearby_place_review', staff.id, {
                    reviewerName, placeName, rating: String(rating)
                });
            }
        } catch (err) {
            console.error('Notification error (new_nearby_place_review):', err.message);
        }
    }

    async getSiteReviews(siteId, { page = 1, limit = 10, sort = 'newest' }) {
        const site = await Site.findOne({ where: { id: siteId, is_active: true } });
        if (!site) {
            const error = new Error('Site not found');
            error.statusCode = 404;
            throw error;
        }

        const offset = (page - 1) * limit;
        const order = sort === 'oldest' ? [['created_at', 'ASC']]
            : sort === 'highest' ? [['rating', 'DESC'], ['created_at', 'DESC']]
                : sort === 'lowest' ? [['rating', 'ASC'], ['created_at', 'DESC']]
                    : [['created_at', 'DESC']];

        const { count, rows } = await SiteReview.findAndCountAll({
            where: { site_id: siteId, is_active: true },
            include: [
                {
                    model: User,
                    as: 'reviewer',
                    attributes: ['id', 'full_name', 'avatar_url']
                },
                {
                    model: SiteReviewReply,
                    as: 'reply',
                    include: [{
                        model: User,
                        as: 'replier',
                        attributes: ['id', 'full_name', 'avatar_url', 'role']
                    }]
                }
            ],
            order,
            limit: parseInt(limit),
            offset
        });

        const avgResult = await SiteReview.findOne({
            where: { site_id: siteId, is_active: true },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews']
            ],
            raw: true
        });

        const distribution = await SiteReview.findAll({
            where: { site_id: siteId, is_active: true },
            attributes: [
                'rating',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['rating'],
            raw: true
        });

        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        distribution.forEach(d => {
            ratingDistribution[d.rating] = parseInt(d.count);
        });

        return {
            summary: {
                avg_rating: avgResult.avg_rating ? parseFloat(parseFloat(avgResult.avg_rating).toFixed(1)) : 0,
                total_reviews: parseInt(avgResult.total_reviews) || 0,
                rating_distribution: ratingDistribution
            },
            reviews: rows.map(r => this._formatSiteReview(r)),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                total_pages: Math.ceil(count / limit)
            }
        };
    }

    async updateSiteReview(userId, reviewId, siteId, { rating, feedback, image_urls }) {
        const review = await SiteReview.findOne({
            where: { id: reviewId, user_id: userId, site_id: siteId, is_active: true }
        });

        if (!review) {
            const error = new Error('Review not found or not authorized');
            error.statusCode = 404;
            throw error;
        }

        const updateData = {};
        if (rating !== undefined) updateData.rating = rating;
        if (feedback !== undefined) updateData.feedback = feedback;
        if (image_urls !== undefined) updateData.image_urls = image_urls;

        await review.update(updateData);
        return this._formatSiteReview(review);
    }

    async deleteSiteReview(userId, reviewId, siteId) {
        const review = await SiteReview.findOne({
            where: { id: reviewId, user_id: userId, site_id: siteId, is_active: true }
        });

        if (!review) {
            const error = new Error('Review not found or not authorized');
            error.statusCode = 404;
            throw error;
        }

        await review.update({ is_active: false });
        return { message: 'Review deleted successfully' };
    }

    // ===================== NEARBY PLACE REVIEWS =====================

    /**
     * Verify nearby place belongs to the given site
     */
    async _verifyNearbyPlaceBelongsToSite(nearbyPlaceId, siteId) {
        const place = await NearbyPlace.findOne({
            where: { id: nearbyPlaceId, site_id: siteId, is_active: true, status: 'approved' }
        });
        if (!place) {
            const error = new Error('Nearby place not found or does not belong to this site');
            error.statusCode = 404;
            throw error;
        }
        return place;
    }

    async createNearbyPlaceReview(userId, nearbyPlaceId, siteId, { rating, feedback, image_urls }) {
        await this._verifyNearbyPlaceBelongsToSite(nearbyPlaceId, siteId);

        const existing = await NearbyPlaceReview.findOne({
            where: { nearby_place_id: nearbyPlaceId, user_id: userId, is_active: true }
        });
        if (existing) {
            const error = new Error('You already have a review for this place. Please update your existing review.');
            error.statusCode = 409;
            throw error;
        }

        const review = await NearbyPlaceReview.create({
            nearby_place_id: nearbyPlaceId,
            user_id: userId,
            rating,
            feedback: feedback || null,
            image_urls: image_urls || []
        });

        // Notify LG/Manager (fire-and-forget)
        const reviewer = await User.findByPk(userId, { attributes: ['full_name'] });
        const place = await NearbyPlace.findByPk(nearbyPlaceId, { attributes: ['name'] });
        this._notifyNewNearbyPlaceReview(siteId, reviewer?.full_name || 'Pilgrim', rating, place?.name || 'Nearby Place');

        return this._formatNearbyPlaceReview(review);
    }

    async getNearbyPlaceReviews(nearbyPlaceId, siteId, { page = 1, limit = 10, sort = 'newest' }) {
        await this._verifyNearbyPlaceBelongsToSite(nearbyPlaceId, siteId);

        const offset = (page - 1) * limit;
        const order = sort === 'oldest' ? [['created_at', 'ASC']]
            : sort === 'highest' ? [['rating', 'DESC'], ['created_at', 'DESC']]
                : sort === 'lowest' ? [['rating', 'ASC'], ['created_at', 'DESC']]
                    : [['created_at', 'DESC']];

        const { count, rows } = await NearbyPlaceReview.findAndCountAll({
            where: { nearby_place_id: nearbyPlaceId, is_active: true },
            include: [
                {
                    model: User,
                    as: 'reviewer',
                    attributes: ['id', 'full_name', 'avatar_url']
                },
                {
                    model: NearbyPlaceReviewReply,
                    as: 'reply',
                    include: [{
                        model: User,
                        as: 'replier',
                        attributes: ['id', 'full_name', 'avatar_url', 'role']
                    }]
                }
            ],
            order,
            limit: parseInt(limit),
            offset
        });

        const avgResult = await NearbyPlaceReview.findOne({
            where: { nearby_place_id: nearbyPlaceId, is_active: true },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews']
            ],
            raw: true
        });

        const distribution = await NearbyPlaceReview.findAll({
            where: { nearby_place_id: nearbyPlaceId, is_active: true },
            attributes: [
                'rating',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['rating'],
            raw: true
        });

        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        distribution.forEach(d => {
            ratingDistribution[d.rating] = parseInt(d.count);
        });

        return {
            summary: {
                avg_rating: avgResult.avg_rating ? parseFloat(parseFloat(avgResult.avg_rating).toFixed(1)) : 0,
                total_reviews: parseInt(avgResult.total_reviews) || 0,
                rating_distribution: ratingDistribution
            },
            reviews: rows.map(r => this._formatNearbyPlaceReview(r)),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                total_pages: Math.ceil(count / limit)
            }
        };
    }

    async updateNearbyPlaceReview(userId, reviewId, siteId, { rating, feedback, image_urls }) {
        const review = await NearbyPlaceReview.findOne({
            where: { id: reviewId, user_id: userId, is_active: true },
            include: [{
                model: NearbyPlace,
                as: 'nearbyPlace',
                where: { site_id: siteId },
                attributes: ['id', 'site_id']
            }]
        });

        if (!review) {
            const error = new Error('Review not found, not authorized, or does not belong to this site');
            error.statusCode = 404;
            throw error;
        }

        const updateData = {};
        if (rating !== undefined) updateData.rating = rating;
        if (feedback !== undefined) updateData.feedback = feedback;
        if (image_urls !== undefined) updateData.image_urls = image_urls;

        await review.update(updateData);
        return this._formatNearbyPlaceReview(review);
    }

    async deleteNearbyPlaceReview(userId, reviewId, siteId) {
        const review = await NearbyPlaceReview.findOne({
            where: { id: reviewId, user_id: userId, is_active: true },
            include: [{
                model: NearbyPlace,
                as: 'nearbyPlace',
                where: { site_id: siteId },
                attributes: ['id', 'site_id']
            }]
        });

        if (!review) {
            const error = new Error('Review not found, not authorized, or does not belong to this site');
            error.statusCode = 404;
            throw error;
        }

        await review.update({ is_active: false });
        return { message: 'Review deleted successfully' };
    }

    // ===================== HELPERS =====================

    _formatSiteReview(review) {
        const data = {
            id: review.id,
            site_id: review.site_id,
            rating: review.rating,
            feedback: review.feedback,
            image_urls: review.image_urls || [],
            verified_visit: review.verified_visit,
            created_at: review.created_at,
            updated_at: review.updated_at
        };

        if (review.reviewer) {
            data.reviewer = {
                id: review.reviewer.id,
                full_name: review.reviewer.full_name,
                avatar_url: review.reviewer.avatar_url
            };
        }

        if (review.reply) {
            data.reply = {
                id: review.reply.id,
                content: review.reply.content,
                created_at: review.reply.created_at,
                replier: review.reply.replier ? {
                    id: review.reply.replier.id,
                    full_name: review.reply.replier.full_name,
                    avatar_url: review.reply.replier.avatar_url,
                    role: review.reply.replier.role
                } : null
            };
        }

        return data;
    }

    _formatNearbyPlaceReview(review) {
        const data = {
            id: review.id,
            nearby_place_id: review.nearby_place_id,
            rating: review.rating,
            feedback: review.feedback,
            image_urls: review.image_urls || [],
            created_at: review.created_at,
            updated_at: review.updated_at
        };

        if (review.reviewer) {
            data.reviewer = {
                id: review.reviewer.id,
                full_name: review.reviewer.full_name,
                avatar_url: review.reviewer.avatar_url
            };
        }

        if (review.reply) {
            data.reply = {
                id: review.reply.id,
                content: review.reply.content,
                created_at: review.reply.created_at,
                replier: review.reply.replier ? {
                    id: review.reply.replier.id,
                    full_name: review.reply.replier.full_name,
                    avatar_url: review.reply.replier.avatar_url,
                    role: review.reply.replier.role
                } : null
            };
        }

        return data;
    }
}

module.exports = new PilgrimReviewService();
