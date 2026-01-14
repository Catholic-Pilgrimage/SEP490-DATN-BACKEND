const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const AdminValidator = require('../validators/admin.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

// Apply middlewares
router.use(i18nMiddleware);
router.use(authMiddleware);
router.use(authMiddleware.authorize('admin'));

// Routes
router.get('/users', AdminValidator.getUsers, AdminController.getUsers);
router.get('/users/:id', AdminValidator.validateUserId, AdminController.getUserById);
router.put('/users/:id', AdminValidator.updateUser, AdminController.updateUser);
router.patch('/users/:id/status', AdminValidator.updateUserStatus, AdminController.updateUserStatus);

module.exports = router;
