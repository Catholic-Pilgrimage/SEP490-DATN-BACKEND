const { generateJSON } = require('../../config/googleai.config');
const { Site, Event, SiteReview, User } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const { AiCacheService, MODEL_VERSION } = require('./aiCacheService');
const { AiPromptService } = require('./aiPromptService');

/**
 * Google AI Service — AI features for Local Guides
 * 1. AI Article Writer (with style, summary, full site context)
 * 2. AI Review Summarizer (summarize recent site reviews)
 * 3. AI Event Recommender (aligned with Event model schema)
 */
class GoogleAiService {

    /**
     * 1. Generate devotional article for a pilgrimage site
     * @param {string} userId - Local Guide's user ID
     * @param {string} siteId - Site UUID
     * @param {object} params - { topic, additionalContext, language, length, style }
     * @returns {Promise<{title, summary, content, tags[]}>}
     */
    static async generateArticle(userId, siteId, params = {}) {
        const {
            topic,
            additionalContext,
            language = 'vi',
            length = 'medium',
            style = 'devotional'
        } = params;

        if (!topic || topic.trim().length < 2) {
            throw new Error('Topic is required and must be at least 2 characters');
        }

        // Fetch full site context
        let siteContext = '';
        let siteUpdatedAt = '';
        if (siteId) {
            const site = await Site.findByPk(siteId);
            if (site) {
                siteUpdatedAt = site.updated_at ? new Date(site.updated_at).toISOString() : '';
                siteContext = `
Site Information:
- Name: ${site.name}
- Type: ${site.type} (${this._typeLabel(site.type)})
- Region: ${site.region}
- Province: ${site.province || 'N/A'}
- District: ${site.district || 'N/A'}
- Patron Saint: ${site.patron_saint || 'N/A'}
- Description: ${site.description || 'N/A'}
- History: ${site.history || 'N/A'}
- Address: ${site.address || 'N/A'}`;
            }
        }

        // ─── Get instruction text from DB or fallback ───
        const promptConfig = await AiPromptService.getPromptByKey('article');

        // ─── Cache check (use DB prompt version) ───
        const cacheKey = AiCacheService.buildCacheKey({
            site_id: siteId || '',
            topic: topic.trim().toLowerCase(),
            additional_context: (additionalContext || '').trim().toLowerCase(),
            language, length, style,
            site_updated_at: siteUpdatedAt,
            prompt_version: promptConfig.version,
            model: MODEL_VERSION
        });
        const cached = await AiCacheService.get('generate_article', cacheKey);
        if (cached) return cached;

        const wordCount = length === 'short' ? 200 : length === 'long' ? 700 : 400;
        const langInstruction = language === 'en'
            ? 'Write the article in English.'
            : 'Viết bài bằng tiếng Việt.';

        const styleMap = {
            devotional: 'Tone: Devotional, reverent, prayerful — suitable for spiritual reflection',
            informational: 'Tone: Informational, factual, educational — suitable for a guide or brochure',
            historical: 'Tone: Historical narrative, detailed chronology — focus on dates, events, historical figures',
            youth: 'Tone: Youth-friendly, engaging, modern — use relatable language for young Catholics'
        };
        const styleInstruction = styleMap[style] || styleMap.devotional;

        const prompt = `${promptConfig.instructionText}

Topic: ${topic}
${siteContext}
${additionalContext ? `Additional context from Local Guide: ${additionalContext}` : ''}

- ${langInstruction}
- ${styleInstruction}
- Length: approximately ${wordCount} words

Return JSON:
{
  "title": "Article title",
  "summary": "A 2-3 sentence preview/excerpt of the article",
  "content": "Full article text with paragraphs separated by \\n\\n",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

        Logger.info(`[AI API Call] Article for site=${siteId}, topic="${topic}", lang=${language}, style=${style}, prompt_source=${promptConfig.source}`);
        const result = await generateJSON('article', prompt, { temperature: 0.8 });

        // Output guard
        if (!result.title || typeof result.title !== 'string') {
            throw new Error('AI returned invalid article schema: missing title');
        }
        if (!result.content || typeof result.content !== 'string') {
            throw new Error('AI returned invalid article schema: missing content');
        }

        const response = {
            title: result.title,
            summary: result.summary || '',
            content: result.content,
            tags: Array.isArray(result.tags) ? result.tags : [],
            metadata: { generated_by: 'google_ai', language, length, style, topic }
        };

        // ─── Cache set (only after successful output guard) ───
        await AiCacheService.set('generate_article', cacheKey, response);
        return response;
    }

    /**
     * 2. Summarize recent reviews for a site
     * Fetches up to 20 most recent reviews and asks AI to summarize
     * @param {string} siteId - Site UUID
     * @param {object} params - { language }
     * @returns {Promise<{site_name, total_reviews, average_rating, summary, strengths[], weaknesses[], metadata}>}
     */
    static async summarizeReviews(siteId, params = {}) {
        const { language = 'vi' } = params;

        const site = await Site.findByPk(siteId);
        if (!site) {
            throw new Error('Site not found');
        }

        // Get overall stats for the entire site (all reviews)
        const sequelize = require('../../config/database');
        const [siteStats] = await SiteReview.findAll({
            where: { site_id: siteId, is_active: true },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_count'],
                [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
                [sequelize.fn('MAX', sequelize.col('updated_at')), 'latest_updated']
            ],
            raw: true
        });

        const totalReviews = parseInt(siteStats.total_count) || 0;
        const averageRating = siteStats.avg_rating ? Math.round(parseFloat(siteStats.avg_rating) * 10) / 10 : 0;
        const latestReviewUpdatedAt = siteStats.latest_updated || '';

        if (totalReviews === 0) {
            throw new Error('No reviews found for this site');
        }

        // ─── Get instruction text from DB or fallback ───
        const promptConfig = await AiPromptService.getPromptByKey('review_summary');

        // ─── Cache check (use DB prompt version) ───
        const siteUpdatedAt = site.updated_at ? new Date(site.updated_at).toISOString() : '';
        const cacheKey = AiCacheService.buildCacheKey({
            site_id: siteId,
            language,
            site_updated_at: siteUpdatedAt,
            active_review_count: String(totalReviews),
            latest_review_updated_at: latestReviewUpdatedAt ? new Date(latestReviewUpdatedAt).toISOString() : '',
            prompt_version: promptConfig.version,
            model: MODEL_VERSION
        });
        const cached = await AiCacheService.get('summarize_reviews', cacheKey);
        if (cached) return cached;

        // Fetch recent reviews (up to 20) for AI analysis
        const reviews = await SiteReview.findAll({
            where: { site_id: siteId, is_active: true },
            include: [{
                model: User,
                as: 'reviewer',
                attributes: ['full_name']
            }],
            order: [['created_at', 'DESC']],
            limit: 20
        });

        // Build review text for AI
        const reviewText = reviews.map((r, i) => {
            const name = r.reviewer?.full_name || 'Ẩn danh';
            return `Review ${i + 1} (${name}, ${r.rating}/5 sao): ${r.feedback || '(không có nhận xét)'}`;
        }).join('\n');

        const langInstruction = language === 'en'
            ? 'Write the summary in English.'
            : 'Viết tóm tắt bằng tiếng Việt.';

        const prompt = `${promptConfig.instructionText}

Site: ${site.name}
Type: ${site.type} (${this._typeLabel(site.type)})
Total reviews on site: ${totalReviews}
Overall average rating: ${averageRating}/5
Reviews analyzed below: ${reviews.length} (most recent)

Here are the recent reviews:
${reviewText}

${langInstruction}

Return JSON:
{
  "overall_summary": "Tóm tắt tổng quan 2-3 câu về trải nghiệm khách hành hương",
  "strengths": ["Ưu điểm 1", "Ưu điểm 2", "Ưu điểm 3"],
  "weaknesses": ["Nhược điểm 1", "Nhược điểm 2"],
  "sentiment": "positive | neutral | negative",
  "highlights": ["Điểm nổi bật 1 được nhiều người nhắc đến", "Điểm nổi bật 2"]
}`;

        Logger.info(`[AI API Call] Summarizing ${reviews.length} reviews for site=${siteId} (total: ${totalReviews}), prompt_source=${promptConfig.source}`);
        const result = await generateJSON('review_summary', prompt, { temperature: 0.4 });

        // Output guard
        if (!result.overall_summary || typeof result.overall_summary !== 'string') {
            throw new Error('AI returned invalid review summary schema: missing overall_summary');
        }
        if (!Array.isArray(result.strengths) || !Array.isArray(result.weaknesses)) {
            throw new Error('AI returned invalid review summary schema: strengths/weaknesses must be arrays');
        }

        const response = {
            site_name: site.name,
            total_reviews: totalReviews,
            average_rating: averageRating,
            reviews_analyzed: reviews.length,
            overall_summary: result.overall_summary,
            strengths: result.strengths,
            weaknesses: result.weaknesses,
            sentiment: result.sentiment || 'neutral',
            highlights: Array.isArray(result.highlights) ? result.highlights : [],
            metadata: { generated_by: 'google_ai', language, reviews_analyzed: reviews.length }
        };

        // ─── Cache set (only after successful output guard) ───
        await AiCacheService.set('summarize_reviews', cacheKey, response);
        return response;
    }

    /**
     * 3. Suggest events — output aligned with Event model schema
     * Returns data that can be directly used to create events
     * @param {string} userId - Local Guide user ID
     * @param {string} siteId - Site UUID
     * @param {object} params - { currentDate, count }
     * @returns {Promise<{liturgical_season, suggestions[]}>}
     */
    static async suggestEvents(userId, siteId, params = {}) {
        const { currentDate, count = 5 } = params;
        const dateStr = currentDate || new Date().toISOString().split('T')[0];

        let siteContext = '';
        let siteName = 'Unknown Site';
        let siteLocation = '';
        let siteUpdatedAt = '';
        if (siteId) {
            const site = await Site.findByPk(siteId);
            if (site) {
                siteName = site.name;
                siteLocation = site.address || site.province || '';
                siteUpdatedAt = site.updated_at ? new Date(site.updated_at).toISOString() : '';
                siteContext = `
Site: ${site.name}
Type: ${site.type} (${this._typeLabel(site.type)})
Region: ${site.region}
Province: ${site.province || 'N/A'}
Address: ${site.address || 'N/A'}
Patron Saint: ${site.patron_saint || 'N/A'}
Description: ${(site.description || '').substring(0, 300)}`;
            }
        }

        // Fetch more recent events to avoid duplicates
        let recentEvents = [];
        let latestEventUpdatedAt = '';
        if (siteId) {
            recentEvents = await Event.findAll({
                where: { site_id: siteId, is_active: true },
                order: [['created_at', 'DESC']],
                limit: 15,
                attributes: ['name', 'description', 'start_date', 'end_date', 'category', 'updated_at']
            });
            if (recentEvents.length > 0) {
                const maxUpdated = recentEvents.reduce((max, e) => {
                    const t = new Date(e.updated_at || 0).getTime();
                    return t > max ? t : max;
                }, 0);
                latestEventUpdatedAt = new Date(maxUpdated).toISOString();
            }
        }

        // ─── Get instruction text from DB or fallback ───
        const promptConfig = await AiPromptService.getPromptByKey('events');

        // ─── Cache check (use DB prompt version) ───
        const cacheKey = AiCacheService.buildCacheKey({
            site_id: siteId || '',
            current_date: dateStr,
            count: String(count),
            site_updated_at: siteUpdatedAt,
            active_event_count: String(recentEvents.length),
            latest_event_updated_at: latestEventUpdatedAt,
            prompt_version: promptConfig.version,
            model: MODEL_VERSION
        });
        const cached = await AiCacheService.get('suggest_events', cacheKey);
        if (cached) return cached;

        const recentList = recentEvents.length > 0
            ? recentEvents.map(e => `- ${e.name} (${e.start_date}${e.end_date ? ' → ' + e.end_date : ''}) [${e.category || 'no category'}]`).join('\n')
            : 'No recent events';

        const prompt = `${promptConfig.instructionText}

Current date: ${dateStr}
${siteContext}

Recent/existing events at this site (DO NOT suggest duplicates or very similar events):
${recentList}

Suggest ${count} NEW and UNIQUE event ideas.

Return JSON:
{
  "liturgical_season": "Current liturgical season name (Vietnamese)",
  "liturgical_season_en": "Current liturgical season name (English)",
  "season_description": "Brief explanation of this season's significance (Vietnamese, 2-3 sentences)",
  "suggestions": [
    {
      "name": "Tên sự kiện",
      "name_en": "Event name in English",
      "description": "Mô tả chi tiết sự kiện bằng tiếng Việt",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "start_time": "HH:mm:ss",
      "end_time": "HH:mm:ss",
      "location": "${siteLocation || 'Nhà thờ'}",
      "category": "mass",
      "relevance": "Why this event fits the season and site (Vietnamese)"
    }
  ]
}`;

        Logger.info(`[AI API Call] Suggesting events for site=${siteId}, date=${dateStr}, count=${count}, prompt_source=${promptConfig.source}`);
        const result = await generateJSON('events', prompt, { temperature: 0.8 });

        // Output guard
        if (!Array.isArray(result.suggestions) || result.suggestions.length === 0) {
            throw new Error('AI returned invalid event schema: suggestions must be a non-empty array');
        }
        const VALID_EVENT_CATEGORIES = ['solemn_feast', 'sacrament_mass', 'procession', 'adoration', 'patron_feast', 'festival', 'performance', 'sports', 'retreat', 'camp', 'course', 'pilgrimage', 'charity'];
        const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
        for (const s of result.suggestions) {
            if (!s.name || !s.start_date || !s.category) {
                throw new Error('AI returned invalid event schema: each suggestion needs name, start_date, category');
            }
            if (!VALID_EVENT_CATEGORIES.includes(s.category)) {
                s.category = 'pilgrimage'; // fallback to safe default
            }
            if (s.start_time && !TIME_RE.test(s.start_time)) {
                s.start_time = null;
            }
            if (s.end_time && !TIME_RE.test(s.end_time)) {
                s.end_time = null;
            }
        }

        const response = {
            site_name: siteName,
            current_date: dateStr,
            liturgical_season: result.liturgical_season,
            liturgical_season_en: result.liturgical_season_en,
            season_description: result.season_description,
            suggestions: result.suggestions,
            metadata: { generated_by: 'google_ai', count }
        };

        // ─── Cache set (only after successful output guard) ───
        await AiCacheService.set('suggest_events', cacheKey, response);
        return response;
    }

    /**
     * 4. Suggest a short prayer based on pilgrimage context (Journal Feature)
     * Context is pre-validated by JournalService.resolveJournalContextForAi
     *
     * ⚠️ NO DB CACHE — Prayer context is personal/sensitive (mood, intention, current_text).
     *    Each request hits the AI directly. See aiCacheService.js for rationale.
     *
     * @param {string} userId - Pilgrim's user ID
     * @param {{ contextType: string, planner: object, site?: object, checkedInSites?: object[] }} context
     * @param {{ current_text?: string, mood?: string, intention?: string, language?: string }} params
     * @returns {Promise<{prayer_text: string, explanation: string, tags: string[], metadata: object}>}
     */
    static async suggestPrayer(userId, context, params = {}) {
        const { current_text, mood, intention, language = 'vi' } = params;
        const { contextType, planner, site, checkedInSites } = context;

        let contextDescription = '';

        if (contextType === 'planner_item' && site) {
            contextDescription = [
                "Context: The pilgrim is writing a journal entry after visiting a specific site during their pilgrimage.",
                "Pilgrimage Trip Name: " + planner.name,
                "Site Visited: " + site.name,
                "Site Type: " + this._typeLabel(site.type),
                site.patron_saint ? "Patron Saint of the Site: " + site.patron_saint : "",
                site.province ? "Province: " + site.province : ""
            ].filter(Boolean).join("\n");
        } else if (contextType === 'planner') {
            const siteNames = (checkedInSites || [])
                .map(s => s.site?.name)
                .filter(Boolean)
                .slice(0, 5);
            contextDescription = [
                "Context: The pilgrim is writing a summary journal entry after completing their entire pilgrimage trip.",
                "Pilgrimage Trip Name: " + planner.name,
                "Trip Status: " + planner.status,
                siteNames.length > 0 ? "Sites visited: " + siteNames.join(", ") : ""
            ].filter(Boolean).join("\n");
        }

        const langInstruction = language === 'en'
            ? 'The prayer should be in English.'
            : 'The prayer should be in Vietnamese.';

        // ─── Get instruction text from DB or fallback ───
        const promptConfig = await AiPromptService.getPromptByKey('prayer');

        const prompt = [
            promptConfig.instructionText,
            "",
            contextDescription,
            current_text ? "What the pilgrim has written so far: '" + current_text + "'" : "The pilgrim has not written anything yet.",
            mood ? "The pilgrim's current mood/feeling: " + mood : "",
            intention ? "The pilgrim's special intention for this prayer: " + intention : "",
            "",
            "- " + langInstruction,
            "",
            'Return JSON:',
            '{',
            '  "prayer_text": "Lạy Chúa...",',
            '  "explanation": "Lời nguyện này...",',
            '  "tags": ["tag1", "tag2"]',
            '}'
        ].filter(line => line !== "").join("\n");

        Logger.info("Google AI: Suggesting prayer for user=" + userId + ", type=" + contextType + ", prompt_source=" + promptConfig.source);
        const result = await generateJSON('prayer', prompt, { temperature: 0.7 });

        // Output guard
        if (!result.prayer_text || typeof result.prayer_text !== 'string') {
            throw new Error('AI returned invalid prayer schema: missing prayer_text');
        }

        return {
            prayer_text: result.prayer_text,
            explanation: result.explanation || '',
            tags: Array.isArray(result.tags) ? result.tags : [],
            metadata: {
                generated_by: 'google_ai',
                context_type: contextType,
                language
            }
        };
    }

    /**
     * 5. Translate post title and content into English automatically.
     * Caching is handled by TranslationAiService at a higher level.
     * @param {string|null} title - Original post title
     * @param {string} content - Original post content
     * @returns {Promise<{title_en: string|null, content_en: string|null, metadata: object}>}
     */
    static async translatePostToEnglish(title, content) {
        if (!content && !title) {
            return { title_en: title || null, content_en: content || null };
        }

        // ─── Get instruction text from DB or fallback ───
        const promptConfig = await AiPromptService.getPromptByKey('translation_post_vi_en');

        const prompt = [
            promptConfig.instructionText,
            title ? `Original Title:\n${title}\n` : "",
            content ? `Original Content:\n${content}\n` : "",
            "Return JSON: ",
            "{",
            '  "title_en": "Translated title here (or null)",',
            '  "content_en": "Translated content here"',
            "}"
        ].filter(Boolean).join("\n");

        Logger.info(`[AI API Call] Translating post to English, prompt_source=${promptConfig.source}`);
        const result = await generateJSON('translation', prompt, { temperature: 0.3 });

        return {
            title_en: result.title_en || null,
            content_en: result.content_en || null,
            metadata: { generated_by: 'google_ai', prompt_version: promptConfig.version }
        };
    }

    /**
     * 6. Translate comment content into English.
     * Caching is handled by TranslationAiService at a higher level.
     * @param {string} content - Original comment content
     * @returns {Promise<{content_en: string|null, metadata: object}>}
     */
    static async translateCommentToEnglish(content) {
        if (!content) {
            return { content_en: null };
        }

        // ─── Get instruction text from DB or fallback ───
        const promptConfig = await AiPromptService.getPromptByKey('translation_comment_vi_en');

        const prompt = [
            promptConfig.instructionText,
            `Comment:\n${content}\n`,
            "Return JSON: ",
            "{",
            '  "content_en": "Translated comment"',
            "}"
        ].join("\n");

        Logger.info(`[AI API Call] Translating comment to English, prompt_source=${promptConfig.source}`);
        const result = await generateJSON('translation', prompt, { temperature: 0.3 });

        return {
            content_en: result.content_en || null,
            metadata: { generated_by: 'google_ai', prompt_version: promptConfig.version }
        };
    }

    /**
     * Helper: Get Vietnamese label for site type
     */
    static _typeLabel(type) {
        const labels = {
            church: 'Nhà thờ',
            shrine: 'Đền thánh',
            monastery: 'Tu viện',
            center: 'Trung tâm hành hương',
            other: 'Khác'
        };
        return labels[type] || type;
    }
}

module.exports = GoogleAiService;
