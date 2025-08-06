import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './ProfileView.css';
import { getDisplayName, getDisplayInitials } from '../utils/userDisplay';

export default function ProfileView() {
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [trips, setTrips] = useState([]);
  const [friends, setFriends] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { userId } = useParams();

  const isOwnProfile = !userId;

  useEffect(() => {
    const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(currentUserData);
    
    fetchUserProfile();
    window.scrollTo(0, 0);
  }, [userId]);

  useEffect(() => {
    if (user) {
      fetchUserPosts();
      fetchUserTrips();
      if (isOwnProfile) {
        fetchUserFriends();
      }
    }
  }, [user, isOwnProfile]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        toast.error('No authentication token found');
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      const endpoint = userId ? `/api/users/${userId}` : '/api/users/profile';
      
      const response = await axios.get(endpoint, { headers });
      const userData = response.data.user || response.data;
      
      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setLoading(false);
      setUser(null);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const targetUserId = userId || user?._id;
      const response = await axios.get('/api/posts/user/' + targetUserId, { headers });
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setPosts([]);
    }
  };

  const fetchUserTrips = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (isOwnProfile) {
        const response = await axios.get('/api/trips/mine', { headers });
        setTrips(response.data);
      } else {
        setTrips([]);
      }
    } catch (error) {
      console.error('Failed to fetch trips:', error);
      setTrips([]);
    }
  };

  const fetchUserFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (isOwnProfile) {
        const response = await axios.get('/api/users/friends', { headers });
        setFriends(response.data);
      } else {
        setFriends([]);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
      setFriends([]);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/uploads/')) {
      return `http://localhost:5000${imagePath}`;
    }
    
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
      toast.error('Failed to update post');
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
      setPosts(posts.filter(post => post._id !== postId));
      toast.success('Post deleted successfully!');
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleSendMessage = () => {
    if (!isOwnProfile && user) {
      navigate(`/messages?user=${user._id}`);
    }
  };

  const handleViewFriendProfile = (friendId) => {
    navigate(`/profile/${friendId}`);
  };

  if (loading) {
    return (
      <div className="modern-profile-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="modern-profile-container">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Profile not found</h3>
          <p>The user profile you're looking for doesn't exist or may have been removed.</p>
          <button 
            className="btn-primary"
            onClick={() => navigate('/profile')}
          >
            Back to My Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-profile-container">
      {/* Modern Profile Header */}
      <div className="profile-hero">
        <div className="cover-section">
          {user.coverImage ? (
            <img 
              src={getImageUrl(user.coverImage)} 
              alt="Cover" 
              className="cover-image" 
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
          ) : (
            <div className="cover-placeholder">
              <div className="cover-gradient"></div>
            </div>
          )}
        </div>
        
        <div className="profile-main">
          <div className="profile-avatar-section">
            <div className="avatar-container">
              {user.profileImage ? (
                <img 
                  src={getImageUrl(user.profileImage)} 
                  alt={getDisplayName(user)} 
                  className="profile-avatar"
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
              ) : (
                <div className="avatar-placeholder">
                  <span className="avatar-initials">{getDisplayInitials(user)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="profile-info-section">
            <div className="profile-header-info">
              <h1 className="profile-name">{getDisplayName(user)}</h1>
              <div className="profile-meta">
                <span className="profile-location">
                  <i className="icon-location"></i>
                  {user.country || 'Location not set'}
                </span>
                <span className="profile-join-date">
                  <i className="icon-calendar"></i>
                  {formatJoinDate(user.createdAt)}
                </span>
                {user.instagram && (
                  <span className="profile-instagram">
                    <i className="icon-instagram"></i>
                    <a 
                      href={`https://instagram.com/${user.instagram}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="instagram-link"
                    >
                      @{user.instagram}
                    </a>
                  </span>
                )}
              </div>
              {user.bio && (
                <p className="profile-bio">{user.bio}</p>
              )}
            </div>
            
            <div className="profile-stats">
              <div className="stat-card">
                <span className="stat-number">{trips.length}</span>
                <span className="stat-label">Trips</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{posts.length}</span>
                <span className="stat-label">Posts</span>
              </div>
              {isOwnProfile && (
                <div className="stat-card">
                  <span className="stat-number">{friends.length}</span>
                  <span className="stat-label">Friends</span>
                </div>
              )}
            </div>
            
            <div className="profile-actions">
              {isOwnProfile ? (
                <div className="action-buttons">
                  <button 
                    className="btn-primary"
                    onClick={() => navigate('/profile/edit')}
                  >
                    <i className="icon-edit"></i>
                    Edit Profile
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => navigate('/account-settings')}
                  >
                    <i className="icon-settings"></i>
                    Settings
                  </button>
                </div>
              ) : (
                <div className="action-buttons">
                  <button 
                    className="btn-primary"
                    onClick={handleSendMessage}
                  >
                    <i className="icon-message"></i>
                    Send Message
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => navigate('/profile')}
                  >
                    <i className="icon-arrow-left"></i>
                    Back to My Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Tab Navigation */}
      <div className="tab-navigation">
        <div className="tab-container">
          <button 
            className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <i className="icon-posts"></i>
            Posts
            <span className="tab-count">{posts.length}</span>
          </button>
          <button 
            className={`tab-button ${activeTab === 'trips' ? 'active' : ''}`}
            onClick={() => setActiveTab('trips')}
          >
            <i className="icon-trips"></i>
            Trips
            <span className="tab-count">{trips.length}</span>
          </button>
          {isOwnProfile && (
            <button 
              className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              <i className="icon-friends"></i>
              Friends
              <span className="tab-count">{friends.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="content-area">
        <div className="content-container">
          {activeTab === 'posts' && (
            <div className="posts-content">
              {posts.length > 0 ? (
                <div className="posts-grid">
                  {posts.map(post => (
                    <div key={post._id} className="post-card-modern">
                      <div className="post-header-modern">
                        <div className="post-author-modern">
                          <div className="author-avatar-modern">
                            {user.profileImage ? (
                              <img 
                                src={getImageUrl(user.profileImage)} 
                                alt={getDisplayName(user)} 
                                className="author-image"
                                onError={(e) => { e.target.style.display = 'none'; }} 
                              />
                            ) : (
                              <div className="author-placeholder">
                                {getDisplayInitials(user)}
                              </div>
                            )}
                          </div>
                          <div className="author-info-modern">
                            <span className="author-name-modern">{getDisplayName(user)}</span>
                            <span className="post-date-modern">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        {isOwnProfile && (
                          <div className="post-actions-modern">
                            <button 
                              className="action-btn edit-btn"
                              onClick={() => handleEditPost(post)}
                              title="Edit post"
                            >
                              <i className="icon-edit-small"></i>
                            </button>
                            <button 
                              className="action-btn delete-btn"
                              onClick={() => handleDeletePost(post._id)}
                              title="Delete post"
                            >
                              <i className="icon-delete"></i>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="post-content-modern">
                        {editingPost === post._id ? (
                          <div className="edit-form-modern">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              placeholder="Edit your post..."
                              className="edit-textarea-modern"
                              rows="3"
                            />
                            <div className="edit-actions-modern">
                              <button 
                                className="btn-primary btn-small"
                                onClick={() => handleSaveEdit(post._id)}
                                disabled={saving}
                              >
                                {saving ? 'Saving...' : 'Save'}
                              </button>
                              <button 
                                className="btn-secondary btn-small"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="post-text">{post.content}</p>
                            {post.image && (
                              <img src={post.image} alt="Post" className="post-image-modern" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-modern">
                  <div className="empty-icon-modern">
                    <i className="icon-posts-large"></i>
                  </div>
                  <h3>No posts yet</h3>
                  <p>{isOwnProfile ? "You haven't shared any posts yet." : `${getDisplayName(user)} hasn't shared any posts yet.`}</p>
                  {isOwnProfile && (
                    <button 
                      className="btn-primary"
                      onClick={() => navigate('/social')}
                    >
                      <i className="icon-plus"></i>
                      Create Your First Post
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'trips' && (
            <div className="trips-content">
              {trips.length > 0 ? (
                <div className="trips-grid-modern">
                  {trips.map(trip => (
                    <div key={trip._id} className="trip-card-modern">
                      <div className="trip-image-modern">
                        {trip.images && trip.images.length > 0 ? (
                          <img src={getImageUrl(trip.images[0])} alt={trip.destination} />
                        ) : (
                          <div className="trip-image-placeholder-modern">
                            <i className="icon-map"></i>
                          </div>
                        )}
                        <div className="trip-status-badge">
                          <span className={`status ${trip.status}`}>
                            {trip.status}
                          </span>
                        </div>
                      </div>
                      <div className="trip-info-modern">
                        <h3 className="trip-destination">{trip.destination}</h3>
                        <div className="trip-dates-modern">
                          <i className="icon-calendar-small"></i>
                          {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-modern">
                  <div className="empty-icon-modern">
                    <i className="icon-trips-large"></i>
                  </div>
                  <h3>No trips yet</h3>
                  <p>{isOwnProfile ? "You haven't created any trips yet." : `${getDisplayName(user)} hasn't created any trips yet.`}</p>
                  {isOwnProfile && (
                    <button 
                      className="btn-primary"
                      onClick={() => navigate('/trips/create')}
                    >
                      <i className="icon-plus"></i>
                      Create Your First Trip
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'friends' && isOwnProfile && (
            <div className="friends-content">
              {friends.length > 0 ? (
                <div className="friends-grid-modern">
                  {friends.map(friend => (
                    <div key={friend._id} className="friend-card-modern">
                      <div className="friend-avatar-modern">
                        {friend.profileImage ? (
                          <img 
                            src={getImageUrl(friend.profileImage)} 
                            alt={getDisplayName(friend)} 
                            className="friend-image"
                            onError={(e) => { e.target.style.display = 'none'; }} 
                          />
                        ) : (
                          <div className="friend-placeholder">
                            {getDisplayInitials(friend)}
                          </div>
                        )}
                      </div>
                                             <div className="friend-info-modern">
                         <h3 className="friend-name">{getDisplayName(friend)}</h3>
                         <p className="friend-location">
                           <i className="icon-location-small"></i>
                           {friend.country || 'Location not set'}
                         </p>
                         {friend.instagram && (
                           <p className="friend-instagram">
                             <i className="icon-instagram"></i>
                             <a 
                               href={`https://instagram.com/${friend.instagram}`} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="instagram-link"
                             >
                               @{friend.instagram}
                             </a>
                           </p>
                         )}
                       </div>
                      <button 
                        className="btn-primary btn-small"
                        onClick={() => handleViewFriendProfile(friend._id)}
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-modern">
                  <div className="empty-icon-modern">
                    <i className="icon-friends-large"></i>
                  </div>
                  <h3>No friends yet</h3>
                  <p>Connect with other travelers to see them here!</p>
                  <button 
                    className="btn-primary"
                    onClick={() => navigate('/social')}
                  >
                    <i className="icon-search"></i>
                    Browse Users
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 