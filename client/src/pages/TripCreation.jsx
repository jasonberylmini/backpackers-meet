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
    privacy: 'public',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});
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
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      toast.success('Image uploaded successfully!');
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.destination.trim()) {
      errors.destination = 'Destination is required';
    }
    
    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    } else if (new Date(formData.startDate) <= new Date()) {
      errors.startDate = 'Start date must be in the future';
    }
    
    if (!formData.endDate) {
      errors.endDate = 'End date is required';
    } else if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      errors.endDate = 'End date must be after start date';
    }
    
    if (!formData.budget) {
      errors.budget = 'Budget is required';
    } else if (parseInt(formData.budget) < 0) {
      errors.budget = 'Budget cannot be negative';
    }
    
    if (!formData.tripType) {
      errors.tripType = 'Please select a trip type';
    }
    
    if (formData.maxMembers && parseInt(formData.maxMembers) < 1) {
      errors.maxMembers = 'Max members must be at least 1';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
          if (formData[key] instanceof File) {
            submitData.append(key, formData[key]);
          } else {
            submitData.append(key, formData[key]);
          }
        }
      });
      
      console.log('Submitting trip data:', Object.fromEntries(submitData));
      
      const response = await axios.post('/api/trips/create', submitData, { 
        headers: { 
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Trip creation response:', response.data);
      
      toast.success('Trip created successfully!');
      
      // Navigate to the trip details page
      if (response.data.trip && response.data.trip._id) {
        navigate(`/trips/${response.data.trip._id}`);
      } else {
        // Fallback to browse page if trip ID is not available
        navigate('/trips/browse');
      }
    } catch (error) {
      console.error('Failed to create trip:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const tripTypes = [
    { value: 'carpool', label: '🚗 Carpool', description: 'Share rides with other travelers', color: '#3b82f6' },
    { value: 'backpacking', label: '🎒 Backpacking', description: 'Budget-friendly adventure travel', color: '#10b981' },
    { value: 'luxury', label: '💎 Luxury', description: 'Premium travel experiences', color: '#8b5cf6' },
    { value: 'adventure', label: '🏔️ Adventure', description: 'Thrilling outdoor activities', color: '#f59e0b' },
    { value: 'cultural', label: '🏛️ Cultural', description: 'Explore local culture and history', color: '#ef4444' },
    { value: 'beach', label: '🏖️ Beach', description: 'Relaxing beach getaways', color: '#06b6d4' }
  ];

  const getSelectedTripType = () => {
    return tripTypes.find(type => type.value === formData.tripType);
  };

  const getCurrencySymbol = (currency = 'INR') => {
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
    return symbols[currency] || '₹';
  };

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
            {/* Trip Image Upload */}
            <section className="form-section">
              <h2>Trip Image</h2>
              <div className="image-upload-section">
                {imagePreview ? (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Trip preview" />
                    <button 
                      type="button" 
                      className="remove-image-btn"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData(prev => ({ ...prev, image: null }));
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="image-upload-placeholder">
                    <div className="upload-icon">📷</div>
                    <p>Add a photo for your trip</p>
                    <small>This will help others understand your trip better</small>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="image-input"
                  id="tripImage"
                />
                <label htmlFor="tripImage" className="upload-btn">
                  {imagePreview ? 'Change Image' : 'Upload Image'}
                </label>
              </div>
            </section>

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
                  className={formErrors.destination ? 'error' : ''}
                />
                {formErrors.destination && (
                  <span className="error-message">{formErrors.destination}</span>
                )}
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
                    className={formErrors.startDate ? 'error' : ''}
                  />
                  {formErrors.startDate && (
                    <span className="error-message">{formErrors.startDate}</span>
                  )}
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
                    className={formErrors.endDate ? 'error' : ''}
                  />
                  {formErrors.endDate && (
                    <span className="error-message">{formErrors.endDate}</span>
                  )}
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
                    onClick={() => {
                      setFormData(prev => ({ ...prev, tripType: type.value }));
                      if (formErrors.tripType) {
                        setFormErrors(prev => ({ ...prev, tripType: '' }));
                      }
                    }}
                    style={{
                      borderColor: formData.tripType === type.value ? type.color : '#e5e7eb',
                      backgroundColor: formData.tripType === type.value ? type.color : 'white'
                    }}
                  >
                    <div className="type-icon">{type.label.split(' ')[0]}</div>
                    <div className="type-content">
                      <h3>{type.label.split(' ').slice(1).join(' ')}</h3>
                      <p>{type.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {formErrors.tripType && (
                <span className="error-message">{formErrors.tripType}</span>
              )}
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
                    className={formErrors.budget ? 'error' : ''}
                  />
                  {formErrors.budget && (
                    <span className="error-message">{formErrors.budget}</span>
                  )}
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
                    className={formErrors.maxMembers ? 'error' : ''}
                  />
                  {formErrors.maxMembers && (
                    <span className="error-message">{formErrors.maxMembers}</span>
                  )}
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
                <small className="form-hint">
                  {formData.description.length}/500 characters
                </small>
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

            {/* Trip Summary */}
            {formData.destination && formData.tripType && (
              <section className="form-section trip-summary">
                <h2>Trip Summary</h2>
                <div className="summary-card">
                  <div className="summary-header">
                    <div className="summary-icon">
                      {getSelectedTripType()?.label.split(' ')[0]}
                    </div>
                    <div className="summary-info">
                      <h3>{formData.destination}</h3>
                      <p>{getSelectedTripType()?.label.split(' ').slice(1).join(' ')}</p>
                    </div>
                  </div>
                  <div className="summary-details">
                    <div className="summary-item">
                      <span className="label">Dates:</span>
                      <span className="value">
                        {formData.startDate && formData.endDate 
                          ? `${new Date(formData.startDate).toLocaleDateString()} - ${new Date(formData.endDate).toLocaleDateString()}`
                          : 'Not set'
                        }
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Budget:</span>
                      <span className="value">
                        {formData.budget ? `${getCurrencySymbol()}${formData.budget}` : 'Not set'}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Members:</span>
                      <span className="value">
                        {formData.maxMembers ? `Max ${formData.maxMembers}` : 'No limit'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

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