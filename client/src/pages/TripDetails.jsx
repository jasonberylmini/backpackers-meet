import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../contexts/SocketContext';
import './TripDetails.css';

export default function TripDetails() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { isConnected } = useSocket();
  
  const [trip, setTrip] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [isMember, setIsMember] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchTripDetails();
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(`/api/trips/${tripId}`, { headers });
      const tripData = response.data;
      
      setTrip(tripData);
      
      // Check if current user is a member or creator
      const userData = JSON.parse(localStorage.getItem('user'));
      const currentUserId = userData.id || userData._id || userData.userId; // Handle all possible structures
      
      setIsCreator(tripData.creator._id === currentUserId);
      setIsMember(
        tripData.creator._id === currentUserId || 
        tripData.members.some(member => member._id === currentUserId)
      );
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch trip details:', error);
      setLoading(false);
      if (error.response?.status === 404) {
        // Trip not found - this is expected for newly created trips
        toast.error('Trip not found. Please try refreshing the page.');
      } else {
        toast.error('Failed to load trip details');
      }
    }
  };

  const handleJoinTrip = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/trips/join/${tripId}`, {}, { headers });
      toast.success('Successfully joined the trip!');
      fetchTripDetails(); // Refresh trip data
    } catch (error) {
      console.error('Failed to join trip:', error);
      toast.error(error.response?.data?.message || 'Failed to join trip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveTrip = async () => {
    if (!window.confirm('Are you sure you want to leave this trip?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/trips/leave/${tripId}`, {}, { headers });
      toast.success('Left the trip successfully');
      navigate('/trips/browse');
    } catch (error) {
      console.error('Failed to leave trip:', error);
      toast.error('Failed to leave trip');
    }
  };

  const handleDeleteTrip = async () => {
    if (!window.confirm('Are you sure you want to delete this trip? This action cannot be undone.')) return;
    
    try {
      setActionLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete(`/api/trips/delete/${tripId}`, { headers });
      toast.success('Trip deleted successfully');
      navigate('/trips/browse');
    } catch (error) {
      console.error('Failed to delete trip:', error);
      toast.error(error.response?.data?.message || 'Failed to delete trip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditTrip = () => {
    // Navigate to trip creation page with edit mode
    navigate(`/trips/create`, { 
      state: { 
        editMode: true, 
        tripId, 
        tripData: trip 
      } 
    });
  };

  const handleManageMembers = () => {
    // For now, show a modal or navigate to a members management page
    // You can implement a modal here or create a dedicated members page
    toast.info('Members management - you can invite, remove, and manage trip members here');
  };

  const handleManageExpenses = () => {
    // Navigate to the existing expenses page with trip context
    navigate('/expenses', { state: { tripId, tripName: trip.destination } });
  };

  const handleTripSettings = () => {
    // For now, show a modal or navigate to trip settings
    toast.info('Trip settings - you can modify trip details, privacy settings, and more');
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member from the trip?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/trips/${tripId}/remove-member`, { memberId }, { headers });
      toast.success('Member removed successfully');
      fetchTripDetails(); // Refresh trip data
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleApproveMember = async (memberId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/trips/${tripId}/approve-member`, { memberId }, { headers });
      toast.success('Member approved successfully');
      fetchTripDetails(); // Refresh trip data
    } catch (error) {
      console.error('Failed to approve member:', error);
      toast.error(error.response?.data?.message || 'Failed to approve member');
    }
  };

  const getTripStatus = () => {
    if (!trip) return 'unknown';
    const now = new Date();
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    
    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'active';
    return 'completed';
  };

  const getTripTypeIcon = (tripType) => {
    const icons = {
      carpool: '🚗',
      backpacking: '🎒',
      luxury: '💎',
      adventure: '🏔️',
      cultural: '🏛️',
      beach: '🏖️'
    };
    return icons[tripType] || '🧳';
  };

  const getTotalMembers = () => {
    if (!trip) return 0;
    // Count members + creator (if creator is not in members array)
    const creatorInMembers = trip.members.some(member => member._id === trip.creator._id);
    return trip.members.length + (creatorInMembers ? 0 : 1);
  };

  const getTripImage = () => {
    if (!trip) return '';
    if (trip.images && trip.images.length > 0) {
      // If it's a relative path, prepend the server URL
      const imagePath = trip.images[0];
      if (imagePath.startsWith('/uploads/')) {
        return `http://localhost:5000${imagePath}`;
      }
      return imagePath;
    }
    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop';
  };

  if (loading) {
    return (
      <div className="trip-details-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="trip-details-container">
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h3>Trip not found</h3>
          <p>The trip you're looking for doesn't exist or has been removed.</p>
          <button 
            className="primary-btn"
            onClick={() => navigate('/trips/browse')}
          >
            Browse Trips
          </button>
        </div>
      </div>
    );
  }



  return (
    <div className="trip-details-container">


      {/* Header */}
      <header className="details-header">
        <div className="header-content">
          <div className="header-text">
            <div className="breadcrumb">
              <button onClick={() => navigate('/trips/browse')}>Trips</button>
              <span>→</span>
              <span>{trip.destination}</span>
            </div>
            <h1>{trip.destination}</h1>
            <div className="trip-meta">
              <span className="trip-type">
                {getTripTypeIcon(trip.tripType)} {trip.tripType}
              </span>
              <span className="trip-status">
                <span className={`status-badge ${getTripStatus()}`}>
                  {getTripStatus()}
                </span>
              </span>
              <span className="connection-status">
                <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
          <div className="header-actions">
            {!isMember ? (
              <button 
                className="join-btn"
                onClick={handleJoinTrip}
                disabled={getTotalMembers() >= (trip.maxMembers || Infinity) || actionLoading}
              >
                {actionLoading ? 'Joining...' : (getTotalMembers() >= (trip.maxMembers || Infinity) ? 'Full' : 'Join Trip')}
              </button>
            ) : (
              <div className="member-actions">
                {isCreator ? (
                  // Creator Actions
                  <div className="creator-actions">
                    <div className="action-group">
                      <button 
                        className="manage-btn"
                        onClick={handleManageMembers}
                      >
                        👥 Manage Members
                      </button>
                      <button 
                        className="manage-btn"
                        onClick={handleManageExpenses}
                      >
                        💰 Manage Expenses
                      </button>
                    </div>
                    <div className="action-group">
                      <button 
                        className="edit-btn"
                        onClick={handleEditTrip}
                      >
                        ✏️ Edit Trip
                      </button>
                      <button 
                        className="settings-btn"
                        onClick={handleTripSettings}
                      >
                        ⚙️ Settings
                      </button>
                    </div>
                    <div className="action-group">
                      <button 
                        className="chat-btn"
                        onClick={() => navigate(`/messages?trip=${tripId}`)}
                      >
                        💬 Chat
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={handleDeleteTrip}
                        disabled={actionLoading}
                      >
                        {actionLoading ? 'Deleting...' : '🗑️ Delete Trip'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Regular Member Actions
                  <div className="member-actions">
                    <button 
                      className="chat-btn"
                      onClick={() => navigate(`/messages?trip=${tripId}`)}
                    >
                      💬 Chat
                    </button>
                    <button 
                      className="leave-btn"
                      onClick={handleLeaveTrip}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Leaving...' : 'Leave Trip'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="details-content">
        <div className="trip-overview">
          {/* Trip Image */}
          <div className="trip-image-section">
            <img 
              src={getTripImage()} 
              alt={trip.destination}
              className="trip-image"
            />
          </div>

          {/* Trip Details */}
          <div className="trip-info-section">
            <div className="info-card">
              <h3>Trip Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">📅 Dates</span>
                  <span className="info-value">
                    {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">💰 Budget</span>
                  <span className="info-value">₹{trip.budget}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">👥 Members</span>
                  <span className="info-value">
                    {getTotalMembers()}/{trip.maxMembers || '∞'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">👤 Creator</span>
                  <span className="info-value">{trip.creator.username || trip.creator.name || 'Unknown'}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3>Description</h3>
              <p className="trip-description">
                {trip.description || 'No description provided for this trip.'}
              </p>
            </div>

            <div className="info-card">
              <h3>Created</h3>
              <p>{new Date(trip.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 