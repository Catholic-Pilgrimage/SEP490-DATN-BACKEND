const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Image storage (for cover_image, avatar, etc.)
const imageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'catholic_pilgrimage/images',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

// Document storage (for PDF, certificates, etc.)
const documentStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'catholic_pilgrimage/documents',
        allowed_formats: ['pdf', 'jpg', 'png', 'jpeg', 'webp'],
        resource_type: 'auto'
    }
});

// Media storage (for site gallery: images and videos only)
const mediaStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Determine resource type based on file mimetype
        const isVideo = file.mimetype.startsWith('video/');
        return {
            folder: 'catholic_pilgrimage/site_media',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'mp4', 'mov', 'avi'],
            resource_type: isVideo ? 'video' : 'image',
            transformation: isVideo ? [] : [{ width: 2000, height: 2000, crop: 'limit' }]
        };
    }
});

// Journal image storage
const journalImageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'catholic_pilgrimage/journals/images',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 2000, height: 2000, crop: 'limit' }]
    }
});

// Journal audio storage
const journalAudioStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'catholic_pilgrimage/journals/audio',
        allowed_formats: ['mp3', 'wav', 'm4a', 'mp4', 'aac', 'ogg'],
        resource_type: 'video' // Cloudinary uses 'video' for audio files
    }
});

// Journal video storage
const journalVideoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'catholic_pilgrimage/journals/videos',
        allowed_formats: ['mp4', 'mov', 'avi', 'webm'],
        resource_type: 'video'
    }
});

// Check-in photo storage
const checkinPhotoStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'catholic_pilgrimage/checkins',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }]
    }
});

const createUploadValidationError = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
};

const postMediaFieldTypes = {
    images: 'image',
    image_urls: 'image',
    audio: 'audio',
    audio_url: 'audio',
    video: 'video',
    video_url: 'video'
};

const postMediaCanonicalFields = {
    image: 'images',
    audio: 'audio',
    video: 'video'
};

const resolvePostMediaFieldType = (fieldname) => postMediaFieldTypes[fieldname] || null;

const getNormalizedFileExtension = (file = {}) => {
    const extension = path.extname(String(file.originalname || '')).toLowerCase().replace('.', '');
    return extension || null;
};

const postMediaMimeTypes = {
    image: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
    audio: new Set([
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/aac',
        'audio/x-aac',
        'audio/ogg',
        'audio/mp4',
        'audio/m4a',
        'audio/x-m4a',
        'audio/mp4a-latm'
    ]),
    video: new Set(['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'])
};

const postMediaFileExtensions = {
    image: new Set(['jpg', 'jpeg', 'png', 'webp']),
    audio: new Set(['mp3', 'wav', 'm4a', 'mp4', 'aac', 'ogg']),
    video: new Set(['mp4', 'mov', 'avi', 'webm'])
};

const postMediaInferenceExtensions = {
    image: postMediaFileExtensions.image,
    audio: new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg']),
    video: new Set(['mov', 'avi', 'webm'])
};

const inferPostMediaType = (file = {}) => {
    const mimeType = String(file.mimetype || '').toLowerCase();
    const extension = getNormalizedFileExtension(file);

    if (mimeType.startsWith('audio/')) {
        return 'audio';
    }

    if (mimeType.startsWith('video/')) {
        return 'video';
    }

    if (mimeType.startsWith('image/')) {
        return 'image';
    }

    if (postMediaInferenceExtensions.audio.has(extension)) {
        return 'audio';
    }

    if (postMediaInferenceExtensions.video.has(extension)) {
        return 'video';
    }

    if (postMediaInferenceExtensions.image.has(extension)) {
        return 'image';
    }

    return null;
};

const resolvePostMediaStorageType = (file = {}) => {
    const declaredFieldType = resolvePostMediaFieldType(file.fieldname);
    return declaredFieldType || inferPostMediaType(file) || 'image';
};

const isAllowedPostMediaFile = (mediaType, file = {}) => {
    const mimeType = String(file.mimetype || '').toLowerCase();
    const extension = getNormalizedFileExtension(file);

    if (mediaType === 'audio') {
        return (
            mimeType.startsWith('audio/') ||
            postMediaMimeTypes.audio.has(mimeType) ||
            (mimeType === 'video/mp4' && postMediaFileExtensions.audio.has(extension)) ||
            postMediaFileExtensions.audio.has(extension)
        );
    }

    if (mediaType === 'video') {
        return postMediaMimeTypes.video.has(mimeType) || postMediaFileExtensions.video.has(extension);
    }

    if (mediaType === 'image') {
        return postMediaMimeTypes.image.has(mimeType) || postMediaFileExtensions.image.has(extension);
    }

    return false;
};

