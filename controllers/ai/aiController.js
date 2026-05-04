const GoogleAiService = require('../../services/ai/googleAiService');
const PlannerAiService = require('../../services/ai/plannerAiService');
const JournalService = require('../../services/journalService');
const ResponseUtil = require('../../utils/response.util');
const Logger = require('../../utils/logger.util');
const { User } = require('../../models');

// Helper: Check if error is a quota/rate-limit error from Gemini
function isQuotaError(error) {
    return error.message.includes('429') || error.message.includes('quota') || error.message.includes('Too Many Requests') || error.message.includes('Resource has been exhausted');
}
const QUOTA_MSG = 'AI service quota exceeded. Please try again later.';

// Helper: Check if error is a 503 overload error from Gemini
function isOverloadError(error) {
    return error.message.includes('503') || error.message.includes('Service Unavailable') || error.message.includes('high demand') || error.message.includes('overloaded');
}
const OVERLOAD_MSG = 'AI đang quá tải, vui lòng thử lại sau.';

// Helper: Check if error is an AI schema/parse error (output guard or JSON parse failure)
function isInvalidAiSchemaError(error) {
    return error.message.includes('AI returned invalid JSON') || error.message.includes('AI returned invalid');
}
const SCHEMA_MSG = 'AI service returned unexpected format. Please try again.';

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
        if (isInvalidAiSchemaError(error)) {
            return ResponseUtil.error(res, SCHEMA_MSG, 502);
        }
        if (isQuotaError(error)) {
            return ResponseUtil.error(res, QUOTA_MSG, 429);
        }
        if (isOverloadError(error)) {
            return ResponseUtil.error(res, OVERLOAD_MSG, 503);
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// ========================
// PILGRIM: AI Prayer Suggestion
// ========================

/**
 * POST /api/ai/suggest-prayer
 * AI suggests a personalized prayer based on journal context
 */
exports.suggestPrayer = async (req, res) => {
    try {
        const { planner_item_id, planner_id, current_text, mood, intention } = req.body;
        const language = req.user.language || 'vi';

        // 1. Validate and resolve journal context (same rules as journal creation)
        const context = await JournalService.resolveJournalContextForAi(req.user.id, { planner_item_id, planner_id });

        // 2. Generate prayer using AI
        const result = await GoogleAiService.suggestPrayer(req.user.id, context, {
            current_text, mood, intention, language
        });

        return ResponseUtil.success(res, result, req.__('ai.suggest_prayer_success') || 'Prayer suggestion generated successfully');
    } catch (error) {
        Logger.error(`AI Prayer Suggestion Error: ${error.message}`);
        if (error.message.includes('GOOGLE_AI_KEY')) {
            return ResponseUtil.error(res, 'AI service is not configured', 503);
        }
        if (error.message.includes('Planner not found') || error.message.includes('Associated planner not found')) {
            return ResponseUtil.notFound(res, req.__('ai.invalid_journal_context') || error.message);
        }
        if (error.message.includes('Forbidden')) {
            return ResponseUtil.forbidden(res, req.__('ai.invalid_journal_context') || error.message);
        }
        if (error.message.includes('check-in') || error.message.includes('completed')) {
            return ResponseUtil.badRequest(res, req.__('ai.invalid_journal_context') || error.message);
        }
        if (error.message.includes('Either planner_item_id or planner_id') || error.message.includes('Cannot provide both')) {
            return ResponseUtil.badRequest(res, req.__('ai.prayer_context_required') || error.message);
        }
        if (isInvalidAiSchemaError(error)) {
            return ResponseUtil.error(res, SCHEMA_MSG, 502);
        }
        if (isQuotaError(error)) {
            return ResponseUtil.error(res, QUOTA_MSG, 429);
        }
        if (isOverloadError(error)) {
            return ResponseUtil.error(res, OVERLOAD_MSG, 503);
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

// ========================
// Helper: Resolve Local Guide's site_id
// ========================

/**
 * Get the authenticated user's site context (Manager or Local Guide).
 * If FE sends a site_id, verify it matches the user's assigned site.
 */
async function resolveSiteContext(userId, requestedSiteId) {
    const user = await User.findByPk(userId, { attributes: ['id', 'role', 'site_id', 'language'] });

    if (!user || !['local_guide', 'manager'].includes(user.role)) {
        throw new Error('Unauthorized');
    }

    if (!user.site_id) {
        throw new Error(`${user.role === 'manager' ? 'Manager' : 'Local Guide'} has no site assigned`);
    }

    // If FE sent a site_id, it must match the user's assigned site
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

        const { site_id: siteId } = await resolveSiteContext(req.user.id);

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
        if (isInvalidAiSchemaError(error)) {
            return ResponseUtil.error(res, SCHEMA_MSG, 502);
        }
        if (isQuotaError(error)) {
            return ResponseUtil.error(res, QUOTA_MSG, 429);
        }
        if (isOverloadError(error)) {
            return ResponseUtil.error(res, OVERLOAD_MSG, 503);
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
        const { site_id: siteId, language } = await resolveSiteContext(req.user.id);

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
        if (isInvalidAiSchemaError(error)) {
            return ResponseUtil.error(res, SCHEMA_MSG, 502);
        }
        if (isQuotaError(error)) {
            return ResponseUtil.error(res, QUOTA_MSG, 429);
        }
        if (isOverloadError(error)) {
            return ResponseUtil.error(res, OVERLOAD_MSG, 503);
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

        const { site_id: siteId } = await resolveSiteContext(req.user.id);

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
        if (isInvalidAiSchemaError(error)) {
            return ResponseUtil.error(res, SCHEMA_MSG, 502);
        }
        if (isQuotaError(error)) {
            return ResponseUtil.error(res, QUOTA_MSG, 429);
        }
        if (isOverloadError(error)) {
            return ResponseUtil.error(res, OVERLOAD_MSG, 503);
        }
        return ResponseUtil.error(res, req.__('error.server_error') || 'Server error');
    }
};

