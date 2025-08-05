import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ExpenseDashboard = ({ currentUser }) => {
  const [expenseData, setExpenseData] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpenseData();
  }, []);

  const fetchExpenseData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [expensesRes, balancesRes] = await Promise.all([
        fetch('/api/expenses/my-expenses', { headers }),
        fetch('/api/expenses/my-balances', { headers })
      ]);

      if (expensesRes.ok && balancesRes.ok) {
        const expenses = await expensesRes.json();
        const balances = await balancesRes.json();
        
        setExpenseData(expenses);
        setBalanceData(balances);
      } else {
        toast.error('Failed to load expense data');
      }
    } catch (error) {
      console.error('Error fetching expense data:', error);
      toast.error('Error loading expense data');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      food: '🍕',
      transport: '🚗',
      accommodation: '🏨',
      activities: '🎯',
      shopping: '🛍️',
      other: '💰'
    };
    return icons[category] || '💰';
  };

  const getCategoryColor = (category) => {
    const colors = {
      food: 'category-food',
      transport: 'category-transport',
      accommodation: 'category-accommodation',
      activities: 'category-activities',
      shopping: 'category-shopping',
      other: 'category-other'
    };
    return colors[category] || 'category-other';
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'balance-positive';
    if (balance < 0) return 'balance-negative';
    return 'balance-neutral';
  };

  const getBalanceIcon = (balance) => {
    if (balance > 0) return '💰';
    if (balance < 0) return '💸';
    return '✅';
  };

  // Get currency symbol
  const getCurrencySymbol = (currency = 'USD') => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹'
    };
    // If it's a custom currency, return the currency code itself
    if (currency && !symbols[currency]) {
      return currency;
    }
    return symbols[currency] || '$';
  };

  if (loading) {
    return (
      <div className="expense-dashboard-card">
        <div className="loading-pulse">
          <div className="loading-title"></div>
          <div className="loading-stats">
            <div className="loading-stat"></div>
            <div className="loading-stat"></div>
            <div className="loading-stat"></div>
          </div>
          <div className="loading-content">
            <div className="loading-line"></div>
            <div className="loading-line short"></div>
          </div>
        </div>
      </div>
    );
  }

  const recentExpenses = expenseData?.expenses?.slice(0, 5) || [];
  const totalExpenses = expenseData?.summary?.totalAmountUSD || expenseData?.summary?.totalAmount || 0;
  const totalTransactions = expenseData?.total || 0;
  const overallBalance = balanceData?.overallBalance || 0;

  return (
    <div className="expense-dashboard-card">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h2>💰 Expense Overview</h2>
          <p>Track your trip expenses and balances</p>
        </div>
        <button
          onClick={() => navigate('/expenses')}
          className="view-all-btn"
        >
          View All Expenses
        </button>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-content">
              <div>
                <p className="stat-label">Total Spent</p>
                <p className="stat-value">
                  {expenseData?.summary?.totalAmountUSD ? 
                    `${getCurrencySymbol('USD')}${totalExpenses.toFixed(2)} USD` : 
                    `${getCurrencySymbol()}${totalExpenses.toFixed(2)}`
                  }
                </p>
              </div>
              <div className="stat-icon">💸</div>
            </div>
          </div>
          
          <div className="stat-card green">
            <div className="stat-content">
              <div>
                <p className="stat-label">Total Transactions</p>
                <p className="stat-value">{totalTransactions}</p>
              </div>
              <div className="stat-icon">📊</div>
            </div>
          </div>
          
          <div className={`stat-card ${overallBalance > 0 ? 'green' : overallBalance < 0 ? 'red' : 'gray'}`}>
            <div className="stat-content">
              <div>
                <p className="stat-label">Your Balance</p>
                <p className="stat-value">
                  {getBalanceIcon(overallBalance)} {getCurrencySymbol()}{Math.abs(overallBalance).toFixed(2)}
                </p>
              </div>
              <div className="stat-icon">
                {overallBalance > 0 ? '💰' : overallBalance < 0 ? '💸' : '✅'}
              </div>
            </div>
          </div>
        </div>

        {/* Trip Balances */}
        {balanceData?.tripBalances && Object.keys(balanceData.tripBalances).length > 0 && (
          <div className="trip-balances-section">
            <h3>Trip Balances</h3>
            <div className="trip-balances-list">
              {Object.values(balanceData.tripBalances).map((tripData) => {
                const userBalance = tripData.balances.find(
                  balance => balance.user._id === currentUser.userId
                );
                
                return (
                  <div key={tripData.trip._id} className="trip-balance-item">
                    <div className="trip-balance-header">
                      <h4>{tripData.trip.destination}</h4>
                      <span className="trip-expense-count">
                        {tripData.totalExpenses} expenses
                      </span>
                    </div>
                    <div className="trip-balance-details">
                      <div className="trip-total">
                        Total: {tripData.totalAmountUSD ? 
                          `${getCurrencySymbol('USD')}${tripData.totalAmountUSD.toFixed(2)} USD` : 
                          `${getCurrencySymbol()}${tripData.totalAmount.toFixed(2)}`
                        }
                      </div>
                      {userBalance && (
                        <div className={`user-balance ${getBalanceColor(userBalance.balance)}`}>
                          {getBalanceIcon(userBalance.balance)} {getCurrencySymbol()}{Math.abs(userBalance.balance).toFixed(2)}
                          <span className="balance-status">
                            {userBalance.balance > 0 ? 'owed to you' : userBalance.balance < 0 ? 'you owe' : 'settled'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Expenses */}
        <div className="recent-expenses-section">
          <h3>Recent Expenses</h3>
          {recentExpenses.length === 0 ? (
            <div className="empty-expenses">
              <div className="empty-icon">💰</div>
              <p>No expenses yet</p>
              <button
                onClick={() => navigate('/expenses')}
                className="add-first-btn"
              >
                Add your first expense
              </button>
            </div>
          ) : (
            <div className="expenses-list">
              {recentExpenses.map((expense) => (
                <div key={expense._id} className="expense-item">
                  <div className="expense-info">
                    <div className={`expense-icon ${getCategoryColor(expense.category)}`}>
                      {getCategoryIcon(expense.category)}
                    </div>
                    <div className="expense-details">
                      <p className="expense-description">{expense.description}</p>
                      <div className="expense-meta">
                        <span>{expense.category}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{expense.contributorId?.name || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="expense-amount">
                    <p>{expense.currency} {expense.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseDashboard; 