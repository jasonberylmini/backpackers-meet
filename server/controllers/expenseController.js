import Expense from '../models/Expense.js';

export const addExpense = async (req, res) => {
  try {
    const { groupId, amount, description } = req.body;

    const newExpense = new Expense({
      groupId,
      contributorId: req.user.userId,
      amount,
      description,
    });

    await newExpense.save();
    res.status(201).json({ message: 'Expense added!', expense: newExpense });
  } catch (err) {
    console.error('❌ Expense Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;

    const expenses = await Expense.find({ groupId }).populate('contributorId', 'name email');
    res.status(200).json(expenses);
  } catch (err) {
    console.error('❌ Fetch Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
