import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSocket } from '../contexts/SocketContext';
import './ExpenseList.css';

const ExpenseList = ({ tripId, currentUser, onExpenseUpdated }) => {
  const { socket, isConnected, notifyExpenseSettled } = useSocket();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tripId) {
      fetchExpenses();
    }
  }, [tripId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewExpense = (data) => {
      if (data.tripId === tripId) {
        setExpenses(prev => [...prev, data.expense]);
        toast(`${data.addedBy?.username || data.addedBy?.name || 'Unknown'} added expense: ${data.expense.description}`, {
          duration: 4000,
          position: 'top-right',
          icon: '💰',
        });
      }
    };

    const handleExpenseSettled = (data) => {
      if (data.tripId === tripId) {
        setExpenses(prev => prev.map(exp => 
          exp._id === data.expenseId 
            ? { ...exp, status: 'settled' }
            : exp
        ));
        toast(`${data.settledBy?.username || data.settledBy?.name || 'Unknown'} settled an expense`, {
          duration: 3000,
          position: 'top-right',
          icon: '✅',
        });
      }
    };

    socket.on('newExpense', handleNewExpense);
    socket.on('expenseSettled', handleExpenseSettled);

    return () => {
      socket.off('newExpense', handleNewExpense);
      socket.off('expenseSettled', handleExpenseSettled);
    };
  }, [socket, tripId]);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/expenses/trip/${tripId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
      } else {
        console.error('Failed to fetch expenses');
        toast.error('Failed to load expenses');
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Error loading expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSettleExpense = async (expenseId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/expenses/${expenseId}/share-paid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: currentUser.userId || currentUser.id || currentUser._id
        })
      });

      if (response.ok) {
        if (isConnected && socket) {
          notifyExpenseSettled(tripId, expenseId);
        }
        
        setExpenses(prev => prev.map(exp => 
          exp._id === expenseId 
            ? { ...exp, status: 'settled' }
            : exp
        ));
        
        toast.success('Expense marked as settled!');
        
        if (onExpenseUpdated) {
          onExpenseUpdated();
        }
      } else {
        toast.error('Failed to settle expense');
      }
    } catch (error) {
      console.error('Error settling expense:', error);
      toast.error('Error settling expense');
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      transport: '🚗',
      accommodation: '🏨',
      food: '🍽️',
      activities: '🎯',
      shopping: '🛍️',
      other: '💰'
    };
    return icons[category] || '💰';
  };

  const getCurrencySymbol = (currency = 'USD') => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹'
    };
    return symbols[currency] || currency;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate total amount in USD for consistent display
  const totalAmountUSD = expenses.reduce((sum, exp) => {
    // Convert all amounts to USD for consistent total
    const usdAmount = exp.currency === 'USD' ? exp.amount : 
                     exp.currency === 'EUR' ? exp.amount * 1.08 :
                     exp.currency === 'GBP' ? exp.amount * 1.27 :
                     exp.currency === 'INR' ? exp.amount * 0.012 :
                     exp.amount; // Default to USD
    return sum + usdAmount;
  }, 0);
  
  const settledExpenses = expenses.filter(exp => exp.status === 'settled').length;
  const pendingExpenses = expenses.length - settledExpenses;

  if (loading) {
    return (
      <div className="expense-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="expense-list-container">
      <div className="expense-summary-header">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-number">{expenses.length}</span>
            <span className="stat-label">Total Expenses</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{getCurrencySymbol('USD')}{totalAmountUSD.toFixed(2)}</span>
            <span className="stat-label">Total Amount (USD)</span>
          </div>
          <div className="stat-item">
            <span className="stat-number settled">{settledExpenses}</span>
            <span className="stat-label">Settled</span>
          </div>
          <div className="stat-item">
            <span className="stat-number pending">{pendingExpenses}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      </div>

      <div className="expenses-list">
        {expenses.length === 0 ? (
          <div className="no-expenses">
            <div className="no-expenses-icon">💰</div>
            <h3>No expenses yet</h3>
            <p>Start adding expenses to track your trip costs</p>
          </div>
        ) : (
          expenses.map((expense) => (
            <div 
              key={expense._id} 
              className={`expense-item ${expense.status === 'settled' ? 'settled' : ''}`}
            >
              <div className="expense-header">
                <div className="expense-category">
                  <span className="category-icon">{getCategoryIcon(expense.category)}</span>
                  <span className="category-name">{expense.category}</span>
                </div>
                <div className="expense-amount">
                  <span className="amount-value">
                    {getCurrencySymbol(expense.currency)}{expense.amount.toFixed(2)}
                  </span>
                  <span className="amount-currency">{expense.currency}</span>
                </div>
              </div>

              <div className="expense-content">
                <h4 className="expense-description">{expense.description}</h4>
                {expense.notes && (
                  <p className="expense-notes">{expense.notes}</p>
                )}
                
                <div className="expense-meta">
                  <span className="expense-date">
                    📅 {formatDate(expense.date)}
                  </span>
                  <span className="expense-contributor">
                    👤 by {expense.contributorId?.name || expense.contributorId?.username || 'Unknown'}
                  </span>
                  <span className={`expense-status ${expense.status}`}>
                    {expense.status === 'settled' ? '✅ Settled' : '⏳ Pending'}
                  </span>
                </div>

                {expense.shares && expense.shares.length > 0 && (
                  <div className="expense-splits">
                    <h5>Split Details:</h5>
                    <div className="split-list">
                      {expense.shares.map((share, index) => (
                        <div key={index} className="split-item">
                          <span className="split-person">
                            {share.userId?.name || share.userId?.username || 'Unknown'}
                          </span>
                          <span className={`split-amount ${share.status}`}>
                            {getCurrencySymbol(expense.currency)}{share.amount.toFixed(2)}
                            {share.status === 'paid' && ' ✅'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {expense.status !== 'settled' && (
                <div className="expense-actions">
                  <button
                    className="settle-btn"
                    onClick={() => handleSettleExpense(expense._id)}
                    disabled={!isConnected}
                  >
                    Mark as Settled
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExpenseList;
