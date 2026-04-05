const postService = require('../services/postService');
const ResponseUtil = require('../utils/response.util');

class PostController {
    constructor() {
        this.createPost = this.createPost.bind(this);
        this.getPosts = this.getPosts.bind(this);
        this.getPostById = this.getPostById.bind(this);
        this.updatePost = this.updatePost.bind(this);
        this.deletePost = this.deletePost.bind(this);
        this.likePost = this.likePost.bind(this);
        this.unlikePost = this.unlikePost.bind(this);
        this.addComment = this.addComment.bind(this);
        this.replyComment = this.replyComment.bind(this);
        this.getComments = this.getComments.bind(this);
        this.updateComment = this.updateComment.bind(this);
        this.deleteComment = this.deleteComment.bind(this);
    }

    localizePostResult(req, result) {
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
            return result;
        }

        const localizedResult = { ...result };

        switch (localizedResult.message) {
            case 'Post deleted successfully':
                localizedResult.message = req.__('post.deleted');
                break;
            case 'Post liked successfully':
                localizedResult.message = req.__('post.liked');
                break;
            case 'Post unliked successfully':
                localizedResult.message = req.__('post.unliked');
                break;
            case 'Comment deleted successfully':
                localizedResult.message = req.__('comment.deleted');
                break;
            default:
                break;
        }

