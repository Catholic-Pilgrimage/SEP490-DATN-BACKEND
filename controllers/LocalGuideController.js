const LocalGuideService = require('../services/localGuideService');
const ResponseUtil = require('../utils/response.util');

/**
 * Local Guide: Get my site details
 * GET /api/local-guide/site
 */
exports.getMySite = async (req, res) => {
    try {
        const result = await LocalGuideService.getMySite(req.user.id);

        return ResponseUtil.success(res, result, req.__('local_guide.site_success'));
    } catch (error) {
        if (error.message === 'User not found') {
            return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
        }
        if (error.message === 'Only local guides can access this') {
            return ResponseUtil.forbidden(res, req.__('local_guide.only_local_guide'));
        }
        if (error.message === 'Local Guide has no site assigned') {
            return ResponseUtil.badRequest(res, req.__('local_guide.no_site'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Upload Site Media
 * POST /api/local-guide/media
 * - File upload (multipart/form-data): image, video, panorama
 * - YouTube URL (application/json): video link
 */
exports.uploadMedia = async (req, res) => {
    try {
        const { type, caption, url } = req.body;

        // Validate type
        if (!type || !['image', 'video', 'panorama'].includes(type)) {
            return ResponseUtil.badRequest(res, req.__('local_guide.invalid_media_type'));
        }

        let mediaUrl;


        if (req.file) {
            mediaUrl = req.file.path;
        }

        else if (url && type === 'video') {
            mediaUrl = url;
        }

        else {
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

        // If file uploaded, use Cloudinary URL
        if (req.file) {
            updateData.url = req.file.path;
        }
        // If YouTube URL provided (video only)
        else if (url) {
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
