const express = require('express');
const router = express.Router();
const CheckinController = require('../controllers/CheckinController');
const authMiddleware = require('../middlewares/auth.middleware');

router.get(
    '/me',
    authMiddleware,
    CheckinController.getUserCheckins
);

module.exports = router;