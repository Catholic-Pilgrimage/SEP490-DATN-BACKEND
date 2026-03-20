const { requestTTS, downloadAudio, getVoiceForRegion, AVAILABLE_VOICES } = require('../../config/vbee.config');
const { cloudinary } = require('../../config/cloudinary.config');
const { SiteMedia, Site } = require('../../models');
const Logger = require('../../utils/logger.util');

class FptAiService {

    /**
     * Full pipeline (async): Text -> VBee TTS request -> wait for VBee callback
     * VBee will call VBEE_CALLBACK_URL with the audio file when ready
     * @param {string} mediaId - SiteMedia ID
     * @param {string} narrationText - Text content for voiceover
     * @param {string} region - Site region ('Bac', 'Trung', 'Nam')
     * @param {string} [customVoice] - Optional voice override
     * @returns {Promise<{request_id: string, status: 'processing'}>}
     */
    static async generateAndUploadNarration(mediaId, narrationText, region, customVoice = null) {
        if (!narrationText || narrationText.trim().length < 3) {
            throw new Error('Narration text must have at least 3 characters');
        }

        if (narrationText.length > 5000) {
            throw new Error('Narration text must not exceed 5000 characters');
        }

        const voice = customVoice || getVoiceForRegion(region);

        Logger.info(`VBee Service: Starting async TTS for media=${mediaId}, voice=${voice}, region=${region}`);

        // Build callback URL with mediaId so webhook knows which record to update
        const baseUrl = process.env.SERVER_BASE_URL || process.env.VBEE_CALLBACK_URL?.replace(/\/api\/webhooks\/vbee.*/, '');
        const callbackUrl = `${baseUrl}/api/webhooks/vbee?mediaId=${mediaId}`;

        // Send async TTS request to VBee
        const { request_id } = await requestTTS(narrationText, voice, 1.0, callbackUrl);

        Logger.info(`VBee Service: TTS request sent. request_id=${request_id}, awaiting callback for media=${mediaId}`);

        return { request_id, status: 'processing' };
    }


    /**
     * Upload a raw audio file (from Local Guide) to Cloudinary
     * @param {object} file - Multer file object (with buffer)
     * @returns {Promise<string>} - Cloudinary secure URL
     */
    static async uploadAudioFile(file) {
        const audioUrl = await FptAiService._uploadBufferToCloudinary(
            file.buffer,
            `narration_upload_${Date.now()}`
        );
        return audioUrl;
    }

    /**
     * Upload audio buffer to Cloudinary using stream
     * @param {Buffer} buffer - Audio buffer
     * @param {string} publicId - Cloudinary public ID
     * @returns {Promise<string>} - Secure URL
     * @private
     */
    static async _uploadBufferToCloudinary(buffer, publicId) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'catholic_pilgrimage/narration_audio',
                    resource_type: 'video',  // Cloudinary uses 'video' for audio files
                    public_id: publicId,
                    format: 'mp3'
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result.secure_url);
                }
            );
            uploadStream.end(buffer);
        });
    }

    /**
     * Get available voices list
     * @returns {Array}
     */
    static getAvailableVoices() {
        return AVAILABLE_VOICES;
    }
}

module.exports = FptAiService;
