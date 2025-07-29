import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Expenses.css';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [userTrips, setUserTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    tripId: '',
    amount: '',
    description: '',
    category: 'other',
    currency: 'INR',
    splitBetween: [],
    notes: ''
  });
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
      const headers = { Authorization: `Bearer ${token}` };
      
      const [expensesRes, tripsRes] = await Promise.all([
        axios.get('/api/expenses/my-expenses', { headers }),
        axios.get('/api/trips/my-trips', { headers })
      ]);
      
      setExpenses(expensesRes.data);
      setUserTrips(tripsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
      toast.error('Failed to load expenses');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tripId || !formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post('/api/expenses/create', formData, { headers });
      
      toast.success('Expense added successfully!');
      setShowAddForm(false);
      setFormData({
        tripId: '',
        amount: '',
        description: '',
        category: 'other',
        currency: 'INR',
        splitBetween: [],
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast.error(error.response?.data?.message || 'Failed to add expense');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete(`/api/expenses/${expenseId}`, { headers });
      toast.success('Expense deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setFormData({
      tripId: expense.groupId || '',
      amount: expense.amount.toString(),
      description: expense.description || '',
      category: expense.category || 'other',
      currency: expense.currency || 'INR',
      splitBetween: expense.splitBetween || [],
      notes: expense.notes || ''
    });
    setShowEditForm(true);
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    
    if (!formData.tripId || !formData.amount || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put(`/api/expenses/${editingExpense._id}`, formData, { headers });
      
      toast.success('Expense updated successfully!');
      setShowEditForm(false);
      setEditingExpense(null);
      setFormData({
        tripId: '',
        amount: '',
        description: '',
        category: 'other',
        currency: 'INR',
        splitBetween: [],
        notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update expense:', error);
      toast.error(error.response?.data?.message || 'Failed to update expense');
    }
  };

  const getTotalExpenses = () => {
    const filteredExpenses = selectedTrip === 'all' 
      ? expenses 
      : expenses.filter(expense => expense.groupId === selectedTrip);
    
    return filteredExpenses.reduce((total, expense) => total + expense.amount, 0);
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

  const filteredExpenses = selectedTrip === 'all' 
    ? expenses 
    : expenses.filter(expense => expense.groupId === selectedTrip);

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
        </div>
      </section>

      {/* Stats */}
      <section className="dashboard-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h3>₹{getTotalExpenses().toLocaleString()}</h3>
              <p>Total Expenses</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>{filteredExpenses.length}</h3>
              <p>Total Transactions</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🧳</div>
            <div className="stat-content">
              <h3>{userTrips.length}</h3>
              <p>Active Trips</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="expenses-filters">
        <div className="filters-content">
          <div className="filter-group">
            <label>Filter by Trip:</label>
            <select 
              value={selectedTrip} 
              onChange={(e) => setSelectedTrip(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Trips</option>
              {userTrips.map(trip => (
                <option key={trip._id} value={trip._id}>
                  {trip.destination}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Expenses List */}
      <section className="expenses-list">
        <div className="list-header">
          <h2>Recent Expenses</h2>
          {filteredExpenses.length > 0 && (
            <span className="expense-count">
              {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <h3>No expenses yet</h3>
            <p>Start tracking your trip expenses to keep your budget organized</p>
            <button 
              className="primary-btn"
              onClick={() => setShowAddForm(true)}
            >
              Add First Expense
            </button>
          </div>
        ) : (
          <div className="expenses-grid">
            {filteredExpenses.map(expense => (
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
                    <span className="amount">₹{expense.amount}</span>
                    <span className="currency">{expense.currency}</span>
                  </div>
                </div>
                
                <div className="expense-details">
                  <div className="detail-item">
                    <span className="detail-label">Trip:</span>
                    <span className="detail-value">
                      {userTrips.find(trip => trip._id === expense.groupId)?.destination || 'Unknown Trip'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">
                      {new Date(expense.createdAt).toLocaleDateString()}
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
                <label htmlFor="tripId">Trip *</label>
                <select
                  id="tripId"
                  name="tripId"
                  value={formData.tripId}
                  onChange={handleInputChange}
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
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="GBP">£ GBP</option>
                  </select>
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
                <label htmlFor="edit-tripId">Trip *</label>
                <select
                  id="edit-tripId"
                  name="tripId"
                  value={formData.tripId}
                  onChange={handleInputChange}
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
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                    <option value="GBP">£ GBP</option>
                  </select>
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
    </div>
  );
} 