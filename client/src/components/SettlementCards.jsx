import React from 'react';
import './SettlementCards.css';

const SettlementCards = ({ expenses, user }) => {
  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹'
    };
    if (currency && !symbols[currency]) {
      return currency;
    }
    return symbols[currency] || '$';
  };

  // Calculate settlement statistics
  const calculateSettlementStats = () => {
    let totalPending = 0;
    let totalPaid = 0;
    let pendingExpenses = 0;
    let settledExpenses = 0;
    let totalSettlements = 0;

    expenses.forEach(expense => {
      if (expense.shares && expense.shares.length > 0) {
        const pendingShares = expense.shares.filter(share => share.status === 'pending');
        const paidShares = expense.shares.filter(share => share.status === 'paid');
        
        totalPending += pendingShares.reduce((sum, share) => sum + share.amount, 0);
        totalPaid += paidShares.reduce((sum, share) => sum + share.amount, 0);
        totalSettlements += expense.shares.length;

        if (pendingShares.length > 0) {
          pendingExpenses++;
        } else {
          settledExpenses++;
        }
      }
    });

    return {
      totalPending,
      totalPaid,
      pendingExpenses,
      settledExpenses,
      totalSettlements,
      settlementRate: totalSettlements > 0 ? ((totalSettlements - pendingExpenses) / totalSettlements * 100).toFixed(1) : 0
    };
  };

  const stats = calculateSettlementStats();

  return (
    <div className="settlement-cards">
      <h3>Settlement Overview</h3>
      <div className="cards-grid">
        <div className="settlement-card pending">
          <div className="card-icon">⏳</div>
          <div className="card-content">
            <h4>Pending Settlements</h4>
            <p className="card-amount">
              {getCurrencySymbol('USD')}{stats.totalPending.toFixed(2)}
            </p>
            <p className="card-detail">{stats.pendingExpenses} expenses</p>
          </div>
        </div>

        <div className="settlement-card paid">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <h4>Paid Amount</h4>
            <p className="card-amount">
              {getCurrencySymbol('USD')}{stats.totalPaid.toFixed(2)}
            </p>
            <p className="card-detail">{stats.settledExpenses} settled</p>
          </div>
        </div>

        <div className="settlement-card rate">
          <div className="card-icon">📊</div>
          <div className="card-content">
            <h4>Settlement Rate</h4>
            <p className="card-amount">{stats.settlementRate}%</p>
            <p className="card-detail">{stats.totalSettlements} total shares</p>
          </div>
        </div>

        <div className="settlement-card split">
          <div className="card-icon">🔀</div>
          <div className="card-content">
            <h4>Split Types</h4>
            <p className="card-amount">
              {expenses.filter(e => e.splitType === 'auto').length} Auto
            </p>
            <p className="card-detail">
              {expenses.filter(e => e.splitType === 'manual').length} Manual
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettlementCards; 