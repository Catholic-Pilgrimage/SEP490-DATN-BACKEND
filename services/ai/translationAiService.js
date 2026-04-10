const { Post, PostComment } = require('../../models');
const GoogleAiService = require('./googleAiService');
const { AiCacheService } = require('./aiCacheService');

class TranslationAiService {

    /**
     * Translate post to English on-demand.
     * Uses AiCache with key = hash(post_id + updated_at + title + content).
     */
    static async translatePost(postId) {
        try {
            const post = await Post.findByPk(postId, {
                attributes: ['id', 'title', 'content', 'updated_at', 'status', 'is_active']
            });

            if (!post || !post.is_active || post.status !== 'published') {
                const error = new Error('Post not found');
                error.statusCode = 404;
                throw error;
            }

            const cacheKey = AiCacheService.buildCacheKey({
                post_id: post.id,
                updated_at: post.updated_at ? new Date(post.updated_at).toISOString() : '',
                title: post.title || '',
                content: post.content || ''
            });

            const cachedResult = await AiCacheService.get('translate_post', cacheKey);
            if (cachedResult) return { ...cachedResult, cached: true };

            const translation = await GoogleAiService.translatePostToEnglish(post.title, post.content);

            await AiCacheService.set('translate_post', cacheKey, translation);
            return { ...translation, cached: false };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Translate comment to English on-demand.
     * Uses AiCache with key = hash(comment_id + content).
     * Comment has no updated_at, so content itself acts as cache buster.
     */
    static async translateComment(postId, commentId) {
        try {
            const comment = await PostComment.findOne({
                where: {
                    id: commentId,
                    post_id: postId,
                    status: 'published'
                },
                attributes: ['id', 'content'],
                include: [{
                    model: Post,
                    as: 'post',
                    attributes: ['is_active', 'status']
                }]
            });

            if (!comment || !comment.post || !comment.post.is_active || comment.post.status !== 'published') {
                const error = new Error('Comment not found');
                error.statusCode = 404;
                throw error;
            }

            const cacheKey = AiCacheService.buildCacheKey({
                comment_id: comment.id,
                content: comment.content || ''
            });

            const cachedResult = await AiCacheService.get('translate_comment', cacheKey);
            if (cachedResult) return { ...cachedResult, cached: true };

            const translation = await GoogleAiService.translateCommentToEnglish(comment.content);

            await AiCacheService.set('translate_comment', cacheKey, translation);
            return { ...translation, cached: false };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = TranslationAiService;
