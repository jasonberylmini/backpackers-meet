import express from 'express';
import {
  getAllUsers,
  toggleBanUser,
  getAllTrips, getReports, getAdminLogs, deleteTrip, getFlagsForTarget, getAllFlags, getNotificationCount, incrementNotificationCount, dismissFlag, resolveFlag
} from '../controllers/adminController.js';
import verifyToken from '../middlewares/authMiddleware.js';
import isAdmin from '../middlewares/isAdmin.js';
import { verifyUser, setUserStatus } from '../controllers/userController.js';

const router = express.Router();

// Basic token auth for now — later you can add role check
router.get('/users', verifyToken, isAdmin, getAllUsers);
router.put('/ban/:id', verifyToken, isAdmin, toggleBanUser);
router.get('/trips', verifyToken, isAdmin, getAllTrips);

// 🔒 Protected for admin
router.get('/reports', verifyToken, isAdmin, getReports);
router.get('/logs', verifyToken, isAdmin, getAdminLogs);
router.get('/flags/:flagType/:targetId', verifyToken, getFlagsForTarget);
router.get('/all-flags', verifyToken, getAllFlags);
router.get('/notification-count/:flagType/:targetId', verifyToken, getNotificationCount);
router.post('/notification-count/:flagType/:targetId', verifyToken, incrementNotificationCount);
router.patch('/flags/:flagId/dismiss', verifyToken, dismissFlag);
router.patch('/flags/:flagId/resolve', verifyToken, resolveFlag);
router.patch('/users/:id/status', verifyToken, isAdmin, setUserStatus);

router.put('/verify/:id', verifyToken, isAdmin, verifyUser);

router.delete('/trips/:id', verifyToken, isAdmin, deleteTrip);

export default router;
