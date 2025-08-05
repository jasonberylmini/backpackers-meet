import React from 'react';
import './CurrencyBreakdown.css';

const CurrencyBreakdown = ({ currencyBreakdown, totalAmountUSD }) => {
  if (!currencyBreakdown || Object.keys(currencyBreakdown).length === 0) {
    return null;
  }

  const getCurrencySymbol = (currency) => {
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

  return (
    <div className="currency-breakdown">
      <h4>Currency Breakdown</h4>
      <div className="breakdown-items">
        {Object.entries(currencyBreakdown).map(([currency, data]) => (
          <div key={currency} className="breakdown-item">
            <div className="currency-info">
              <span className="currency-amount">
                {getCurrencySymbol(currency)}{data.amount.toFixed(2)} {currency}
              </span>
              <span className="usd-equivalent">
                ≈ ${data.usdEquivalent.toFixed(2)} USD
              </span>
            </div>
          </div>
        ))}
        <div className="total-usd">
          <strong>Total: ${totalAmountUSD.toFixed(2)} USD</strong>
        </div>
      </div>
    </div>
  );
};

export default CurrencyBreakdown; 