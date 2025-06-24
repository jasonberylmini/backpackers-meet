import express from 'express';
import { addExpense, getGroupExpenses } from '../controllers/expenseController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/add', authMiddleware, addExpense);
router.get('/:groupId', authMiddleware, getGroupExpenses);

export default router;
