const axios = require('axios');
const Logger = require('../utils/logger.util');

/**
 * VBee Text-to-Speech Configuration
 * API Docs: https://docs.vbee.vn/
 */

const VBEE_API_URL = 'https://vbee.vn/api/v1/tts';

// Lazy read: đọc khi function được gọi, không phải lúc module load
function getApiKey() {
    return process.env.VBEE_API_KEY;
}
function getAppId() {
    return process.env.VBEE_APP_ID || process.env.VBEE_API_KEY;
}

/**
 * Map Site region to VBee voice identifier (default voices)
 */
const REGION_VOICE_MAP = {
    'Bac': 'hn_female_ngochuyen_full_48k-fhg',      // Nữ miền Bắc - Ngọc Huyền
    'Trung': 'hue_female_huonggiang_full_48k-fhg',  // Nữ miền Trung - Hương Giang
    'Nam': 'sg_female_tuongvy_call_44k-fhg'         // Nữ miền Nam - Tường Vy
};

/**
 * All available VBee voices (from user account)
 */
const AVAILABLE_VOICES = [
    // --- Tiếng Việt (vi) ---
    // Miền Bắc
    { id: 'hn_female_ngochuyen_full_48k-fhg', name: 'Ngọc Huyền', gender: 'female', region: 'Bắc', language: 'vi', quality: 'high' },
    { id: 'hn_male_minhquan_yt-stable', name: 'Minh Quân', gender: 'male', region: 'Bắc', language: 'vi', quality: 'high' },
    { id: 'hn_female_hachi_book_22k-vc', name: 'Hà Chi', gender: 'female', region: 'Bắc', language: 'vi', quality: 'high' },
    { id: 'hn_male_vietbach_child_22k-vc', name: 'Việt Bách (Bé trai)', gender: 'male', region: 'Bắc', language: 'vi', quality: 'high' },
    { id: 'hn_female_nganha_child_22k-vc', name: 'Ngân Hà (Bé gái)', gender: 'female', region: 'Bắc', language: 'vi', quality: 'high' },
    { id: 'hn_male_phuthang_stor80dt_48k-fhg', name: 'Anh Khôi (Giọng trầm kể chuyện)', gender: 'male', region: 'Bắc', language: 'vi', quality: 'high' },
    { id: 'hn_female_maiphuong_vdts_48k-fhg', name: 'Mai Phương', gender: 'female', region: 'Bắc', language: 'vi', quality: 'high' },
    
    // Miền Trung
    { id: 'hue_female_huonggiang_full_48k-fhg', name: 'Hương Giang', gender: 'female', region: 'Trung', language: 'vi', quality: 'high' },
    { id: 'hue_male_duyphuong_full_48k-fhg', name: 'Duy Phương', gender: 'male', region: 'Trung', language: 'vi', quality: 'high' },
    
    // Miền Nam
    { id: 'sg_female_tuongvy_call_44k-fhg', name: 'Tường Vy', gender: 'female', region: 'Nam', language: 'vi', quality: 'high' },
    { id: 'sg_male_chidat_ebook_48k-phg', name: 'Chí Đạt', gender: 'male', region: 'Nam', language: 'vi', quality: 'high' },
    { id: 'sg_female_thaotrinh_full_48k-fhg', name: 'Thảo Trinh', gender: 'female', region: 'Nam', language: 'vi', quality: 'high' },
    { id: 'sg_female_lantrinh_vdts_48k-fhg', name: 'Lan Trinh', gender: 'female', region: 'Nam', language: 'vi', quality: 'high' },
    { id: 'sg_male_trungkien_vdts_48k-fhg', name: 'Trung Kiên', gender: 'male', region: 'Nam', language: 'vi', quality: 'high' },

    // --- Tiếng Anh (en) ---
    { id: 'en-US-Wavenet-D-Premium', name: 'Lucas (Premium US)', gender: 'male', region: 'US', language: 'en', quality: 'high' },
    { id: 'en-GB-Standard-F', name: 'Sarah (British)', gender: 'female', region: 'UK', language: 'en', quality: 'high' },
    { id: 'en-AU-Standard-B', name: 'Taylor (Australian)', gender: 'male', region: 'AU', language: 'en', quality: 'high' },
    { id: 'en-IN-Standard-B', name: 'Rohan (Indian English)', gender: 'male', region: 'IN', language: 'en', quality: 'high' }
];

/**
 * Send text to VBee TTS API (async - VBee will POST audio to callback_url)
 * @param {string} text - Text to convert (max 5000 characters)
 * @param {string} voice - Voice identifier
 * @param {number} speed - Speed adjustment (0.8 to 1.5, default 1.0)
 * @param {string} callbackUrl - URL VBee will POST the audio result to
 * @returns {Promise<{request_id: string}>} - VBee request ID
 */
