const postService = require('../services/postService');
const ResponseUtil = require('../utils/response.util');

class PostController {
    /**
     * Create a new post
     * POST /posts
     */
    async createPost(req, res) {
        try {
            const userId = req.user.id;

            // If images were uploaded, use Cloudinary URLs
            if (req.files && req.files.length > 0) {
                req.body.image_urls = req.files.map(file => file.path);
            }

            const post = await postService.createPost(userId, req.body);

            return ResponseUtil.created(res, post, req.__('post.created'));
        } catch (error) {
            console.error('PostController.createPost error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
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
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
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
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
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

            // If new images were uploaded, use Cloudinary URLs
            if (req.files && req.files.length > 0) {
                req.body.image_urls = req.files.map(file => file.path);
            }

            const post = await postService.updatePost(id, userId, req.body);

            return ResponseUtil.success(res, post, req.__('post.updated'));
        } catch (error) {
            console.error('PostController.updatePost error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
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

            const result = await postService.deletePost(id, userId, userRole);

            return ResponseUtil.success(res, result, req.__('post.deleted'));
        } catch (error) {
            console.error('PostController.deletePost error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
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

            const result = await postService.likePost(id, userId);

            return ResponseUtil.success(res, result, req.__('post.liked'));
        } catch (error) {
            console.error('PostController.likePost error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
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

            const result = await postService.unlikePost(id, userId);

            return ResponseUtil.success(res, result, req.__('post.unliked'));
        } catch (error) {
            console.error('PostController.unlikePost error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
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
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
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

            return ResponseUtil.created(res, comment, req.__('comment.replied') || 'Reply created successfully');
        } catch (error) {
            console.error('PostController.replyComment error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
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
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
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
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
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

            const result = await postService.deleteComment(id, commentId, userId, userRole);

            return ResponseUtil.success(res, result, req.__('comment.deleted'));
        } catch (error) {
            console.error('PostController.deleteComment error:', error);
            return ResponseUtil.error(res, error.message, error.statusCode || 500);
        }
    }
}

module.exports = new PostController();
