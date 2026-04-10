const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const MODULES = {
    MODELS: path.join(ROOT, 'models', 'index.js'),
    GOOGLE_AI: path.join(ROOT, 'services', 'ai', 'googleAiService.js'),
    AI_CACHE: path.join(ROOT, 'services', 'ai', 'aiCacheService.js')
};

function clearModules() {
    Object.values(MODULES).forEach((modulePath) => {
        delete require.cache[modulePath];
    });
    delete require.cache[path.join(ROOT, 'services', 'ai', 'translationAiService.js')];
}

function setMock(modulePath, exports) {
    require.cache[modulePath] = {
        id: modulePath,
        filename: modulePath,
        loaded: true,
        exports,
    };
}

function loadTranslationAiService(overrides = {}) {
    clearModules();

    const state = {
        postFindByPkCalls: [],
        postCommentFindOneCalls: [],
        googleTranslatePostCalls: [],
        googleTranslateCommentCalls: [],
        cacheGetCalls: [],
        cacheSetCalls: []
    };

    setMock(MODULES.MODELS, {
        Post: {
            findByPk: async (id, options) => {
                state.postFindByPkCalls.push(id);
                if (overrides.postFindByPk) return overrides.postFindByPk(id, options);
                return null;
            }
        },
        PostComment: {
            findOne: async (options) => {
                state.postCommentFindOneCalls.push(options);
                if (overrides.postCommentFindOne) return overrides.postCommentFindOne(options);
                return null;
            }
        }
    });

    setMock(MODULES.GOOGLE_AI, {
        translatePostToEnglish: async (title, content) => {
            state.googleTranslatePostCalls.push({ title, content });
            if (overrides.googleTranslatePost) return overrides.googleTranslatePost(title, content);
            return { title_en: 'En', content_en: 'En' };
        },
        translateCommentToEnglish: async (content) => {
            state.googleTranslateCommentCalls.push({ content });
            if (overrides.googleTranslateComment) return overrides.googleTranslateComment(content);
            return { content_en: 'En' };
        }
    });

    setMock(MODULES.AI_CACHE, {
        AiCacheService: {
            buildCacheKey: () => 'mock_cache_key',
            get: async (feature, key) => {
                state.cacheGetCalls.push({ feature, key });
                if (overrides.cacheGet) return overrides.cacheGet(feature, key);
                return null;
            },
            set: async (feature, key, data) => {
                state.cacheSetCalls.push({ feature, key, data });
                if (overrides.cacheSet) return overrides.cacheSet(feature, key, data);
            }
        }
    });

    const TranslationAiService = require('../../services/ai/translationAiService');
    return { TranslationAiService, state };
}

test('translatePost throws 404 if post not found', async () => {
    const { TranslationAiService } = loadTranslationAiService({
        postFindByPk: async () => null
    });

    await assert.rejects(
        TranslationAiService.translatePost('invalid-id'),
        (err) => {
            assert.equal(err.message, 'Post not found');
            assert.equal(err.statusCode, 404);
            return true;
        }
    );
});

test('translatePost throws 404 if post is inactive', async () => {
    const { TranslationAiService } = loadTranslationAiService({
        postFindByPk: async () => ({ id: 'uuid-1', is_active: false, status: 'published' })
    });

    await assert.rejects(
        TranslationAiService.translatePost('uuid-1'),
        (err) => {
            assert.equal(err.message, 'Post not found');
            assert.equal(err.statusCode, 404);
            return true;
        }
    );
});

test('translatePost returns cached result and skips AI if cache hits', async () => {
    const { TranslationAiService, state } = loadTranslationAiService({
        postFindByPk: async () => ({
            id: 'uuid-1',
            title: 'Vi',
            content: 'Vi',
            is_active: true,
            status: 'published',
            updated_at: '2026-04-01T00:00:00Z'
        }),
        cacheGet: async () => ({ title_en: 'En', content_en: 'En' })
    });

    const result = await TranslationAiService.translatePost('uuid-1');

    assert.equal(result.cached, true);
    assert.equal(result.title_en, 'En');
    assert.equal(state.googleTranslatePostCalls.length, 0);
    assert.equal(state.cacheSetCalls.length, 0);
});

test('translatePost calls AI, saves to cache, and returns data if cache misses', async () => {
    const { TranslationAiService, state } = loadTranslationAiService({
        postFindByPk: async () => ({
            id: 'uuid-1',
            title: 'Vi',
            content: 'Vi',
            is_active: true,
            status: 'published',
            updated_at: '2026-04-01T00:00:00Z'
        }),
        cacheGet: async () => null
    });

    const result = await TranslationAiService.translatePost('uuid-1');

    assert.equal(result.cached, false);
    assert.equal(result.title_en, 'En');
    assert.equal(state.googleTranslatePostCalls.length, 1);
    assert.deepEqual(state.googleTranslatePostCalls[0], { title: 'Vi', content: 'Vi' });
    assert.equal(state.cacheSetCalls.length, 1);
    assert.deepEqual(state.cacheSetCalls[0], {
        feature: 'translate_post',
        key: 'mock_cache_key',
        data: { title_en: 'En', content_en: 'En' }
    });
});

test('translateComment throws 404 if comment not found', async () => {
    const { TranslationAiService } = loadTranslationAiService({
        postCommentFindOne: async () => null
    });

    await assert.rejects(
        TranslationAiService.translateComment('post-1', 'comment-not-found'),
        (err) => {
            assert.equal(err.message, 'Comment not found');
            assert.equal(err.statusCode, 404);
            return true;
        }
    );
});

test('translateComment throws 404 if parent post is inactive (preventing leak)', async () => {
    const { TranslationAiService } = loadTranslationAiService({
        postCommentFindOne: async () => ({
            id: 'comment-1',
            content: 'Vi',
            post: { is_active: false, status: 'published' }
        })
    });

    await assert.rejects(
        TranslationAiService.translateComment('post-1', 'comment-1'),
        (err) => {
            assert.equal(err.message, 'Comment not found');
            assert.equal(err.statusCode, 404);
            return true;
        }
    );
});

test('translateComment returns cached result and skips AI if cache hits', async () => {
    const { TranslationAiService, state } = loadTranslationAiService({
        postCommentFindOne: async () => ({
            id: 'comment-1',
            content: 'Vi',
            post: { is_active: true, status: 'published' }
        }),
        cacheGet: async () => ({ content_en: 'En' })
    });

    const result = await TranslationAiService.translateComment('post-1', 'comment-1');

    assert.equal(result.cached, true);
    assert.equal(result.content_en, 'En');
    assert.equal(state.googleTranslateCommentCalls.length, 0);
    assert.equal(state.cacheSetCalls.length, 0);
});

test('translateComment calls AI, saves to cache, and returns data if cache misses', async () => {
    const { TranslationAiService, state } = loadTranslationAiService({
        postCommentFindOne: async () => ({
            id: 'comment-1',
            content: 'Vi',
            post: { is_active: true, status: 'published' }
        }),
        cacheGet: async () => null
    });

    const result = await TranslationAiService.translateComment('post-1', 'comment-1');

    assert.equal(result.cached, false);
    assert.equal(result.content_en, 'En');
    assert.equal(state.googleTranslateCommentCalls.length, 1);
    assert.deepEqual(state.googleTranslateCommentCalls[0], { content: 'Vi' });
    assert.equal(state.cacheSetCalls.length, 1);
    assert.deepEqual(state.cacheSetCalls[0], {
        feature: 'translate_comment',
        key: 'mock_cache_key',
        data: { content_en: 'En' }
    });
});
