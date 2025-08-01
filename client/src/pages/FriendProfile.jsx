import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './FriendProfile.css';
import { getDisplayName, getDisplayInitials } from '../utils/userDisplay';

export default function FriendProfile() {
  const [friend, setFriend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [trips, setTrips] = useState([]);
  const navigate = useNavigate();
  const { friendId } = useParams();
  
  // Get current user data
  const currentUser = JSON.parse(localStorage.getItem('user'));
  
  // If viewing own profile, redirect to main profile page
  useEffect(() => {
    if (currentUser && friendId === currentUser.id) {
      navigate('/profile', { replace: true });
      return;
    }
  }, [friendId, currentUser, navigate]);

  useEffect(() => {
    fetchFriendProfile();
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, [friendId]);

  useEffect(() => {
    if (friend) {
      fetchFriendPosts();
      fetchFriendTrips();
    }
  }, [friend]);

  const fetchFriendProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        toast.error('No authentication token found');
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      
      console.log('=== FRIEND PROFILE DEBUG ===');
      console.log('Friend ID from URL:', friendId);
      console.log('Making API call to:', `/api/users/${friendId}`);
      console.log('============================');
      
      // Make real API call to get user data
      const response = await axios.get(`/api/users/${friendId}`, { headers });
      console.log('API response:', response.data);
      
      // Handle the response format (user data wrapped in object)
      const userData = response.data.user || response.data;
      console.log('Processed user data:', userData);
      
      setFriend(userData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch friend profile:', error);
      setLoading(false);
      setFriend(null);
    }
  };

  const fetchFriendPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Make real API call to get user's posts
      const response = await axios.get(`/api/posts/user/${friendId}`, { headers });
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch friend posts:', error);
      setPosts([]);
    }
  };

  const fetchFriendTrips = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // For now, show empty trips since there's no endpoint for other users' trips
      // TODO: Add an endpoint to get trips for a specific user
      setTrips([]);
    } catch (error) {
      console.error('Failed to fetch friend trips:', error);
      setTrips([]);
    }
  };

  // Remove the old getInitials function as we're using the utility now

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL or blob URL, return as is
    if (imagePath.startsWith('http') || imagePath.startsWith('blob:')) {
      return imagePath;
    }
    
    // Handle both old format (with uploads\) and new format (just filename)
    const filename = imagePath.includes('uploads') ? imagePath.split(/[/\\]/).pop() : imagePath;
    return `/uploads/${filename}`;
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Recently joined';
    const date = new Date(dateString);
    return `Joined ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  };

  const handleSendMessage = () => {
    navigate(`/messages?user=${friendId}`);
    // Scroll to top when navigating to messages
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="friend-profile-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!friend) {
    return (
      <div className="friend-profile-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Profile not found</h3>
          <p>The user profile you're looking for doesn't exist.</p>
          <button 
            className="back-btn"
            onClick={() => navigate('/profile')}
          >
            Back to My Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="friend-profile-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-cover">
          {friend.coverImage && (
            <img src={getImageUrl(friend.coverImage)} alt="Cover" className="cover-image" onError={(e) => { console.error('Cover image failed to load:', friend.coverImage); e.target.style.display = 'none'; }} />
          )}
          <div className="profile-avatar">
            {friend.profileImage ? (
              <img src={getImageUrl(friend.profileImage)} alt={getDisplayName(friend)} onError={(e) => { console.error('Profile image failed to load:', friend.profileImage); e.target.style.display = 'none'; }} />
            ) : (
              <div className="avatar-placeholder">
                {getDisplayInitials(friend)}
              </div>
            )}
          </div>
        </div>
        
        <div className="profile-info">
          <h1 className="profile-name">{getDisplayName(friend)}</h1>
          <p className="profile-location">{friend.country || 'Location not set'}</p>
          <p className="profile-join-date">{formatJoinDate(friend.createdAt)}</p>
          
          {friend.bio && (
            <p className="profile-bio">{friend.bio}</p>
          )}
        </div>

        {/* Profile Stats */}
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-number">{trips.length}</span>
            <span className="stat-label">Trips</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{posts.length}</span>
            <span className="stat-label">Posts</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          <button 
            className="message-btn"
            onClick={handleSendMessage}
          >
            💬 Send Message
          </button>
          <button 
            className="back-btn"
            onClick={() => navigate('/profile')}
          >
            ← Back to My Profile
          </button>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="content-tabs">
        <button 
          className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          📝 Posts
        </button>
        <button 
          className={`tab-btn ${activeTab === 'trips' ? 'active' : ''}`}
          onClick={() => setActiveTab('trips')}
        >
          🗓️ Trips
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'posts' && (
          <div className="posts-section">
            {posts.length > 0 ? (
              <div className="posts-grid">
                {posts.map(post => (
                  <div key={post._id} className="post-card">
                    <div className="post-header">
                                             <div className="post-author">
                         <div className="author-avatar">
                           {friend.profileImage ? (
                             <img src={getImageUrl(friend.profileImage)} alt={getDisplayName(friend)} onError={(e) => { e.target.style.display = 'none'; }} />
                           ) : (
                             <div className="avatar-placeholder">
                               {getDisplayInitials(friend)}
                             </div>
                           )}
                         </div>
                        <div className="author-info">
                          <span className="author-name">{getDisplayName(friend)}</span>
                          <span className="post-date">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="post-content">
                      <p>{post.content}</p>
                      {post.image && (
                        <img src={post.image} alt="Post" className="post-image" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No posts yet</h3>
                <p>{getDisplayName(friend)} hasn't shared any posts yet.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trips' && (
          <div className="trips-section">
            {trips.length > 0 ? (
              <div className="trips-grid">
                {trips.map(trip => (
                  <div key={trip._id} className="trip-card">
                    <div className="trip-image">
                      {trip.image ? (
                        <img src={trip.image} alt={trip.destination} />
                      ) : (
                        <div className="trip-image-placeholder">
                          🗺️
                        </div>
                      )}
                    </div>
                    <div className="trip-info">
                      <h3>{trip.destination}</h3>
                      <p className="trip-dates">
                        {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                      </p>
                      <span className={`trip-status ${trip.status}`}>
                        {trip.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🗺️</div>
                <h3>No trips yet</h3>
                <p>{getDisplayName(friend)} hasn't created any trips yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 