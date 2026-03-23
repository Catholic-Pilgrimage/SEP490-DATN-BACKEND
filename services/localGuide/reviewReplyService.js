const {
    Site, NearbyPlace, User,
    SiteReview, NearbyPlaceReview,
    SiteReviewReply, NearbyPlaceReviewReply,
    sequelize
} = require('../../models');
const NotificationService = require('../shared/notificationService');

class LocalGuideReviewReplyService {

    // ===================== GET REVIEWS FOR MY SITE =====================

    async getReviewsForMySite(userId, { page = 1, limit = 10, sort = 'newest', type = 'all', has_reply }) {
        const user = await User.findByPk(userId, { attributes: ['id', 'role', 'site_id'] });
        if (!user || !user.site_id) {
            const error = new Error('You are not assigned to any site');
            error.statusCode = 403;
            throw error;
        }

        const siteId = user.site_id;
        const offset = (page - 1) * limit;
        const order = sort === 'oldest' ? [['created_at', 'ASC']]
            : sort === 'highest' ? [['rating', 'DESC'], ['created_at', 'DESC']]
                : sort === 'lowest' ? [['rating', 'ASC'], ['created_at', 'DESC']]
                    : [['created_at', 'DESC']];

        const results = { site_reviews: null, nearby_place_reviews: null };

        // Site reviews
        if (type === 'all' || type === 'site') {
            const siteReviewInclude = [
                { model: User, as: 'reviewer', attributes: ['id', 'full_name', 'avatar_url'] },
                {
                    model: SiteReviewReply,
                    as: 'reply',
                    required: has_reply === 'true' ? true : (has_reply === 'false' ? false : undefined),
                    include: [{ model: User, as: 'replier', attributes: ['id', 'full_name', 'avatar_url', 'role'] }]
                }
            ];

            const siteWhere = { site_id: siteId, is_active: true };

            // For has_reply=false, we need LEFT JOIN + NULL check
            let siteReviewQuery = {
                where: siteWhere,
                include: siteReviewInclude,
                order,
                limit: parseInt(limit),
                offset
            };

            if (has_reply === 'false') {
                siteReviewQuery.include[1].required = false;
            }

            const { count, rows } = await SiteReview.findAndCountAll(siteReviewQuery);

            // Filter out reviews with replies when has_reply=false
            let filteredRows = rows;
            if (has_reply === 'false') {
                filteredRows = rows.filter(r => !r.reply);
            }

            const avgResult = await SiteReview.findOne({
                where: siteWhere,
                attributes: [
                    [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews']
                ],
                raw: true
            });

            results.site_reviews = {
                summary: {
                    avg_rating: avgResult.avg_rating ? parseFloat(parseFloat(avgResult.avg_rating).toFixed(1)) : 0,
                    total_reviews: parseInt(avgResult.total_reviews) || 0
                },
                reviews: filteredRows.map(r => this._formatReview(r, 'site')),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: has_reply === 'false' ? filteredRows.length : count,
                    total_pages: Math.ceil((has_reply === 'false' ? filteredRows.length : count) / limit)
                }
            };
        }

        // Nearby place reviews
        if (type === 'all' || type === 'nearby_place') {
            const npReviewInclude = [
                { model: User, as: 'reviewer', attributes: ['id', 'full_name', 'avatar_url'] },
                {
                    model: NearbyPlaceReviewReply,
                    as: 'reply',
                    required: has_reply === 'true' ? true : false,
                    include: [{ model: User, as: 'replier', attributes: ['id', 'full_name', 'avatar_url', 'role'] }]
                },
                {
                    model: NearbyPlace,
                    as: 'nearbyPlace',
                    where: { site_id: siteId },
                    attributes: ['id', 'name', 'category', 'site_id']
                }
            ];

            const { count: npCount, rows: npRows } = await NearbyPlaceReview.findAndCountAll({
                where: { is_active: true },
                include: npReviewInclude,
                order,
                limit: parseInt(limit),
                offset
            });

            let filteredNpRows = npRows;
            if (has_reply === 'false') {
                filteredNpRows = npRows.filter(r => !r.reply);
            }

            results.nearby_place_reviews = {
                reviews: filteredNpRows.map(r => this._formatReview(r, 'nearby_place')),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: has_reply === 'false' ? filteredNpRows.length : npCount,
                    total_pages: Math.ceil((has_reply === 'false' ? filteredNpRows.length : npCount) / limit)
                }
            };
        }

