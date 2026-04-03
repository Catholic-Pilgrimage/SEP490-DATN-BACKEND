const GoogleAiService = require('../../services/ai/googleAiService');
const PlannerAiService = require('../../services/ai/plannerAiService');
const ResponseUtil = require('../../utils/response.util');
const Logger = require('../../utils/logger.util');
const { User } = require('../../models');

// Helper: Check if error is a quota/rate-limit error from Gemini
function isQuotaError(error) {
    return error.message.includes('429') || error.message.includes('quota') || error.message.includes('Too Many Requests') || error.message.includes('Resource has been exhausted');
}
const QUOTA_MSG = 'AI service quota exceeded. Please try again later.';

// ========================
// PILGRIM: AI Route Suggestion
// ========================

/**
 * POST /api/ai/suggest-route
 * Pilgrim selects multiple destinations → AI suggests optimized route
 */
exports.suggestRoute = async (req, res) => {
    try {
        const { site_ids, transport_mode, max_days, start_date, priority, number_of_people, patron_saint } = req.body;

        if (!site_ids || !Array.isArray(site_ids)) {
            return ResponseUtil.badRequest(res, 'site_ids must be an array of site UUIDs');
        }

        const result = await PlannerAiService.suggestRoute(site_ids, {
            start_date,
            max_days,
            transport_mode,
            priority,
            number_of_people,
            patron_saint
        });

        return ResponseUtil.success(res, result, 'AI route suggestion generated');
    } catch (error) {
        Logger.error(`AI Route Suggestion Error: ${error.message}`);
        if (error.message.includes('GOOGLE_AI_KEY')) {
            return ResponseUtil.error(res, 'AI service is not configured', 503);
        }
        if (error.message.includes('At least 2') || error.message.includes('Maximum 15') || error.message.includes('Could not find enough') || error.message.includes('Invalid site ID format')) {
            return ResponseUtil.badRequest(res, error.message);
        }
        if (error.message.includes('AI returned invalid JSON')) {
            return ResponseUtil.error(res, 'AI service returned unexpected format. Please try again.', 502);
        }
        if (isQuotaError(error)) {
            return ResponseUtil.error(res, QUOTA_MSG, 429);
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// ========================
// Helper: Resolve Local Guide's site_id
// ========================

/**
 * Get the authenticated Local Guide's context.
 * If FE sends a site_id, verify it matches the guide's assigned site.
 */
async function resolveGuideContext(userId, requestedSiteId) {
    const user = await User.findByPk(userId, { attributes: ['id', 'role', 'site_id', 'language'] });

    if (!user || user.role !== 'local_guide') {
        throw new Error('Unauthorized');
    }

    if (!user.site_id) {
        throw new Error('Local Guide has no site assigned');
    }

    // If FE sent a site_id, it must match the guide's assigned site
    if (requestedSiteId && requestedSiteId !== user.site_id) {
        throw new Error('You can only use AI features for your assigned site');
    }

    return {
        site_id: user.site_id,
        language: user.language || 'vi'
    };
}

// ========================
// LOCAL GUIDE: AI Article Writer
// ========================

/**
 * POST /api/ai/generate-article
 * Generate devotional article about a pilgrimage site
 */
exports.generateArticle = async (req, res) => {
    try {
        const { topic, additional_context, language, length, style } = req.body;

        const { site_id: siteId } = await resolveGuideContext(req.user.id);

        const result = await GoogleAiService.generateArticle(req.user.id, siteId, {
            topic,
            additionalContext: additional_context,
            language,
            length,
            style
        });

        return ResponseUtil.success(res, result, req.__('ai.generate_article_success') || 'Article generated successfully');
    } catch (error) {
        Logger.error(`AI Article Writer Error: ${error.message}`);
        if (error.message.includes('GOOGLE_AI_KEY')) {
            return ResponseUtil.error(res, 'AI service is not configured', 503);
        }
        if (error.message.includes('Topic is required')) {
            return ResponseUtil.badRequest(res, error.message);
        }
        if (error.message.includes('Unauthorized') || error.message.includes('only use AI features')) {
            return ResponseUtil.forbidden(res, error.message);
        }
        if (error.message.includes('no site assigned')) {
            return ResponseUtil.badRequest(res, error.message);
        }
        if (error.message.includes('AI returned invalid JSON')) {
            return ResponseUtil.error(res, 'AI service returned unexpected format. Please try again.', 502);
        }
        if (isQuotaError(error)) {
            return ResponseUtil.error(res, QUOTA_MSG, 429);
        }
        return ResponseUtil.error(res, req.__('error.server_error') || 'Server error');
    }
};

// ========================
// LOCAL GUIDE: AI Review Summarizer
// ========================

/**
 * POST /api/ai/summarize-reviews
 * Summarize recent reviews for a site (AI-powered)
 */
exports.summarizeReviews = async (req, res) => {
    try {
        const { site_id: siteId, language } = await resolveGuideContext(req.user.id);

        const result = await GoogleAiService.summarizeReviews(siteId, { language });

        return ResponseUtil.success(res, result, req.__('ai.summarize_reviews_success') || 'Reviews summarized successfully');
    } catch (error) {
        Logger.error(`AI Review Summarizer Error: ${error.message}`);
        if (error.message.includes('GOOGLE_AI_KEY')) {
            return ResponseUtil.error(res, 'AI service is not configured', 503);
        }
        if (error.message.includes('Unauthorized') || error.message.includes('only use AI features')) {
            return ResponseUtil.forbidden(res, error.message);
        }
        if (error.message.includes('no site assigned')) {
            return ResponseUtil.badRequest(res, error.message);
        }
        if (error.message.includes('No reviews found')) {
            return ResponseUtil.badRequest(res, req.__('ai.no_reviews') || error.message);
        }
        if (error.message.includes('Site not found')) {
            return ResponseUtil.notFound(res, error.message);
        }
        if (error.message.includes('AI returned invalid JSON')) {
            return ResponseUtil.error(res, 'AI service returned unexpected format. Please try again.', 502);
        }
        if (isQuotaError(error)) {
            return ResponseUtil.error(res, QUOTA_MSG, 429);
        }
        return ResponseUtil.error(res, req.__('error.server_error') || 'Server error');
    }
};

// ========================
// LOCAL GUIDE: AI Event Recommender
// ========================

/**
 * POST /api/ai/suggest-events
 * Suggest events based on liturgical season + site context
 */
exports.suggestEvents = async (req, res) => {
    try {
        const { current_date, count } = req.body || {};

        const { site_id: siteId } = await resolveGuideContext(req.user.id);

        const result = await GoogleAiService.suggestEvents(req.user.id, siteId, {
            currentDate: current_date,
            count: Math.min(count || 5, 10) // Cap at 10 suggestions
        });

        return ResponseUtil.success(res, result, req.__('ai.suggest_events_success') || 'Event suggestions generated');
    } catch (error) {
        Logger.error(`AI Event Recommender Error: ${error.message}`);
        if (error.message.includes('GOOGLE_AI_KEY')) {
            return ResponseUtil.error(res, 'AI service is not configured', 503);
        }
        if (error.message.includes('Unauthorized') || error.message.includes('only use AI features')) {
            return ResponseUtil.forbidden(res, error.message);
        }
        if (error.message.includes('no site assigned')) {
            return ResponseUtil.badRequest(res, error.message);
        }
        if (error.message.includes('AI returned invalid JSON')) {
            return ResponseUtil.error(res, 'AI service returned unexpected format. Please try again.', 502);
        }
        if (isQuotaError(error)) {
            return ResponseUtil.error(res, QUOTA_MSG, 429);
        }
        return ResponseUtil.error(res, req.__('error.server_error') || 'Server error');
    }
};
