import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './TripDiscovery.css';

export default function TripDiscovery() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    tripType: '',
    destination: '',
    dateRange: '',
    maxMembers: '',
    status: '' // New filter for trip status
  });
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all'); // New state for active category
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrips();
  }, [filters, sortBy]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.tripType) params.append('tripType', filters.tripType);
      if (filters.destination) params.append('destination', filters.destination);
      if (filters.dateRange) params.append('dateRange', filters.dateRange);
      if (filters.maxMembers) params.append('maxMembers', filters.maxMembers);
      if (filters.status) params.append('status', filters.status);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await axios.get(`/api/trips/browse?${params}`, { headers });
      setTrips(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      setLoading(false);
      toast.error('Failed to load trips');
    }
  };

  const handleJoinTrip = async (tripId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/trips/join/${tripId}`, {}, { headers });
      toast.success('Successfully joined the trip!');
      fetchTrips();
    } catch (error) {
      console.error('Failed to join trip:', error);
      toast.error(error.response?.data?.message || 'Failed to join trip');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTrips();
  };

  const clearFilters = () => {
    setFilters({
      tripType: '',
      destination: '',
      dateRange: '',
      maxMembers: '',
      status: ''
    });
    setSearchTerm('');
    setSortBy('date');
    setActiveCategory('all');
  };

  const getTripStatus = (trip) => {
    const now = new Date();
    const startDate = new Date(trip.startDate || trip.date);
    const endDate = new Date(trip.endDate || trip.date);
    
    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'active';
    return 'completed';
  };

  const getDateRangeLabel = (value) => {
    const ranges = {
      'this-week': 'This Week',
      'this-month': 'This Month',
      'next-month': 'Next Month',
      'next-3-months': 'Next 3 Months'
    };
    return ranges[value] || value;
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

  // Categorize trips
  const categorizedTrips = trips.reduce((acc, trip) => {
    const status = getTripStatus(trip);
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(trip);
    return acc;
  }, {});

  // Filter trips based on active category
  const getFilteredTrips = () => {
    if (activeCategory === 'all') {
      return trips;
    }
    return categorizedTrips[activeCategory] || [];
  };

  const filteredTrips = getFilteredTrips();

  const getCategoryCount = (category) => {
    if (category === 'all') return trips.length;
    return categorizedTrips[category]?.length || 0;
  };

  if (loading) {
    return (
      <div className="discovery-container">
        <div className="loading-state-modern">
          <div className="loading-spinner-modern"></div>
          <h3>Discovering Amazing Adventures</h3>
          <p>Loading incredible trips just for you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="discovery-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <div className="hero-overlay"></div>
        </div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Discover Your Next Adventure
              <span className="hero-accent">✨</span>
            </h1>
            <p className="hero-subtitle">
              Connect with fellow travelers and explore the world together
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="hero-search">
            <form onSubmit={handleSearch} className="search-form-modern">
              <div className="search-input-wrapper">
                <div className="search-icon">🔍</div>
                <input
                  type="text"
                  placeholder="Search destinations, trip types, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-modern"
                />
                <button type="submit" className="search-btn-modern">
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="main-content">
        {/* Filters Section */}
        <section className="filters-section-modern">
          <div className="filters-header">
            <div className="filters-title">
              <h2>Find Your Perfect Trip</h2>
              <p>Filter and sort to discover exactly what you're looking for</p>
            </div>
            <div className="filters-actions-modern">
              <button 
                className="filter-toggle-btn"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
          <button 
                className="clear-filters-btn-modern"
            onClick={clearFilters}
          >
                Clear All
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="filters-content">
              <div className="filters-grid">
                <div className="filter-group">
                  <label className="filter-label">Trip Type</label>
              <select
                value={filters.tripType}
                onChange={(e) => setFilters({...filters, tripType: e.target.value})}
                    className="filter-select-modern"
              >
                    <option value="">All Types</option>
                <option value="carpool">🚗 Carpool</option>
                <option value="backpacking">🎒 Backpacking</option>
                <option value="luxury">💎 Luxury</option>
                <option value="adventure">🏔️ Adventure</option>
                <option value="cultural">🏛️ Cultural</option>
                <option value="beach">🏖️ Beach</option>
              </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Trip Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="filter-select-modern"
                  >
                    <option value="">All Status</option>
                    <option value="upcoming">🕒 Upcoming</option>
                    <option value="active">🟢 Active</option>
                    <option value="completed">✅ Completed</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                    className="filter-select-modern"
              >
                <option value="">Any Date</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="next-month">Next Month</option>
                <option value="next-3-months">Next 3 Months</option>
              </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Group Size</label>
              <select
                value={filters.maxMembers}
                onChange={(e) => setFilters({...filters, maxMembers: e.target.value})}
                    className="filter-select-modern"
              >
                    <option value="">Any Size</option>
                <option value="2-4">2-4 People</option>
                <option value="5-8">5-8 People</option>
                <option value="9-15">9-15 People</option>
                <option value="16+">16+ People</option>
              </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                    className="filter-select-modern"
                  >
                    <option value="date">Date</option>
                    <option value="destination">Destination</option>
                    <option value="members">Members</option>
                    <option value="created">Created</option>
              </select>
            </div>
              </div>
            </div>
          )}
      </section>

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

        {/* Results Header */}
        <section className="results-header-modern">
          <div className="results-info">
            <h2 className="results-title">
              {filteredTrips.length} {filteredTrips.length === 1 ? 'Trip' : 'Trips'} Found
              {activeCategory !== 'all' && (
                <span className="category-indicator"> • {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)}</span>
              )}
            </h2>
            {Object.values(filters).some(f => f) && (
              <div className="active-filters-modern">
                {filters.tripType && (
                  <span className="filter-tag-modern">
                    {getTripTypeIcon(filters.tripType)} {filters.tripType}
                  </span>
                )}
                {filters.status && (
                  <span className="filter-tag-modern">
                    {filters.status === 'upcoming' ? '🕒' : filters.status === 'active' ? '🟢' : '✅'} {filters.status}
                  </span>
                )}
                {filters.dateRange && (
                  <span className="filter-tag-modern">
                    📅 {getDateRangeLabel(filters.dateRange)}
                  </span>
                )}
                {filters.maxMembers && (
                  <span className="filter-tag-modern">
                    👥 {filters.maxMembers}
                  </span>
                )}
              </div>
            )}
        </div>

          <div className="results-actions">
            <button 
              className="create-trip-btn-modern"
              onClick={() => navigate('/trips/create')}
            >
              <span className="btn-icon">✨</span>
              Create Trip
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
                  ? "Try adjusting your search criteria or be the first to create a trip!"
                  : `No ${activeCategory} trips found. Try adjusting your filters or check other categories.`
                }
              </p>
              <button 
                className="primary-btn-modern"
                onClick={() => navigate('/trips/create')}
              >
                Create Your First Trip
              </button>
            </div>
          </section>
        ) : (
          <section className="trips-section">
            <div className={`trips-grid`}>
              {filteredTrips.map(trip => (
                <div key={trip._id} className={`trip-card-modern`}>
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
                        className="join-btn-modern"
                      onClick={() => handleJoinTrip(trip._id)}
                        disabled={getTotalMembers(trip) >= (trip.maxMembers || Infinity) || getTripStatus(trip) === 'completed'}
                    >
                        {getTripStatus(trip) === 'completed' ? 'Completed' : 
                         getTotalMembers(trip) >= (trip.maxMembers || Infinity) ? 'Full' : 'Join Trip'}
                    </button>
                    <button 
                        className="view-details-btn-modern"
                      onClick={() => navigate(`/trips/${trip._id}`)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </section>
        )}
      </div>
    </div>
  );
} 