const { GoogleGenerativeAI } = require('@google/generative-ai');
const Logger = require('../utils/logger.util');

/**
 * Google AI Config — 4 separate API keys for 4 features
 * Each feature gets its own quota to maximize free tier usage
 * 
 * Keys:
 *   GOOGLE_AI_KEY_ROUTE           → suggest-route (Pilgrim)
 *   GOOGLE_AI_KEY_ARTICLE         → generate-article (Local Guide)
 *   GOOGLE_AI_KEY_REVIEW_SUMMARY  → summarize-reviews (Local Guide)
 *   GOOGLE_AI_KEY_EVENTS          → suggest-events (Local Guide)
 *   GOOGLE_AI_KEY_PRAYER          → suggest-prayer (Pilgrim)
 *   GOOGLE_AI_KEY_TRANSLATION     → translation (Shared)
 */

const AI_KEYS = {
    route: process.env.GOOGLE_AI_KEY_ROUTE,
    article: process.env.GOOGLE_AI_KEY_ARTICLE,
    review_summary: process.env.GOOGLE_AI_KEY_REVIEW_SUMMARY,
    events: process.env.GOOGLE_AI_KEY_EVENTS,
    prayer: process.env.GOOGLE_AI_KEY_PRAYER,
    translation: process.env.GOOGLE_AI_KEY_TRANSLATION,
};

// Warn on missing keys at startup
Object.entries(AI_KEYS).forEach(([feature, key]) => {
    if (!key) console.warn(`⚠️  GOOGLE_AI_KEY_${feature.toUpperCase()} not found in .env`);
});

// Cache: one GenAI instance per feature
const clientCache = {};

const FALLBACK_MODELS = [
    'gemini-3-flash-preview',
    'gemini-2.0-flash',
    'gemini-2.5-flash'
];

/**
 * Get GenAI client for a specific feature
 * @param {'route'|'article'|'review_summary'|'events'|'prayer'|'translation'} feature
 * @returns {GoogleGenerativeAI}
 */
function getGenAIForFeature(feature) {
    const key = AI_KEYS[feature];
    if (!key) {
        throw new Error(`GOOGLE_AI_KEY_${feature.toUpperCase()} is not configured`);
    }

    if (!clientCache[feature]) {
        clientCache[feature] = new GoogleGenerativeAI(key);
    }

    return clientCache[feature];
}

/**
 * Sleep utility for retry backoff
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry(fn, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn(attempt);
        } catch (error) {
            lastError = error;
            const isRetryable =
                error.message?.includes('429') ||
                error.message?.includes('503') ||
                error.message?.includes('500') ||
                error.message?.includes('ECONNRESET') ||
                error.message?.includes('ETIMEDOUT') ||
                error.message?.includes('Resource has been exhausted');

            if (!isRetryable || attempt === maxRetries) {
                throw error;
            }

            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
            Logger.warn(`Google AI: Attempt ${attempt}/${maxRetries} failed (${error.message.substring(0, 100)}). Retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
    throw lastError;
}

/**
 * Extract JSON from text — handles markdown blocks, leading text
 */
function extractJSON(text) {
    let cleaned = text.trim();

    // Strip complete markdown code blocks
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
        cleaned = codeBlockMatch[1].trim();
    } else if (cleaned.startsWith('```')) {
        // Truncated code block — no closing ```, strip opening
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').trim();
    }

    // Find first JSON object/array if text doesn't start with one
    if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        const jsonStart = cleaned.search(/[{\[]/);
        if (jsonStart !== -1) {
            cleaned = cleaned.substring(jsonStart);
        }
    }

    return cleaned;
}

/**
 * Generate JSON content using a feature-specific API key
 * @param {'route'|'article'|'review_summary'|'events'|'prayer'|'translation'} feature - Which feature key to use
 * @param {string} prompt - The prompt
 * @param {object} options - { temperature, topP, maxTokens }
 * @returns {Promise<object>}
 */
async function generateJSON(feature, prompt, options = {}) {
    const genAI = getGenAIForFeature(feature);

    const generationConfig = {
        responseMimeType: 'application/json',
        temperature: options.temperature || 0.7,
        topP: options.topP || 0.9,
        maxOutputTokens: options.maxTokens || 16384,
    };

    return withRetry(async (attempt) => {
        // Fallback sequentially through models based on retry attempt
        const modelName = FALLBACK_MODELS[Math.min(attempt - 1, FALLBACK_MODELS.length - 1)];
        const aiModel = genAI.getGenerativeModel({ model: modelName });
        
        Logger.info(`Google AI [${feature}]: Calling model ${modelName} (attempt ${attempt})`);
        
        const result = await aiModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig
        });

        const text = result.response.text();
        Logger.info(`Google AI [${feature}]: Generated ${text.length} chars`);

        try {
            return JSON.parse(text);
        } catch (e) {
            const extracted = extractJSON(text);
            try {
                return JSON.parse(extracted);
            } catch (e2) {
                Logger.error(`Google AI [${feature}]: Failed to parse JSON: ${text.substring(0, 300)}`);
                throw new Error('AI returned invalid JSON format');
            }
        }
    });
}

module.exports = { getGenAIForFeature, generateJSON };
