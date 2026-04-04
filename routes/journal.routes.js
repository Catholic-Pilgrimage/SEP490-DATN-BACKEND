const express = require('express');
const router = express.Router();
const JournalController = require('../controllers/JournalController');
const JournalValidator = require('../validators/journal.validator');
const authenticate = require('../middlewares/auth.middleware');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary.config');

// Combined storage for journal uploads
const journalStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async(req, file) => {
        // Determine folder and settings based on field name
        if (file.fieldname === 'images') {
            return {
                folder: 'catholic_pilgrimage/journals/images',
                allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
                transformation: [{ width: 2000, height: 2000, crop: 'limit' }]
            };
        } else if (file.fieldname === 'audio') {
            return {
                folder: 'catholic_pilgrimage/journals/audio',
                resource_type: 'video' // Cloudinary uses 'video' for audio files
            };
        } else if (file.fieldname === 'video') {
            return {
                folder: 'catholic_pilgrimage/journals/videos',
                resource_type: 'video'
            };
        }
    }
});

const uploadJournal = multer({
    storage: journalStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
}).fields([
    { name: 'images', maxCount: 10 },
    { name: 'audio', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]);

router.post(
    '/',
    authenticate,
    uploadJournal,
    JournalValidator.createJournal,
    JournalController.createJournal
);

router.get(
    '/me',
    authenticate,
    JournalValidator.getUserJournals,
    JournalController.getUserJournals
);

router.get(
    '/public',
    JournalValidator.getPublicJournals,
    JournalController.getPublicJournals
);

router.get(
    '/:id',
    authenticate.optional,
    JournalController.getJournalById
);

router.post(
    '/:id/share',
    authenticate,
    JournalController.shareToPost
);

router.patch(
    '/:id',
    authenticate,
    uploadJournal,
    JournalValidator.updateJournal,
    JournalController.updateJournal
);

router.delete(
    '/:id',
    authenticate,
    JournalController.deleteJournal
);

module.exports = router;