const createPostMediaFieldMismatchError = (mediaType) => {
    if (mediaType === 'image') {
        return createUploadValidationError(`Image files must use the \`${postMediaCanonicalFields.image}\` field`);
    }

    if (mediaType === 'audio') {
        return createUploadValidationError(`Audio files must use the \`${postMediaCanonicalFields.audio}\` field`);
    }

    if (mediaType === 'video') {
        return createUploadValidationError(`Video files must use the \`${postMediaCanonicalFields.video}\` field`);
    }

    return createUploadValidationError('Invalid upload field for post media');
};

const getPostMediaStorageParams = (mediaType) => {
    if (mediaType === 'audio') {
        return {
            folder: 'catholic_pilgrimage/posts/audio',
            allowed_formats: ['mp3', 'wav', 'm4a', 'mp4', 'aac', 'ogg'],
            resource_type: 'video'
        };
    }

    if (mediaType === 'video') {
        return {
            folder: 'catholic_pilgrimage/posts/videos',
            allowed_formats: ['mp4', 'mov', 'avi', 'webm'],
            resource_type: 'video'
        };
    }

    return {
        folder: 'catholic_pilgrimage/posts/images',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }]
    };
};

// Post media storage
const postMediaStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const mediaType = resolvePostMediaStorageType(file);
        return getPostMediaStorageParams(mediaType);
    }
});

const upload = multer({ storage: imageStorage });
const uploadDocument = multer({ storage: documentStorage });
const uploadMedia = multer({
    storage: mediaStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for videos
});

// Journal-specific uploads
const uploadJournalImages = multer({
    storage: journalImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB per image
});

const uploadJournalAudio = multer({
    storage: journalAudioStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for audio
});

const uploadJournalVideo = multer({
    storage: journalVideoStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for video
});

const checkinPhotoFileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    if (file.fieldname !== 'photo') {
        return cb(new Error('Invalid upload field for check-in photo'), false);
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error('Invalid image format. Allowed: jpg, png, jpeg, webp'), false);
    }

    return cb(null, true);
};

const uploadCheckinPhoto = multer({
    storage: checkinPhotoStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: checkinPhotoFileFilter
});

const postMediaFileFilter = (req, file, cb) => {
    const declaredFieldType = resolvePostMediaFieldType(file.fieldname);
    const detectedMediaType = inferPostMediaType(file);

    if (declaredFieldType === 'image') {
        if (detectedMediaType && detectedMediaType !== 'image') {
            return cb(createPostMediaFieldMismatchError(detectedMediaType), false);
        }

        if (isAllowedPostMediaFile('image', file)) {
            return cb(null, true);
        }

        return cb(createUploadValidationError('Invalid image format. Allowed: jpg, png, jpeg, webp'), false);
    }

    if (declaredFieldType === 'video') {
        if (detectedMediaType && detectedMediaType !== 'video') {
            return cb(createPostMediaFieldMismatchError(detectedMediaType), false);
        }

        if (isAllowedPostMediaFile('video', file)) {
            return cb(null, true);
        }

        return cb(createUploadValidationError('Invalid video format. Allowed: mp4, mov, avi, webm'), false);
    }

    if (declaredFieldType === 'audio') {
        if (detectedMediaType && detectedMediaType !== 'audio') {
            return cb(createPostMediaFieldMismatchError(detectedMediaType), false);
        }

        if (isAllowedPostMediaFile('audio', file)) {
            return cb(null, true);
        }

        return cb(createUploadValidationError('Invalid audio format. Allowed: mp3, wav, m4a, mp4, aac, ogg'), false);
    }

    return cb(createUploadValidationError('Invalid upload field for post media'), false);
};

// Post media upload (max 10 images, 1 audio, and 1 video)
const uploadPostMedia = multer({
    storage: postMediaStorage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: postMediaFileFilter
}).fields([
    { name: 'images', maxCount: 10 },
    { name: 'image_urls', maxCount: 10 },
    { name: 'audio', maxCount: 1 },
    { name: 'audio_url', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'video_url', maxCount: 1 }
]);

// Review image storage (max 5 images per review)
const reviewImageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'catholic_pilgrimage/reviews',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }]
    }
});

const uploadReviewImages = multer({
    storage: reviewImageStorage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB per image
}).array('images', 5); // Max 5 images per review

// Narrative audio storage (for 3D Model voiceover - uses memory storage for FPT AI pipeline)
const uploadNarrativeAudio = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/mp4', 'audio/aac', 'audio/ogg'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid audio format. Allowed: mp3, wav, m4a, aac, ogg'), false);
        }
    }
});

module.exports = {
    cloudinary,
    upload,
    uploadDocument,
    uploadMedia,
    uploadJournalImages,
    uploadJournalAudio,
    uploadJournalVideo,
    uploadCheckinPhoto,
    uploadPostMedia,
    uploadReviewImages,
    uploadNarrativeAudio
};
