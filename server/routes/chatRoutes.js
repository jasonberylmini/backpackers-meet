import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  createPersonalChat,
  getTripChat,
  getUserChats,
  sendMessage,
  getChatMessages,
  markMessagesAsRead,
  editMessage,
  deleteMessage,
  addMessageReaction,
  deleteChat
} from '../controllers/chatController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and text files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and text files are allowed.'), false);
    }
  }
});

// File upload route
router.post('/upload/files', verifyToken, upload.array('files', 5), (req, res) => {
  try {
    const files = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      type: file.mimetype,
      originalname: file.originalname,
      size: file.size
    }));

    res.status(200).json({
      message: 'Files uploaded successfully',
      files: files
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error uploading files',
      error: error.message
    });
  }
});

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
router.post('/messages/:messageId/reactions', verifyToken, addMessageReaction);

// Chat management
router.delete('/:chatId', verifyToken, deleteChat);

export default router;
