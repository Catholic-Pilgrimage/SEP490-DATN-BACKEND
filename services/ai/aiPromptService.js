const { AiPrompt } = require('../../models');
const Logger = require('../../utils/logger.util');

/**
 * AI Prompt Service — manages dynamic AI prompts with DB fallback
 *
 * Design:
 *   - Each prompt key has a hardcoded default in code (fallback)
 *   - Admin can override via DB through the admin API
 *   - Service always tries DB first, falls back to default if DB miss or error
 *   - Returns { promptKey, instructionText, version, source: 'db' | 'default' }
 */

// ─── Whitelist of valid prompt keys ───
const VALID_PROMPT_KEYS = [
    'route',
    'article',
    'review_summary',
    'events',
    'prayer',
    'translation_post_vi_en',
    'translation_comment_vi_en'
];

// ─── Default prompts (fallback when DB has no record) ───
const DEFAULT_PROMPTS = {
    route: {
        description: 'AI Route Planner — generates optimal Catholic pilgrimage itinerary',
        instructionText: `You are an expert Catholic pilgrimage route planner in Vietnam.
Given these pilgrimage sites, suggest the optimal route.

Requirements:
- Organize into daily itinerary, grouping nearby sites (same region/province) on same day
- Use the provided distance data to estimate realistic travel times for Vietnam roads
- IMPORTANT: Review 'opening_hours', 'mass_schedules', and 'upcoming_events' in the Sites JSON. Try to schedule visits to ALIGN with a Mass or an interesting Event when possible!
- Visit duration: shrine ~90min, church ~60min, monastery ~120min, center ~45min. Format as "Xh" or "XhYm" (e.g. "1h30m", "2h")
- Each stop needs an estimated arrival/start time in HH:mm format
- Add a short spiritual note for each stop (Vietnamese)
- Each item MUST have an order_index (1-based, sequential within each day)`
    },

    article: {
        description: 'AI Article Writer — generates devotional article for pilgrimage sites',
        instructionText: `You are a Catholic content writer specializing in pilgrimage sites in Vietnam.
Write a devotional and inspiring article about the given topic.

Requirements:
- Structure: Clear introduction, structured body with subsections if needed, meaningful conclusion
- Include historical and spiritual significance
- If relevant, mention patron saints, miracles, or notable Catholic traditions
- Reference specific details from the site information provided`
    },

    review_summary: {
        description: 'AI Review Summarizer — summarizes recent site reviews',
        instructionText: `You are a review analyst for a Catholic pilgrimage site in Vietnam.

Analyze these reviews and provide a structured summary. Focus on:
1. Overall impression from visitors
2. Key strengths mentioned repeatedly
3. Key weaknesses or areas for improvement
4. A concise overall summary (2-3 sentences)`
    },

    events: {
        description: 'AI Event Recommender — suggests events aligned with liturgical calendar',
        instructionText: `You are a Catholic liturgical calendar expert and event planner for pilgrimage sites in Vietnam.

Based on the current date, determine the liturgical season and suggest NEW and UNIQUE event ideas that don't overlap with existing events.

IMPORTANT: The output must use these EXACT field names to be compatible with our Event API.

For each event provide data that can be directly used to create an event:
- name: Event name in Vietnamese (max 255 chars)
- description: Detailed description in Vietnamese (2-4 sentences)
- start_date: YYYY-MM-DD format (must be in the future)
- end_date: YYYY-MM-DD format (same as start_date for single-day events, or later for multi-day)
- start_time: HH:mm:ss format (e.g. "08:00:00", "19:30:00")
- end_time: HH:mm:ss format
- location: Specific location within or near the site
- category: One of: solemn_feast, sacrament_mass, procession, adoration, patron_feast, festival, performance, sports, retreat, camp, course, pilgrimage, charity`
    },

    prayer: {
        description: 'AI Prayer Suggestion — generates personalized Catholic prayer for journal entries',
        instructionText: `You are a Catholic spiritual guide helping a pilgrim write their spiritual journal.
Based on the context of their pilgrimage and the text they have written so far, suggest a short, meaningful, and personalized Catholic prayer.

Requirements:
- It must be devotional, authentic, and use proper Catholic terminology (e.g., Lạy Chúa, xin thương xót, tạ ơn, hiệp thông, ơn sủng...).
- If a patron saint is mentioned, you can ask for their intercession (e.g., 'Nhờ lời chuyển cầu của...').
- Keep the prayer concise (about 3-5 sentences), suitable for a journal entry.
- Provide a brief explanation (1-2 sentences) of why this prayer fits their current experience.
- Provide 2-5 relevant tags (in English or Vietnamese, e.g., 'gratitude', 'peace', 'repentance', 'family').`
    },

    translation_post_vi_en: {
        description: 'AI Post Translator — translates Vietnamese posts to English',
        instructionText: `You are a professional translator specializing in Vietnamese to English translation, especially for Catholic communities and social media posts.
Please translate the following post into natural, well-formatted English.

Requirements:
- Maintain the original tone and any Catholic formatting or terminology.
- If there is no title originally, return null or empty string for 'title_en'.
- If there is no content originally, return null or empty string for 'content_en'.`
    },

    translation_comment_vi_en: {
        description: 'AI Comment Translator — translates Vietnamese comments to English',
        instructionText: `You are a professional translator specializing in Vietnamese to English translation.
Please translate the following short comment into natural English.

Requirements:
- Maintain original tone.`
    }
};

