import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSocket } from '../contexts/SocketContext';
import { getDisplayName } from '../utils/userDisplay';
import './ExpenseForm.css';

const ExpenseForm = ({ tripId, currentUser, onExpenseAdded, onCancel }) => {
  const { socket, isConnected, notifyExpenseAdded } = useSocket();
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'other',
    currency: 'USD',
    notes: '',
    groupId: tripId,
    splitBetween: []
  });
  const [customCurrency, setCustomCurrency] = useState('');
  const [showCustomCurrency, setShowCustomCurrency] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tripMembers, setTripMembers] = useState([]);
  const [splitType, setSplitType] = useState('auto'); // 'auto' or 'manual'
  const [manualSplits, setManualSplits] = useState({}); // { memberId: amount }

  // Fetch trip members when component mounts
  useEffect(() => {
    if (tripId) {
      fetchTripMembers();
    }
  }, [tripId]);

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
        console.log('Trip members loaded:', allMembers); // Debug log
        setTripMembers(allMembers);
        
        // Initialize with all members selected
        setFormData(prev => ({
          ...prev,
          splitBetween: allMembers.map(m => m._id)
        }));

        // Initialize manual splits
        const initialManualSplits = {};
        allMembers.forEach(member => {
          initialManualSplits[member._id] = '';
        });
        setManualSplits(initialManualSplits);
      }
    } catch (error) {
      console.error('Error fetching trip members:', error);
      toast.error('Failed to load trip members');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle custom currency selection
    if (name === 'currency') {
      if (value === 'CUSTOM') {
        setShowCustomCurrency(true);
        setFormData(prev => ({ ...prev, currency: customCurrency || 'CUSTOM' }));
      } else {
        setShowCustomCurrency(false);
        setFormData(prev => ({ ...prev, currency: value }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleMemberToggle = (memberId) => {
    setFormData(prev => {
      const newSplitBetween = prev.splitBetween.includes(memberId)
        ? prev.splitBetween.filter(id => id !== memberId)
        : [...prev.splitBetween, memberId];
      
      return {
        ...prev,
        splitBetween: newSplitBetween
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description) {
      toast.error('Please fill in amount and description');
      return;
    }

    // Validate custom currency
    if (formData.currency === 'CUSTOM' && !customCurrency.trim()) {
      toast.error('Please enter a custom currency code');
      return;
    }

    if (formData.splitBetween.length === 0) {
      toast.error('Please select at least one member to split with');
      return;
    }

    // Validate manual split if using manual mode
    if (splitType === 'manual' && !isManualSplitValid()) {
      toast.error('Manual split amounts must equal the total expense amount');
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
          ...formData,
          currency: formData.currency === 'CUSTOM' ? customCurrency : formData.currency,
          amount: parseFloat(formData.amount),
          splitType,
          manualSplits: splitType === 'manual' ? manualSplits : undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Notify other users via Socket.IO
        if (isConnected && socket) {
          notifyExpenseAdded(tripId, result.expense);
        }
        
        toast.success('Expense added successfully!');
        
        // Reset form
        setFormData({
          amount: '',
          description: '',
          category: 'other',
          currency: 'USD',
          notes: '',
          groupId: tripId,
          splitBetween: tripMembers.map(m => m._id)
        });
        setManualSplits({});
        setSplitType('auto');
        
        if (onExpenseAdded) {
          onExpenseAdded(result.expense);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to add expense');
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Error adding expense');
    } finally {
      setLoading(false);
    }
  };

  // Calculate amount per person for auto split
  const getAmountPerPerson = () => {
    if (!formData.amount || formData.splitBetween.length === 0) return 0;
    return parseFloat(formData.amount) / formData.splitBetween.length;
  };

  // Handle manual split amount change
  const handleManualSplitChange = (memberId, amount) => {
    setManualSplits(prev => ({
      ...prev,
      [memberId]: amount
    }));
  };

  // Calculate total manual split amount
  const getTotalManualSplit = () => {
    return Object.values(manualSplits).reduce((total, amount) => {
      return total + (parseFloat(amount) || 0);
    }, 0);
  };

  // Check if manual split is valid
  const isManualSplitValid = () => {
    const total = getTotalManualSplit();
    const expenseAmount = parseFloat(formData.amount) || 0;
    return Math.abs(total - expenseAmount) < 0.01; // Allow small rounding differences
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

  const handleCustomCurrencyChange = (e) => {
    setCustomCurrency(e.target.value.toUpperCase());
    setFormData(prev => ({ ...prev, currency: e.target.value.toUpperCase() }));
  };

  return (
    <div className="expense-form-container">
      <div className="expense-form-header">
        <h3>💰 Add New Expense</h3>
        <button 
          className="close-btn"
          onClick={onCancel}
          type="button"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="expense-form">
        {/* Amount and Currency */}
        <div className="form-row">
          <div className="form-group amount-group">
            <label>Amount *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />
          </div>
          
          <div className="form-group currency-group">
            <label>Currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="INR">INR</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>
        </div>

        {/* Custom Currency Input */}
        {showCustomCurrency && (
          <div className="form-group">
            <label>Custom Currency Code *</label>
            <input
              type="text"
              value={customCurrency}
              onChange={handleCustomCurrencyChange}
              placeholder="e.g., CAD, AUD, JPY"
              maxLength="3"
              style={{ textTransform: 'uppercase' }}
            />
          </div>
        )}

        {/* Description */}
        <div className="form-group">
          <label>Description *</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="What was this expense for?"
            required
          />
        </div>

        {/* Category */}
        <div className="form-group">
          <label>Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
          >
            <option value="transport">🚗 Transport</option>
            <option value="accommodation">🏨 Accommodation</option>
            <option value="food">🍽️ Food & Dining</option>
            <option value="activities">🎯 Activities</option>
            <option value="shopping">🛍️ Shopping</option>
            <option value="other">💰 Other</option>
          </select>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label>Notes (Optional)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Additional details about this expense..."
            rows="3"
          />
        </div>

        {/* Split Type Selection */}
        <div className="form-group">
          <label>Split Type</label>
          <div className="split-type-options">
            <label className="radio-option">
              <input
                type="radio"
                name="splitType"
                value="auto"
                checked={splitType === 'auto'}
                onChange={(e) => setSplitType(e.target.value)}
              />
              <span>Auto Split (Equal amounts)</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="splitType"
                value="manual"
                checked={splitType === 'manual'}
                onChange={(e) => setSplitType(e.target.value)}
              />
              <span>Manual Split (Custom amounts)</span>
            </label>
          </div>
        </div>

        {/* Member Selection */}
        <div className="form-group">
          <label>Split Between *</label>
          <div className="member-selection">
            {tripMembers.map(member => (
              <label key={member._id} className="member-checkbox">
                <input
                  type="checkbox"
                  checked={formData.splitBetween.includes(member._id)}
                  onChange={() => handleMemberToggle(member._id)}
                />
                <span className="member-name">
                  {getDisplayName(member)}
                  {member._id === tripMembers[0]?._id && ' (Creator)'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Split Summary */}
        {formData.splitBetween.length > 0 && (
          <div className="split-summary">
            <h4>Split Summary</h4>
            {splitType === 'auto' ? (
              <p>
                Amount per person: {getCurrencySymbol(formData.currency)}
                {getAmountPerPerson().toFixed(2)}
              </p>
            ) : (
              <div className="manual-split-summary">
                <p>
                  Total: {getCurrencySymbol(formData.currency)}
                  {getTotalManualSplit().toFixed(2)} / {getCurrencySymbol(formData.currency)}
                  {formData.amount || '0.00'}
                </p>
                {!isManualSplitValid() && formData.amount && (
                  <p className="error-text">
                    Split amounts must equal the total expense amount
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manual Split Inputs */}
        {splitType === 'manual' && formData.splitBetween.length > 0 && (
          <div className="manual-split-section">
            <label>Manual Split Amounts *</label>
            <div className="manual-split-inputs">
              {tripMembers
                .filter(member => formData.splitBetween.includes(member._id))
                .map(member => (
                  <div key={member._id} className="manual-split-input">
                    <label>
                      {getDisplayName(member)}:
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={manualSplits[member._id] || ''}
                      onChange={(e) => handleManualSplitChange(member._id, e.target.value)}
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !formData.amount || !formData.description}
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;
