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

// Media storage (for site gallery: images, videos, panoramas)
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

const upload = multer({ storage: imageStorage });
const uploadDocument = multer({ storage: documentStorage });
const uploadMedia = multer({
    storage: mediaStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for videos
});

module.exports = {
    cloudinary,
    upload,
    uploadDocument,
    uploadMedia
};
