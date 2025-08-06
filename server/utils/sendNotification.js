import Notification from '../models/Notification.js';
import nodemailer from 'nodemailer';
import { emitToUser } from './socketManager.js';
// import your SMS provider if needed

export async function sendNotification({
  user,
  type = 'info',
  title = '',
  message = '',
  data = {},
  relatedFlag = null,
  relatedTrip = null,
  relatedReview = null,
  sentBy = null
}) {
  try {
    // 1. Always create in-app notification
    const notification = await Notification.create({
      user: user._id,
      type,
      title,
      message,
      data,
      relatedFlag,
      relatedTrip,
      relatedReview,
      sentBy,
      deliveryMethod: 'in-app'
    });

    // 2. Emit real-time notification to user
    emitToUser(user._id, 'newNotification', notification);

    // 3. Email notification
    if (user.notificationPrefs?.email) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        await transporter.sendMail({
          to: user.email,
          from: process.env.EMAIL_USER,
          subject: title || 'Notification from RideTribe',
          text: message
        });
      } catch (err) {
        console.error('Failed to send notification email:', err);
      }
    }

    // 4. SMS notification (placeholder)
    if (user.notificationPrefs?.sms) {
      // TODO: Integrate with SMS provider (e.g., Twilio)
      // Example:
      // await smsProvider.send({ to: user.phone, message });
      console.log(`(SMS to ${user.phone}): ${message}`);
    }

    return notification;
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
} 