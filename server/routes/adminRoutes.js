import express from 'express';
import {
  getAllUsers,
  toggleBanUser,
  bulkToggleBanUsers,
  bulkKYCVerification,
  getTripStats,
  getReportedTrips,
  bulkTripOperations,
  getUserStats,
  getReportedUsers,
  bulkUserOperations,
  getFlagStats,
  getAllFlags,
  bulkFlagOperations,
  getReviewStats,
  bulkReviewOperations,
  getAllTrips,
  getReports,
  getAdminLogs,
  getAdminLogsAnalytics,
  deleteTrip,
  getFlagsForTarget,
  getNotificationCount,
  incrementNotificationCount,
  dismissFlag,
  resolveFlag,
  approveReview,
  rejectReview,
  deleteReview,
  getStats
} from '../controllers/adminController.js';
import verifyToken from '../middlewares/authMiddleware.js';
import isAdmin from '../middlewares/isAdmin.js';
import { verifyUser, setUserStatus } from '../controllers/userController.js';

const router = express.Router();

// Dashboard statistics
router.get('/stats', verifyToken, isAdmin, getStats);
router.get('/flag-stats', verifyToken, isAdmin, getFlagStats);
router.get('/trip-stats', verifyToken, isAdmin, getTripStats);
router.get('/user-stats', verifyToken, isAdmin, getUserStats);
router.get('/review-stats', verifyToken, isAdmin, getReviewStats);

// Basic token auth for now — later you can add role check
router.get('/users', verifyToken, isAdmin, getAllUsers);
router.put('/ban/:id', verifyToken, isAdmin, toggleBanUser);
router.post('/bulk-ban', verifyToken, isAdmin, bulkToggleBanUsers);
router.post('/bulk-kyc', verifyToken, isAdmin, bulkKYCVerification);
router.post('/bulk-trips', verifyToken, isAdmin, bulkTripOperations);
router.post('/bulk-users', verifyToken, isAdmin, bulkUserOperations);
router.post('/bulk-flags', verifyToken, isAdmin, bulkFlagOperations);
router.post('/bulk-reviews', verifyToken, isAdmin, bulkReviewOperations);
router.get('/flags', verifyToken, isAdmin, getAllFlags);
router.get('/reported-trips', verifyToken, isAdmin, getReportedTrips);
router.get('/reported-users', verifyToken, isAdmin, getReportedUsers);
router.get('/trips', verifyToken, isAdmin, getAllTrips);

// 🔒 Protected for admin
router.get('/reports', verifyToken, isAdmin, getReports);
router.get('/logs', verifyToken, isAdmin, getAdminLogs);
router.get('/logs/analytics', verifyToken, isAdmin, getAdminLogsAnalytics);
router.get('/flags/:flagType/:targetId', verifyToken, getFlagsForTarget);
router.get('/all-flags', verifyToken, getAllFlags);
router.get('/notification-count/:flagType/:targetId', verifyToken, getNotificationCount);
router.post('/notification-count/:flagType/:targetId', verifyToken, incrementNotificationCount);
router.patch('/flags/:flagId/dismiss', verifyToken, dismissFlag);
router.patch('/flags/:flagId/resolve', verifyToken, resolveFlag);
router.patch('/users/:id/status', verifyToken, isAdmin, setUserStatus);

router.put('/verify/:id', verifyToken, isAdmin, verifyUser);

router.delete('/trips/:id', verifyToken, isAdmin, deleteTrip);

// Admin Review Moderation
router.put('/reviews/:reviewId/approve', verifyToken, isAdmin, approveReview);
router.put('/reviews/:reviewId/reject', verifyToken, isAdmin, rejectReview);
router.delete('/reviews/:reviewId', verifyToken, isAdmin, deleteReview);

export default router;
