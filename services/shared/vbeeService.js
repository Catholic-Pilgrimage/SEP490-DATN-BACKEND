const { requestTTS, downloadAudio, getVoiceForRegion, AVAILABLE_VOICES } = require('../../config/vbee.config');
const { cloudinary } = require('../../config/cloudinary.config');
const { SiteMedia, Site } = require('../../models');
const Logger = require('../../utils/logger.util');

class VbeeService {

    /**
     * Full pipeline: Text -> VBee TTS -> Cloudinary -> DB Update
     * @param {string} mediaId - SiteMedia ID (must be type 'model_3d')
     * @param {string} narrationText - Text content for voiceover
     * @param {string} region - Site region ('Bac', 'Trung', 'Nam')
     * @param {string} [customVoice] - Optional voice override
     * @returns {Promise<{audio_url: string}>}
     */
    static async generateAndUploadNarration(mediaId, narrationText, region, customVoice = null) {
        if (!narrationText || narrationText.trim().length < 3) {
            throw new Error('Narration text must have at least 3 characters');
        }

        if (narrationText.length > 5000) {
            throw new Error('Narration text must not exceed 5000 characters');
        }

        const voice = customVoice || getVoiceForRegion(region);

        Logger.info(`VBee Service: Starting TTS pipeline for media=${mediaId}, voice=${voice}, region=${region}`);

        // Step 1: Call VBee TTS API
        const audioUrl = await requestTTS(narrationText, voice, 1.0);

        // Step 2: Download audio buffer
        const audioBuffer = await downloadAudio(audioUrl);

        // Step 3: Upload to Cloudinary
        const cloudinaryUrl = await VbeeService._uploadBufferToCloudinary(audioBuffer, `narration_${mediaId}_${Date.now()}`);

        Logger.info(`VBee Service: Pipeline complete. audio_url=${cloudinaryUrl}`);

        return { audio_url: cloudinaryUrl };
    }

    /**
     * Upload a raw audio file (from Local Guide) to Cloudinary
     * @param {object} file - Multer file object (with buffer)
     * @returns {Promise<string>} - Cloudinary secure URL
     */
    static async uploadAudioFile(file) {
        const audioUrl = await VbeeService._uploadBufferToCloudinary(
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

module.exports = VbeeService;
