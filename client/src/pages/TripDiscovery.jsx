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
    maxMembers: ''
  });
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
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
      fetchTrips(); // Refresh the list
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
      maxMembers: ''
    });
    setSearchTerm('');
    setSortBy('date');
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

  if (loading) {
    return (
      <div className="trip-discovery-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Discovering amazing trips...</p>
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
            <h1>Discover Amazing Trips 🧳</h1>
            <p className="user-subtitle">
              Find your next adventure and connect with fellow travelers
            </p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Search & Filters</h2>
          <button 
            className="view-all-btn"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
        
        <div className="search-filters-container">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Search destinations, trip types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-btn">
                🔍
              </button>
            </div>
          </form>

          <div className="filters-section">
            <div className="filters-row">
              <select
                value={filters.tripType}
                onChange={(e) => setFilters({...filters, tripType: e.target.value})}
                className="filter-select"
              >
                <option value="">All Trip Types</option>
                <option value="carpool">🚗 Carpool</option>
                <option value="backpacking">🎒 Backpacking</option>
                <option value="luxury">💎 Luxury</option>
                <option value="adventure">🏔️ Adventure</option>
                <option value="cultural">🏛️ Cultural</option>
                <option value="beach">🏖️ Beach</option>
              </select>

              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="filter-select"
              >
                <option value="">Any Date</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
                <option value="next-month">Next Month</option>
                <option value="next-3-months">Next 3 Months</option>
              </select>

              <select
                value={filters.maxMembers}
                onChange={(e) => setFilters({...filters, maxMembers: e.target.value})}
                className="filter-select"
              >
                <option value="">Any Group Size</option>
                <option value="2-4">2-4 People</option>
                <option value="5-8">5-8 People</option>
                <option value="9-15">9-15 People</option>
                <option value="16+">16+ People</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="date">Sort by Date</option>
                <option value="destination">Sort by Destination</option>
                <option value="members">Sort by Members</option>
                <option value="created">Sort by Created</option>
              </select>
            </div>

            <div className="filters-actions">
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  ⊞
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  ☰
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>
            {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'} Found
          </h2>
          {Object.values(filters).some(f => f) && (
            <div className="active-filters">
              {filters.tripType && (
                <span className="filter-tag">
                  {filters.tripType} ✕
                </span>
              )}
              {filters.dateRange && (
                <span className="filter-tag">
                  {getDateRangeLabel(filters.dateRange)} ✕
                </span>
              )}
              {filters.maxMembers && (
                <span className="filter-tag">
                  {filters.maxMembers} ✕
                </span>
              )}
            </div>
          )}
        </div>

        {trips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧳</div>
            <h3>No trips found</h3>
            <p>Try adjusting your search criteria or create a new trip!</p>
            <button 
              className="primary-btn"
              onClick={() => navigate('/trips/create')}
            >
              Create Trip
            </button>
          </div>
        ) : (
          <div className={`trips-container ${viewMode}`}>
            {trips.map(trip => (
              <div key={trip._id} className={`trip-card ${viewMode}`}>
                <div className="trip-image">
                  <img 
                    src={trip.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=250&fit=crop'} 
                    alt={trip.destination}
                  />
                  <div className="trip-overlay">
                    <span className={`status-badge ${getTripStatus(trip)}`}>
                      {getTripStatus(trip)}
                    </span>
                  </div>
                </div>

                <div className="trip-content">
                  <div className="trip-header">
                    <h3>{trip.destination}</h3>
                    <div className="trip-type">
                      {trip.tripType === 'carpool' && '🚗'}
                      {trip.tripType === 'backpacking' && '🎒'}
                      {trip.tripType === 'luxury' && '💎'}
                      {trip.tripType === 'adventure' && '🏔️'}
                      {trip.tripType === 'cultural' && '🏛️'}
                      {trip.tripType === 'beach' && '🏖️'}
                      {trip.tripType}
                    </div>
                  </div>

                  <p className="trip-description">
                    {trip.description || 'Join this amazing adventure!'}
                  </p>

                  <div className="trip-details">
                    <div className="detail-item">
                      <span className="detail-icon">📅</span>
                      <span>{new Date(trip.startDate || trip.date).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">👥</span>
                      <span>{trip.members?.length || 0}/{trip.maxMembers || '∞'} members</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">👤</span>
                      <span>{trip.creator?.name || 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="trip-actions">
                    <button 
                      className="join-btn"
                      onClick={() => handleJoinTrip(trip._id)}
                      disabled={trip.members?.length >= (trip.maxMembers || Infinity)}
                    >
                      {trip.members?.length >= (trip.maxMembers || Infinity) ? 'Full' : 'Join Trip'}
                    </button>
                    <button 
                      className="view-details-btn"
                      onClick={() => navigate(`/trips/${trip._id}`)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
} 