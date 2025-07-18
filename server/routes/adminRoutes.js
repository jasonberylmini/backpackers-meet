import express from 'express';
import {
  getAllUsers,
  toggleBanUser,
  getAllTrips, getReports, getAdminLogs, deleteTrip
} from '../controllers/adminController.js';
import verifyToken from '../middlewares/authMiddleware.js';
import isAdmin from '../middlewares/isAdmin.js';
import { verifyUser } from '../controllers/userController.js';

const router = express.Router();

// Basic token auth for now — later you can add role check
router.get('/users', verifyToken, isAdmin, getAllUsers);
router.put('/ban/:id', verifyToken, isAdmin, toggleBanUser);
router.get('/trips', verifyToken, isAdmin, getAllTrips);

// 🔒 Protected for admin
router.get('/reports', verifyToken, isAdmin, getReports);
router.get('/logs', verifyToken, isAdmin, getAdminLogs);

router.post('/verify/:id', verifyToken, isAdmin, verifyUser);

router.delete('/trips/:id', verifyToken, isAdmin, deleteTrip);

export default router;
