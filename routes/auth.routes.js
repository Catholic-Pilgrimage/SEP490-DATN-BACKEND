const express = require('express');
const router = express.Router();
const AuthValidator = require('../validators/auth.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const { upload } = require('../config/cloudinary.config');
const i18nMiddleware = require('../middlewares/i18n.middleware');


router.use(i18nMiddleware);

const AuthController = require('../controllers/shared/AuthController');

// Routes
router.post('/register', AuthValidator.register, AuthController.register);
router.post('/login', AuthValidator.login, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', AuthValidator.forgotPassword, AuthController.forgotPassword);
router.post('/reset-password', AuthValidator.resetPassword, AuthController.resetPassword);
router.get('/profile', authMiddleware, AuthController.getProfile);
router.put('/profile', authMiddleware, upload.single('avatar'), AuthValidator.updateProfile, AuthController.updateProfile);
router.put('/change-password', authMiddleware, AuthValidator.changePassword, AuthController.changePassword);
router.post('/logout', authMiddleware, AuthController.logout);

module.exports = router;
