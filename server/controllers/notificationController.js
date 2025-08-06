import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { sendNotification } from '../utils/sendNotification.js';
import { emitToUser } from '../utils/socketManager.js';
import winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// Get user's notifications with pagination and filters
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, read, type } = req.query;
    
    const filter = { user: userId };
    if (read !== undefined) filter.read = read === 'true';
    if (type) filter.type = type;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const notifications = await Notification.find(filter)
      .populate('sentBy', 'name email username')
      .populate('relatedTrip', 'destination startDate endDate')
      .populate('data.tripId', 'destination startDate endDate')
      .populate('relatedReview', 'feedback')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ user: userId, read: false });
    
    // Return notifications in the format expected by frontend
    res.status(200).json(notifications);
  } catch (err) {
    logger.error('Get User Notifications Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true, updatedAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    
    // Emit real-time update
    emitToUser(userId, 'notificationUpdated', notification);
    
    res.status(200).json({
      message: 'Notification marked as read.',
      notification
    });
  } catch (err) {
    logger.error('Mark Notification Read Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await Notification.updateMany(
      { user: userId, read: false },
      { read: true, updatedAt: new Date() }
    );
    
    res.status(200).json({
      message: 'All notifications marked as read.',
      updatedCount: result.modifiedCount
    });
  } catch (err) {
    logger.error('Mark All Notifications Read Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a notification
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;
    
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }
    
    res.status(200).json({
      message: 'Notification deleted successfully.'
    });
  } catch (err) {
    logger.error('Delete Notification Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete all read notifications
export const deleteAllReadNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await Notification.deleteMany({
      user: userId,
      read: true
    });
    
    res.status(200).json({
      message: 'All read notifications deleted.',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    logger.error('Delete All Read Notifications Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { inApp, email, sms } = req.body;
    
    const updateData = {};
    if (inApp !== undefined) updateData['notificationPrefs.inApp'] = inApp;
    if (email !== undefined) updateData['notificationPrefs.email'] = email;
    if (sms !== undefined) updateData['notificationPrefs.sms'] = sms;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    res.status(200).json({
      message: 'Notification preferences updated.',
      preferences: user.notificationPrefs
    });
  } catch (err) {
    logger.error('Update Notification Preferences Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get notification preferences
export const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId).select('notificationPrefs');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    res.status(200).json({
      preferences: user.notificationPrefs
    });
  } catch (err) {
    logger.error('Get Notification Preferences Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Send notification to user
export const sendNotificationToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, title, message, deliveryMethod = 'in-app' } = req.body;
    const adminId = req.user.userId;
    
    if (!type || !title || !message) {
      return res.status(400).json({ message: 'Type, title, and message are required.' });
    }
    
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found.' });
    }
    
    // Create notification record
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      deliveryMethod,
      sentBy: adminId
    });
    
    await notification.save();
    
    // Send notification based on user preferences
    await sendNotification(targetUser, notification);
    
    res.status(201).json({
      message: 'Notification sent successfully.',
      notification: {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        deliveryMethod: notification.deliveryMethod,
        createdAt: notification.createdAt
      }
    });
  } catch (err) {
    logger.error('Send Notification Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Send notification to all users
export const sendNotificationToAllUsers = async (req, res) => {
  try {
    const { type, title, message, deliveryMethod = 'in-app' } = req.body;
    const adminId = req.user.userId;
    
    if (!type || !title || !message) {
      return res.status(400).json({ message: 'Type, title, and message are required.' });
    }
    
    // Get all active users
    const users = await User.find({ accountStatus: 'active' });
    
    const notifications = [];
    const batchId = `batch_${Date.now()}`;
    
    // Create notifications for all users
    for (const user of users) {
      const notification = new Notification({
        user: user._id,
        type,
        title,
        message,
        deliveryMethod,
        sentBy: adminId,
        batchId
      });
      
      await notification.save();
      notifications.push(notification);
      
      // Send notification based on user preferences
      await sendNotification(user, notification);
    }
    
    res.status(201).json({
      message: `Notification sent to ${users.length} users successfully.`,
      sentCount: users.length,
      batchId
    });
  } catch (err) {
    logger.error('Send Notification to All Users Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}; 