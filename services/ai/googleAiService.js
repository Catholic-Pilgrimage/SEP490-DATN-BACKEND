const { generateJSON } = require('../../config/googleai.config');
const { Site, Event } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');

/**
 * Google AI Service — AI features for Local Guides
 * 1. AI Article Writer (with style, summary, full site context)
 * 2. AI Translator (multi-lang, auto-detect, context-aware)
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
     * 2. Translate content (multi-language support with auto-detect)
     * Supported: vi, en, zh, ko, ja, fr
     * @param {string} text - Text to translate
     * @param {string} targetLang - Target language code
     * @param {object} options - { context }
     * @returns {Promise<{original, translated, source_lang, target_lang}>}
     */
    static async translateContent(text, targetLang = 'en', options = {}) {
        if (!text || text.trim().length < 2) {
            throw new Error('Text to translate must be at least 2 characters');
        }
        if (text.length > 10000) {
            throw new Error('Text must not exceed 10000 characters');
        }

        const langMap = {
            vi: 'Vietnamese',
            en: 'English',
            zh: 'Chinese (Simplified)',
            ko: 'Korean',
            ja: 'Japanese',
            fr: 'French'
        };

        const targetName = langMap[targetLang];
        if (!targetName) {
            throw new Error(`Unsupported target language: ${targetLang}. Supported: ${Object.keys(langMap).join(', ')}`);
        }

        const contextInstruction = options.context
            ? `Context/Domain: ${options.context}. Use this context to correctly translate proper nouns and domain-specific terms.`
            : '';

        const prompt = `You are a professional translator specializing in Catholic/religious terminology.
Translate the following text to ${targetName}.

Rules:
- First, detect the source language of the text
- If the source language is the same as the target language (${targetLang}), still provide the text as-is in "translated" but set "same_language" to true
- Preserve the devotional and reverent tone
- Keep proper nouns (place names, saint names) in their commonly known form in ${targetName}
- Use standard ${targetName} Catholic terminology
- Preserve paragraph formatting and line breaks
- Only return the translation, no commentary
${contextInstruction}

Text to translate:
"""
${text}
"""

Return JSON:
{
  "translated": "the translated text",
  "source_lang": "detected source language code (vi, en, zh, ko, ja, fr, or other)",
  "same_language": false
}`;

        Logger.info(`Google AI: Translating ${text.length} chars to ${targetLang}`);
        const result = await generateJSON('translate', prompt, { temperature: 0.3 });

        return {
            original: text,
            translated: result.translated,
            source_lang: result.source_lang || 'unknown',
            target_lang: targetLang,
            same_language: result.same_language || false
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
