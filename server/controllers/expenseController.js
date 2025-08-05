import Expense from '../models/Expense.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// Currency conversion rates (simplified - in production, use a real API)
const CURRENCY_RATES = {
  USD: 1,
  EUR: 1.08, // 1 EUR = 1.08 USD
  GBP: 1.27, // 1 GBP = 1.27 USD
  INR: 0.012, // 1 INR = 0.012 USD
  // Add more currencies as needed
};

// Helper function to convert currency to USD
const convertToUSD = (amount, currency) => {
  const rate = CURRENCY_RATES[currency] || 1;
  return amount * rate;
};

// Helper function to convert USD to target currency
const convertFromUSD = (usdAmount, targetCurrency) => {
  const rate = CURRENCY_RATES[targetCurrency] || 1;
  return usdAmount / rate;
};

// Create a new expense
export const createExpense = async (req, res) => {
  try {
    const { 
      groupId, 
      amount, 
      description, 
      category, 
      currency, 
      splitBetween, 
      location, 
      tags, 
      notes 
    } = req.body;
    const contributorId = req.user.userId;

    // Validate trip exists and user is a member
    const trip = await Trip.findById(groupId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const isMember = trip.creator.toString() === contributorId.toString() || 
                    trip.members.some(memberId => memberId.toString() === contributorId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this trip.' });
    }

    // Calculate shares
    const allMembers = [trip.creator, ...trip.members];
    const membersToSplit = splitBetween && splitBetween.length > 0 ? splitBetween : allMembers;
    
    // Handle manual splits if provided
    const { splitType = 'auto', manualSplits = {} } = req.body;
    
    let shares;
    if (splitType === 'manual' && manualSplits && Object.keys(manualSplits).length > 0) {
      shares = membersToSplit.map(userId => ({
        userId,
        amount: parseFloat(manualSplits[userId]) || 0,
        status: userId.toString() === contributorId.toString() ? 'paid' : 'pending'
      }));
    } else {
      const shareAmount = Math.round((amount / membersToSplit.length) * 100) / 100; // Round to 2 decimal places
      shares = membersToSplit.map(userId => ({
        userId,
        amount: shareAmount,
        status: userId.toString() === contributorId.toString() ? 'paid' : 'pending'
      }));
    }

    // Create expense
    const expense = new Expense({
      groupId,
      contributorId,
      amount,
      description,
      category,
      currency,
      splitBetween: membersToSplit,
      shares,
      splitType,
      location,
      tags,
      notes
    });

    await expense.save();

    // Create system message in trip chat
    const chat = await Chat.findOne({ type: 'group', tripId: groupId });
    if (chat) {
      const message = new Message({
        chatId: chat._id,
        tripId: groupId,
        sender: contributorId,
        text: `Added expense: ${description} - ${currency}${amount}`,
        type: 'expense',
        expense: {
          expenseId: expense._id,
          amount: expense.amount,
          description: expense.description
        }
      });
      await message.save();

      // Update expense with message reference
      expense.chatMessageId = message._id;
      await expense.save();
    }

    // Populate contributor info
    await expense.populate('contributorId', 'name email');

    res.status(201).json({
      message: 'Expense created successfully.',
      expense
    });
  } catch (err) {
    logger.error('Create Expense Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all expenses for a trip
export const getTripExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 20, category, status } = req.query;
    const currentUserId = req.user.userId;

    // Validate trip exists and user is a member
    const trip = await Trip.findById(groupId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const isMember = trip.creator.toString() === currentUserId.toString() || 
                    trip.members.some(memberId => memberId.toString() === currentUserId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this trip.' });
    }

    // Build filter
    const filter = { groupId };
    if (category) filter.category = category;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const expenses = await Expense.find(filter)
      .populate('contributorId', 'name email profileImage')
      .populate('splitBetween', 'name email')
      .populate('shares.userId', 'name email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Expense.countDocuments(filter);

    // Calculate summary with currency conversion
    const summary = await Expense.aggregate([
      { $match: { groupId: trip._id } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalExpenses: { $sum: 1 },
          byCategory: {
            $push: {
              category: '$category',
              amount: '$amount',
              currency: '$currency'
            }
          },
          currencies: { $addToSet: '$currency' }
        }
      }
    ]);

    // Convert all amounts to USD for accurate total calculation
    let totalAmountUSD = 0;
    let currencyBreakdown = {};
    
    if (summary[0]) {
      // Group expenses by currency for breakdown
      const expensesByCurrency = await Expense.aggregate([
        { $match: { groupId: trip._id } },
        {
          $group: {
            _id: '$currency',
            total: { $sum: '$amount' }
          }
        }
      ]);

      // Calculate total in USD and create currency breakdown
      expensesByCurrency.forEach(item => {
        const usdAmount = convertToUSD(item.total, item._id);
        totalAmountUSD += usdAmount;
        currencyBreakdown[item._id] = {
          amount: item.total,
          usdEquivalent: usdAmount
        };
      });
    }

    res.status(200).json({
      expenses,
      total,
      page: Number(page),
      limit: Number(limit),
      summary: {
        ...summary[0] || { totalAmount: 0, totalExpenses: 0, byCategory: [] },
        totalAmountUSD,
        currencyBreakdown
      }
    });
  } catch (err) {
    logger.error('Get Trip Expenses Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get expense summary and balances
export const getExpenseSummary = async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUserId = req.user.userId;

    // Validate trip exists and user is a member
    const trip = await Trip.findById(groupId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const isMember = trip.creator.toString() === currentUserId.toString() || 
                    trip.members.some(memberId => memberId.toString() === currentUserId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this trip.' });
    }

    const allMembers = [trip.creator, ...trip.members];
    const expenses = await Expense.find({ groupId }).populate('shares.userId', 'name email');

    // Calculate balances for each member
    const balances = {};
    allMembers.forEach(memberId => {
      balances[memberId.toString()] = {
        paid: 0,
        owes: 0,
        balance: 0
      };
    });

    // Calculate what each person paid and owes
    expenses.forEach(expense => {
      const contributorId = expense.contributorId.toString();
      balances[contributorId].paid += expense.amount;

      expense.shares.forEach(share => {
        const userId = share.userId._id.toString();
        balances[userId].owes += share.amount;
      });
    });

    // Calculate final balance
    Object.keys(balances).forEach(userId => {
      balances[userId].balance = balances[userId].paid - balances[userId].owes;
    });

    // Get user details
    const userDetails = await User.find({ _id: { $in: allMembers } }).select('name email profileImage');
    const userMap = {};
    userDetails.forEach(user => {
      userMap[user._id.toString()] = user;
    });

    // Format response
    const formattedBalances = Object.keys(balances).map(userId => ({
      user: userMap[userId],
      ...balances[userId]
    }));

    res.status(200).json({
      balances: formattedBalances,
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0)
    });
  } catch (err) {
    logger.error('Get Expense Summary Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all expenses for a user across all trips
export const getUserExpenses = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { page = 1, limit = 20, category, status } = req.query;

    logger.info(`Getting expenses for user: ${currentUserId}`);

    // Get all trips where user is a member
    const userTrips = await Trip.find({
      $or: [
        { creator: currentUserId },
        { members: currentUserId }
      ]
    }).select('_id');

    logger.info(`Found ${userTrips.length} trips for user`);

    const tripIds = userTrips.map(trip => trip._id);

    // If no trips, return empty result
    if (tripIds.length === 0) {
      return res.status(200).json({
        expenses: [],
        total: 0,
        page: Number(page),
        limit: Number(limit),
        summary: { totalAmount: 0, totalExpenses: 0, byCategory: [], totalAmountUSD: 0, currencyBreakdown: {} }
      });
    }

    // Build filter
    const filter = { groupId: { $in: tripIds } };
    if (category) filter.category = category;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    logger.info(`Fetching expenses with filter:`, filter);

    const expenses = await Expense.find(filter)
      .populate('contributorId', 'name email profileImage')
      .populate('splitBetween', 'name email')
      .populate('shares.userId', 'name email')
      .populate('groupId', 'destination startDate endDate')
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    logger.info(`Found ${expenses.length} expenses`);

    const total = await Expense.countDocuments(filter);

    // Calculate summary with currency conversion
    const summary = await Expense.aggregate([
      { $match: { groupId: { $in: tripIds } } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalExpenses: { $sum: 1 },
          byCategory: {
            $push: {
              category: '$category',
              amount: '$amount',
              currency: '$currency'
            }
          },
          currencies: { $addToSet: '$currency' }
        }
      }
    ]);

    // Convert all amounts to USD for accurate total calculation
    let totalAmountUSD = 0;
    let currencyBreakdown = {};
    
    if (summary[0]) {
      // Group expenses by currency for breakdown
      const expensesByCurrency = await Expense.aggregate([
        { $match: { groupId: { $in: tripIds } } },
        {
          $group: {
            _id: '$currency',
            total: { $sum: '$amount' }
          }
        }
      ]);

      // Calculate total in USD and create currency breakdown
      expensesByCurrency.forEach(item => {
        const usdAmount = convertToUSD(item.total, item._id);
        totalAmountUSD += usdAmount;
        currencyBreakdown[item._id] = {
          amount: item.total,
          usdEquivalent: usdAmount
        };
      });
    }

    logger.info(`Sending response with ${expenses.length} expenses`);

    res.status(200).json({
      expenses,
      total,
      page: Number(page),
      limit: Number(limit),
      summary: {
        ...summary[0] || { totalAmount: 0, totalExpenses: 0, byCategory: [] },
        totalAmountUSD,
        currencyBreakdown
      }
    });
  } catch (err) {
    logger.error('Get User Expenses Error:', err);
    logger.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Mark expense share as paid
export const markShareAsPaid = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user.userId;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    // Check if user is a member of the trip
    const trip = await Trip.findById(expense.groupId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const isMember = trip.creator.toString() === currentUserId.toString() || 
                    trip.members.some(memberId => memberId.toString() === currentUserId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this trip.' });
    }

    // Find and update the share
    const share = expense.shares.find(s => s.userId.toString() === userId);
    if (!share) {
      return res.status(404).json({ message: 'Share not found.' });
    }

    if (share.status === 'paid') {
      return res.status(400).json({ message: 'Share is already marked as paid.' });
    }

    share.status = 'paid';
    share.paidAt = new Date();
    await expense.save();

    res.status(200).json({
      message: 'Share marked as paid.',
      expense
    });
  } catch (err) {
    logger.error('Mark Share Paid Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update expense
export const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const updateData = req.body;
    const currentUserId = req.user.userId;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    // Only contributor can update expense
    if (expense.contributorId.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: 'You can only update your own expenses.' });
    }

    // Remove fields that shouldn't be updated
    delete updateData.contributorId;
    delete updateData.groupId;
    delete updateData.shares;

    const updatedExpense = await Expense.findByIdAndUpdate(
      expenseId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).populate('contributorId', 'name email');

    res.status(200).json({
      message: 'Expense updated successfully.',
      expense: updatedExpense
    });
  } catch (err) {
    logger.error('Update Expense Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete expense
export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const currentUserId = req.user.userId;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    // Only contributor can delete expense
    if (expense.contributorId.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own expenses.' });
    }

    // Delete related chat message if exists
    if (expense.chatMessageId) {
      await Message.findByIdAndDelete(expense.chatMessageId);
    }

    await Expense.findByIdAndDelete(expenseId);

    res.status(200).json({
      message: 'Expense deleted successfully.'
    });
  } catch (err) {
    logger.error('Delete Expense Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get expense settlements
export const getExpenseSettlements = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const currentUserId = req.user.userId;

    const expense = await Expense.findById(expenseId)
      .populate('contributorId', 'name email')
      .populate('groupId', 'destination')
      .populate('shares.userId', 'name email');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found.' });
    }

    // Check if user is a member of the trip
    const trip = await Trip.findById(expense.groupId._id);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    const isMember = trip.creator.toString() === currentUserId.toString() || 
                    trip.members.some(memberId => memberId.toString() === currentUserId.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this trip.' });
    }

    // Calculate settlement data
    const totalAmount = expense.amount;
    const shares = expense.shares || [];
    
    let totalPaid = 0;
    let totalPending = 0;
    const pending = [];
    const paid = [];

    shares.forEach(share => {
      if (share.status === 'paid') {
        totalPaid += share.amount;
        paid.push({
          from: share.userId,
          amount: share.amount,
          paidAt: share.paidAt
        });
      } else {
        totalPending += share.amount;
        pending.push({
          from: share.userId,
          amount: share.amount
        });
      }
    });

    // Determine overall expense status
    let status = 'pending';
    if (totalPaid === totalAmount) {
      status = 'settled';
    }
    // Note: We don't set status to 'partial' since it's not in the enum
    // The status will remain 'pending' until fully settled

    // Update expense status if it has changed
    if (expense.status !== status) {
      expense.status = status;
      await expense.save();
    }

    // Calculate settlement status for display (separate from database status)
    let settlementStatus = 'pending';
    if (totalPaid === totalAmount) {
      settlementStatus = 'settled';
    } else if (totalPaid > 0) {
      settlementStatus = 'partial';
    }

    res.status(200).json({
      expense,
      settlements: {
        totalAmount,
        totalPaid,
        totalPending,
        pending,
        paid,
        status,
        settlementStatus
      }
    });
  } catch (err) {
    logger.error('Get Expense Settlements Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
