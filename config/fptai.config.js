const axios = require('axios');
const Logger = require('../utils/logger.util');

/**
 * VBee Text-to-Speech Configuration
 * API Docs: https://docs.vbee.vn/
 */

const VBEE_API_URL = 'https://vbee.vn/api/v1/tts';
const VBEE_API_KEY = process.env.VBEE_API_KEY;

if (!VBEE_API_KEY) {
    console.warn('⚠️  VBEE_API_KEY not found in .env');
}

/**
 * Map Site region to VBee voice identifier (default voices)
 */
const REGION_VOICE_MAP = {
    'Bac': 'hn_female_thutrang_full_48k-fhg',      // Nữ miền Bắc - Thu Trang
    'Trung': 'hue_female_thutrang_full_48k-fhg',   // Nữ miền Trung - Thu Trang
    'Nam': 'sg_female_thutrang_full_48k-fhg'        // Nữ miền Nam - Thu Trang
};

/**
 * All available VBee voices (popular ones)
 */
const AVAILABLE_VOICES = [
    // Miền Bắc
    { id: 'hn_female_thutrang_full_48k-fhg', name: 'Thu Trang', gender: 'female', region: 'Bắc', quality: 'high' },
    { id: 'hn_male_xuantin_full_48k-fhg', name: 'Xuân Tín', gender: 'male', region: 'Bắc', quality: 'high' },
    { id: 'hn_female_ngoclam_full_48k-fhg', name: 'Ngọc Lam', gender: 'female', region: 'Bắc', quality: 'high' },

    // Miền Trung
    { id: 'hue_female_thutrang_full_48k-fhg', name: 'Thu Trang', gender: 'female', region: 'Trung', quality: 'high' },
    { id: 'hue_male_xuantin_full_48k-fhg', name: 'Xuân Tín', gender: 'male', region: 'Trung', quality: 'high' },

    // Miền Nam
    { id: 'sg_female_thutrang_full_48k-fhg', name: 'Thu Trang', gender: 'female', region: 'Nam', quality: 'high' },
    { id: 'sg_male_xuantin_full_48k-fhg', name: 'Xuân Tín', gender: 'male', region: 'Nam', quality: 'high' },
    { id: 'sg_female_ngoclam_full_48k-fhg', name: 'Ngọc Lam', gender: 'female', region: 'Nam', quality: 'high' }
];

/**
 * Send text to VBee TTS API and get audio URL
 * @param {string} text - Text to convert (max 5000 characters)
 * @param {string} voice - Voice identifier (e.g. 'hn_female_thutrang_full_48k-fhg')
 * @param {number} speed - Speed adjustment (0.8 to 1.5, default 1.0)
 * @returns {Promise<string>} - Direct audio URL (mp3)
 */
