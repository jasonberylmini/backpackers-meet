import express from 'express';
import { createPost, editPost, deletePost, getAllPosts, getUserPosts, getFeed, likePost, addComment, getComments, editComment, deleteComment, reportPost, reportComment } from '../controllers/postController.js';
import verifyToken from '../middlewares/authMiddleware.js';
import { moderateBodyField } from '../middlewares/moderation.js';

const router = express.Router();

router.post('/', verifyToken, moderateBodyField('content'), createPost);
router.put('/:postId', verifyToken, moderateBodyField('content'), editPost);
router.delete('/:postId', verifyToken, deletePost);
router.get('/', verifyToken, getAllPosts);
router.get('/feed', verifyToken, getFeed);
router.get('/user/:userId', verifyToken, getUserPosts);
router.post('/:postId/like', verifyToken, likePost);
router.post('/:postId/comments', verifyToken, moderateBodyField('content'), addComment);
router.get('/:postId/comments', verifyToken, getComments);
router.put('/comments/:commentId', verifyToken, moderateBodyField('content'), editComment);
router.delete('/comments/:commentId', verifyToken, deleteComment);
router.post('/:postId/report', verifyToken, reportPost);
router.post('/comments/:commentId/report', verifyToken, reportComment);

export default router; 