class AiPromptService {

    /**
     * Get prompt config by key.
     * Tries DB first, falls back to hardcoded default.
     *
     * @param {string} promptKey - One of VALID_PROMPT_KEYS
     * @returns {Promise<{ promptKey: string, instructionText: string, version: number, source: 'db'|'default' }>}
     */
    static async getPromptByKey(promptKey) {
        try {
            const dbPrompt = await AiPrompt.findOne({
                where: { prompt_key: promptKey }
            });

            if (dbPrompt) {
                return {
                    promptKey: dbPrompt.prompt_key,
                    instructionText: dbPrompt.instruction_text,
                    description: dbPrompt.description,
                    version: dbPrompt.version,
                    updatedAt: dbPrompt.updated_at,
                    source: 'db'
                };
            }
        } catch (err) {
            Logger.error(`[AiPromptService] DB read error for key=${promptKey}: ${err.message}`);
        }

        // Fallback to default
        const defaultPrompt = DEFAULT_PROMPTS[promptKey];
        if (defaultPrompt) {
            return {
                promptKey,
                instructionText: defaultPrompt.instructionText,
                description: defaultPrompt.description,
                version: 0,
                updatedAt: null,
                source: 'default'
            };
        }

        return null;
    }

    /**
     * Get all prompt definitions (DB records merged with defaults).
     * For admin listing — shows all 7 keys with their current state.
     *
     * @returns {Promise<Array>}
     */
    static async getAllPromptDefinitions() {
        const results = [];

        // Load all DB records
        let dbRecords = {};
        try {
            const records = await AiPrompt.findAll({
                order: [['prompt_key', 'ASC']]
            });
            for (const r of records) {
                dbRecords[r.prompt_key] = r;
            }
        } catch (err) {
            Logger.error(`[AiPromptService] DB read error: ${err.message}`);
        }

        for (const key of VALID_PROMPT_KEYS) {
            const dbRecord = dbRecords[key];
            if (dbRecord) {
                results.push({
                    promptKey: dbRecord.prompt_key,
                    instructionText: dbRecord.instruction_text,
                    description: dbRecord.description,
                    version: dbRecord.version,
                    updatedAt: dbRecord.updated_at,
                    source: 'db'
                });
            } else {
                const def = DEFAULT_PROMPTS[key];
                results.push({
                    promptKey: key,
                    instructionText: def.instructionText,
                    description: def.description,
                    version: 0,
                    updatedAt: null,
                    source: 'default'
                });
            }
        }

        return results;
    }

    /**
     * Update or insert a prompt (upsert). Only whitelisted keys allowed.
     *
     * @param {string} promptKey
     * @param {string} instructionText
     * @param {string} updatedBy - admin user ID
     * @param {string} [description]
     * @returns {Promise<object>} updated prompt record
     */
    static async upsertPrompt(promptKey, instructionText, updatedBy, description) {
        if (!VALID_PROMPT_KEYS.includes(promptKey)) {
            throw new Error(`Invalid prompt key: ${promptKey}`);
        }

        const existing = await AiPrompt.findOne({ where: { prompt_key: promptKey } });

        if (existing) {
            existing.instruction_text = instructionText;
            existing.version = existing.version + 1;
            existing.updated_by = updatedBy;
            if (description !== undefined) {
                existing.description = description;
            }
            await existing.save();
            return existing;
        }

        // Create new record (upsert — key was valid but not yet seeded)
        const defaultDef = DEFAULT_PROMPTS[promptKey];
        const newPrompt = await AiPrompt.create({
            prompt_key: promptKey,
            instruction_text: instructionText,
            description: description !== undefined ? description : (defaultDef?.description || ''),
            version: 1,
            updated_by: updatedBy
        });

        return newPrompt;
    }
}

module.exports = { AiPromptService, VALID_PROMPT_KEYS, DEFAULT_PROMPTS };
