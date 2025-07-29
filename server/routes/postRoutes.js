import express from 'express';
import { createPost, editPost, deletePost, getAllPosts, getUserPosts, likePost, addComment, getComments, editComment, deleteComment, reportPost } from '../controllers/postController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, createPost);
router.put('/:postId', verifyToken, editPost);
router.delete('/:postId', verifyToken, deletePost);
router.get('/', verifyToken, getAllPosts);
router.get('/user/:userId', verifyToken, getUserPosts);
router.post('/:postId/like', verifyToken, likePost);
router.post('/:postId/comments', verifyToken, addComment);
router.get('/:postId/comments', verifyToken, getComments);
router.put('/comments/:commentId', verifyToken, editComment);
router.delete('/comments/:commentId', verifyToken, deleteComment);
router.post('/:postId/report', verifyToken, reportPost);

export default router; 