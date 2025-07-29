import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './SocialFeed.css';

export default function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    content: '',
    image: null,
    tripId: ''
  });
  const [userTrips, setUserTrips] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [postsRes, tripsRes] = await Promise.all([
        axios.get('/api/posts/feed', { headers }),
        axios.get('/api/trips/my-trips', { headers })
      ]);
      
      setPosts(postsRes.data);
      setUserTrips(tripsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
      toast.error('Failed to load social feed');
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    if (!newPost.content.trim()) {
      toast.error('Please write something to share');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const formData = new FormData();
      formData.append('content', newPost.content);
      if (newPost.image) {
        formData.append('image', newPost.image);
      }
      if (newPost.tripId) {
        formData.append('tripId', newPost.tripId);
      }
      
      await axios.post('/api/posts/create', formData, { 
        headers: { 
          ...headers,
          'Content-Type': 'multipart/form-data'
        } 
      });
      
      toast.success('Post created successfully!');
      setShowCreatePost(false);
      setNewPost({ content: '', image: null, tripId: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to create post:', error);
      toast.error(error.response?.data?.message || 'Failed to create post');
    }
  };

  const handleLikePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/posts/${postId}/like`, {}, { headers });
      
      // Update local state
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                likes: post.likes.includes(user.userId) 
                  ? post.likes.filter(id => id !== user.userId)
                  : [...post.likes, user.userId],
                likeCount: post.likes.includes(user.userId) 
                  ? post.likeCount - 1 
                  : post.likeCount + 1
              }
            : post
        )
      );
    } catch (error) {
      console.error('Failed to like post:', error);
      toast.error('Failed to like post');
    }
  };

  const handleComment = async (postId, comment) => {
    if (!comment.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/posts/${postId}/comment`, { content: comment }, { headers });
      
      toast.success('Comment added successfully!');
      fetchData(); // Refresh to get updated comments
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size must be less than 5MB');
        return;
      }
      setNewPost(prev => ({ ...prev, image: file }));
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInSeconds = Math.floor((now - postDate) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return postDate.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="social-feed-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading social feed...</p>
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
            <h1>Social Feed 💬</h1>
            <p className="user-subtitle">
              Connect with fellow travelers and share your adventures
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2>Social Feed</h2>
          <button 
            className="view-all-btn"
            onClick={() => setShowCreatePost(true)}
          >
            ✏️ Create Post
          </button>
        </div>
        
        <div className="social-content">
        <div className="feed-container">
          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📱</div>
              <h3>No posts yet</h3>
              <p>Be the first to share your travel experiences!</p>
              <button 
                className="primary-btn"
                onClick={() => setShowCreatePost(true)}
              >
                Create First Post
              </button>
            </div>
          ) : (
            <div className="posts-list">
              {posts.map(post => (
                <div key={post._id} className="post-card">
                  {/* Post Header */}
                  <div className="post-header">
                    <div className="post-author">
                      <div className="author-avatar">
                        <span>{post.author.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="author-info">
                        <h4>{post.author.name}</h4>
                        <span className="post-time">
                          {formatTimeAgo(post.createdAt)}
                        </span>
                      </div>
                    </div>
                    {post.trip && (
                      <div className="post-trip">
                        <span className="trip-badge">
                          🧳 {post.trip.destination}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Post Content */}
                  <div className="post-content">
                    <p>{post.content}</p>
                    {post.image && (
                      <div className="post-image">
                        <img src={post.image} alt="Post" />
                      </div>
                    )}
                  </div>

                  {/* Post Stats */}
                  <div className="post-stats">
                    <span className="stat-item">
                      ❤️ {post.likeCount} likes
                    </span>
                    <span className="stat-item">
                      💬 {post.comments?.length || 0} comments
                    </span>
                  </div>

                  {/* Post Actions */}
                  <div className="post-actions">
                    <button 
                      className={`action-btn ${post.likes.includes(user?.userId) ? 'liked' : ''}`}
                      onClick={() => handleLikePost(post._id)}
                    >
                      {post.likes.includes(user?.userId) ? '❤️' : '🤍'} Like
                    </button>
                    <button 
                      className="action-btn"
                      onClick={() => {
                        const comment = prompt('Write a comment:');
                        if (comment) handleComment(post._id, comment);
                      }}
                    >
                      💬 Comment
                    </button>
                    <button 
                      className="action-btn"
                      onClick={() => {
                        navigator.share ? 
                          navigator.share({
                            title: `${post.author.name}'s post`,
                            text: post.content,
                            url: window.location.href
                          }) :
                          navigator.clipboard.writeText(post.content).then(() => 
                            toast.success('Post copied to clipboard!')
                          );
                      }}
                    >
                      📤 Share
                    </button>
                  </div>

                  {/* Comments */}
                  {post.comments && post.comments.length > 0 && (
                    <div className="comments-section">
                      <h5>Comments</h5>
                      <div className="comments-list">
                        {post.comments.map((comment, index) => (
                          <div key={index} className="comment-item">
                            <div className="comment-author">
                              <span className="comment-avatar">
                                {comment.author.name.charAt(0).toUpperCase()}
                              </span>
                              <div className="comment-info">
                                <span className="comment-name">{comment.author.name}</span>
                                <span className="comment-time">
                                  {formatTimeAgo(comment.createdAt)}
                                </span>
                              </div>
                            </div>
                            <p className="comment-content">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </section>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="modal-overlay" onClick={() => setShowCreatePost(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Post</h2>
              <button 
                className="close-btn"
                onClick={() => setShowCreatePost(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreatePost} className="post-form">
              <div className="form-group">
                <label htmlFor="content">What's on your mind?</label>
                <textarea
                  id="content"
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Share your travel experiences, tips, or adventures..."
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tripId">Link to Trip (Optional)</label>
                <select
                  id="tripId"
                  value={newPost.tripId}
                  onChange={(e) => setNewPost(prev => ({ ...prev, tripId: e.target.value }))}
                >
                  <option value="">No trip linked</option>
                  {userTrips.map(trip => (
                    <option key={trip._id} value={trip._id}>
                      {trip.destination}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="image">Add Image (Optional)</label>
                <input
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="file-input"
                />
                {newPost.image && (
                  <div className="image-preview">
                    <img src={URL.createObjectURL(newPost.image)} alt="Preview" />
                    <button 
                      type="button"
                      onClick={() => setNewPost(prev => ({ ...prev, image: null }))}
                      className="remove-image"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => setShowCreatePost(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                >
                  Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 