const express = require('express');
const router = express.Router();
const PostController = require('../controllers/PostController');
const postValidator = require('../validators/post.validator');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');
const { uploadPostImages } = require('../config/cloudinary.config');

// Swagger documentation is in config/swagger/apis/shared/post.api.js

router.post('/',
    authenticate,
    uploadPostImages,
    postValidator.createPost,
    validate,
    PostController.createPost
);

router.get('/',
    authenticate,
    postValidator.getPosts,
    validate,
    PostController.getPosts
);

router.get('/:id',
    authenticate,
    postValidator.postId,
    validate,
    PostController.getPostById
);

router.put('/:id',
    authenticate,
    uploadPostImages,
    postValidator.updatePost,
    validate,
    PostController.updatePost
);

router.delete('/:id',
    authenticate,
    postValidator.postId,
    validate,
    PostController.deletePost
);

router.post('/:id/like',
    authenticate,
    postValidator.postId,
    validate,
    PostController.likePost
);

router.delete('/:id/like',
    authenticate,
    postValidator.postId,
    validate,
    PostController.unlikePost
);

router.post('/:id/comments',
    authenticate,
    postValidator.createComment,
    validate,
    PostController.addComment
);

router.post('/:id/comments/:commentId/reply',
    authenticate,
    postValidator.replyComment,
    validate,
    PostController.replyComment
);

router.get('/:id/comments',
    authenticate,
    postValidator.getComments,
    validate,
    PostController.getComments
);

router.put('/:id/comments/:commentId',
    authenticate,
    postValidator.updateComment,
    validate,
    PostController.updateComment
);

router.delete('/:id/comments/:commentId',
    authenticate,
    postValidator.commentId,
    validate,
    PostController.deleteComment
);

module.exports = router;
