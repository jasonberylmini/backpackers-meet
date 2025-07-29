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
  const [activeTab, setActiveTab] = useState('overview');
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
      const currentUserId = JSON.parse(localStorage.getItem('user')).userId;
      setIsCreator(tripData.creator._id === currentUserId);
      setIsMember(
        tripData.creator._id === currentUserId || 
        tripData.members.some(member => member._id === currentUserId)
      );
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch trip details:', error);
      setLoading(false);
      toast.error('Failed to load trip details');
    }
  };

  const handleJoinTrip = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/trips/join/${tripId}`, {}, { headers });
      toast.success('Successfully joined the trip!');
      fetchTripDetails(); // Refresh trip data
    } catch (error) {
      console.error('Failed to join trip:', error);
      toast.error(error.response?.data?.message || 'Failed to join trip');
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
                disabled={trip.members.length >= (trip.maxMembers || Infinity)}
              >
                {trip.members.length >= (trip.maxMembers || Infinity) ? 'Full' : 'Join Trip'}
              </button>
            ) : (
              <div className="member-actions">
                <button 
                  className="chat-btn"
                  onClick={() => setActiveTab('chat')}
                >
                  💬 Chat
                </button>
                {isCreator && (
                  <button 
                    className="edit-btn"
                    onClick={() => navigate(`/trips/${tripId}/edit`)}
                  >
                    ✏️ Edit
                  </button>
                )}
                <button 
                  className="leave-btn"
                  onClick={handleLeaveTrip}
                >
                  Leave Trip
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="details-nav">
        <div className="nav-content">
          <button 
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`nav-tab ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Members ({trip.members.length + 1})
          </button>
          <button 
            className={`nav-tab ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            Expenses
          </button>
          {isMember && (
            <button 
              className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
          )}
        </div>
      </nav>

      {/* Content Area */}
      <div className="details-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-grid">
              {/* Trip Image */}
              <div className="trip-image-section">
                <img 
                  src={trip.image || 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=400&fit=crop'} 
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
                        {trip.members.length + 1}/{trip.maxMembers || '∞'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">👤 Creator</span>
                      <span className="info-value">{trip.creator.name}</span>
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
        )}

        {activeTab === 'members' && (
          <div className="members-tab">
            <div className="members-grid">
              {/* Creator */}
              <div className="member-card creator">
                <div className="member-avatar">
                  <span>{trip.creator.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="member-info">
                  <h4>{trip.creator.name}</h4>
                  <span className="member-role">Creator</span>
                </div>
              </div>

              {/* Members */}
              {trip.members.map(member => (
                <div key={member._id} className="member-card">
                  <div className="member-avatar">
                    <span>{member.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="member-info">
                    <h4>{member.name}</h4>
                    <span className="member-role">Member</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="expenses-tab">
            <div className="expenses-header">
              <h3>Expenses</h3>
              {isMember && (
                <button className="add-expense-btn">
                  ➕ Add Expense
                </button>
              )}
            </div>
            <div className="expenses-list">
              <div className="empty-state">
                <div className="empty-icon">💰</div>
                <h3>No expenses yet</h3>
                <p>Start tracking expenses for this trip</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && isMember && (
          <div className="chat-tab">
            <div className="chat-container">
              <div className="chat-messages">
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <h3>No messages yet</h3>
                  <p>Start the conversation with your trip members</p>
                </div>
              </div>
              <div className="chat-input">
                <input 
                  type="text" 
                  placeholder="Type a message..."
                  disabled
                />
                <button disabled>Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 