import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../contexts/SocketContext';
import { getProfileImageUrl, getDisplayFirstChar } from '../utils/userDisplay';
import './TripDetails.css';

export default function TripDetails() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { isConnected } = useSocket();
  
  const [trip, setTrip] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'members', 'expenses'
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Test: Force modal to be visible
  const [forceShowModal, setForceShowModal] = useState(false);

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
      
      console.log('Trip data received:', tripData);
      console.log('Creator data:', tripData.creator);
      console.log('Members data:', tripData.members);
      
      setTrip(tripData);
      
      // Check if current user is a member or creator
      const userData = JSON.parse(localStorage.getItem('user'));
      const currentUserId = userData.id || userData._id || userData.userId;
      
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
      fetchTripDetails();
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
      toast.error('Failed to delete trip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditTrip = () => {
    navigate(`/trips/edit/${tripId}`);
  };

  const handleManageMembers = () => {
    setActiveTab('members');
  };

  const handleManageExpenses = () => {
    setActiveTab('expenses');
  };

  const handleTripSettings = () => {
    // TODO: Implement trip settings
    toast.info('Trip settings coming soon!');
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('Searching users with query:', query);
      const response = await axios.get(`/api/users/search?q=${encodeURIComponent(query)}`, { headers });
      console.log('Search results:', response.data);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Failed to search users:', error);
      console.error('Error response:', error.response?.data);
      // Removed toast notification for search errors
    } finally {
      setSearching(false);
    }
  };

  const handleInviteUser = async (userId) => {
    try {
      setInviting(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('Inviting user with ID:', userId);
      await axios.post(`/api/trips/${tripId}/invite`, { userId }, { headers });
      console.log('User invited successfully');
      toast.success('Invitation sent successfully!');
      setShowInviteModal(false);
      setInviteUsername('');
      setSearchResults([]);
      fetchTripDetails(); // Refresh trip data
    } catch (error) {
      console.error('Failed to invite user:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };



  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/trips/remove-member/${tripId}`, { memberId }, { headers });
      toast.success('Member removed successfully');
      fetchTripDetails();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleApproveMember = async (memberId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/trips/approve-member/${tripId}`, { memberId }, { headers });
      toast.success('Member approved successfully');
      fetchTripDetails();
    } catch (error) {
      console.error('Failed to approve member:', error);
      toast.error('Failed to approve member');
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
      'carpool': '🚗',
      'backpacking': '🎒',
      'luxury': '💎',
      'adventure': '🏔️',
      'cultural': '🏛️',
      'beach': '🏖️'
    };
    return icons[tripType] || '🧳';
  };

  const getTotalMembers = () => {
    if (!trip) return 0;
    const creatorInMembers = trip.members.some(member => member._id === trip.creator._id);
    return trip.members.length + (creatorInMembers ? 0 : 1);
  };

  const getTripImage = () => {
    if (!trip) return '';
    if (trip.images && trip.images.length > 0) {
      const imagePath = trip.images[0];
      if (imagePath.startsWith('/uploads/')) {
        return `http://localhost:5000${imagePath}`;
      }
      return imagePath;
    }
    return 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&h=600&fit=crop';
  };

  if (loading) {
    return (
      <div className="trip-details-container">
        <div className="loading-state-modern">
          <div className="loading-spinner-modern"></div>
          <h3>Loading Trip Details</h3>
          <p>Fetching amazing adventure information...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="trip-details-container">
        <div className="error-state-modern">
          <div className="error-icon-modern">❌</div>
          <h3>Trip not found</h3>
          <p>The trip you're looking for doesn't exist or has been removed.</p>
          <button 
            className="primary-btn-modern"
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
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <img 
            src={getTripImage()} 
            alt={trip.destination}
            className="hero-image"
          />
          <div className="hero-overlay"></div>
            </div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">{trip.destination}</h1>
            <div className="hero-meta">
              <span className="trip-type-badge">
                {getTripTypeIcon(trip.tripType)} {trip.tripType}
              </span>
              <span className={`status-badge-modern ${getTripStatus()}`}>
                  {getTripStatus()}
              </span>
              <span className="connection-status">
                <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
          
          <div className="hero-actions">
            {!isMember ? (
              <button 
                className="join-btn-modern"
                onClick={handleJoinTrip}
                disabled={getTotalMembers() >= (trip.maxMembers || Infinity) || actionLoading}
              >
                {actionLoading ? 'Joining...' : (getTotalMembers() >= (trip.maxMembers || Infinity) ? 'Full' : 'Join Trip')}
              </button>
            ) : (
              <div className="member-actions-modern">
                {isCreator ? (
                  <div className="creator-actions-modern">
                      <button 
                      className="action-btn-modern primary"
                        onClick={() => navigate(`/messages?trip=${tripId}`)}
                      >
                        💬 Chat
                      </button>
                      <button 
                      className="action-btn-modern secondary"
                      onClick={handleEditTrip}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="action-btn-modern danger"
                        onClick={handleDeleteTrip}
                        disabled={actionLoading}
                      >
                      {actionLoading ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                  </div>
                ) : (
                  <div className="member-actions-modern">
                    <button 
                      className="action-btn-modern primary"
                      onClick={() => navigate(`/messages?trip=${tripId}`)}
                    >
                      💬 Chat
                    </button>
                    <button 
                      className="action-btn-modern secondary"
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
      </section>

      {/* Main Content */}
      <div className="main-content">
        {/* Tab Navigation */}
        <section className="tab-navigation-section">
          <div className="tab-navigation">
            <button
              className={`tab-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span className="tab-icon">📋</span>
              <span className="tab-label">Overview</span>
            </button>
            <button
              className={`tab-nav-btn ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <span className="tab-icon">👥</span>
              <span className="tab-label">Members ({getTotalMembers()})</span>
            </button>
            <button
              className={`tab-nav-btn ${activeTab === 'expenses' ? 'active' : ''}`}
              onClick={() => setActiveTab('expenses')}
            >
              <span className="tab-icon">💰</span>
              <span className="tab-label">Expenses</span>
            </button>
          </div>
        </section>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <section className="overview-section">
            <div className="overview-container">
              {/* Single Trip Details Card */}
              <div className="trip-details-card">
                <div className="card-header">
                  <h3>Trip Information</h3>
                </div>
                <div className="card-content">
                  <div className="details-grid">
                    <div className="detail-item-modern">
                      <span className="detail-icon">📅</span>
                      <div className="detail-info">
                        <span className="detail-label">Dates</span>
                        <span className="detail-value">
                    {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                  </span>
                </div>
                    </div>
                    <div className="detail-item-modern">
                      <span className="detail-icon">💰</span>
                      <div className="detail-info">
                        <span className="detail-label">Budget</span>
                        <span className="detail-value">₹{trip.budget}</span>
                      </div>
                </div>
                    <div className="detail-item-modern">
                      <span className="detail-icon">👥</span>
                      <div className="detail-info">
                        <span className="detail-label">Members</span>
                        <span className="detail-value">
                    {getTotalMembers()}/{trip.maxMembers || '∞'}
                  </span>
                </div>
                    </div>
                    <div className="detail-item-modern">
                      <span className="detail-icon">👤</span>
                      <div className="detail-info">
                        <span className="detail-label">Creator</span>
                        <span className="detail-value">{trip.creator.username || trip.creator.name || 'Unknown'}</span>
                      </div>
                    </div>
                    <div className="detail-item-modern">
                      <span className="detail-icon">📝</span>
                      <div className="detail-info">
                        <span className="detail-label">Created</span>
                        <span className="detail-value">{new Date(trip.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="detail-item-modern">
                      <span className="detail-icon">🔒</span>
                      <div className="detail-info">
                        <span className="detail-label">Privacy</span>
                        <span className="detail-value">{trip.privacy === 'public' ? 'Public' : 'Private'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="description-section">
                    <h4>Description</h4>
                    <p className="trip-description-modern">
                      {trip.description || 'No description provided for this trip.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'members' && (
          <section className="members-section">
            <div className="members-container">
              <div className="members-header">
                <h3>Trip Members</h3>
                <div className="members-actions">
                  <span className="member-count">{getTotalMembers()} members</span>
                  {isCreator && (
                    <button 
                      className="invite-btn"
                      onClick={() => {
                        setShowInviteModal(true);
                      }}
                    >
                      <span className="invite-icon">👥</span>
                      + Invite Members
                    </button>
                  )}
                </div>
              </div>
              
              <div className="members-grid">
                {/* Creator */}
                <div className="member-card-modern creator">
                  <div className="member-avatar">
                    {getProfileImageUrl(trip.creator) ? (
                      <img 
                        src={getProfileImageUrl(trip.creator)} 
                        alt={trip.creator.username || trip.creator.name}
                        className="avatar-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          // Show the text fallback
                          const avatarContainer = e.target.parentElement;
                          const textElement = avatarContainer.querySelector('.avatar-text');
                          if (textElement) {
                            textElement.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <span className="avatar-text" style={{ display: getProfileImageUrl(trip.creator) ? 'none' : 'flex' }}>
                      {getDisplayFirstChar(trip.creator)}
                    </span>
                  </div>
                  <div className="member-info">
                    <h4 
                      className="member-name clickable"
                      onClick={() => navigate(`/profile/${trip.creator._id}`)}
                    >
                      {trip.creator.username || trip.creator.name || 'Unknown'}
                    </h4>
                    <span className="member-role">Creator</span>
                  </div>
                </div>

                {/* Members (excluding creator) */}
                {trip.members
                  .filter(member => member._id !== trip.creator._id)
                  .map(member => (
                    <div key={member._id} className="member-card-modern">
                      <div className="member-avatar">
                        {getProfileImageUrl(member) ? (
                          <img 
                            src={getProfileImageUrl(member)} 
                            alt={member.username || member.name}
                            className="avatar-image"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              // Show the text fallback
                              const avatarContainer = e.target.parentElement;
                              const textElement = avatarContainer.querySelector('.avatar-text');
                              if (textElement) {
                                textElement.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <span className="avatar-text" style={{ display: getProfileImageUrl(member) ? 'none' : 'flex' }}>
                          {getDisplayFirstChar(member)}
                        </span>
                      </div>
                      <div className="member-info">
                        <h4 
                          className="member-name clickable"
                          onClick={() => navigate(`/profile/${member._id}`)}
                        >
                          {member.username || member.name || 'Unknown'}
                        </h4>
                        <span className="member-role">Member</span>
                      </div>
                      {isCreator && (
                        <button 
                          className="remove-member-btn"
                          onClick={() => handleRemoveMember(member._id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'expenses' && (
          <section className="expenses-section">
            <div className="expenses-container">
              <div className="expenses-header">
                <h3>Trip Expenses</h3>
                <button className="add-expense-btn">
                  + Add Expense
                </button>
            </div>

              <div className="expenses-placeholder">
                <div className="placeholder-icon">💰</div>
                <h4>No expenses yet</h4>
                <p>Start tracking your trip expenses to keep everyone informed about costs.</p>
                <button className="primary-btn-modern">
                  Add First Expense
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Invite Members Modal */}
      {(showInviteModal || forceShowModal) && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999999
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowInviteModal(false);
              setForceShowModal(false);
            }
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative',
              zIndex: 10000000,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '15px'
            }}>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Invite Members</h3>
              <button 
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowInviteModal(false);
                  setForceShowModal(false);
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* Search Users Tab */}
              <div className="invite-section">
                <h4>Search Users</h4>
                <div className="search-input-group">
                  <input
                    type="text"
                    placeholder="Search by username..."
                    value={inviteUsername}
                    onChange={(e) => {
                      setInviteUsername(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="search-input"
                  />
                  {searching && <div className="search-spinner"></div>}
                </div>
                
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                  Type at least 2 characters to search by username
                </div>
                
                <div style={{ marginTop: '5px', fontSize: '11px', color: '#999' }}>
                  Search results: {searchResults.length} users found
                </div>
                
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(user => (
                      <div key={user._id} className="user-result">
                        <div className="user-info">
                          <div className="user-avatar">
                            {getProfileImageUrl(user) ? (
                              <img 
                                src={getProfileImageUrl(user)} 
                                alt={user.username || user.name}
                                className="avatar-image"
                              />
                            ) : (
                              <span className="avatar-text">
                                {getDisplayFirstChar(user)}
                              </span>
                            )}
                          </div>
                          <div className="user-details">
                            <span className="user-name">{user.username || user.name}</span>
                            <span className="user-place">{user.country || 'Location not set'}</span>
                          </div>
                        </div>
                        <button 
                          className="invite-user-btn"
                          onClick={() => handleInviteUser(user._id)}
                          disabled={inviting}
                        >
                          {inviting ? 'Inviting...' : 'Invite'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {inviteUsername.trim().length >= 2 && !searching && searchResults.length === 0 && (
                  <div className="no-results">
                    <p>No users found with username "{inviteUsername}"</p>
                    <p className="no-results-hint">Try searching with a different username</p>
                  </div>
                )}
              </div>


            </div>
          </div>
        </div>
      )}
    </div>
  );
} 