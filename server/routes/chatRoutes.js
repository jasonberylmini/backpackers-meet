import express from 'express';
import {
  createPersonalChat,
  getTripChat,
  getUserChats,
  sendMessage,
  getChatMessages,
  markMessagesAsRead,
  editMessage,
  deleteMessage,
  deleteChat
} from '../controllers/chatController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

// Chat management
router.post('/personal', verifyToken, createPersonalChat);
router.get('/trip/:tripId', verifyToken, getTripChat);
router.get('/user-chats', verifyToken, getUserChats);

// Message management
router.post('/:chatId/messages', verifyToken, sendMessage);
router.get('/:chatId/messages', verifyToken, getChatMessages);
router.patch('/:chatId/messages/read', verifyToken, markMessagesAsRead);
router.patch('/messages/:messageId', verifyToken, editMessage);
router.delete('/messages/:messageId', verifyToken, deleteMessage);

// Chat management
router.delete('/:chatId', verifyToken, deleteChat);

export default router;
