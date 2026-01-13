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

const upload = multer({ storage: imageStorage });
const uploadDocument = multer({ storage: documentStorage });

module.exports = {
    cloudinary,
    upload,
    uploadDocument
};
