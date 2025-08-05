import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

const ExpenseChatIntegration = ({ tripId, currentUser, onExpenseAdded }) => {
  const { socket, isConnected } = useSocket();
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
    category: 'other',
    currency: 'USD',
    notes: ''
  });
  const [customCurrency, setCustomCurrency] = useState('');
  const [showCustomCurrency, setShowCustomCurrency] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tripMembers, setTripMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle custom currency selection
    if (name === 'currency') {
      if (value === 'CUSTOM') {
        setShowCustomCurrency(true);
        setExpenseForm(prev => ({ ...prev, currency: customCurrency || 'CUSTOM' }));
      } else {
        setShowCustomCurrency(false);
        setExpenseForm(prev => ({ ...prev, currency: value }));
      }
    } else {
      setExpenseForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Fetch trip members when form is shown
  useEffect(() => {
    if (showExpenseForm && tripId) {
      fetchTripMembers();
    }
  }, [showExpenseForm, tripId]);

  const fetchTripMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/trips/${tripId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const tripData = await response.json();
        const allMembers = [tripData.creator, ...tripData.members];
        setTripMembers(allMembers);
        setSelectedMembers(allMembers.map(m => m._id));
      }
    } catch (error) {
      console.error('Error fetching trip members:', error);
    }
  };

  const handleMemberToggle = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    
    if (!expenseForm.amount || !expenseForm.description) {
      toast.error('Please fill in amount and description');
      return;
    }

    // Validate custom currency
    if (expenseForm.currency === 'CUSTOM' && !customCurrency.trim()) {
      toast.error('Please enter a custom currency code');
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member to split with');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId: tripId,
          ...expenseForm,
          currency: expenseForm.currency === 'CUSTOM' ? customCurrency : expenseForm.currency,
          splitBetween: selectedMembers,
          amount: parseFloat(expenseForm.amount)
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Reset form
        setExpenseForm({
          amount: '',
          description: '',
          category: 'other',
          currency: 'USD',
          notes: ''
        });
        setCustomCurrency('');
        setShowCustomCurrency(false);
        setShowExpenseForm(false);
        
        // Notify parent component
        if (onExpenseAdded) {
          onExpenseAdded(result.expense);
        }
        
        toast.success('Expense added successfully!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Error adding expense');
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

  const handleCustomCurrencyChange = (e) => {
    const value = e.target.value;
    setCustomCurrency(value);
    setExpenseForm(prev => ({ ...prev, currency: value }));
  };

  return (
    <div className="expense-chat-integration">
      {!showExpenseForm ? (
        <button
          onClick={() => setShowExpenseForm(true)}
          className="add-expense-btn"
        >
          <span>💰</span>
          <span>Add Expense</span>
        </button>
      ) : (
        <div className="expense-form-container">
          <div className="form-header">
            <h3>Add Expense</h3>
            <button
              onClick={() => setShowExpenseForm(false)}
              className="close-form-btn"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmitExpense} className="expense-form-compact">
            <div className="form-row">
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  name="amount"
                  value={expenseForm.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select
                  name="currency"
                  value={expenseForm.currency}
                  onChange={handleInputChange}
                >
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                  <option value="GBP">£ GBP</option>
                  <option value="INR">₹ INR</option>
                  <option value="CUSTOM">Other (Custom)</option>
                </select>
                {showCustomCurrency && (
                  <input
                    type="text"
                    placeholder="Enter currency code (e.g., CAD, AUD, JPY)"
                    value={customCurrency}
                    onChange={handleCustomCurrencyChange}
                    className="custom-currency-input"
                    maxLength="10"
                  />
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <input
                type="text"
                name="description"
                value={expenseForm.description}
                onChange={handleInputChange}
                placeholder="e.g., Dinner at restaurant"
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                name="category"
                value={expenseForm.category}
                onChange={handleInputChange}
              >
                <option value="food">🍕 Food & Dining</option>
                <option value="transport">🚗 Transportation</option>
                <option value="accommodation">🏨 Accommodation</option>
                <option value="activities">🎯 Activities</option>
                <option value="shopping">🛍️ Shopping</option>
                <option value="other">💰 Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={expenseForm.notes}
                onChange={handleInputChange}
                placeholder="Additional notes..."
                rows="2"
              />
            </div>

            {tripMembers.length > 0 && (
              <div className="form-group">
                <label>Split Between Members</label>
                <div className="member-selection-compact">
                  {tripMembers.map(member => (
                    <label key={member._id} className="member-checkbox-compact">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(member._id)}
                        onChange={() => handleMemberToggle(member._id)}
                      />
                      <span>{member.name}</span>
                    </label>
                  ))}
                </div>
                <div className="split-info-compact">
                  <small>
                    Amount per person: {getCurrencySymbol(expenseForm.currency)}{expenseForm.amount && selectedMembers.length > 0 
                      ? (expenseForm.amount / selectedMembers.length).toFixed(2) 
                      : '0.00'}
                  </small>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowExpenseForm(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !expenseForm.amount || !expenseForm.description}
                className="submit-btn"
              >
                {loading ? (
                  <div className="loading-spinner-small"></div>
                ) : (
                  <>
                    <span>{getCategoryIcon(expenseForm.category)}</span>
                    Add Expense
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ExpenseChatIntegration; 