        return localizedResult;
    }

    localizePostError(req, error) {
        switch (error.message) {
            case 'Post not found':
                return req.__('post.not_found');
            case 'You must check-in at this site before tagging it in your post.':
                return req.__('post.site_checkin_required');
            case 'You can only update your own posts':
                return req.__('post.only_owner');
            case 'You do not have permission to delete this post':
                return req.__('post.forbidden');
            case 'You have already liked this post':
                return req.__('post.already_liked');
            case 'You have not liked this post':
                return req.__('post.not_liked');
            case 'Maximum 10 images allowed':
                return req.__('post.max_images');
            case 'Parent comment not found in this post':
                return req.__('comment.parent_not_found');
            case 'Comment not found':
                return req.__('comment.not_found');
            case 'You can only update your own comments':
                return req.__('comment.only_owner');
            case 'You do not have permission to delete this comment':
                return req.__('comment.forbidden');
            default:
                break;
        }

        if (typeof error.message === 'string' && error.message.startsWith('Không thể chỉnh sửa nội dung của')) {
            return req.__('post.cannot_edit_shared_content');
        }

        return error.message;
    }

    /**
     * Create a new post
     * POST /posts
     */
    async createPost(req, res) {
        try {
            const userId = req.user.id;

            const imageFiles = [...(req.files?.images || []), ...(req.files?.image_urls || [])];
            const audioFile = req.files?.audio?.[0] || req.files?.audio_url?.[0] || null;
            const videoFile = req.files?.video?.[0] || req.files?.video_url?.[0] || null;

            if (imageFiles.length > 0) {
                req.body.image_urls = imageFiles.map(file => file.path);
            }

            if (videoFile) {
                req.body.video_url = videoFile.path || videoFile.url;
            }

            if (audioFile) {
                req.body.audio_url = audioFile.path || audioFile.url;
            }

            const post = await postService.createPost(userId, req.body);

            return ResponseUtil.created(res, post, req.__('post.created'));
        } catch (error) {
            console.error('PostController.createPost error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }

    /**
     * Get posts
     * GET /posts
     */
    async getPosts(req, res) {
        try {
            const userId = req.user.id;
            const filters = {
                page: req.query.page || 1,
                limit: req.query.limit || 20
            };

            const result = await postService.getPosts(userId, filters);

            return ResponseUtil.success(res, result, req.__('post.list_retrieved'));
        } catch (error) {
            console.error('PostController.getPosts error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }

    /**
     * Get post by ID
     * GET /posts/:id
     */
    async getPostById(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const post = await postService.getPostById(id, userId);

            return ResponseUtil.success(res, post, req.__('post.retrieved'));
        } catch (error) {
            console.error('PostController.getPostById error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }

    /**
     * Update post
     * PUT /posts/:id
     */
    async updatePost(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const imageFiles = [...(req.files?.images || []), ...(req.files?.image_urls || [])];
            const audioFile = req.files?.audio?.[0] || req.files?.audio_url?.[0] || null;
            const videoFile = req.files?.video?.[0] || req.files?.video_url?.[0] || null;

            const post = await postService.updatePost(
                id,
                userId,
                req.body,
                imageFiles,
                audioFile,
                videoFile
            );

            return ResponseUtil.success(res, post, req.__('post.updated'));
        } catch (error) {
            console.error('PostController.updatePost error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }

    /**
     * Delete post
     * DELETE /posts/:id
     */
    async deletePost(req, res) {
        try {
            const userId = req.user.id;
            const userRole = req.user.role;
            const { id } = req.params;

            let result = await postService.deletePost(id, userId, userRole);
            result = this.localizePostResult(req, result);

            return ResponseUtil.success(res, result, req.__('post.deleted'));
        } catch (error) {
            console.error('PostController.deletePost error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }

    /**
     * Like a post
     * POST /posts/:id/like
     */
    async likePost(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            let result = await postService.likePost(id, userId);
            result = this.localizePostResult(req, result);

            return ResponseUtil.success(res, result, req.__('post.liked'));
        } catch (error) {
            console.error('PostController.likePost error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }

    /**
     * Unlike a post
     * DELETE /posts/:id/like
     */
    async unlikePost(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            let result = await postService.unlikePost(id, userId);
            result = this.localizePostResult(req, result);

            return ResponseUtil.success(res, result, req.__('post.unliked'));
        } catch (error) {
            console.error('PostController.unlikePost error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }

    /**
     * Add comment to post
     * POST /posts/:id/comments
     */
    async addComment(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { content, parent_id } = req.body;

            const comment = await postService.addComment(id, userId, content, parent_id);

            return ResponseUtil.created(res, comment, req.__('comment.created'));
        } catch (error) {
            console.error('PostController.addComment error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }

    /**
     * Reply to a comment
     * POST /posts/:id/comments/:commentId/reply
     */
    async replyComment(req, res) {
        try {
            const userId = req.user.id;
            const { id, commentId } = req.params;
            const { content } = req.body;

            // Here commentId from the URL becomes parentId
            const comment = await postService.addComment(id, userId, content, commentId);

            return ResponseUtil.created(res, comment, req.__('comment.replied'));
        } catch (error) {
            console.error('PostController.replyComment error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }

    /**
     * Get comments for a post
     * GET /posts/:id/comments
     */
    async getComments(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const filters = {
                page: req.query.page || 1,
                limit: req.query.limit || 20
            };

            const result = await postService.getComments(id, userId, filters);

            return ResponseUtil.success(res, result, req.__('comment.list_retrieved'));
        } catch (error) {
            console.error('PostController.getComments error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }

    /**
     * Update comment
     * PUT /posts/:id/comments/:commentId
     */
    async updateComment(req, res) {
        try {
            const userId = req.user.id;
            const { id, commentId } = req.params;
            const { content } = req.body;

            const comment = await postService.updateComment(id, commentId, userId, content);

            return ResponseUtil.success(res, comment, req.__('comment.updated'));
        } catch (error) {
            console.error('PostController.updateComment error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }

    /**
     * Delete comment
     * DELETE /posts/:id/comments/:commentId
     */
    async deleteComment(req, res) {
        try {
            const userId = req.user.id;
            const userRole = req.user.role;
            const { id, commentId } = req.params;

            let result = await postService.deleteComment(id, commentId, userId, userRole);
            result = this.localizePostResult(req, result);

            return ResponseUtil.success(res, result, req.__('comment.deleted'));
        } catch (error) {
            console.error('PostController.deleteComment error:', error);
            return ResponseUtil.error(res, this.localizePostError(req, error), error.statusCode || 500);
        }
    }
}

module.exports = new PostController();
