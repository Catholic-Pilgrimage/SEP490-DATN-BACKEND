const crypto = require('crypto');
const { Op } = require('sequelize');
const { AiCache } = require('../../models');
const Logger = require('../../utils/logger.util');

/**
 * AI Cache Service — DB-backed caching layer for AI responses
 *
 * Design rules:
 *   - Cache operates at SERVICE layer, AFTER output guard validation
 *   - Only cache valid, normalized responses (never raw Gemini output)
 *   - Never cache errors, quota failures, or invalid schemas
 *   - suggestPrayer: no DB cache (sensitive/personal data)
 *   - suggestRoute: bypass Phase 1 (high request variance)
 */

// ─── Prompt versions: bump when prompt text changes ───
const PROMPT_VERSIONS = {
    summarize_reviews: 'v1',
    suggest_events: 'v1',
    generate_article: 'v1'
};

// ─── TTL configs (milliseconds) ───
const TTL = {
    summarize_reviews: 12 * 60 * 60 * 1000,  // 12 hours
    suggest_events: 24 * 60 * 60 * 1000,     // 24 hours
    generate_article: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// ─── Model version: bump when switching Gemini model ───
const MODEL_VERSION = 'gemini-2.5-flash';

class AiCacheService {

    /**
     * Build a deterministic MD5 cache key from canonical params.
     * Params are sorted by key to guarantee the same hash regardless of object key order.
     *
     * @param {object} params - Flat key/value pairs relevant to the cache identity
     * @returns {string} MD5 hex digest (32 chars)
     */
    static buildCacheKey(params) {
        // Sort keys for deterministic hash
        const sorted = Object.keys(params)
            .sort()
            .map(k => `${k}=${params[k] ?? ''}`)
            .join('|');
        return crypto.createHash('md5').update(sorted).digest('hex');
    }

    /**
     * Get a cached response. Returns null on miss or expired entry.
     * Expired entries are lazy-deleted on access.
     *
     * @param {string} feature - e.g. 'summarize_reviews'
     * @param {string} cacheKey - MD5 hash from buildCacheKey()
     * @returns {Promise<object|null>} Cached response_data or null
     */
    static async get(feature, cacheKey) {
        try {
            const entry = await AiCache.findOne({
                where: { feature, cache_key: cacheKey }
            });

            if (!entry) return null;

            // Lazy purge expired entries
            if (new Date(entry.expires_at) < new Date()) {
                await entry.destroy();
                Logger.info(`[AI Cache] Expired entry purged: feature=${feature}`);
                return null;
            }

            Logger.info(`[AI Cache Hit] feature=${feature}, key=${cacheKey.substring(0, 8)}...`);
            return entry.response_data;
        } catch (err) {
            // Cache read failure should never break AI flow
            Logger.error(`[AI Cache] Read error: ${err.message}`);
            return null;
        }
    }

    /**
     * Store a validated AI response in cache.
     * Uses upsert to handle race conditions gracefully.
     *
     * @param {string} feature - e.g. 'summarize_reviews'
     * @param {string} cacheKey - MD5 hash from buildCacheKey()
     * @param {object} responseData - Normalized AI response (post output-guard)
     * @param {number} [ttlMs] - Time-to-live in ms. Defaults to feature-specific TTL.
     */
    static async set(feature, cacheKey, responseData, ttlMs) {
        try {
            const ttl = ttlMs || TTL[feature] || 12 * 60 * 60 * 1000;
            const expiresAt = new Date(Date.now() + ttl);

            await AiCache.upsert({
                feature,
                cache_key: cacheKey,
                response_data: responseData,
                expires_at: expiresAt
            });

            Logger.info(`[AI Cache Set] feature=${feature}, key=${cacheKey.substring(0, 8)}..., ttl=${Math.round(ttl / 3600000)}h`);
        } catch (err) {
            // Cache write failure should never break AI flow
            Logger.error(`[AI Cache] Write error: ${err.message}`);
        }
    }

    /**
     * Cleanup all expired cache entries.
     * Can be called from a cron job (Phase 2) or manually.
     *
     * @returns {Promise<number>} Number of purged rows
     */
    static async cleanupExpired() {
        try {
            const deleted = await AiCache.destroy({
                where: { expires_at: { [Op.lt]: new Date() } }
            });
            if (deleted > 0) {
                Logger.info(`[AI Cache Cleanup] Purged ${deleted} expired entries`);
            }
            return deleted;
        } catch (err) {
            Logger.error(`[AI Cache Cleanup] Error: ${err.message}`);
            return 0;
        }
    }
}

module.exports = { AiCacheService, PROMPT_VERSIONS, TTL, MODEL_VERSION };
