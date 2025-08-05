import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const ExpenseSummary = ({ tripId, currentUser }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchExpenseSummary();
  }, [tripId]);

  const fetchExpenseSummary = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/expenses/trip/${tripId}/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      } else {
        toast.error('Failed to load expense summary');
      }
    } catch (error) {
      console.error('Error fetching expense summary:', error);
      toast.error('Error loading expense summary');
    } finally {
      setLoading(false);
    }
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
      <div className="expense-summary-card">
        <div className="loading-pulse">
          <div className="loading-title"></div>
          <div className="loading-content">
            <div className="loading-line"></div>
            <div className="loading-line short"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const currentUserBalance = summary.balances.find(
    balance => balance.user._id === currentUser.userId
  );

  return (
    <div className="expense-summary-card">
      <div className="summary-header">
        <h3>💰 Expense Summary</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="toggle-details-btn"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Quick Summary */}
      <div className="summary-stats">
        <div className="stat-item">
          <div className="stat-value">
            {summary.totalAmountUSD ? 
              `${getCurrencySymbol('USD')}${summary.totalAmountUSD.toFixed(2)} USD` : 
              `${getCurrencySymbol()}${summary.totalAmount.toFixed(2)}`
            }
          </div>
          <div className="stat-label">Total Spent</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{summary.totalExpenses}</div>
          <div className="stat-label">Total Expenses</div>
        </div>
      </div>

      {/* Current User Balance */}
      {currentUserBalance && (
        <div className="user-balance-card">
          <div className="balance-header">
            <div>
              <div className="balance-label">Your Balance</div>
              <div className={`balance-amount ${getBalanceColor(currentUserBalance.balance)}`}>
                {getBalanceIcon(currentUserBalance.balance)} {getCurrencySymbol()}{Math.abs(currentUserBalance.balance).toFixed(2)}
              </div>
            </div>
            <div className="balance-details">
              <div className="balance-detail">
                Paid: {getCurrencySymbol()}{currentUserBalance.paid.toFixed(2)}
              </div>
              <div className="balance-detail">
                Owes: {getCurrencySymbol()}{currentUserBalance.owes.toFixed(2)}
              </div>
            </div>
          </div>
          {currentUserBalance.balance > 0 && (
            <div className="balance-message positive">
              You are owed {getCurrencySymbol()}{currentUserBalance.balance.toFixed(2)}
            </div>
          )}
          {currentUserBalance.balance < 0 && (
            <div className="balance-message negative">
              You owe {getCurrencySymbol()}{Math.abs(currentUserBalance.balance).toFixed(2)}
            </div>
          )}
          {currentUserBalance.balance === 0 && (
            <div className="balance-message neutral">
              All settled up! ✅
            </div>
          )}
        </div>
      )}

      {/* Detailed Balances */}
      {showDetails && (
        <div className="detailed-balances">
          <h4>All Members</h4>
          <div className="balance-list">
            {summary.balances.map((balance) => (
              <div key={balance.user._id} className="balance-item">
                <div className="balance-user">
                  <div className="user-avatar">
                    {balance.user.name?.charAt(0) || 'U'}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{balance.user.name}</div>
                    <div className="user-details">
                      Paid: {getCurrencySymbol()}{balance.paid.toFixed(2)} | Owes: {getCurrencySymbol()}{balance.owes.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className={`balance-status ${getBalanceColor(balance.balance)}`}>
                  <div className="balance-amount">
                    {getBalanceIcon(balance.balance)} {getCurrencySymbol()}{Math.abs(balance.balance).toFixed(2)}
                  </div>
                  <div className="balance-status-text">
                    {balance.balance > 0 ? 'Owed' : balance.balance < 0 ? 'Owes' : 'Settled'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseSummary; 