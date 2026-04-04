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
        allowed_formats: ['mp3', 'wav', 'm4a', 'aac', 'ogg'],
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

// Post media storage
const postMediaStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        if (file.fieldname === 'video') {
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
    const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const videoMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

    if (file.fieldname === 'images') {
        if (imageMimeTypes.includes(file.mimetype)) {
            return cb(null, true);
        }

        return cb(new Error('Invalid image format. Allowed: jpg, png, jpeg, webp'), false);
    }

    if (file.fieldname === 'video') {
        if (videoMimeTypes.includes(file.mimetype)) {
            return cb(null, true);
        }

        return cb(new Error('Invalid video format. Allowed: mp4, mov, avi, webm'), false);
    }

    return cb(new Error('Invalid upload field for post media'), false);
};

// Post media upload (max 10 images and 1 video)
const uploadPostMedia = multer({
    storage: postMediaStorage,
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: postMediaFileFilter
}).fields([
    { name: 'images', maxCount: 10 },
    { name: 'video', maxCount: 1 }
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
