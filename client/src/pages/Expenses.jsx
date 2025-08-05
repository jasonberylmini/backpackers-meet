import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Expenses.css';

export default function Expenses() {
  const [tripExpenses, setTripExpenses] = useState({}); // { tripId: { expenses: [], summary: {} } }
  const [userTrips, setUserTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState('all');
  const [expenseFilter, setExpenseFilter] = useState('all'); // 'all', 'pending', 'settled'
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [settlementData, setSettlementData] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    groupId: '',
    amount: '',
    description: '',
    category: 'other',
    currency: 'USD',
    splitBetween: [],
    notes: ''
  });
  const [selectedTripMembers, setSelectedTripMembers] = useState([]);
  const [splitType, setSplitType] = useState('auto'); // 'auto' or 'manual'
  const [manualSplits, setManualSplits] = useState({}); // { memberId: amount }
  const [customCurrency, setCustomCurrency] = useState('');
  const [showCustomCurrency, setShowCustomCurrency] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('No authentication token found. Please log in again.');
        navigate('/login');
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('Fetching user trips...');
      // First, get user's trips
      const tripsRes = await axios.get('/api/trips/mine', { 
        headers,
        timeout: 10000 // 10 second timeout
      });
      console.log('Trips response:', tripsRes.data);
      setUserTrips(tripsRes.data || []);
      
      // Then get expenses for each trip if user has trips
      if (tripsRes.data && tripsRes.data.length > 0) {
        console.log('Fetching expenses for each trip...');
        const tripExpensesData = {};
        
        // Fetch expenses for each trip
        for (const trip of tripsRes.data) {
          try {
            const expensesRes = await axios.get(`/api/expenses/trip/${trip._id}`, { 
              headers,
              timeout: 10000
            });
            tripExpensesData[trip._id] = {
              expenses: expensesRes.data.expenses || [],
              summary: expensesRes.data.summary || { totalAmount: 0, totalExpenses: 0 }
            };
          } catch (error) {
            console.error(`Failed to fetch expenses for trip ${trip._id}:`, error);
            tripExpensesData[trip._id] = {
              expenses: [],
              summary: { totalAmount: 0, totalExpenses: 0 }
            };
          }
        }
        
        setTripExpenses(tripExpensesData);
      } else {
        console.log('No trips found, setting empty trip expenses');
        setTripExpenses({});
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      setLoading(false);
      setTripExpenses({});
      setUserTrips([]);
      
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        navigate('/login');
      } else if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
        toast.error('Connection timeout. Please check your internet connection and try again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load expenses');
      }
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

  const handleTripChange = (e) => {
    const tripId = e.target.value;
    setFormData(prev => ({ ...prev, groupId: tripId }));
    
    if (tripId) {
      const trip = userTrips.find(t => t._id === tripId);
      if (trip && trip.members) {
        // Remove duplicates by using a Map with member ID as key
        const uniqueMembers = new Map();
        uniqueMembers.set(trip.creator._id, trip.creator);
        trip.members.forEach(member => {
          uniqueMembers.set(member._id, member);
        });
        
        const membersArray = Array.from(uniqueMembers.values());
        setSelectedTripMembers(membersArray);
        
        // Default to all members selected
        setFormData(prev => ({ 
          ...prev, 
          splitBetween: membersArray.map(m => m._id)
        }));
        
        // Initialize manual splits
        const initialManualSplits = {};
        membersArray.forEach(member => {
          initialManualSplits[member._id] = '';
        });
        setManualSplits(initialManualSplits);
      }
    } else {
      setSelectedTripMembers([]);
      setFormData(prev => ({ ...prev, splitBetween: [] }));
      setManualSplits({});
    }
  };

  const handleMemberToggle = (memberId) => {
    setFormData(prev => {
      const currentSplit = prev.splitBetween || [];
      const newSplit = currentSplit.includes(memberId)
        ? currentSplit.filter(id => id !== memberId)
        : [...currentSplit, memberId];
      
      return { ...prev, splitBetween: newSplit };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.groupId || !formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate custom currency
    if (formData.currency === 'CUSTOM' && !customCurrency.trim()) {
      toast.error('Please enter a custom currency code');
      return;
    }

    // Validate manual split if using manual mode
    if (splitType === 'manual' && !isManualSplitValid()) {
      toast.error('Manual split amounts must equal the total expense amount');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Prepare expense data
      const expenseData = {
        ...formData,
        currency: formData.currency === 'CUSTOM' ? customCurrency : formData.currency,
        splitType,
        manualSplits: splitType === 'manual' ? manualSplits : undefined
      };
      
      await axios.post('/api/expenses', expenseData, { 
        headers,
        timeout: 10000
      });
      
      toast.success('Expense added successfully!');
      setShowAddForm(false);
      setFormData({
        groupId: '',
        amount: '',
        description: '',
        category: 'other',
        currency: 'USD',
        splitBetween: [],
        notes: ''
      });
      setSplitType('auto');
      setManualSplits({});
      setCustomCurrency('');
      setShowCustomCurrency(false);
      fetchData();
    } catch (error) {
      console.error('Failed to add expense:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        navigate('/login');
      } else if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
        toast.error('Connection timeout. Please check your internet connection and try again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to add expense');
      }
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete(`/api/expenses/${expenseId}`, { 
        headers,
        timeout: 10000
      });
      toast.success('Expense deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete expense:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        navigate('/login');
      } else if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
        toast.error('Connection timeout. Please check your internet connection and try again.');
      } else {
        toast.error('Failed to delete expense');
      }
    }
  };

  const handleViewSettlements = async (expense) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(`/api/expenses/${expense._id}/settlements`, { 
        headers,
        timeout: 10000
      });
      setSettlementData(response.data);
      setSelectedExpense(expense);
      setShowSettlementModal(true);
    } catch (error) {
      console.error('Failed to fetch settlements:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        navigate('/login');
      } else if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
        toast.error('Connection timeout. Please check your internet connection and try again.');
      } else {
        toast.error('Failed to load settlements');
      }
    }
  };

  const handleMarkAsPaid = async (expenseId, userId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.patch(`/api/expenses/${expenseId}/share-paid`, { userId }, { 
        headers,
        timeout: 10000
      });
      toast.success('Payment marked as completed');
      
      // Refresh settlement data
      if (selectedExpense) {
        handleViewSettlements(selectedExpense);
      }
    } catch (error) {
      console.error('Failed to mark as paid:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        navigate('/login');
      } else if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
        toast.error('Connection timeout. Please check your internet connection and try again.');
      } else {
        toast.error('Failed to mark payment as completed');
      }
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    
    // Check if it's a custom currency
    const isCustomCurrency = expense.currency && !['USD', 'EUR', 'GBP', 'INR'].includes(expense.currency);
    
    setFormData({
      groupId: expense.groupId || '',
      amount: expense.amount.toString(),
      description: expense.description || '',
      category: expense.category || 'other',
      currency: isCustomCurrency ? 'CUSTOM' : (expense.currency || 'USD'),
      splitBetween: expense.splitBetween || [],
      notes: expense.notes || ''
    });
    
    if (isCustomCurrency) {
      setCustomCurrency(expense.currency);
      setShowCustomCurrency(true);
    } else {
      setCustomCurrency('');
      setShowCustomCurrency(false);
    }
    
    setShowEditForm(true);
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    
    if (!formData.groupId || !formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate custom currency
    if (formData.currency === 'CUSTOM' && !customCurrency.trim()) {
      toast.error('Please enter a custom currency code');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Prepare expense data with custom currency
      const expenseData = {
        ...formData,
        currency: formData.currency === 'CUSTOM' ? customCurrency : formData.currency
      };
      
      await axios.put(`/api/expenses/${editingExpense._id}`, expenseData, { 
        headers,
        timeout: 10000
      });
      
      toast.success('Expense updated successfully!');
      setShowEditForm(false);
      setEditingExpense(null);
      setFormData({
        groupId: '',
        amount: '',
        description: '',
        category: 'other',
        currency: 'USD',
        splitBetween: [],
        notes: ''
      });
      setCustomCurrency('');
      setShowCustomCurrency(false);
      fetchData();
    } catch (error) {
      console.error('Failed to update expense:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
        navigate('/login');
      } else if (error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
        toast.error('Connection timeout. Please check your internet connection and try again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to update expense');
      }
    }
  };

  const getTotalExpenses = () => {
    if (selectedTrip === 'all') {
      // Sum all trip totals
      return Object.values(tripExpenses).reduce((total, tripData) => {
        return total + (tripData.summary?.totalAmount || 0);
      }, 0);
    } else {
      // Return specific trip total
      return tripExpenses[selectedTrip]?.summary?.totalAmount || 0;
    }
  };

  const getExpenseCategoryIcon = (category) => {
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

  const getExpenseCategoryColor = (category) => {
    const colors = {
      food: '#ef4444',
      transport: '#3b82f6',
      accommodation: '#10b981',
      activities: '#f59e0b',
      shopping: '#8b5cf6',
      other: '#6b7280'
    };
    return colors[category] || '#6b7280';
  };

  // Get currency symbol
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
    const expected = parseFloat(formData.amount) || 0;
    return Math.abs(total - expected) < 0.01; // Allow small rounding differences
  };

  const handleCustomCurrencyChange = (e) => {
    const value = e.target.value;
    setCustomCurrency(value);
    setFormData(prev => ({ ...prev, currency: value }));
  };

  // Calculate total transactions based on selected trip
  const getTotalTransactions = () => {
    if (selectedTrip === 'all') {
      return Object.values(tripExpenses).reduce((total, tripData) => {
        return total + (tripData.expenses?.length || 0);
      }, 0);
    } else {
      return tripExpenses[selectedTrip]?.expenses?.length || 0;
    }
  };

  if (loading) {
    return (
      <div className="expenses-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Welcome Section */}
      <section className="dashboard-welcome">
        <div className="welcome-content">
          <div className="user-welcome">
            <h1>Expense Tracker 💰</h1>
            <p className="user-subtitle">
              Track and manage expenses for your trips
            </p>
          </div>
          <button 
            className="primary-btn"
            onClick={() => setShowAddForm(true)}
            style={{ marginTop: '20px' }}
          >
            Add Expense
          </button>
        </div>
      </section>

             {/* Stats */}
       <section className="dashboard-stats">
         <div className="stats-grid">
           <div className="stat-card">
             <div className="stat-icon">💰</div>
             <div className="stat-content">
               <h3>{getTotalTransactions()}</h3>
               <p>Total Transactions</p>
             </div>
           </div>
         </div>
       </section>

             {/* Trip Navigation */}
       <section className="trip-navigation">
         <div className="trip-tabs">
           <button 
             className={`trip-tab ${selectedTrip === 'all' ? 'active' : ''}`}
             onClick={() => setSelectedTrip('all')}
           >
             All Trips
           </button>
           {userTrips.map(trip => (
             <button 
               key={trip._id}
               className={`trip-tab ${selectedTrip === trip._id ? 'active' : ''}`}
               onClick={() => setSelectedTrip(trip._id)}
             >
               {trip.destination}
             </button>
           ))}
         </div>
         
         {/* Expense Status Filter */}
         <div className="expense-filter">
           <button 
             className={`filter-btn ${expenseFilter === 'all' ? 'active' : ''}`}
             onClick={() => setExpenseFilter('all')}
           >
             All Expenses
           </button>
           <button 
             className={`filter-btn ${expenseFilter === 'pending' ? 'active' : ''}`}
             onClick={() => setExpenseFilter('pending')}
           >
             ⏳ Pending
           </button>
           <button 
             className={`filter-btn ${expenseFilter === 'settled' ? 'active' : ''}`}
             onClick={() => setExpenseFilter('settled')}
           >
             ✅ Settled
           </button>
         </div>
       </section>

      {/* Trip-wise Expenses */}
      {userTrips.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧳</div>
          <h3>No trips yet</h3>
          <p>Create a trip to start tracking expenses</p>
        </div>
      ) : (
        (selectedTrip === 'all' ? userTrips : userTrips.filter(trip => trip._id === selectedTrip)).map(trip => {
          const tripData = tripExpenses[trip._id];
          const expenses = tripData?.expenses || [];
          const summary = tripData?.summary || { totalAmount: 0, totalExpenses: 0 };
          
                     return (
             <section key={trip._id} className="trip-expenses-section">
               <div className="trip-transaction-count">
                 <span className="transaction-count-text">
                   {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
                 </span>
               </div>
               <div className="trip-header">
                 <h2>{trip.destination}</h2>
                 <div className="trip-summary">
                   <span className="trip-total">
                     {expenses.length > 0 && expenses[0].currency ? 
                       `${getCurrencySymbol(expenses[0].currency)}${summary.totalAmount.toFixed(2)}` : 
                       '$0.00'
                     }
                   </span>
                   <span className="trip-count">
                     {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                   </span>
                 </div>
               </div>

              {expenses.length === 0 ? (
                <div className="empty-trip-state">
                  <p>No expenses for this trip yet</p>
                  <button 
                    className="primary-btn"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, groupId: trip._id }));
                      setShowAddForm(true);
                    }}
                  >
                    Add First Expense
                  </button>
                </div>
              ) : (
                                 <div className="expenses-grid">
                   {expenses
                     .filter(expense => {
                       if (expenseFilter === 'all') return true;
                       if (expenseFilter === 'pending') return expense.status === 'pending';
                       if (expenseFilter === 'settled') return expense.status === 'settled';
                       return true;
                     })
                     .map(expense => (
                     <div key={expense._id} className="expense-card">
                       <div className="expense-header">
                         <div className="expense-category">
                           <span 
                             className="category-icon"
                             style={{ backgroundColor: getExpenseCategoryColor(expense.category) }}
                           >
                             {getExpenseCategoryIcon(expense.category)}
                           </span>
                           <div className="category-info">
                             <h4>{expense.description}</h4>
                             <span className="category-name">{expense.category}</span>
                           </div>
                         </div>
                         <div className="expense-amount">
                           <span className="amount">{getCurrencySymbol(expense.currency)}{expense.amount}</span>
                           <span className="currency">{expense.currency}</span>
                         </div>
                       </div>
                       
                                                <div className="expense-details">
                           <div className="detail-item">
                             <span className="detail-label">Date:</span>
                             <span className="detail-value">
                               {new Date(expense.date).toLocaleDateString()}
                             </span>
                           </div>
                           <div className="detail-item">
                             <span className="detail-label">Status:</span>
                             <span className={`detail-value status-${expense.status}`}>
                               {expense.status === 'settled' ? '✅ Settled' : '⏳ Pending'}
                             </span>
                           </div>
                           {expense.notes && (
                             <div className="detail-item">
                               <span className="detail-label">Notes:</span>
                               <span className="detail-value">{expense.notes}</span>
                             </div>
                           )}
                         </div>

                       <div className="expense-actions">
                         <button 
                           className="settlement-btn"
                           onClick={() => handleViewSettlements(expense)}
                         >
                           💰 Settlements
                         </button>
                         <button 
                           className="edit-btn"
                           onClick={() => handleEditExpense(expense)}
                         >
                           ✏️ Edit
                         </button>
                         <button 
                           className="delete-btn"
                           onClick={() => handleDeleteExpense(expense._id)}
                         >
                           🗑️ Delete
                         </button>
                       </div>
                     </div>
                   ))}
                 </div>
                               )}
              </section>
            );
          })
        )}

      {/* Add Expense Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Expense</h2>
              <button 
                className="close-btn"
                onClick={() => setShowAddForm(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="expense-form">
                             <div className="form-group">
                 <label htmlFor="groupId">Trip *</label>
                 <select
                   id="groupId"
                   name="groupId"
                   value={formData.groupId}
                   onChange={handleTripChange}
                   required
                 >
                   <option value="">Select a trip</option>
                   {userTrips.map(trip => (
                     <option key={trip._id} value={trip._id}>
                       {trip.destination}
                     </option>
                   ))}
                 </select>
               </div>

               {selectedTripMembers.length > 0 && (
                 <div className="form-group">
                   <label>Split Between Members *</label>
                   <div className="member-selection">
                     {selectedTripMembers.map(member => (
                       <label key={member._id} className="member-checkbox">
                         <input
                           type="checkbox"
                           checked={formData.splitBetween.includes(member._id)}
                           onChange={() => handleMemberToggle(member._id)}
                         />
                         <span className="member-name">{member.name}</span>
                       </label>
                     ))}
                   </div>
                   
                   {/* Split Type Selection */}
                   <div className="form-group">
                     <label>Split Type</label>
                     <div className="split-type-selection">
                       <label className="split-type-option">
                         <input
                           type="radio"
                           name="splitType"
                           value="auto"
                           checked={splitType === 'auto'}
                           onChange={(e) => setSplitType(e.target.value)}
                         />
                         <span>Auto Split (Equal amounts)</span>
                       </label>
                       <label className="split-type-option">
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

                   {/* Split Information */}
                   {splitType === 'auto' && (
                     <div className="split-info">
                       <small>
                         Amount per person: {getCurrencySymbol(formData.currency)}{getAmountPerPerson().toFixed(2)}
                       </small>
                     </div>
                   )}

                   {/* Manual Split Inputs */}
                   {splitType === 'manual' && formData.splitBetween.length > 0 && (
                     <div className="manual-split-section">
                       <label>Manual Split Amounts *</label>
                       <div className="manual-split-inputs">
                         {selectedTripMembers
                           .filter(member => formData.splitBetween.includes(member._id))
                           .map(member => (
                             <div key={member._id} className="manual-split-input">
                               <label>{member.name}:</label>
                               <input
                                 type="number"
                                 value={manualSplits[member._id] || ''}
                                 onChange={(e) => handleManualSplitChange(member._id, e.target.value)}
                                 placeholder="0.00"
                                 min="0"
                                 step="0.01"
                                 required
                               />
                             </div>
                           ))}
                       </div>
                       <div className="manual-split-summary">
                         <small>
                           Total: {getCurrencySymbol(formData.currency)}{getTotalManualSplit().toFixed(2)} / {getCurrencySymbol(formData.currency)}{formData.amount || '0.00'}
                           {!isManualSplitValid() && formData.amount && (
                             <span className="split-error"> (Amounts must equal total)</span>
                           )}
                         </small>
                       </div>
                     </div>
                   )}
                 </div>
               )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="amount">Amount *</label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency}
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
                <label htmlFor="description">Description *</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="e.g., Dinner at restaurant"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
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
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes about this expense..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditForm && editingExpense && (
        <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Expense</h2>
              <button 
                className="close-btn"
                onClick={() => setShowEditForm(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpdateExpense} className="expense-form">
                             <div className="form-group">
                 <label htmlFor="edit-groupId">Trip *</label>
                 <select
                   id="edit-groupId"
                   name="groupId"
                   value={formData.groupId}
                   onChange={handleTripChange}
                   required
                 >
                   <option value="">Select a trip</option>
                   {userTrips.map(trip => (
                     <option key={trip._id} value={trip._id}>
                       {trip.destination}
                     </option>
                   ))}
                 </select>
               </div>

               {selectedTripMembers.length > 0 && (
                 <div className="form-group">
                   <label>Split Between Members *</label>
                   <div className="member-selection">
                     {selectedTripMembers.map(member => (
                       <label key={member._id} className="member-checkbox">
                         <input
                           type="checkbox"
                           checked={formData.splitBetween.includes(member._id)}
                           onChange={() => handleMemberToggle(member._id)}
                         />
                         <span className="member-name">{member.name}</span>
                       </label>
                     ))}
                   </div>
                   <div className="split-info">
                     <small>
                       Amount per person: {getCurrencySymbol(formData.currency)}{formData.amount && formData.splitBetween.length > 0 
                         ? (formData.amount / formData.splitBetween.length).toFixed(2) 
                         : '0.00'}
                     </small>
                   </div>
                 </div>
               )}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="edit-amount">Amount *</label>
                  <input
                    type="number"
                    id="edit-amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-currency">Currency</label>
                  <select
                    id="edit-currency"
                    name="currency"
                    value={formData.currency}
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
                <label htmlFor="edit-description">Description *</label>
                <input
                  type="text"
                  id="edit-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="e.g., Dinner at restaurant"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-category">Category</label>
                <select
                  id="edit-category"
                  name="category"
                  value={formData.category}
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
                <label htmlFor="edit-notes">Notes</label>
                <textarea
                  id="edit-notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes about this expense..."
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowEditForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                >
                  Update Expense
                </button>
              </div>
            </form>
          </div>
                 </div>
       )}

       {/* Settlement Modal */}
       {showSettlementModal && selectedExpense && settlementData && (
         <div className="modal-overlay" onClick={() => setShowSettlementModal(false)}>
           <div className="modal-content settlement-modal" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header">
               <h2>Expense Settlements</h2>
               <button 
                 className="close-btn"
                 onClick={() => setShowSettlementModal(false)}
               >
                 ✕
               </button>
             </div>
             
             <div className="settlement-content">
               <div className="expense-summary">
                 <h3>{selectedExpense.description}</h3>
                 <p className="expense-amount">{getCurrencySymbol(selectedExpense.currency)}{selectedExpense.amount} {selectedExpense.currency}</p>
                 <p className="expense-status">
                   Status: <span className={`status-${selectedExpense.status}`}>{selectedExpense.status}</span>
                 </p>
               </div>

               <div className="settlement-stats">
                 <div className="stat-item">
                   <span className="stat-label">Total Paid:</span>
                   <span className="stat-value">{getCurrencySymbol(selectedExpense.currency)}{settlementData.settlements.totalPaid.toFixed(2)}</span>
                 </div>
                 <div className="stat-item">
                   <span className="stat-label">Pending:</span>
                   <span className="stat-value">{getCurrencySymbol(selectedExpense.currency)}{settlementData.settlements.totalPending.toFixed(2)}</span>
                 </div>
               </div>

               <div className="settlement-sections">
                 <div className="settlement-section">
                   <h4>Pending Payments</h4>
                   {settlementData.settlements.pending.length === 0 ? (
                     <p className="no-payments">All payments completed! 🎉</p>
                   ) : (
                     <div className="pending-payments">
                       {settlementData.settlements.pending.map((settlement, index) => (
                         <div key={index} className="payment-item">
                           <div className="payment-info">
                             <div className="payment-from">
                               <span className="user-avatar">
                                 {settlement.from.name?.charAt(0) || 'U'}
                               </span>
                               <span className="user-name">{settlement.from.name}</span>
                             </div>
                             <div className="payment-amount">{getCurrencySymbol(selectedExpense.currency)}{settlement.amount.toFixed(2)}</div>
                           </div>
                           <button 
                             className="mark-paid-btn"
                             onClick={() => handleMarkAsPaid(selectedExpense._id, settlement.from._id)}
                           >
                             Mark as Paid
                           </button>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>

                 <div className="settlement-section">
                   <h4>Payment Breakdown</h4>
                   <div className="payment-breakdown">
                     {settlementData.expense.shares.map((share, index) => (
                       <div key={index} className="share-item">
                         <div className="share-user">
                           <span className="user-avatar">
                             {share.userId.name?.charAt(0) || 'U'}
                           </span>
                           <span className="user-name">{share.userId.name}</span>
                         </div>
                         <div className="share-details">
                           <span className="share-amount">{getCurrencySymbol(selectedExpense.currency)}{share.amount.toFixed(2)}</span>
                           <span className={`share-status status-${share.status}`}>
                             {share.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                           </span>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 } 