async function requestTTS(text, voice = 'hn_female_thutrang_full_48k-fhg', speed = 1.0) {
    if (!VBEE_API_KEY) {
        throw new Error('VBEE_API_KEY is not configured');
    }

    if (text.length > 5000) {
        throw new Error('Text must not exceed 5000 characters');
    }

    Logger.info(`VBee TTS: Sending request - voice=${voice}, speed=${speed}, textLength=${text.length}`);

    try {
        const response = await axios.post(VBEE_API_URL, {
            input_text: text,
            voice_code: voice,
            speed: speed,
            bit_rate: 128000,
            format: 'mp3',
            sample_rate: 48000
        }, {
            headers: {
                'Authorization': `Bearer ${VBEE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        Logger.info(`VBee TTS: Response received - ${JSON.stringify(response.data)}`);

        if (response.data.code !== 0) {
            throw new Error(`VBee TTS Error: ${response.data.message || 'Unknown error'}`);
        }

        if (!response.data.data || !response.data.data.audio_url) {
            throw new Error('VBee TTS: No audio URL returned');
        }

        const audioUrl = response.data.data.audio_url;
        Logger.info(`VBee TTS: ✓ Audio generated successfully: ${audioUrl}`);

        return audioUrl;

    } catch (error) {
        if (error.response) {
            Logger.error(`VBee TTS: API Error - Status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
            throw new Error(`VBee TTS API Error: ${error.response.data.message || error.message}`);
        }
        throw error;
    }
}

/**
 * Poll async URL until audio file is ready, then download as Buffer
 * @param {string} asyncUrl - The async URL from FPT AI
 * @param {number} maxAttempts - Maximum polling attempts (default 60)
 * @param {number} intervalMs - Interval between polls in ms (default 2000)
 * @returns {Promise<Buffer>} - Audio buffer (mp3)
 */
async function pollAndDownloadAudio(asyncUrl, maxAttempts = 60, intervalMs = 2000) {
    // Wait 10 seconds before first attempt (FPT AI needs processing time)
    Logger.info('FPT AI TTS: Waiting 10 seconds for initial processing...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            // Only log every 5th attempt to reduce noise
            if (attempt % 5 === 0 || attempt === 1) {
                Logger.info(`FPT AI TTS: Polling attempt ${attempt}/${maxAttempts}...`);
            }

            const response = await axios.get(asyncUrl, {
                responseType: 'arraybuffer',
                timeout: 15000,
                validateStatus: (status) => true // Accept all status codes
            });

            // Debug logging for first few attempts
            if (attempt <= 3 || attempt % 10 === 0) {
                Logger.info(`FPT AI TTS: Status=${response.status}, Content-Type=${response.headers['content-type']}, Size=${response.data.byteLength}`);
            }

            if (response.status === 200) {
                const contentType = response.headers['content-type'] || '';
                const contentLength = response.data.byteLength || 0;

                // Check if it's actually audio content (not HTML error page)
                if (contentLength > 1000 && (contentType.includes('audio') || contentType.includes('octet-stream') || contentType.includes('mpeg'))) {
                    Logger.info(`FPT AI TTS: ✓ Audio ready! Size: ${contentLength} bytes, Content-Type: ${contentType}`);
                    return Buffer.from(response.data);
                } else if (contentLength > 1000) {
                    // Sometimes FPT AI returns audio without proper content-type
                    Logger.info(`FPT AI TTS: ✓ Audio ready (no content-type)! Size: ${contentLength} bytes`);
                    return Buffer.from(response.data);
                } else if (contentLength < 1000 && attempt <= 3) {
                    Logger.warn(`FPT AI TTS: File too small (${contentLength} bytes), likely not ready yet`);
                }
            }

            // Not ready yet, wait and retry
            await new Promise(resolve => setTimeout(resolve, intervalMs));

        } catch (error) {
            // Log errors on first few attempts and every 10th attempt
            if (attempt <= 3 || attempt % 10 === 0) {
                Logger.warn(`FPT AI TTS: Poll attempt ${attempt} - ${error.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }

    throw new Error('FPT AI TTS: Audio generation timed out after 2 minutes');
}

/**
 * Get the default voice for a given region
 * @param {string} region - Site region ('Bac', 'Trung', 'Nam')
 * @returns {string} - Voice identifier
 */
function getVoiceForRegion(region) {
    return REGION_VOICE_MAP[region] || 'banmai';
}

/**
 * Map user-friendly speed (0.5-2.0) to FPT AI speed (-3 to +3)
 * @param {number} userSpeed - Speed from 0.5 to 2.0
 * @returns {string} - FPT AI speed string
 */
function mapSpeedToFPTAI(userSpeed) {
    if (userSpeed <= 0.5) return '-3';
    if (userSpeed <= 0.7) return '-2';
    if (userSpeed <= 0.9) return '-1';
    if (userSpeed <= 1.1) return '0';
    if (userSpeed <= 1.3) return '+1';
    if (userSpeed <= 1.7) return '+2';
    return '+3';
}

/**
 * Complete TTS generation: request + poll + download
 * @param {string} text - Text to convert
 * @param {string} voice - Voice identifier
 * @param {number} userSpeed - Speed 0.5-2.0
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function generateTTS(text, voice = 'banmai', userSpeed = 1.0) {
    const fptSpeed = mapSpeedToFPTAI(userSpeed);
    const asyncUrl = await requestTTS(text, voice, fptSpeed);
    const audioBuffer = await pollAndDownloadAudio(asyncUrl);
    return audioBuffer;
}

module.exports = {
    VBEE_API_URL,
    VBEE_API_KEY,
    REGION_VOICE_MAP,
    AVAILABLE_VOICES,
    VOICES: AVAILABLE_VOICES, // Alias for controller
    requestTTS,
    pollAndDownloadAudio,
    getVoiceForRegion,
    mapSpeedToFPTAI,
    generateTTS
};
