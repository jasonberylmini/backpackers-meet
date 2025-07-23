import Notification from '../models/Notification.js';
import nodemailer from 'nodemailer';
// import your SMS provider if needed

export async function sendNotification({
  user,
  type = 'info',
  title = '',
  message = '',
  relatedFlag = null,
  relatedTrip = null,
  relatedReview = null,
  sentBy = null
}) {
  // 1. Always create in-app notification
  await Notification.create({
    user: user._id,
    type,
    title,
    message,
    relatedFlag,
    relatedTrip,
    relatedReview,
    sentBy,
    deliveryMethod: 'in-app'
  });

  // 2. Email notification
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
        subject: title || 'Notification from Backpacker',
        text: message
      });
    } catch (err) {
      console.error('Failed to send notification email:', err);
    }
  }

  // 3. SMS notification (placeholder)
  if (user.notificationPrefs?.sms) {
    // TODO: Integrate with SMS provider (e.g., Twilio)
    // Example:
    // await smsProvider.send({ to: user.phone, message });
    console.log(`(SMS to ${user.phone}): ${message}`);
  }
} 