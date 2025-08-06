import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './TripCreation.css';

export default function TripCreation() {
  const [activeTab, setActiveTab] = useState('my-trips'); // 'my-trips' or 'create-trip'
  const [joinedTrips, setJoinedTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'upcoming', 'active', 'completed'
  
  // Form data for creating trips
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
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchJoinedTrips();
  }, []);

  const fetchJoinedTrips = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please log in to view your trips');
        setLoading(false);
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      console.log('Fetching trips with token:', token.substring(0, 20) + '...');
      
      const response = await axios.get('/api/trips/mine', { headers });
      console.log('Trips response:', response.data);
      setJoinedTrips(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch joined trips:', error);
      console.error('Error response:', error.response?.data);
      setLoading(false);
      
      if (error.response?.status === 401) {
        toast.error('Please log in to view your trips');
      } else if (error.response?.status === 404) {
        // No trips found - this is normal for new users
        setJoinedTrips([]);
      } else {
        toast.error('Failed to load your trips. Please try again later.');
      }
    }
  };

  const getTripStatus = (trip) => {
    const now = new Date();
    const startDate = new Date(trip.startDate || trip.date);
    const endDate = new Date(trip.endDate || trip.date);
    
    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'active';
    return 'completed';
  };

  const getTripImage = (trip) => {
    if (trip.images && trip.images.length > 0) {
      const imagePath = trip.images[0];
      if (imagePath.startsWith('/uploads/')) {
        return `http://localhost:5000${imagePath}`;
      }
      return imagePath;
    }
    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=250&fit=crop';
  };

  const getTotalMembers = (trip) => {
    if (!trip) return 0;
    const creatorInMembers = trip.members.some(member => member._id === trip.creator._id);
    return trip.members.length + (creatorInMembers ? 0 : 1);
  };

  const getTripTypeIcon = (tripType) => {
    const icons = {
      'carpool': '🚗',
      'backpacking': '🎒',
      'luxury': '💎',
      'adventure': '🏔️',
      'cultural': '🏛️',
      'beach': '🏖️'
    };
    return icons[tripType] || '🧳';
  };

  // Categorize joined trips
  const categorizedTrips = joinedTrips.reduce((acc, trip) => {
    const status = getTripStatus(trip);
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(trip);
    return acc;
  }, {});

  const getFilteredTrips = () => {
    if (activeCategory === 'all') {
      return joinedTrips;
    }
    return categorizedTrips[activeCategory] || [];
  };

  const filteredTrips = getFilteredTrips();

  const getCategoryCount = (category) => {
    if (category === 'all') return joinedTrips.length;
    return categorizedTrips[category]?.length || 0;
  };

  // Form handling functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
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
      if (file.size > 5 * 1024 * 1024) {
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
      errors.tripType = 'Trip type is required';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!formData.maxMembers) {
      errors.maxMembers = 'Maximum members is required';
    } else if (parseInt(formData.maxMembers) < 2) {
      errors.maxMembers = 'Minimum 2 members required';
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
    
    try {
      setCreatingTrip(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      await axios.post('/api/trips/create', formDataToSend, { headers });
      toast.success('Trip created successfully!');
      
      // Reset form
      setFormData({
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
      setImagePreview(null);
      setFormErrors({});
      
      // Switch to my trips tab and refresh
      setActiveTab('my-trips');
      fetchJoinedTrips();
      
    } catch (error) {
      console.error('Failed to create trip:', error);
      toast.error(error.response?.data?.message || 'Failed to create trip');
    } finally {
      setCreatingTrip(false);
    }
  };

  if (loading) {
    return (
      <div className="my-trips-container">
        <div className="loading-state-modern">
          <div className="loading-spinner-modern"></div>
          <h3>Loading Your Trips</h3>
          <p>Fetching your amazing adventures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-trips-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              My Trips
              <span className="hero-accent">✨</span>
            </h1>
            <p className="hero-subtitle">
              Manage your adventures and create new ones
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="main-content">
        {/* Tab Navigation */}
        <section className="tab-navigation-section">
          <div className="tab-navigation">
            <button
              className={`tab-nav-btn ${activeTab === 'my-trips' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-trips')}
            >
              <span className="tab-icon">🧳</span>
              <span className="tab-label">My Trips</span>
              <span className="tab-count">({joinedTrips.length})</span>
            </button>
            <button
              className={`tab-nav-btn ${activeTab === 'create-trip' ? 'active' : ''}`}
              onClick={() => setActiveTab('create-trip')}
            >
              <span className="tab-icon">✨</span>
              <span className="tab-label">Create Trip</span>
            </button>
          </div>
        </section>

        {/* My Trips Tab */}
        {activeTab === 'my-trips' && (
          <>
            {/* Category Tabs */}
            <section className="category-tabs-section">
              <div className="category-tabs">
                <button
                  className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('all')}
                >
                  <span className="tab-icon">🌍</span>
                  <span className="tab-label">All Trips</span>
                  <span className="tab-count">({getCategoryCount('all')})</span>
                </button>
                <button
                  className={`category-tab ${activeCategory === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('upcoming')}
                >
                  <span className="tab-icon">🕒</span>
                  <span className="tab-label">Upcoming</span>
                  <span className="tab-count">({getCategoryCount('upcoming')})</span>
                </button>
                <button
                  className={`category-tab ${activeCategory === 'active' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('active')}
                >
                  <span className="tab-icon">🟢</span>
                  <span className="tab-label">Active</span>
                  <span className="tab-count">({getCategoryCount('active')})</span>
                </button>
                <button
                  className={`category-tab ${activeCategory === 'completed' ? 'active' : ''}`}
                  onClick={() => setActiveCategory('completed')}
                >
                  <span className="tab-icon">✅</span>
                  <span className="tab-label">Completed</span>
                  <span className="tab-count">({getCategoryCount('completed')})</span>
                </button>
              </div>
            </section>

            {/* Trips Grid */}
            {filteredTrips.length === 0 ? (
              <section className="empty-state-modern">
                <div className="empty-content">
                  <div className="empty-icon-modern">🧳</div>
                  <h3>No trips found</h3>
                  <p>
                    {activeCategory === 'all' 
                      ? "You haven't joined any trips yet. Start exploring or create your own adventure!"
                      : `No ${activeCategory} trips found. Check other categories or join some trips!`
                    }
                  </p>
                  <div className="empty-actions">
                    <button 
                      className="primary-btn-modern"
                      onClick={() => navigate('/trips/browse')}
                    >
                      Discover Trips
                    </button>
                    <button 
                      className="secondary-btn-modern"
                      onClick={() => setActiveTab('create-trip')}
                    >
                      Create Trip
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="trips-section">
                <div className="trips-grid">
                  {filteredTrips.map(trip => (
                    <div key={trip._id} className="trip-card-modern">
                      <div className="trip-image-modern">
                        <img 
                          src={getTripImage(trip)} 
                          alt={trip.destination}
                          className="trip-img"
                        />
                        <div className="trip-overlay-modern">
                          <div className="trip-type-badge">
                            {trip.tripType}
                          </div>
                        </div>
                        <div className="trip-gradient"></div>
                      </div>

                      <div className="trip-content-modern">
                        <div className="trip-header-modern">
                          <h3 className="trip-title">{trip.destination}</h3>
                          <div className="trip-meta">
                            <span className="trip-creator">
                              by {trip.creator?.username || trip.creator?.name || 'Unknown'}
                            </span>
                          </div>
                        </div>

                        <p className="trip-description-modern">
                          {trip.description || 'Join this amazing adventure and create unforgettable memories!'}
                        </p>

                        <div className="trip-details-modern">
                          <div className="detail-item-modern">
                            <span className="detail-icon-modern">📅</span>
                            <span className="detail-text">
                              {new Date(trip.startDate || trip.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="detail-item-modern">
                            <span className="detail-icon-modern">👥</span>
                            <span className="detail-text">
                              {getTotalMembers(trip)}/{trip.maxMembers || '∞'} members
                            </span>
                          </div>
                        </div>

                        <div className="trip-actions-modern">
                          <button 
                            className="view-details-btn-modern"
                            onClick={() => navigate(`/trips/${trip._id}`)}
                          >
                            View Details
                          </button>
                          <button 
                            className="chat-btn-modern"
                            onClick={() => navigate(`/messages?tripId=${trip._id}`)}
                          >
                            Chat
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Create Trip Tab */}
        {activeTab === 'create-trip' && (
          <section className="create-trip-section">
            <div className="create-trip-container">
              <div className="create-trip-header">
                <h2>Create New Trip</h2>
                <p>Start your adventure and invite fellow travelers to join you</p>
              </div>

              <form onSubmit={handleSubmit} className="create-trip-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Destination *</label>
                    <input
                      type="text"
                      name="destination"
                      value={formData.destination}
                      onChange={handleInputChange}
                      className={`form-input ${formErrors.destination ? 'error' : ''}`}
                      placeholder="Where are you going?"
                    />
                    {formErrors.destination && (
                      <span className="error-message">{formErrors.destination}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Trip Type *</label>
                    <select
                      name="tripType"
                      value={formData.tripType}
                      onChange={handleInputChange}
                      className={`form-select ${formErrors.tripType ? 'error' : ''}`}
                    >
                      <option value="">Select trip type</option>
                      <option value="carpool">🚗 Carpool</option>
                      <option value="backpacking">🎒 Backpacking</option>
                      <option value="luxury">💎 Luxury</option>
                      <option value="adventure">🏔️ Adventure</option>
                      <option value="cultural">🏛️ Cultural</option>
                      <option value="beach">🏖️ Beach</option>
                    </select>
                    {formErrors.tripType && (
                      <span className="error-message">{formErrors.tripType}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Start Date *</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className={`form-input ${formErrors.startDate ? 'error' : ''}`}
                    />
                    {formErrors.startDate && (
                      <span className="error-message">{formErrors.startDate}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">End Date *</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className={`form-input ${formErrors.endDate ? 'error' : ''}`}
                    />
                    {formErrors.endDate && (
                      <span className="error-message">{formErrors.endDate}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Budget (₹) *</label>
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      className={`form-input ${formErrors.budget ? 'error' : ''}`}
                      placeholder="Estimated budget per person"
                    />
                    {formErrors.budget && (
                      <span className="error-message">{formErrors.budget}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Max Members *</label>
                    <input
                      type="number"
                      name="maxMembers"
                      value={formData.maxMembers}
                      onChange={handleInputChange}
                      className={`form-input ${formErrors.maxMembers ? 'error' : ''}`}
                      placeholder="Maximum number of travelers"
                      min="2"
                    />
                    {formErrors.maxMembers && (
                      <span className="error-message">{formErrors.maxMembers}</span>
                    )}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className={`form-textarea ${formErrors.description ? 'error' : ''}`}
                    placeholder="Tell travelers about your trip plans, activities, and what to expect..."
                    rows="4"
                  />
                  {formErrors.description && (
                    <span className="error-message">{formErrors.description}</span>
                  )}
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Trip Image</label>
                  <div className="image-upload-container">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="image-upload-input"
                      id="trip-image"
                    />
                    <label htmlFor="trip-image" className="image-upload-label">
                      {imagePreview ? (
                        <div className="image-preview">
                          <img src={imagePreview} alt="Preview" />
                          <span className="change-image">Change Image</span>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <span className="upload-icon">📷</span>
                          <span>Click to upload trip image</span>
                          <span className="upload-hint">Max 5MB</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Privacy</label>
                  <div className="privacy-options">
                    <label className="privacy-option">
                      <input
                        type="radio"
                        name="privacy"
                        value="public"
                        checked={formData.privacy === 'public'}
                        onChange={handleInputChange}
                      />
                      <span className="privacy-label">
                        <span className="privacy-icon">🌍</span>
                        Public - Anyone can see and join
                      </span>
                    </label>
                    <label className="privacy-option">
                      <input
                        type="radio"
                        name="privacy"
                        value="private"
                        checked={formData.privacy === 'private'}
                        onChange={handleInputChange}
                      />
                      <span className="privacy-label">
                        <span className="privacy-icon">🔒</span>
                        Private - Only invited members can join
                      </span>
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setActiveTab('my-trips')}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="create-btn"
                    disabled={creatingTrip}
                  >
                    {creatingTrip ? 'Creating...' : 'Create Trip'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
} 