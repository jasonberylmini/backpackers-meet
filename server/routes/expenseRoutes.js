import express from 'express';
import {
  createExpense,
  getTripExpenses,
  getExpenseSummary,
  markShareAsPaid,
  updateExpense,
  deleteExpense,
  getUserExpenses,
  getExpenseSettlements
} from '../controllers/expenseController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

// Expense management
router.post('/', verifyToken, createExpense);
router.post('/create', verifyToken, createExpense); // Alias for frontend compatibility
router.get('/my-expenses', verifyToken, getUserExpenses); // Get user's expenses across all trips
router.get('/trip/:groupId', verifyToken, getTripExpenses);
router.get('/trip/:groupId/summary', verifyToken, getExpenseSummary);
router.get('/:expenseId/settlements', verifyToken, getExpenseSettlements);
router.patch('/:expenseId/share-paid', verifyToken, markShareAsPaid);
router.put('/:expenseId', verifyToken, updateExpense);
router.delete('/:expenseId', verifyToken, deleteExpense);

export default router;
