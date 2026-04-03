const { generateJSON } = require('../../config/googleai.config');
const { Site, Event, SiteReview, User } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');

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
        if (siteId) {
            const site = await Site.findByPk(siteId);
            if (site) {
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

        const prompt = `You are a Catholic content writer specializing in pilgrimage sites in Vietnam.
Write a devotional and inspiring article about the following topic.

Topic: ${topic}
${siteContext}
${additionalContext ? `Additional context from Local Guide: ${additionalContext}` : ''}

Requirements:
- ${langInstruction}
- ${styleInstruction}
- Length: approximately ${wordCount} words
- Structure: Clear introduction, structured body with subsections if needed, meaningful conclusion
- Include historical and spiritual significance
- If relevant, mention patron saints, miracles, or notable Catholic traditions
- Reference specific details from the site information provided above

Return JSON:
{
  "title": "Article title",
  "summary": "A 2-3 sentence preview/excerpt of the article",
  "content": "Full article text with paragraphs separated by \\n\\n",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

        Logger.info(`Google AI: Article for site=${siteId}, topic="${topic}", lang=${language}, style=${style}`);
        const result = await generateJSON('article', prompt, { temperature: 0.8 });

        return {
            title: result.title,
            summary: result.summary || '',
            content: result.content,
            tags: result.tags || [],
            metadata: { generated_by: 'google_ai', language, length, style, topic }
        };
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
                [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating']
            ],
            raw: true
        });

        const totalReviews = parseInt(siteStats.total_count) || 0;
        const averageRating = siteStats.avg_rating ? Math.round(parseFloat(siteStats.avg_rating) * 10) / 10 : 0;

        if (totalReviews === 0) {
            throw new Error('No reviews found for this site');
        }

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

        const prompt = `You are a review analyst for a Catholic pilgrimage site in Vietnam.

Site: ${site.name}
Type: ${site.type} (${this._typeLabel(site.type)})
Total reviews on site: ${totalReviews}
Overall average rating: ${averageRating}/5
Reviews analyzed below: ${reviews.length} (most recent)

Here are the recent reviews:
${reviewText}

${langInstruction}

Analyze these reviews and provide a structured summary. Focus on:
1. Overall impression from visitors
2. Key strengths mentioned repeatedly
3. Key weaknesses or areas for improvement
4. A concise overall summary (2-3 sentences)

Return JSON:
{
  "overall_summary": "Tóm tắt tổng quan 2-3 câu về trải nghiệm khách hành hương",
  "strengths": ["Ưu điểm 1", "Ưu điểm 2", "Ưu điểm 3"],
  "weaknesses": ["Nhược điểm 1", "Nhược điểm 2"],
  "sentiment": "positive | neutral | negative",
  "highlights": ["Điểm nổi bật 1 được nhiều người nhắc đến", "Điểm nổi bật 2"]
}`;

        Logger.info(`Google AI: Summarizing ${reviews.length} reviews for site=${siteId} (total: ${totalReviews})`);
        const result = await generateJSON('review_summary', prompt, { temperature: 0.4 });

        return {
            site_name: site.name,
            total_reviews: totalReviews,
            average_rating: averageRating,
            reviews_analyzed: reviews.length,
            overall_summary: result.overall_summary || '',
            strengths: result.strengths || [],
            weaknesses: result.weaknesses || [],
            sentiment: result.sentiment || 'neutral',
            highlights: result.highlights || [],
            metadata: { generated_by: 'google_ai', language, reviews_analyzed: reviews.length }
        };
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
        if (siteId) {
            const site = await Site.findByPk(siteId);
            if (site) {
                siteName = site.name;
                siteLocation = site.address || site.province || '';
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
        if (siteId) {
            recentEvents = await Event.findAll({
                where: { site_id: siteId, is_active: true },
                order: [['created_at', 'DESC']],
                limit: 15,
                attributes: ['name', 'description', 'start_date', 'end_date', 'category']
            });
        }

        const recentList = recentEvents.length > 0
            ? recentEvents.map(e => `- ${e.name} (${e.start_date}${e.end_date ? ' → ' + e.end_date : ''}) [${e.category || 'no category'}]`).join('\n')
            : 'No recent events';

        const prompt = `You are a Catholic liturgical calendar expert and event planner for pilgrimage sites in Vietnam.

Current date: ${dateStr}
${siteContext}

Recent/existing events at this site (DO NOT suggest duplicates or very similar events):
${recentList}

Based on the current date, determine the liturgical season and suggest ${count} NEW and UNIQUE event ideas that don't overlap with existing events.

IMPORTANT: The output must use these EXACT field names to be compatible with our Event API:

For each event provide data that can be directly used to create an event:
- name: Event name in Vietnamese (max 255 chars)
- description: Detailed description in Vietnamese (2-4 sentences)
- start_date: YYYY-MM-DD format (must be in the future from ${dateStr})
- end_date: YYYY-MM-DD format (same as start_date for single-day events, or later for multi-day)
- start_time: HH:mm:ss format (e.g. "08:00:00", "19:30:00")
- end_time: HH:mm:ss format
- location: Specific location within or near the site (e.g. "Sân nhà thờ", "Hội trường giáo xứ")
- category: One of: mass, retreat, procession, workshop, prayer, festival, charity, youth

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

        Logger.info(`Google AI: Suggesting events for site=${siteId}, date=${dateStr}, count=${count}`);
        const result = await generateJSON('events', prompt, { temperature: 0.8 });

        return {
            site_name: siteName,
            current_date: dateStr,
            liturgical_season: result.liturgical_season,
            liturgical_season_en: result.liturgical_season_en,
            season_description: result.season_description,
            suggestions: result.suggestions || [],
            metadata: { generated_by: 'google_ai', count }
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
