const express = require('express');
const router = express.Router();
const ManagerReviewController = require('../controllers/manager/ReviewController');
const authMiddleware = require('../middlewares/auth.middleware');

// GET /api/manager/reviews - Get all reviews for my site
router.get(
    '/',
    authMiddleware,
    authMiddleware.authorize('manager'),
    ManagerReviewController.getReviewsForMySite
);

module.exports = router;