        return results;
    }

    _formatReview(review, type) {
        const data = {
            id: review.id,
            type,
            rating: review.rating,
            feedback: review.feedback,
            image_urls: review.image_urls || [],
            has_reply: !!review.reply,
            created_at: review.created_at,
            updated_at: review.updated_at
        };

        if (type === 'site') {
            data.site_id = review.site_id;
            data.verified_visit = review.verified_visit;
        } else {
            data.nearby_place_id = review.nearby_place_id;
            if (review.nearbyPlace) {
                data.nearby_place = {
                    id: review.nearbyPlace.id,
                    name: review.nearbyPlace.name,
                    category: review.nearbyPlace.category
                };
            }
        }

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
                    full_name: review.reply.replier.full_name
                } : null
            };
        }

        return data;
    }

    // ===================== SITE REVIEW REPLIES =====================

    async replySiteReview(userId, reviewId, content) {
        const review = await SiteReview.findOne({
            where: { id: reviewId, is_active: true },
            include: [{ model: Site, as: 'site', attributes: ['id'] }]
        });

        if (!review) {
            const error = new Error('Review not found');
            error.statusCode = 404;
            throw error;
        }

        // Check user is Local Guide of this site
        const user = await User.findByPk(userId, { attributes: ['id', 'role', 'site_id'] });
        if (!user || user.role !== 'local_guide' || user.site_id !== review.site_id) {
            const error = new Error('Only the Local Guide of this site can reply');
            error.statusCode = 403;
            throw error;
        }

        const existingReply = await SiteReviewReply.findOne({ where: { review_id: reviewId } });
        if (existingReply) {
            const error = new Error('This review already has a reply');
            error.statusCode = 409;
            throw error;
        }

        const reply = await SiteReviewReply.create({
            review_id: reviewId,
            user_id: userId,
            content
        });

        // Notify pilgrim who wrote the review (fire-and-forget)
        try {
            const site = await Site.findByPk(review.site_id, { attributes: ['name'] });
            await NotificationService.createNotification('review_replied', review.user_id, {
                siteName: site?.name || 'Site'
            });
        } catch (err) {
            console.error('Notification error (review_replied):', err.message);
        }

        return reply;
    }

    async updateSiteReviewReply(userId, reviewId, content) {
        const reply = await SiteReviewReply.findOne({
            where: { review_id: reviewId, user_id: userId }
        });

        if (!reply) {
            const error = new Error('Reply not found or not authorized');
            error.statusCode = 404;
            throw error;
        }

        await reply.update({ content });
        return reply;
    }

    async deleteSiteReviewReply(userId, reviewId) {
        const reply = await SiteReviewReply.findOne({
            where: { review_id: reviewId, user_id: userId }
        });

        if (!reply) {
            const error = new Error('Reply not found or not authorized');
            error.statusCode = 404;
            throw error;
        }

        await reply.destroy();
        return { message: 'Reply deleted successfully' };
    }

    // ===================== NEARBY PLACE REVIEW REPLIES =====================

    async replyNearbyPlaceReview(userId, reviewId, content) {
        const review = await NearbyPlaceReview.findOne({
            where: { id: reviewId, is_active: true },
            include: [{
                model: NearbyPlace,
                as: 'nearbyPlace',
                attributes: ['id', 'site_id']
            }]
        });

        if (!review) {
            const error = new Error('Review not found');
            error.statusCode = 404;
            throw error;
        }

        const user = await User.findByPk(userId, { attributes: ['id', 'role', 'site_id'] });
        if (!user || user.role !== 'local_guide' || user.site_id !== review.nearbyPlace.site_id) {
            const error = new Error('Only the Local Guide of the parent site can reply');
            error.statusCode = 403;
            throw error;
        }

        const existingReply = await NearbyPlaceReviewReply.findOne({ where: { review_id: reviewId } });
        if (existingReply) {
            const error = new Error('This review already has a reply');
            error.statusCode = 409;
            throw error;
        }

        const reply = await NearbyPlaceReviewReply.create({
            review_id: reviewId,
            user_id: userId,
            content
        });

        // Notify pilgrim who wrote the review (fire-and-forget)
        try {
            const place = await NearbyPlace.findByPk(review.nearby_place_id, { attributes: ['name'] });
            await NotificationService.createNotification('review_replied', review.user_id, {
                siteName: place?.name || 'Nearby Place'
            });
        } catch (err) {
            console.error('Notification error (review_replied):', err.message);
        }

        return reply;
    }

    async updateNearbyPlaceReviewReply(userId, reviewId, content) {
        const reply = await NearbyPlaceReviewReply.findOne({
            where: { review_id: reviewId, user_id: userId }
        });

        if (!reply) {
            const error = new Error('Reply not found or not authorized');
            error.statusCode = 404;
            throw error;
        }

        await reply.update({ content });
        return reply;
    }

    async deleteNearbyPlaceReviewReply(userId, reviewId) {
        const reply = await NearbyPlaceReviewReply.findOne({
            where: { review_id: reviewId, user_id: userId }
        });

        if (!reply) {
            const error = new Error('Reply not found or not authorized');
            error.statusCode = 404;
            throw error;
        }

        await reply.destroy();
        return { message: 'Reply deleted successfully' };
    }
}

module.exports = new LocalGuideReviewReplyService();