async function requestTTS(text, voice = 'hn_female_thutrang_full_48k-fhg', speed = 1.0, callbackUrl = null) {
    const VBEE_API_KEY = getApiKey();
    const VBEE_APP_ID = getAppId();
    if (!VBEE_API_KEY) {
        throw new Error('VBEE_API_KEY is not configured');
    }

    if (text.length > 5000) {
        throw new Error('Text must not exceed 5000 characters');
    }

    if (text.trim().length < 3) {
        throw new Error('Text must have at least 3 characters');
    }

    const effectiveCallback = callbackUrl || process.env.VBEE_CALLBACK_URL;
    if (!effectiveCallback) {
        throw new Error('VBEE_CALLBACK_URL is not configured');
    }

    Logger.info(`VBee TTS: Sending request - voice=${voice}, speed=${speed}, textLength=${text.length}, callback=${effectiveCallback}`);

    try {
        const response = await axios.post(VBEE_API_URL, {
            app_id: VBEE_APP_ID,
            input_text: text,
            voice_code: voice,
            callback_url: effectiveCallback
        }, {
            headers: {
                'Authorization': `Bearer ${VBEE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        Logger.info(`VBee TTS: Response - ${JSON.stringify(response.data)}`);

        // VBee success: status=1 or code=0
        const isSuccess = response.data?.status === 1 || response.data?.code === 0;
        if (!isSuccess) {
            throw new Error(`VBee TTS Error: ${response.data?.error_message || response.data?.message || 'Unknown error'}`);
        }

        const requestId = response.data?.data?.request_id || response.data?.request_id || response.data?.data?.id;
        Logger.info(`VBee TTS: ✓ Request accepted. request_id=${requestId}`);

        return { request_id: requestId };

    } catch (error) {
        if (error.response) {
            Logger.error(`VBee TTS: API Error - Status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
            throw new Error(`VBee TTS API Error: ${error.response.data?.error_message || error.response.data?.message || error.message}`);
        }
        throw error;
    }
}


/**
 * Download audio from VBee URL
 * @param {string} audioUrl - VBee audio URL
 * @returns {Promise<Buffer>} - Audio buffer (mp3)
 */
async function downloadAudio(audioUrl) {
    try {
        Logger.info(`VBee TTS: Downloading audio from ${audioUrl}`);
        
        const response = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        if (response.status === 200 && response.data.byteLength > 1000) {
            Logger.info(`VBee TTS: ✓ Audio downloaded successfully. Size: ${response.data.byteLength} bytes`);
            return Buffer.from(response.data);
        }

        throw new Error('VBee TTS: Invalid audio file');

    } catch (error) {
        Logger.error(`VBee TTS: Download error - ${error.message}`);
        throw new Error(`VBee TTS: Failed to download audio - ${error.message}`);
    }
}

/**
 * Get the default voice for a given region
 * @param {string} region - Site region ('Bac', 'Trung', 'Nam')
 * @returns {string} - Voice identifier
 */
function getVoiceForRegion(region) {
    return REGION_VOICE_MAP[region] || 'hn_female_thutrang_full_48k-fhg';
}

/**
 * Complete TTS generation: request + download
 * @param {string} text - Text to convert
 * @param {string} voice - Voice identifier
 * @param {number} speed - Speed 0.8-1.5
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function generateTTS(text, voice = 'hn_female_thutrang_full_48k-fhg', speed = 1.0) {
    const audioUrl = await requestTTS(text, voice, speed);
    const audioBuffer = await downloadAudio(audioUrl);
    return audioBuffer;
}

let dynamicVoices = [];
let isVoicesLoaded = false;

async function getAvailableVoicesAsync() {
    if (isVoicesLoaded && dynamicVoices.length > 0) return dynamicVoices;
    try {
        const apiKey = getApiKey();
        if (!apiKey) return AVAILABLE_VOICES;

        const response = await axios.get('https://vbee.vn/api/v1/voices', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        const rawVoices = response.data.result?.voices || [];
        dynamicVoices = rawVoices
            .filter(v => v.active !== false)
            .map(v => {
                let language = 'unknown';
                if (v.language_code) language = v.language_code.split('-')[0];
                else if (v.language && v.language.code) language = v.language.code.split('-')[0];
                
                let region = 'unknown';
                if (v.locale) {
                    const loc = v.locale.toLowerCase();
                    if (loc.includes('northern')) region = 'Bắc';
                    else if (loc.includes('central')) region = 'Trung';
                    else if (loc.includes('southern')) region = 'Nam';
                    else region = loc;
                }
                
                return {
                    id: v.code, // VBee TTS endpoints require 'code'
                    name: v.name,
                    gender: v.gender,
                    region,
                    language,
                    quality: v.level ? v.level.toLowerCase() : 'standard',
                    demo: v.demo || null
                };
            });
            
        isVoicesLoaded = true;
        Logger.info(`Successfully fetched ${dynamicVoices.length} voices from VBee API.`);
        return dynamicVoices;
    } catch (error) {
        Logger.error('Failed to load VBee voices dynamically', error);
        return AVAILABLE_VOICES;
    }
}

module.exports = {
    VBEE_API_URL,
    get VBEE_API_KEY() { return getApiKey(); },  // lazy getter
    REGION_VOICE_MAP,
    AVAILABLE_VOICES,
    VOICES: AVAILABLE_VOICES, // Alias for controller
    requestTTS,
    downloadAudio,
    getVoiceForRegion,
    generateTTS,
    getAvailableVoicesAsync
};
