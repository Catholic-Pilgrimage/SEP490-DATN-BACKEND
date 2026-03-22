const { Post, PostLike, PostComment, User, sequelize } = require('../models');
const { Op } = require('sequelize');

class PostService {
    /**
     * Create a new post
     */
    async createPost(userId, data) {
        try {
            const { content, image_urls } = data;

            // Create post
            const post = await Post.create({
                user_id: userId,
                content,
                image_urls: image_urls || [],
                status: 'published'
            });

            // Fetch post with author info
            return await this.getPostById(post.id, userId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get posts (optionally filtered by group)
     */
    async getPosts(userId, filters = {}) {
        try {
            const { page = 1, limit = 20 } = filters;
            const offset = (page - 1) * limit;

            const whereClause = {
                status: 'published'
            };

            const { count, rows: posts } = await Post.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'full_name', 'avatar_url']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            // Check if user liked each post and count comments
            const postsWithLikeStatus = await Promise.all(
                posts.map(async (post) => {
                    const [isLiked, commentsCount] = await Promise.all([
                        PostLike.findOne({
                            where: {
                                post_id: post.id,
                                user_id: userId
                            }
                        }),
                        PostComment.count({
                            where: {
                                post_id: post.id,
                                status: 'published'
                            }
                        })
                    ]);

                    return {
                        ...post.toJSON(),
                        is_liked: !!isLiked,
                        comments_count: commentsCount
                    };
                })
            );

            return {
                posts: postsWithLikeStatus,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get post by ID
     */
    async getPostById(postId, userId) {
        try {
            const post = await Post.findByPk(postId, {
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'full_name', 'avatar_url']
                    }
                ]
            });

            if (!post) {
                const error = new Error('Post not found');
                error.statusCode = 404;
                throw error;
            }

            // Check if user liked the post
            const isLiked = await PostLike.findOne({
                where: {
                    post_id: postId,
                    user_id: userId
                }
            });

            return {
                ...post.toJSON(),
                is_liked: !!isLiked
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update post
     */
    async updatePost(postId, userId, data) {
        try {
            const post = await Post.findByPk(postId);

            if (!post) {
                const error = new Error('Post not found');
                error.statusCode = 404;
                throw error;
            }

            // Check ownership
            if (post.user_id !== userId) {
                const error = new Error('You can only update your own posts');
                error.statusCode = 403;
                throw error;
            }

            const { content, image_urls } = data;

            await post.update({
                content: content !== undefined ? content : post.content,
                image_urls: image_urls !== undefined ? image_urls : post.image_urls,
                updated_at: new Date()
            });

            return await this.getPostById(postId, userId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Delete post
     */
    async deletePost(postId, userId, userRole) {
        try {
            const post = await Post.findByPk(postId);

            if (!post) {
                const error = new Error('Post not found');
                error.statusCode = 404;
                throw error;
            }

            // Check permissions: owner or admin
            let canDelete = post.user_id === userId || userRole === 'admin';

            if (!canDelete) {
                const error = new Error('You do not have permission to delete this post');
                error.statusCode = 403;
                throw error;
            }

            await post.destroy();

            return { message: 'Post deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Like a post
     */
    async likePost(postId, userId) {
        try {
            const post = await Post.findByPk(postId);

            if (!post) {
                const error = new Error('Post not found');
                error.statusCode = 404;
                throw error;
            }

            // Check if already liked
            const existingLike = await PostLike.findOne({
                where: {
                    post_id: postId,
                    user_id: userId
                }
            });

            if (existingLike) {
                const error = new Error('You have already liked this post');
                error.statusCode = 400;
                throw error;
            }

            // Create like (trigger will update likes_count)
            await PostLike.create({
                post_id: postId,
                user_id: userId
            });

            // Refresh post to get updated likes_count
            await post.reload();

            return {
                message: 'Post liked successfully',
                likes_count: post.likes_count
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Unlike a post
     */
    async unlikePost(postId, userId) {
        try {
            const post = await Post.findByPk(postId);

            if (!post) {
                const error = new Error('Post not found');
                error.statusCode = 404;
                throw error;
            }

            const like = await PostLike.findOne({
                where: {
                    post_id: postId,
                    user_id: userId
                }
            });

            if (!like) {
                const error = new Error('You have not liked this post');
                error.statusCode = 400;
                throw error;
            }

            // Delete like (trigger will update likes_count)
            await like.destroy();

            // Refresh post to get updated likes_count
            await post.reload();

            return {
                message: 'Post unliked successfully',
                likes_count: post.likes_count
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Add comment to post
     */
    async addComment(postId, userId, content, parentId = null) {
        try {
            const post = await Post.findByPk(postId);

            if (!post) {
                const error = new Error('Post not found');
                error.statusCode = 404;
                throw error;
            }

            if (parentId) {
                const parentComment = await PostComment.findByPk(parentId);
                if (!parentComment || parentComment.post_id !== postId) {
                    const error = new Error('Parent comment not found in this post');
                    error.statusCode = 404;
                    throw error;
                }
            }

            const comment = await PostComment.create({
                post_id: postId,
                user_id: userId,
                parent_id: parentId,
                content,
                status: 'published'
            });

            // Fetch comment with author info
            return await PostComment.findByPk(comment.id, {
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'full_name', 'avatar_url', 'role']
                    }
                ]
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get comments for a post
     */
    async getComments(postId, userId, filters = {}) {
        try {
            const { page = 1, limit = 20 } = filters;
            const offset = (page - 1) * limit;

            const post = await Post.findByPk(postId);

            if (!post) {
                const error = new Error('Post not found');
                error.statusCode = 404;
                throw error;
            }

            const { count, rows: comments } = await PostComment.findAndCountAll({
                where: {
                    post_id: postId,
                    status: 'published'
                },
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'full_name', 'avatar_url', 'role']
                    }
                ],
                order: [['created_at', 'ASC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return {
                comments,
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update comment
     */
    async updateComment(postId, commentId, userId, content) {
        try {
            const comment = await PostComment.findByPk(commentId);

            if (!comment || comment.post_id !== postId) {
                const error = new Error('Comment not found');
                error.statusCode = 404;
                throw error;
            }

            // Check ownership
            if (comment.user_id !== userId) {
                const error = new Error('You can only update your own comments');
                error.statusCode = 403;
                throw error;
            }

            await comment.update({ content });

            // Fetch updated comment with author info
            return await PostComment.findByPk(commentId, {
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'full_name', 'avatar_url', 'role']
                    }
                ]
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Delete comment
     */
    async deleteComment(postId, commentId, userId, userRole) {
        try {
            const comment = await PostComment.findByPk(commentId);

            if (!comment || comment.post_id !== postId) {
                const error = new Error('Comment not found');
                error.statusCode = 404;
                throw error;
            }

            const post = await Post.findByPk(postId);

            // Check permissions: comment owner, post owner, or system admin
            let canDelete = comment.user_id === userId || 
                           post.user_id === userId || 
                           userRole === 'admin';

            if (!canDelete) {
                const error = new Error('You do not have permission to delete this comment');
                error.statusCode = 403;
                throw error;
            }

            await comment.destroy();

            return { message: 'Comment deleted successfully' };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new PostService();
