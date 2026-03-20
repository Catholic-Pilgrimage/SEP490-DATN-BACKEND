const { SiteMedia } = require('../../models');
const FptAiService = require('../../services/shared/fptAiService');
const Logger = require('../../utils/logger.util');

/**
 * POST /api/webhooks/vbee?mediaId=<uuid>
 * VBee calls this when TTS audio is ready.
 * 
 * Expected VBee payload:
 * {
 *   request_id: string,
 *   status: 1 | 0,         // 1 = success
 *   audio_url: string,     // URL of generated audio
 *   error_message?: string
 * }
 */
exports.handleVbeeCallback = async (req, res) => {
    try {
        const { mediaId } = req.query;
        const payload = req.body;

        Logger.info(`VBee Webhook: Received callback for media=${mediaId}, body=${JSON.stringify(payload)}`);

        // Always respond 200 immediately so VBee doesn't retry
        res.status(200).json({ received: true });

        if (!mediaId) {
            Logger.error('VBee Webhook: Missing mediaId in query params');
            return;
        }

        // Flexible payload parsing logic since VBee formats vary
        const resultObj = payload?.result || payload?.data || payload;
        
        let isSuccess = false;
        if (
            payload?.status === 1 || 
            payload?.status === 'SUCCESS' || 
            payload?.code === 0 || 
            resultObj?.status === 1 ||
            resultObj?.status === 'SUCCESS'
        ) {
            isSuccess = true;
        }

        // Search for audio url in various possible fields
        let audioUrl = payload?.audio_url || 
                       payload?.audio_link || 
                       resultObj?.audio_url || 
                       resultObj?.audio_link || 
                       resultObj?.url || 
                       payload?.url;

        // Force success if we found a URL
        if (audioUrl) {
            isSuccess = true;
        }

        if (!isSuccess || !audioUrl) {
            Logger.error(`VBee Webhook: TTS failed for media=${mediaId}. Error: ${payload?.error_message || resultObj?.error_message || 'unknown formats'}`);

            // Mark as rejected so Local Guide can retry
            const media = await SiteMedia.findByPk(mediaId);
            if (media && media.narrative_status === 'processing') {
                await media.update({
                    narrative_status: 'rejected',
                    narrative_rejection_reason: `TTS thất bại: ${payload?.error_message || resultObj?.error_message || 'Lỗi không xác định từ VBee'}`
                });
                Logger.info(`VBee Webhook: Media ${mediaId} narrative_status set to rejected`);
            }
            return;
        }


        Logger.info(`VBee Webhook: TTS success for media=${mediaId}. audio_url=${audioUrl}`);

        // Upload to Cloudinary and save to DB
        try {
            // Download audio buffer from VBee URL
            const { downloadAudio } = require('../../config/vbee.config');
            const audioBuffer = await downloadAudio(audioUrl);

            // Upload to Cloudinary
            const cloudinaryUrl = await FptAiService._uploadBufferToCloudinary(
                audioBuffer,
                `narration_${mediaId}_${Date.now()}`
            );

            // Update SiteMedia: set audio_url and move to pending (awaiting manager approval)
            const media = await SiteMedia.findByPk(mediaId);
            if (!media) {
                Logger.error(`VBee Webhook: SiteMedia ${mediaId} not found`);
                return;
            }

            await media.update({
                audio_url: cloudinaryUrl,
                narrative_status: 'pending'
            });

            Logger.info(`VBee Webhook: ✓ Media ${mediaId} audio saved to Cloudinary. narrative_status=pending`);

        } catch (uploadError) {
            Logger.error(`VBee Webhook: Upload failed for media=${mediaId}: ${uploadError.message}`);

            // Mark as rejected so user can retry
            const media = await SiteMedia.findByPk(mediaId);
            if (media && media.narrative_status === 'processing') {
                await media.update({
                    narrative_status: 'rejected',
                    narrative_rejection_reason: 'Lỗi upload audio lên server. Vui lòng thử lại.'
                });
            }
        }

    } catch (error) {
        Logger.error(`VBee Webhook: Unhandled error: ${error.message}`);
        // Don't throw - VBee already got 200
    }
};
