const { Post, PostLike, PostComment, User, Journal, Site, Planner, PlannerItem, UserCheckin, Report, sequelize } = require('../models');
const { Op } = require('sequelize');
const PlannerService = require('./plannerService');
const NotificationService = require('./shared/notificationService');

class PostService {
    getPostImageInput(postData = {}) {
        if (postData?.image_urls !== undefined) {
            return postData.image_urls;
        }

        if (postData?.['image_urls[]'] !== undefined) {
            return postData['image_urls[]'];
        }

        if (postData?.image_url !== undefined) {
            return postData.image_url;
        }

        return postData?.['image_url[]'];
    }

    normalizeStringArrayInput(rawValue) {
        const normalizedValues = [];

        const pushValue = (value) => {
            if (typeof value !== 'string') {
                return;
            }

            const trimmed = value.trim();
            if (!trimmed || trimmed.toLowerCase() === 'null') {
                return;
            }

            normalizedValues.push(trimmed);
        };

        if (Array.isArray(rawValue)) {
            rawValue.forEach(pushValue);
        } else if (typeof rawValue === 'string') {
            const trimmed = rawValue.trim();
            if (!trimmed || trimmed.toLowerCase() === 'null') {
                return [];
            }

            if (trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(pushValue);
                    }
                } catch (error) {
                    pushValue(trimmed);
                }
            } else {
                pushValue(trimmed);
            }
        }

        return normalizedValues;
    }

    normalizeNullableStringInput(value) {
        if (value === undefined || value === null) {
            return null;
        }

        const trimmed = String(value).trim();
        if (!trimmed || trimmed.toLowerCase() === 'null') {
            return null;
        }

        return trimmed;
    }

    sortPlannerItems(items = []) {
        return [...items].sort((left, right) => {
            const leftLeg = Number(left?.leg_number || 0);
            const rightLeg = Number(right?.leg_number || 0);

            if (leftLeg !== rightLeg) {
                return leftLeg - rightLeg;
            }

            return Number(left?.order_index || 0) - Number(right?.order_index || 0);
        });
    }

    buildPlannerJourneySummary(journey, formattedItems = []) {
        const totalStops = formattedItems.length;
        const visitedStops = formattedItems.filter(item => item.status === 'visited').length;
        const skippedStops = formattedItems.filter(item => item.status === 'skipped').length;
        const upcomingStops = formattedItems.filter(item => item.status === 'upcoming').length;
        const coverItem = formattedItems.find(item => item?.site?.cover_image) || formattedItems[0] || null;

        let totalDays = 1;
        if (journey?.start_date && journey?.end_date) {
            totalDays = Math.max(
                1,
                Math.ceil((new Date(journey.end_date) - new Date(journey.start_date)) / (1000 * 60 * 60 * 24)) + 1
            );
        } else if (formattedItems.length > 0) {
            totalDays = Math.max(...formattedItems.map(item => Number(item.leg_number || 0)), 1);
        }

        return {
            total_days: totalDays,
            total_stops: totalStops,
            visited_stops: visitedStops,
            skipped_stops: skippedStops,
            upcoming_stops: upcomingStops,
            visited_percentage: totalStops > 0 ? Math.round((visitedStops / totalStops) * 100) : 0,
            cover_image: coverItem?.site?.cover_image || null,
            can_clone: true
        };
    }

    async enrichPlannerJourneyForPost(post) {
        if (!post?.planner) {
            return null;
        }

        const journey = post.planner.toJSON();
        const sortedItems = this.sortPlannerItems(journey.items || []);
        const formattedItems = sortedItems.map(item => {
            const formattedItem = PlannerService.formatPlannerItemResponse(item);

            if (formattedItem.travel_time_minutes === null || formattedItem.travel_time_minutes === undefined) {
                delete formattedItem.travel_time_minutes;
            }

            return formattedItem;
        });
        const itemsByDay = {};

        formattedItems.forEach(item => {
            if (!itemsByDay[item.leg_number]) {
                itemsByDay[item.leg_number] = [];
            }

            itemsByDay[item.leg_number].push(item);
        });

        const summary = this.buildPlannerJourneySummary(journey, formattedItems);

        return {
            id: journey.id,
            name: journey.name,
            start_date: journey.start_date,
            end_date: journey.end_date,
            number_of_days: summary.total_days,
            number_of_people: journey.number_of_people,
            transportation: journey.transportation,
            status: PlannerService.getPlannerCurrentStatus(journey),
            cloneable: true,
            summary,
            items: formattedItems,
            items_by_day: itemsByDay
        };
    }

    getPostIncludes() {
        return [
            {
                model: User,
                as: 'author',
                attributes: ['id', 'full_name', 'avatar_url']
            },
            {
                model: Journal,
                as: 'sourceJournal',
                attributes: ['id', 'title', 'content', 'image_url', 'audio_url', 'video_url', 'site_id', 'is_active']
            },
            {
                model: Site,
                as: 'site',
                attributes: ['id', 'name', 'province']
            },
            {
                model: Planner,
                as: 'planner',
                attributes: ['id', 'name', 'start_date', 'end_date', 'status', 'number_of_people', 'transportation'],
                include: [
                    {
                        model: PlannerItem,
                        as: 'items',
                        attributes: [
                            'id',
                            'leg_number',
                            'order_index',
                            'status',
                            'site_id',
                            'event_id',
                            'note',
                            'skip_reason',
                            'skipped_at',
                            'nearby_amenity_ids',
                            'estimated_time',
                            'rest_duration',
                            'travel_time_minutes'
                        ],
                        include: [
                            {
                                model: Site,
                                as: 'site',
                                attributes: ['id', 'name', 'code', 'province', 'latitude', 'longitude', 'cover_image', 'patron_saint']
                            }
                        ]
                    }
                ]
            }
        ];
    }

    normalizePostTitle(title) {
        if (title === undefined) {
            return undefined;
        }

        if (title === null) {
            return null;
        }

        const normalizedTitle = String(title).trim();
        return normalizedTitle || null;
    }

    shouldUseLegacyJournalSnapshot(postData) {
        if (!postData?.journal_id || !postData?.sourceJournal || postData.sourceJournal.is_active === false) {
            return false;
        }

        const hasSnapshotTitle = Boolean(postData.title && String(postData.title).trim());
        const hasSnapshotImages = Array.isArray(postData.image_urls) && postData.image_urls.length > 0;
        const hasSnapshotAudio = Boolean(postData.audio_url);
        const hasSnapshotVideo = Boolean(postData.video_url);
        const hasCustomContent = Boolean(
            postData.content &&
            String(postData.content).trim() &&
            postData.content !== postData.sourceJournal.content
        );

        return !hasSnapshotTitle && !hasSnapshotImages && !hasSnapshotAudio && !hasSnapshotVideo && !hasCustomContent;
    }

    buildJournalSnapshot(postData) {
        if (!postData?.journal_id) {
            return null;
        }

        return {
            id: postData.journal_id,
            title: postData.title || null,
            content: postData.content || null,
            image_url: postData.image_urls || [],
            audio_url: postData.audio_url || null,
            video_url: postData.video_url || null,
            site_id: postData.site_id || null,
            is_snapshot: true
        };
    }

    async formatPostResponse(post, extraFields = {}) {
        const postData = post.toJSON();

        if (this.shouldUseLegacyJournalSnapshot(postData)) {
            postData.title = postData.sourceJournal.title || postData.title || null;
            postData.content = postData.sourceJournal.content || postData.content;
            postData.image_urls = postData.sourceJournal.image_url || [];
            postData.audio_url = postData.sourceJournal.audio_url || null;
            postData.video_url = postData.sourceJournal.video_url || null;
            postData.site_id = postData.site_id || postData.sourceJournal.site_id || null;
        }

        if (postData.planner_id && postData.planner) {
            postData.journey = await this.enrichPlannerJourneyForPost(post);
        }

        postData.sourceJournal = this.buildJournalSnapshot(postData);

        return {
            ...postData,
            ...extraFields
        };
    }

    /**
     * Create a new post
     */
    async createPost(userId, data) {
        try {
            const { title, content, image_urls, audio_url, video_url, site_id } = data;
            const normalizedTitle = this.normalizePostTitle(title);

            // If site_id is provided, validate check-in
            if (site_id) {
                const checkin = await UserCheckin.findOne({
                    where: { user_id: userId },
                    include: [{
                        model: PlannerItem,
                        as: 'plannerItem',
                        where: { site_id: site_id },
                        required: true
                    }]
                });

                if (!checkin) {
                    const error = new Error('You must check-in at this site before tagging it in your post.');
                    error.statusCode = 400;
                    throw error;
                }
            }

            // Create post
            const post = await Post.create({
                user_id: userId,
                title: normalizedTitle,
                content,
                image_urls: image_urls || [],
                audio_url: audio_url || null,
                video_url: video_url || null,
                site_id: site_id || null,
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
                status: 'published',
                is_active: true
            };

            const { count, rows: posts } = await Post.findAndCountAll({
                where: whereClause,
                distinct: true,
                include: this.getPostIncludes(),
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

                    return this.formatPostResponse(post, {
                        is_liked: !!isLiked,
                        comments_count: commentsCount
                    });
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
            const post = await Post.findOne({
                where: {
                    id: postId,
                    is_active: true
                },
                include: this.getPostIncludes()
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

            return this.formatPostResponse(post, {
                is_liked: !!isLiked
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update post
     */
    async updatePost(postId, userId, data, imageFiles = [], audioFile = null, videoFile = null) {
        try {
            const post = await Post.findOne({
                where: {
                    id: postId,
                    is_active: true
                },
                include: [
                    {
                        model: Journal,
                        as: 'sourceJournal',
                        attributes: ['id', 'title', 'content', 'image_url', 'audio_url', 'video_url', 'site_id', 'is_active']
                    }
                ]
            });

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

            const { title, content } = data;

            // Planner shares still read from the original planner, so keep them read-only here.
            if (post.planner_id) {
                if (
                    title !== undefined ||
                    content !== undefined ||
                    this.getPostImageInput(data) !== undefined ||
                    data.audio_url !== undefined ||
                    data.video_url !== undefined ||
                    (imageFiles && imageFiles.length > 0) ||
                    audioFile ||
                    videoFile
                ) {
                    const type = post.journal_id ? 'nhật ký' : 'hành trình';
                    const error = new Error(`Không thể chỉnh sửa nội dung của ${type} đã chia sẻ thông qua từ nhật ký tâm linh. Vui lòng chỉnh sửa bản gốc.`);
                    error.statusCode = 400;
                    throw error;
                }
            }

            const postData = post.toJSON();
            const useLegacyJournalSnapshot = this.shouldUseLegacyJournalSnapshot(postData);
            const snapshotTitle = useLegacyJournalSnapshot ? postData.sourceJournal?.title || post.title || null : post.title;
            const snapshotContent = useLegacyJournalSnapshot ? postData.sourceJournal?.content || post.content : post.content;
            const snapshotImageUrls = useLegacyJournalSnapshot ? postData.sourceJournal?.image_url || post.image_urls || [] : post.image_urls;
            const snapshotAudioUrl = useLegacyJournalSnapshot ? postData.sourceJournal?.audio_url || post.audio_url || null : post.audio_url;
            const snapshotVideoUrl = useLegacyJournalSnapshot ? postData.sourceJournal?.video_url || post.video_url || null : post.video_url;

            const requestedImageUrls = this.normalizeStringArrayInput(this.getPostImageInput(data));
            const requestedAudioUrl = this.normalizeNullableStringInput(data.audio_url);
            const requestedVideoUrl = this.normalizeNullableStringInput(data.video_url);

            let finalImageUrls = requestedImageUrls;
            if (imageFiles && imageFiles.length > 0) {
                const uploadedImageUrls = imageFiles.map(file => file.path || file.url).filter(Boolean);
                finalImageUrls = [...new Set([...requestedImageUrls, ...uploadedImageUrls])];
            }

            if (finalImageUrls.length > 10) {
                const error = new Error('Maximum 10 images allowed');
                error.statusCode = 400;
                throw error;
            }

            let finalAudioUrl = requestedAudioUrl;
            if (audioFile) {
                finalAudioUrl = audioFile.path || audioFile.url || null;
            }

            let finalVideoUrl = requestedVideoUrl;
            if (videoFile) {
                finalVideoUrl = videoFile.path || videoFile.url || null;
            }

            await post.update({
                title: title !== undefined ? this.normalizePostTitle(title) : snapshotTitle,
                content: content !== undefined ? content : snapshotContent,
                image_urls: this.getPostImageInput(data) !== undefined || (imageFiles && imageFiles.length > 0)
                    ? finalImageUrls
                    : snapshotImageUrls,
                audio_url: data.audio_url !== undefined || audioFile
                    ? finalAudioUrl
                    : snapshotAudioUrl,
                video_url: data.video_url !== undefined || videoFile
                    ? finalVideoUrl
                    : snapshotVideoUrl,
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

            // Soft delete instead of destroy
            await post.update({ is_active: false });

            if (userRole !== 'admin') {
                await Report.update(
                    {
                        status: 'reject',
                        admin_note: 'Người dùng đã xóa bài viết'
                    },
                    {
                        where: {
                            target_type: 'post',
                            target_id: postId,
                            status: 'pending',
                            is_active: true
                        }
                    }
                );
            }

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

            // Send notification to post author (if not liking their own post)
            if (post.user_id !== userId) {
                const liker = await User.findByPk(userId, { attributes: ['id', 'full_name'] });
                if (liker) {
                    NotificationService.createNotification('post_liked', post.user_id, {
                        likerName: liker.full_name,
                        postId: post.id
                    }).catch(err => console.error('Notification error:', err));
                }
            }

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

            let parentComment = null;
            if (parentId) {
                parentComment = await PostComment.findOne({
                    where: {
                        id: parentId,
                        post_id: postId,
                        status: 'published'
                    }
                });
                if (!parentComment) {
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

            // Send notification
            const commenter = await User.findByPk(userId, { attributes: ['id', 'full_name'] });
            if (commenter) {
                if (parentId && parentComment && parentComment.user_id !== userId) {
                    // Send reply notification
                    NotificationService.createNotification('post_comment_replied', parentComment.user_id, {
                        replierName: commenter.full_name,
                        postId: post.id,
                        commentId: comment.id
                    }).catch(err => console.error('Notification error:', err));
                } else if (!parentId && post.user_id !== userId) {
                    // Send comment notification
                    NotificationService.createNotification('post_commented', post.user_id, {
                        commenterName: commenter.full_name,
                        postId: post.id,
                        commentId: comment.id
                    }).catch(err => console.error('Notification error:', err));
                }
            }

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
            const comment = await PostComment.findOne({
                where: {
                    id: commentId,
                    post_id: postId,
                    status: 'published'
                }
            });

            if (!comment) {
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
            const comment = await PostComment.findOne({
                where: {
                    id: commentId,
                    post_id: postId,
                    status: 'published'
                }
            });

            if (!comment) {
                const error = new Error('Comment not found');
                error.statusCode = 404;
                throw error;
            }

            const post = await Post.findByPk(postId);

            // Check permissions: comment owner, post owner, or system admin
            let canDelete = comment.user_id === userId ||
                post?.user_id === userId ||
                userRole === 'admin';

            if (!canDelete) {
                const error = new Error('You do not have permission to delete this comment');
                error.statusCode = 403;
                throw error;
            }

            // Hide comment by status because some environments do not have post_comments.is_active
            await comment.update({ status: 'rejected' });

            if (userRole !== 'admin') {
                await Report.update(
                    {
                        status: 'reject',
                        admin_note: 'Người dùng đã xóa bình luận'
                    },
                    {
                        where: {
                            target_type: 'comment',
                            target_id: commentId,
                            status: 'pending',
                            is_active: true
                        }
                    }
                );
            }

            return { message: 'Comment deleted successfully' };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new PostService();
