const express = require('express');
const router = express.Router();
const { AdminUserController } = require('../controllers/admin');
const AdminValidator = require('../validators/admin.validator');
const authMiddleware = require('../middlewares/auth.middleware');
const i18nMiddleware = require('../middlewares/i18n.middleware');

// Apply middlewares
router.use(i18nMiddleware);
router.use(authMiddleware);
router.use(authMiddleware.authorize('admin'));

// Routes
router.get('/users', AdminValidator.getUsers, AdminUserController.getUsers);
router.get('/users/:id', AdminValidator.validateUserId, AdminUserController.getUserById);
router.put('/users/:id', AdminValidator.updateUser, AdminUserController.updateUser);
router.patch('/users/:id/status', AdminValidator.updateUserStatus, AdminUserController.updateUserStatus);

module.exports = router;
