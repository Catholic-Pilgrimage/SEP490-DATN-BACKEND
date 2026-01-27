const LocalGuideService = require('../../services/localGuide');
const ResponseUtil = require('../../utils/response.util');

/**
 * Local Guide: Upload Site Media
 * POST /api/local-guide/media
 */
exports.uploadMedia = async (req, res) => {
    try {
        const { type, caption, url } = req.body;

        if (!type || !['image', 'video', 'panorama'].includes(type)) {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_media_type'));
        }

        let mediaUrl;

        if (req.file) {
            mediaUrl = req.file.path;
        } else if (url && type === 'video') {
            mediaUrl = url;
        } else {
            return ResponseUtil.badRequest(res, req.__('local_guide.file_or_url_required'));
        }

        const mediaData = {
            url: mediaUrl,
            type,
            caption
        };

        const result = await LocalGuideService.uploadMedia(req.user.id, mediaData);
        return ResponseUtil.created(res, result, req.__('local_guide.upload_media_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Local Guide has no site') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_site'));
        }
        if (error.message === 'Invalid media type') {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_media_type'));
        }
        if (error.message === 'Invalid YouTube URL') {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_youtube_url'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Get Site Media with filter & pagination
 * GET /api/local-guide/media
 */
exports.getSiteMedia = async (req, res) => {
    try {
        const { page, limit, type, status } = req.query;
        const result = await LocalGuideService.getSiteMedia(req.user.id, {
            page, limit, type, status
        });
        return ResponseUtil.success(res, result, req.__('local_guide.get_media_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Update Site Media (Only pending)
 * PUT /api/local-guide/media/:id
 */
exports.updateMedia = async (req, res) => {
    try {
        const { type, caption, url } = req.body;

        const updateData = { caption };

        if (type) {
            if (!['image', 'video', 'panorama'].includes(type)) {
                return ResponseUtil.badRequest(res, req.__('local_guide.invalid_media_type'));
            }
            updateData.type = type;
        }

        if (req.file) {
            updateData.url = req.file.path;
        } else if (url) {
            updateData.url = url;
        }

        const result = await LocalGuideService.updateMedia(req.user.id, req.params.id, updateData);
        return ResponseUtil.success(res, result, req.__('local_guide.update_media_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Media not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.media_not_found'));
        }
        if (error.message === 'Cannot update approved media') {
            return ResponseUtil.badRequest(res, req.__('local_guide.update_approved_error'));
        }
        if (error.message === 'Invalid YouTube URL') {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_youtube_url'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Delete Site Media (Only pending)
 * DELETE /api/local-guide/media/:id
 */
exports.deleteMedia = async (req, res) => {
    try {
        const result = await LocalGuideService.deleteMedia(req.user.id, req.params.id);
        return ResponseUtil.success(res, result, req.__('local_guide.delete_media_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Media not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.media_not_found'));
        }
        if (error.message === 'Cannot delete approved media') {
            return ResponseUtil.badRequest(res, req.__('local_guide.delete_approved_media_error'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Restore Media
 * PATCH /api/local-guide/media/:id/restore
 */
exports.restoreMedia = async (req, res) => {
    try {
        const result = await LocalGuideService.restoreMedia(req.user.id, req.params.id);
        return ResponseUtil.success(res, result, req.__('local_guide.restore_media_success'));
    } catch (error) {
        if (error.message === 'Unauthorized') {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }
        if (error.message === 'Media not found') {
            return ResponseUtil.notFound(res, req.__('local_guide.media_not_found'));
        }
        if (error.message === 'Cannot restore approved media') {
            return ResponseUtil.badRequest(res, req.__('local_guide.restore_approved_media_error'));
        }
        if (error.message === 'Media is already active') {
            return ResponseUtil.badRequest(res, req.__('local_guide.media_already_active'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
