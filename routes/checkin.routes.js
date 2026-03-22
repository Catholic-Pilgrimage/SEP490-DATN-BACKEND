const express = require('express');
const router = express.Router();
const CheckinController = require('../controllers/CheckinController');
const CheckinValidator = require('../validators/checkin.validator');
const authMiddleware = require('../middlewares/auth.middleware');

router.post(
    '/:id/checkin',
    authMiddleware,
    CheckinValidator.checkin,
    CheckinController.checkin
);

router.patch(
    '/:id/status',
    authMiddleware,
    CheckinController.updateItemStatus
);

module.exports = router;