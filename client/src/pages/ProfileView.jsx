import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './ProfileView.css';
import { getDisplayName, getDisplayInitials } from '../utils/userDisplay';

export default function ProfileView() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [trips, setTrips] = useState([]);
  const [friends, setFriends] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { userId } = useParams(); // Get the user ID from URL parameters

  useEffect(() => {
    fetchUserProfile();
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, [userId]); // Re-fetch when userId changes

  useEffect(() => {
    if (user) {
      fetchUserPosts();
      fetchUserTrips();
      fetchUserFriends();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        toast.error('No authentication token found');
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      
      // Use the userId from URL parameters if available, otherwise fetch current user's profile
      const endpoint = userId ? `/api/users/${userId}` : '/api/users/profile';
      console.log('=== PROFILE DEBUG ===');
      console.log('URL userId parameter:', userId);
      console.log('Current user from localStorage:', JSON.parse(localStorage.getItem('user')));
      console.log('Using endpoint:', endpoint);
      console.log('====================');
      
      const response = await axios.get(endpoint, { headers });
      console.log('User profile data:', response.data);
      
      // Handle different response formats
      const userData = response.data.user || response.data;
      console.log('Processed user data:', userData);
      console.log('Profile image path:', userData.profileImage);
      console.log('Cover image path:', userData.coverImage);
      console.log('Profile image type:', typeof userData.profileImage);
      console.log('Cover image type:', typeof userData.coverImage);
      console.log('Profile image truthy check:', !!userData.profileImage);
      console.log('Cover image truthy check:', !!userData.coverImage);
      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setLoading(false);
      // Don't show error toast, just set user to null
      setUser(null);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Get posts for the specific user (either from URL or current user)
      const targetUserId = userId || user?._id;
      const response = await axios.get('/api/posts/user/' + targetUserId, { headers });
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      // Set empty array as fallback
      setPosts([]);
    }
  };

  const fetchUserTrips = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // For now, only show trips for the current user since there's no endpoint for other users' trips
      // TODO: Add an endpoint to get trips for a specific user
      if (!userId) {
        const response = await axios.get('/api/trips/mine', { headers });
        setTrips(response.data);
      } else {
        // If viewing another user's profile, show empty trips for now
        setTrips([]);
      }
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      // Set empty array as fallback
      setTrips([]);
    }
  };

  const fetchUserFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // For now, we'll use a mock friends list since the friends system isn't fully implemented
      // In a real implementation, this would be: const response = await axios.get('/api/users/friends', { headers });
             const mockFriends = [
         {
           _id: '68866fa9648e12363ee84543', // Real user ID from database
           name: 'Sarah Manager',
           username: 'sarah.manager',
           profileImage: null,
           country: 'Canada',
           bio: 'Photographer and backpacker'
         },
         {
           _id: '68866fa9648e12363ee84541', // Real user ID from database
           name: 'Jason Admin',
           username: 'jason.admin',
           profileImage: null,
           country: 'USA',
           bio: 'Adventure seeker and travel enthusiast'
         },
         {
           _id: '68774d3089f19e43627b356b', // Real user ID from database
           name: 'joel',
           username: 'joel',
           profileImage: null,
           country: 'UK',
           bio: 'Backpacking through Europe'
         }
       ];
      setFriends(mockFriends);
    } catch (error) {
      console.error('Failed to fetch friends:', error);
      setFriends([]);
    }
  };

  // Remove the old getInitials function as we're using the utility now

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // If it's a relative path starting with /uploads, construct the full URL
    if (imagePath.startsWith('/uploads/')) {
      return `http://localhost:5000${imagePath}`;
    }
    
    // If it's just a filename, assume it's in uploads
    if (!imagePath.includes('/')) {
      return `http://localhost:5000/uploads/${imagePath}`;
    }
    
    return imagePath;
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Recently joined';
    const date = new Date(dateString);
    return `Joined ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  };

  const handleEditPost = (post) => {
    setEditingPost(post._id);
    setEditContent(post.content);
  };

  const handleSaveEdit = async (postId) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put(`/api/posts/${postId}`, { content: editContent }, { headers });
      
      // Update the post in the local state
      setPosts(posts.map(post => 
        post._id === postId 
          ? { ...post, content: editContent }
          : post
      ));
      
      setEditingPost(null);
      setEditContent('');
      toast.success('Post updated successfully!');
    } catch (error) {
      console.error('Failed to update post:', error);
      toast.error(error.response?.data?.message || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditContent('');
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete(`/api/posts/${postId}`, { headers });
      
      // Remove the post from local state
      setPosts(posts.filter(post => post._id !== postId));
      
      toast.success('Post deleted successfully!');
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error(error.response?.data?.message || 'Failed to delete post');
    }
  };

  if (loading) {
    return (
      <div className="profile-view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-view-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Failed to load profile</h3>
          <p>Please try refreshing the page or check your connection.</p>
          <button 
            className="retry-btn"
            onClick={() => {
              setLoading(true);
              fetchUserProfile();
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-view-container">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-cover">
          {user.coverImage ? (
            <img src={getImageUrl(user.coverImage)} alt="Cover" className="cover-image" onError={(e) => { console.error('Cover image failed to load:', user.coverImage); e.target.style.display = 'none'; }} />
          ) : (
            <div className="cover-placeholder"></div>
          )}
          <div className="profile-avatar">
            {user.profileImage ? (
              <img src={getImageUrl(user.profileImage)} alt={getDisplayName(user)} onError={(e) => { console.error('Profile image failed to load:', user.profileImage); e.target.style.display = 'none'; }} />
            ) : (
                              <div className="avatar-placeholder">
                  {getDisplayInitials(user)}
                </div>
            )}
          </div>
        </div>
        
        <div className="profile-info">
          <h1 className="profile-name">{getDisplayName(user)}</h1>
          <p className="profile-location">{user.country || 'Location not set'}</p>
          <p className="profile-join-date">{formatJoinDate(user.createdAt)}</p>
          
          {user.instagram ? (
            <a href={`https://instagram.com/${user.instagram}`} target="_blank" rel="noopener noreferrer" className="social-link">
              📸 @{user.instagram}
            </a>
          ) : (
            <button className="add-instagram-btn" onClick={() => navigate('/account-settings')}>
              + Add Instagram
            </button>
          )}
          
          {user.bio && (
            <p className="profile-bio">{user.bio}</p>
          )}
        </div>

        {/* Profile Stats */}
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-number">{trips.length}</span>
            <span className="stat-label">Trips</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{friends.length}</span>
            <span className="stat-label">Friends</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{posts.length}</span>
            <span className="stat-label">Posts</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-actions">
          {/* Only show edit button if viewing own profile */}
          {!userId && (
            <button 
              className="edit-profile-btn"
              onClick={() => {
                navigate('/profile/edit');
                // Scroll to top when navigating to edit profile
                window.scrollTo(0, 0);
              }}
            >
              ✏️ Edit Profile
            </button>
          )}
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
                 <button 
           className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
           onClick={() => setActiveTab('friends')}
         >
           👥 Friends
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
                          {getDisplayInitials(user)}
                        </div>
                        <div className="author-info">
                          <span className="author-name">{getDisplayName(user)}</span>
                          <span className="post-date">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="post-actions">
                        {/* Only show edit/delete buttons for own posts */}
                        {!userId && (
                          <>
                            <button 
                              className="post-action-btn edit-btn"
                              onClick={() => handleEditPost(post)}
                              title="Edit post"
                            >
                              ✏️
                            </button>
                            <button 
                              className="post-action-btn delete-btn"
                              onClick={() => handleDeletePost(post._id)}
                              title="Delete post"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="post-content">
                      {editingPost === post._id ? (
                        <div className="edit-form">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="edit-textarea"
                            placeholder="Edit your post..."
                            rows="3"
                          />
                          <div className="edit-actions">
                            <button 
                              className="save-btn"
                              onClick={() => handleSaveEdit(post._id)}
                              disabled={saving}
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button 
                              className="cancel-btn"
                              onClick={handleCancelEdit}
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>{post.content}</p>
                          {post.image && (
                            <img src={post.image} alt="Post" className="post-image" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>No posts yet</h3>
                <p>Share your travel experiences with the community</p>
                <button 
                  className="create-post-btn"
                  onClick={() => navigate('/social')}
                >
                  Create a Post
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trips' && (
          <div className="trips-section">
            {trips.length > 0 ? (
              <div className="trips-grid">
                {trips.map(trip => (
                  <div key={trip._id} className="trip-card" onClick={() => navigate(`/trips/${trip._id}`)}>
                    <div className="trip-image">
                                      {trip.images && trip.images.length > 0 ? (
                  <img src={getImageUrl(trip.images[0])} alt={trip.destination} />
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
                <p>Start planning your next adventure</p>
                <button 
                  className="create-trip-btn"
                  onClick={() => navigate('/trips/create')}
                >
                  Create a Trip
                </button>
              </div>
            )}
          </div>
        )}

                 {/* Friends Tab */}
         {activeTab === 'friends' && (
           <div className="friends-section">
            {friends.length > 0 ? (
              <div className="friends-grid">
                {friends.map(friend => (
                  <div key={friend._id} className="friend-card">
                    <div className="friend-avatar">
                      {friend.profileImage ? (
                        <img src={getImageUrl(friend.profileImage)} alt={getDisplayName(friend)} onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div className="friend-avatar-placeholder">
                          {getDisplayInitials(friend)}
                        </div>
                      )}
                    </div>
                    <div className="friend-info">
                      <h3 className="friend-name">{getDisplayName(friend)}</h3>
                      <p className="friend-username">@{friend.username || friend.name}</p>
                      <p className="friend-location">{friend.country}</p>
                      {friend.bio && (
                        <p className="friend-bio">{friend.bio}</p>
                      )}
                    </div>
                    <div className="friend-actions">
                      <button 
                        className="friend-action-btn view-btn"
                        onClick={() => {
                          navigate(`/profile/${friend._id}`);
                          // Scroll to top when navigating to friend profile
                          window.scrollTo(0, 0);
                        }}
                        title="View Profile"
                      >
                        👤 View Profile
                      </button>
                      <button 
                        className="friend-action-btn message-btn"
                        onClick={() => {
                          navigate(`/messages?user=${friend._id}`);
                          // Scroll to top when navigating to messages
                          window.scrollTo(0, 0);
                        }}
                        title="Send Message"
                      >
                        💬 Message
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <h3>No friends yet</h3>
                <p>Connect with other travelers to build your network</p>
                <button 
                  className="find-friends-btn"
                  onClick={() => navigate('/social')}
                >
                  Find Friends
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 