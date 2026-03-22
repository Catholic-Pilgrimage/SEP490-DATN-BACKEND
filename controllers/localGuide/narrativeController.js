const { SiteMedia, Site, User } = require('../../models');
const VbeeService = require('../../services/shared/vbeeService');
const ResponseUtil = require('../../utils/response.util');
const Logger = require('../../utils/logger.util');

/**
 * Local Guide: Update narrative for a 3D Model
 * PUT /api/local-guide/media/:id/narrative
 * 
 * Body (form-data):
 *   - narration_text (string, optional): Text for AI TTS
 *   - audio_file (file, optional): Direct audio upload (.mp3/.wav)
 *   - voice (string, optional): Override voice (e.g. 'banmai', 'linhsan')
 * 
 * One of narration_text or audio_file is required.
 */
exports.updateNarrative = async (req, res) => {
    try {
        const { id } = req.params;
        const { narration_text, voice } = req.body;
        const audioFile = req.file;

        // Validate: at least one of narration_text or audio_file must be provided
        if (!narration_text && !audioFile) {
            return ResponseUtil.badRequest(res, req.__('narrative.text_or_audio_required'));
        }

        // Find the media record
        const media = await SiteMedia.findByPk(id, {
            include: [{ model: Site, as: 'site' }]
        });

        if (!media) {
            return ResponseUtil.notFound(res, req.__('local_guide.media_not_found'));
        }

        // Check media type must be model_3d
        if (media.type !== 'model_3d') {
            return ResponseUtil.badRequest(res, req.__('narrative.only_3d_model'));
        }

        // Verify the Local Guide belongs to the same site
        const user = await User.findByPk(req.user.id);
        if (!user || user.site_id !== media.site_id) {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }

        // Check if narrative can be updated
        // Can update if: NULL (no narrative), pending, or rejected
        // Cannot update if: approved
        if (media.narrative_status === 'approved') {
            return ResponseUtil.forbidden(res, req.__('narrative.cannot_edit_approved'));
        }

        let audioUrl = media.audio_url;
        let narrationText = narration_text || media.narration_text;

        if (audioFile) {
            // Path B: Direct audio upload to Cloudinary
            Logger.info(`Narrative: Local Guide ${req.user.id} uploading audio file for media ${id}`);
            audioUrl = await VbeeService.uploadAudioFile(audioFile);

        } else if (narration_text) {
            // Path A: Text-to-Speech via FPT AI
            Logger.info(`Narrative: Local Guide ${req.user.id} generating TTS for media ${id}`);
            const result = await VbeeService.generateAndUploadNarration(
                id,
                narration_text,
                media.site.region,
                voice || null
            );
            audioUrl = result.audio_url;
            narrationText = narration_text;
        }

        // Update the SiteMedia record
        await media.update({
            audio_url: audioUrl,
            narration_text: narrationText,
            narrative_status: 'pending',  // Only narrative needs approval, not the 3D model
            narrative_rejection_reason: null  // Clear any previous rejection reason
            // Note: status and is_active remain unchanged
        });

        Logger.info(`Narrative: Media ${id} narrative updated by Local Guide ${req.user.id}, narrative_status set to pending`);

        return ResponseUtil.success(res, {
            id: media.id,
            audio_url: media.audio_url,
            narration_text: media.narration_text,
            status: media.status,  // 3D model status unchanged
            narrative_status: media.narrative_status,  // Narrative status = pending
            is_active: media.is_active
        }, req.__('narrative.update_success'));

    } catch (error) {
        Logger.error('Narrative update error:', error);

        if (error.message === 'VBEE_API_KEY is not configured') {
            return ResponseUtil.error(res, req.__('narrative.tts_not_configured'));
        }
        if (error.message === 'Narration text must have at least 3 characters') {
            return ResponseUtil.badRequest(res, req.__('narrative.text_too_short'));
        }
        if (error.message === 'Narration text must not exceed 5000 characters') {
            return ResponseUtil.badRequest(res, req.__('narrative.text_too_long'));
        }
        if (error.message.includes('VBee TTS')) {
            return ResponseUtil.error(res, req.__('narrative.tts_error'));
        }
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide / Manager: Get available TTS voices
 * GET /api/local-guide/media/voices
 */
exports.getVoices = async (req, res) => {
    try {
        const voices = VbeeService.getAvailableVoices();
        return ResponseUtil.success(res, voices, req.__('narrative.get_voices_success'));
    } catch (error) {
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};

/**
 * Local Guide: Delete narrative
 * DELETE /api/local-guide/media/:id/narrative
 * 
 * Can only delete narrative when status is pending or rejected
 */
exports.deleteNarrative = async (req, res) => {
    try {
        const { id } = req.params;

        const media = await SiteMedia.findByPk(id, {
            include: [{ model: Site, as: 'site' }]
        });

        if (!media) {
            return ResponseUtil.notFound(res, req.__('local_guide.media_not_found'));
        }

        if (media.type !== 'model_3d') {
            return ResponseUtil.badRequest(res, req.__('narrative.only_3d_model'));
        }

        // Verify the Local Guide belongs to the same site
        const user = await User.findByPk(req.user.id);
        if (!user || user.site_id !== media.site_id) {
            return ResponseUtil.forbidden(res, req.__('auth.forbidden'));
        }

        // Can only delete if pending or rejected
        if (media.narrative_status === 'approved') {
            return ResponseUtil.forbidden(res, req.__('narrative.cannot_delete_approved'));
        }

        if (!media.narrative_status) {
            return ResponseUtil.badRequest(res, req.__('narrative.no_narrative_to_delete'));
        }

        // Delete narrative (set to NULL)
        await media.update({
            audio_url: null,
            narration_text: null,
            narrative_status: null,
            narrative_rejection_reason: null
        });

        Logger.info(`Narrative: Local Guide ${req.user.id} deleted narrative for media ${id}`);

        return ResponseUtil.success(res, {
            id: media.id,
            audio_url: null,
            narration_text: null,
            narrative_status: null
        }, req.__('narrative.delete_success'));

    } catch (error) {
        Logger.error('Narrative delete error:', error);
        return ResponseUtil.error(res, req.__('error.server_error'));
    }
};
