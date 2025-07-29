import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './TripCreation.css';

export default function TripCreation() {
  const [formData, setFormData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    tripType: '',
    description: '',
    maxMembers: '',
    privacy: 'public'
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.destination || !formData.startDate || !formData.endDate || 
        !formData.budget || !formData.tripType) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.startDate) <= new Date()) {
      toast.error('Start date must be in the future');
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post('/api/trips/create', formData, { headers });
      
      toast.success('Trip created successfully!');
      navigate(`/trips/${response.data.trip._id}`);
    } catch (error) {
      console.error('Failed to create trip:', error);
      toast.error(error.response?.data?.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const tripTypes = [
    { value: 'carpool', label: '🚗 Carpool', description: 'Share rides with other travelers' },
    { value: 'backpacking', label: '🎒 Backpacking', description: 'Budget-friendly adventure travel' },
    { value: 'luxury', label: '💎 Luxury', description: 'Premium travel experiences' },
    { value: 'adventure', label: '🏔️ Adventure', description: 'Thrilling outdoor activities' },
    { value: 'cultural', label: '🏛️ Cultural', description: 'Explore local culture and history' },
    { value: 'beach', label: '🏖️ Beach', description: 'Relaxing beach getaways' }
  ];

  if (!user) {
    return (
      <div className="trip-creation-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
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
            <h1>Create Your Trip ✈️</h1>
            <p className="user-subtitle">
              Plan your next adventure and connect with fellow travelers
            </p>
          </div>
        </div>
      </section>

      {/* Creation Form */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Create New Trip</h2>
          <button 
            className="view-all-btn"
            onClick={() => navigate('/trips/browse')}
          >
            ← Back to Trips
          </button>
        </div>
        
        <div className="creation-content">
        <form onSubmit={handleSubmit} className="creation-form">
          {/* Basic Information */}
          <section className="form-section">
            <h2>Basic Information</h2>
            
            <div className="form-group">
              <label htmlFor="destination">Destination *</label>
              <input
                type="text"
                id="destination"
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                placeholder="e.g., Paris, France"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Start Date *</label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate">End Date *</label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>
          </section>

          {/* Trip Type */}
          <section className="form-section">
            <h2>Trip Type *</h2>
            <div className="trip-type-grid">
              {tripTypes.map(type => (
                <div 
                  key={type.value}
                  className={`trip-type-card ${formData.tripType === type.value ? 'selected' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, tripType: type.value }))}
                >
                  <div className="type-icon">{type.label.split(' ')[0]}</div>
                  <div className="type-content">
                    <h3>{type.label.split(' ').slice(1).join(' ')}</h3>
                    <p>{type.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Budget and Group */}
          <section className="form-section">
            <h2>Budget & Group</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="budget">Budget (₹) *</label>
                <input
                  type="number"
                  id="budget"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  placeholder="5000"
                  min="0"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="maxMembers">Max Members</label>
                <input
                  type="number"
                  id="maxMembers"
                  name="maxMembers"
                  value={formData.maxMembers}
                  onChange={handleInputChange}
                  placeholder="Leave empty for no limit"
                  min="1"
                  max="100"
                />
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="form-section">
            <h2>Trip Description</h2>
            <div className="form-group">
              <label htmlFor="description">Tell others about your trip</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Share what you're planning to do, places you want to visit, and what kind of travelers you're looking for..."
                rows="4"
              />
            </div>
          </section>

          {/* Privacy */}
          <section className="form-section">
            <h2>Privacy Settings</h2>
            <div className="form-group">
              <label htmlFor="privacy">Trip Visibility</label>
              <select
                id="privacy"
                name="privacy"
                value={formData.privacy}
                onChange={handleInputChange}
              >
                <option value="public">Public - Anyone can see and join</option>
                <option value="private">Private - Only invited members can join</option>
              </select>
            </div>
          </section>

          {/* Submit */}
          <section className="form-section">
            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => navigate('/trips/browse')}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="create-btn"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Trip'}
              </button>
            </div>
          </section>
        </form>
        </div>
      </section>
    </div>
  );
} 