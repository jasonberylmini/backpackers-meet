import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getDisplayName, getDisplayFirstChar, getProfileImageUrl } from '../utils/userDisplay';
import './SocialFeed.css';

export default function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({
    content: '',
    audience: 'worldwide'
  });
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});
  const [editingComment, setEditingComment] = useState({});
  const [editCommentText, setEditCommentText] = useState({});
  const [showPostMenu, setShowPostMenu] = useState({});
  const [showCommentMenu, setShowCommentMenu] = useState({});
  const [activeTab, setActiveTab] = useState('worldwide');
  const [modalVisible, setModalVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    }
    fetchPosts('worldwide');
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get('/api/users/profile', { headers });
        
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (error) {
        console.error('Failed to fetch current user profile:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close post menus when clicking outside
      if (!event.target.closest('.post-menu')) {
        setShowPostMenu({});
      }
      // Close comment menus when clicking outside
      if (!event.target.closest('.comment-menu')) {
        setShowCommentMenu({});
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Handle modal animations
  useEffect(() => {
    if (showCreatePost) {
      setModalVisible(true);
    } else {
      const timer = setTimeout(() => setModalVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [showCreatePost]);

  // Close all dropdowns when switching tabs
  useEffect(() => {
    setShowPostMenu({});
    setShowCommentMenu({});
  }, [activeTab]);

  const handleMenuToggle = (menuType, id) => {
    if (menuType === 'post') {
      setShowPostMenu(prev => {
        const newState = {};
        // Close all other post menus
        Object.keys(prev).forEach(key => {
          if (key !== id) {
            newState[key] = false;
          }
        });
        // Toggle current menu
        newState[id] = !prev[id];
        return newState;
      });
      // Close all comment menus when opening a post menu
      setShowCommentMenu({});
    } else if (menuType === 'comment') {
      setShowCommentMenu(prev => {
        const newState = {};
        // Close all other comment menus
        Object.keys(prev).forEach(key => {
          if (key !== id) {
            newState[key] = false;
          }
        });
        // Toggle current menu
        newState[id] = !prev[id];
        return newState;
      });
      // Close all post menus when opening a comment menu
      setShowPostMenu({});
    }
  };

  const fetchPosts = async (audience) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(`/api/posts?audience=${audience}`, { headers });
      setPosts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
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
      
      await axios.post('/api/posts', newPost, { headers });
      
      toast.success('Post created successfully!');
      setShowCreatePost(false);
      setNewPost({ content: '', audience: 'worldwide' });
      fetchPosts(activeTab);
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
      
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                likes: post.likes.includes(user?.userId || user?._id || user?.id) 
                  ? post.likes.filter(id => id !== (user?.userId || user?._id || user?.id))
                  : [...post.likes, (user?.userId || user?._id || user?.id)],
                likeCount: post.likes.includes(user?.userId || user?._id || user?.id) 
                  ? (post.likeCount || 0) - 1 
                  : (post.likeCount || 0) + 1
              }
            : post
        )
      );
    } catch (error) {
      console.error('Failed to like post:', error);
      toast.error('Failed to like post');
    }
  };

  const handleComment = async (postId) => {
    const comment = commentText[postId];
    if (!comment?.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.post(`/api/posts/${postId}/comments`, { content: comment }, { headers });
      
      if (response.data && response.data._id) {
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === postId 
              ? { 
                  ...post, 
                  comments: [...(post.comments || []), response.data]
                }
              : post
          )
        );
        
        toast.success('Comment added successfully!');
        setCommentText(prev => ({ ...prev, [postId]: '' }));
      } else {
        console.error('Invalid response format:', response.data);
        toast.error('Failed to add comment - invalid response');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error(error.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleEditComment = async (commentId, postId) => {
    const comment = editCommentText[commentId];
    if (!comment?.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put(`/api/posts/comments/${commentId}`, { content: comment }, { headers });
      
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                comments: post.comments?.map(c => 
                  c._id === commentId 
                    ? { ...c, content: comment }
                    : c
                ) || []
              }
            : post
        )
      );
      
      toast.success('Comment updated successfully!');
      setEditingComment(prev => ({ ...prev, [commentId]: false }));
      setEditCommentText(prev => ({ ...prev, [commentId]: '' }));
    } catch (error) {
      console.error('Failed to edit comment:', error);
      toast.error('Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId, postId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete(`/api/posts/comments/${commentId}`, { headers });
      
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post._id === postId 
            ? { 
                ...post, 
                comments: post.comments?.filter(c => c._id !== commentId) || []
              }
            : post
        )
      );
      
      toast.success('Comment deleted successfully!');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleReportPost = async (postId) => {
    const reason = prompt('Please provide a reason for reporting this post:');
    if (!reason?.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/posts/${postId}/report`, { reason }, { headers });
      
      toast.success('Post reported successfully!');
      setShowPostMenu(prev => ({ ...prev, [postId]: false }));
    } catch (error) {
      console.error('Failed to report post:', error);
      toast.error('Failed to report post');
    }
  };

  const handleBlockUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to block ${userName}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/users/${userId}/block`, {}, { headers });
      
      toast.success('User blocked successfully!');
      setShowPostMenu(prev => ({ ...prev, [userId]: false }));
      fetchPosts(activeTab);
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error('Failed to block user');
    }
  };

  const handleReportComment = async (commentId, commentAuthorName) => {
    const reason = prompt('Please provide a reason for reporting this comment:');
    if (!reason?.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/posts/comments/${commentId}/report`, { reason }, { headers });
      
      toast.success('Comment reported successfully!');
      setShowCommentMenu(prev => ({ ...prev, [commentId]: false }));
    } catch (error) {
      console.error('Failed to report comment:', error);
      toast.error('Failed to report comment');
    }
  };

  const handleBlockCommentUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to block ${userName}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/users/${userId}/block`, {}, { headers });
      
      toast.success('User blocked successfully!');
      setShowCommentMenu(prev => ({ ...prev, [userId]: false }));
      fetchPosts(activeTab);
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error('Failed to block user');
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    fetchPosts(tab);
  };

  if (loading) {
    return (
      <div className="modern-social-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading social feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-social-container">
      {/* Modern Header */}
      <div className="social-header">
        <div className="header-content">
          <div className="header-info">
            <h1 className="header-title">Social Feed</h1>
            <p className="header-subtitle">Connect with fellow travelers and share your adventures</p>
          </div>
          <button 
            className="create-post-btn"
            onClick={() => setShowCreatePost(true)}
          >
            <i className="icon-plus"></i>
            Create Post
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <div className="tab-container">
          <button
            className={`tab-button ${activeTab === 'worldwide' ? 'active' : ''}`}
            onClick={() => handleTabChange('worldwide')}
          >
            <i className="icon-globe"></i>
            Worldwide
          </button>
          <button
            className={`tab-button ${activeTab === 'nearby' ? 'active' : ''}`}
            onClick={() => handleTabChange('nearby')}
          >
            <i className="icon-location"></i>
            Nearby
          </button>
        </div>
      </div>

      {/* Feed Content */}
      <div className="feed-content">
        <div className="feed-container">
          {posts.length === 0 ? (
            <div className="empty-state-modern">
              <div className="empty-icon-modern">
                <i className="icon-posts-large"></i>
              </div>
              <h3>No {activeTab} posts yet</h3>
              <p>Be the first to share your travel experiences!</p>
              <button 
                className="btn-primary"
                onClick={() => setShowCreatePost(true)}
              >
                <i className="icon-plus"></i>
                Create First Post
              </button>
            </div>
          ) : (
            <div className="posts-grid">
              {posts.map(post => (
                <div key={post._id} className="post-card-modern">
                  {/* Post Header */}
                  <div className="post-header-modern">
                    <div className="post-author-modern">
                      <div 
                        className="author-avatar-modern clickable"
                        onClick={() => navigate(`/profile/${post.author._id}`)}
                        title={`View ${getDisplayName(post.author)}'s profile`}
                      >
                        {(() => {
                          const profileUrl = getProfileImageUrl(post.author);
                          return profileUrl ? (
                            <img 
                              src={profileUrl} 
                              alt={getDisplayName(post.author)}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null;
                        })()}
                        <span style={{ display: getProfileImageUrl(post.author) ? 'none' : 'flex' }}>
                          {getDisplayFirstChar(post.author)}
                        </span>
                      </div>
                      <div className="author-info-modern">
                        <h4 
                          className="clickable"
                          onClick={() => navigate(`/profile/${post.author._id}`)}
                          title={`View ${getDisplayName(post.author)}'s profile`}
                        >
                          {getDisplayName(post.author)}
                        </h4>
                        <div className="post-meta">
                          <span className="post-time">
                            {formatTimeAgo(post.createdAt)}
                          </span>
                          <span className="post-audience-badge">
                            {post.audience === 'nearby' ? '📍' : '🌍'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`post-menu ${showPostMenu[post._id] ? 'active' : ''}`}>
                      <button 
                        className="menu-btn"
                        onClick={() => handleMenuToggle('post', post._id)}
                      >
                        <i className="icon-more"></i>
                      </button>
                      <div className={`menu-dropdown ${showPostMenu[post._id] ? 'show' : ''}`}>
                        {String(post.author._id) === String(user?.userId || user?._id || user?.id) ? (
                          <>
                            <button 
                              className="menu-item"
                              onClick={() => {
                                toast.info('Edit post feature coming soon!');
                                setShowPostMenu(prev => ({ ...prev, [post._id]: false }));
                              }}
                            >
                              <i className="icon-edit"></i>
                              Edit Post
                            </button>
                            <button 
                              className="menu-item danger"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this post?')) {
                                  toast.info('Delete post feature coming soon!');
                                }
                                setShowPostMenu(prev => ({ ...prev, [post._id]: false }));
                              }}
                            >
                              <i className="icon-delete"></i>
                              Delete Post
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="menu-item"
                              onClick={() => handleReportPost(post._id)}
                            >
                              <i className="icon-report"></i>
                              Report Post
                            </button>
                            <button 
                              className="menu-item danger"
                              onClick={() => handleBlockUser(post.author._id, getDisplayName(post.author))}
                            >
                              <i className="icon-block"></i>
                              Block User
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="post-content-modern">
                    <p className="post-text">{post.content}</p>
                  </div>

                  {/* Post Actions */}
                  <div className="post-actions-modern">
                    <button 
                      className={`action-btn ${post.likes?.includes(user?.userId || user?._id || user?.id) ? 'liked' : ''}`}
                      onClick={() => handleLikePost(post._id)}
                    >
                      <i className={`icon-heart ${post.likes?.includes(user?.userId || user?._id || user?.id) ? 'filled' : ''}`}></i>
                      <span>{post.likes?.length || 0}</span>
                    </button>
                    <button 
                      className="action-btn"
                      onClick={() => setShowComments(prev => ({ ...prev, [post._id]: !prev[post._id] }))}
                    >
                      <i className="icon-comment"></i>
                      <span>{post.comments?.length || 0}</span>
                    </button>
                    <button 
                      className="action-btn"
                      onClick={() => {
                        navigator.share ? 
                          navigator.share({
                            title: `${getDisplayName(post.author)}'s post`,
                            text: post.content,
                            url: window.location.href
                          }) :
                          navigator.clipboard.writeText(post.content).then(() => 
                            toast.success('Post copied to clipboard!')
                          );
                      }}
                    >
                      <i className="icon-share"></i>
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {showComments[post._id] && (
                    <div className="comments-section-modern">
                      <div className="comments-header">
                        <h5>Comments</h5>
                      </div>
                      
                      {/* Add Comment */}
                      <div className="comment-input-container-modern">
                        <div className="comment-avatar-modern">
                          {(() => {
                            const profileUrl = getProfileImageUrl(user);
                            return profileUrl ? (
                              <img 
                                src={profileUrl} 
                                alt={getDisplayName(user)}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null;
                          })()}
                          <span style={{ display: getProfileImageUrl(user) ? 'none' : 'flex' }}>
                            {getDisplayFirstChar(user)}
                          </span>
                        </div>
                        <div className="comment-input-wrapper-modern">
                          <textarea
                            placeholder="Write a comment..."
                            value={commentText[post._id] || ''}
                            onChange={(e) => setCommentText(prev => ({ ...prev, [post._id]: e.target.value }))}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleComment(post._id)}
                            className="comment-input-modern"
                            rows="1"
                          />
                          <button
                            onClick={() => handleComment(post._id)}
                            className="comment-submit-btn-modern"
                          >
                            Post
                          </button>
                        </div>
                      </div>

                      {/* Comments List */}
                      {post.comments && post.comments.length > 0 ? (
                        <div className="comments-list-modern">
                          {post.comments.map((comment, index) => (
                            <div key={index} className="comment-item-modern">
                              <div className="comment-author-modern">
                                <div 
                                  className="comment-avatar-modern clickable"
                                  onClick={() => navigate(`/profile/${comment.author._id}`)}
                                  title={`View ${getDisplayName(comment.author)}'s profile`}
                                >
                                  {(() => {
                                    const profileUrl = getProfileImageUrl(comment.author);
                                    return profileUrl ? (
                                      <img 
                                        src={profileUrl} 
                                        alt={getDisplayName(comment.author)}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : null;
                                  })()}
                                  <span style={{ display: getProfileImageUrl(comment.author) ? 'none' : 'flex' }}>
                                    {getDisplayFirstChar(comment.author)}
                                  </span>
                                </div>
                                <div className="comment-info-modern">
                                  <span 
                                    className="comment-name-modern clickable"
                                    onClick={() => navigate(`/profile/${comment.author._id}`)}
                                    title={`View ${getDisplayName(comment.author)}'s profile`}
                                  >
                                    {getDisplayName(comment.author)}
                                  </span>
                                  <span className="comment-time-modern">
                                    {formatTimeAgo(comment.createdAt)}
                                  </span>
                                </div>
                                                                 <div className={`comment-menu ${showCommentMenu[comment._id] ? 'active' : ''}`}>
                                   <button 
                                     className="menu-btn"
                                     onClick={() => handleMenuToggle('comment', comment._id)}
                                   >
                                     <i className="icon-more"></i>
                                   </button>
                                  <div className={`menu-dropdown ${showCommentMenu[comment._id] ? 'show' : ''}`}>
                                    {String(comment.author._id) === String(user?.userId || user?._id || user?.id) ? (
                                      <>
                                        <button 
                                          className="menu-item"
                                          onClick={() => {
                                            setEditingComment(prev => ({ ...prev, [comment._id]: !prev[comment._id] }));
                                            if (!editingComment[comment._id]) {
                                              setEditCommentText(prev => ({ ...prev, [comment._id]: comment.content }));
                                            }
                                            setShowCommentMenu(prev => ({ ...prev, [comment._id]: false }));
                                          }}
                                        >
                                          <i className="icon-edit"></i>
                                          Edit Comment
                                        </button>
                                        <button 
                                          className="menu-item danger"
                                          onClick={() => {
                                            handleDeleteComment(comment._id, post._id);
                                            setShowCommentMenu(prev => ({ ...prev, [comment._id]: false }));
                                          }}
                                        >
                                          <i className="icon-delete"></i>
                                          Delete Comment
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button 
                                          className="menu-item"
                                          onClick={() => handleReportComment(comment._id, getDisplayName(comment.author))}
                                        >
                                          <i className="icon-report"></i>
                                          Report Comment
                                        </button>
                                        <button 
                                          className="menu-item danger"
                                          onClick={() => handleBlockCommentUser(comment.author._id, getDisplayName(comment.author))}
                                        >
                                          <i className="icon-block"></i>
                                          Block User
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {editingComment[comment._id] ? (
                                <div className="comment-edit-container-modern">
                                  <textarea
                                    value={editCommentText[comment._id] || ''}
                                    onChange={(e) => setEditCommentText(prev => ({ ...prev, [comment._id]: e.target.value }))}
                                    className="comment-edit-input-modern"
                                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleEditComment(comment._id, post._id)}
                                    rows="2"
                                  />
                                  <div className="comment-edit-actions-modern">
                                    <button 
                                      className="btn-primary btn-small"
                                      onClick={() => handleEditComment(comment._id, post._id)}
                                    >
                                      Save
                                    </button>
                                    <button 
                                      className="btn-secondary btn-small"
                                      onClick={() => {
                                        setEditingComment(prev => ({ ...prev, [comment._id]: false }));
                                        setEditCommentText(prev => ({ ...prev, [comment._id]: '' }));
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="comment-content-modern">{comment.content}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-comments-modern">No comments yet. Be the first to comment!</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      {modalVisible && (
        <div className={`modal-overlay-modern ${showCreatePost ? 'show' : ''}`} onClick={() => setShowCreatePost(false)}>
          <div className="modal-content-modern" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-modern">
              <h2>Create Post</h2>
              <button 
                className="close-btn-modern"
                onClick={() => setShowCreatePost(false)}
              >
                <i className="icon-close"></i>
              </button>
            </div>
            
            <form onSubmit={handleCreatePost} className="post-form-modern">
              <div className="form-group-modern">
                <label htmlFor="content">What's on your mind?</label>
                <textarea
                  id="content"
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Share your travel experiences, tips, or adventures..."
                  rows="4"
                  required
                  className="form-textarea-modern"
                />
                <div className="char-count-modern">
                  {newPost.content.length}/500
                </div>
              </div>

              <div className="form-group-modern">
                <label htmlFor="audience">Audience</label>
                <select
                  id="audience"
                  value={newPost.audience}
                  onChange={(e) => setNewPost(prev => ({ ...prev, audience: e.target.value }))}
                  className="form-select-modern"
                >
                  <option value="worldwide">🌍 Worldwide - Share with all travelers</option>
                  <option value="nearby">📍 Nearby - Share with travelers in your country</option>
                </select>
              </div>

              <div className="form-actions-modern">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowCreatePost(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                >
                  Create Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 