import express from 'express';
import {
  createExpense,
  getTripExpenses,
  getExpenseSummary,
  markShareAsPaid,
  updateExpense,
  deleteExpense
} from '../controllers/expenseController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

// Expense management
router.post('/', verifyToken, createExpense);
router.get('/trip/:groupId', verifyToken, getTripExpenses);
router.get('/trip/:groupId/summary', verifyToken, getExpenseSummary);
router.patch('/:expenseId/share-paid', verifyToken, markShareAsPaid);
router.put('/:expenseId', verifyToken, updateExpense);
router.delete('/:expenseId', verifyToken, deleteExpense);

export default router;
