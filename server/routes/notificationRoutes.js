import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllReadNotifications,
  updateNotificationPreferences,
  getNotificationPreferences,
  sendNotificationToUser,
  sendNotificationToAllUsers
} from '../controllers/notificationController.js';
import verifyToken from '../middlewares/authMiddleware.js';
import isAdmin from '../middlewares/isAdmin.js';

const router = express.Router();

// User notification routes
router.get('/', verifyToken, getUserNotifications);
router.patch('/:notificationId/read', verifyToken, markNotificationAsRead);
router.patch('/read-all', verifyToken, markAllNotificationsAsRead);
router.delete('/:notificationId', verifyToken, deleteNotification);
router.delete('/read/all', verifyToken, deleteAllReadNotifications);

// Notification preferences
router.get('/preferences', verifyToken, getNotificationPreferences);
router.put('/preferences', verifyToken, updateNotificationPreferences);

// Admin notification routes
router.post('/send/:userId', verifyToken, isAdmin, sendNotificationToUser);
router.post('/send-all', verifyToken, isAdmin, sendNotificationToAllUsers);

export default router; 