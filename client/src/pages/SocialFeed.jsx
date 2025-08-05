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
  const [activeTab, setActiveTab] = useState('worldwide'); // 'worldwide' or 'nearby'
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      console.log('User data from localStorage:', parsedUser);
      console.log('User profileImage field:', parsedUser?.profileImage);
      console.log('Profile image URL result:', getProfileImageUrl(parsedUser));
      setUser(parsedUser);
    }
    fetchPosts('worldwide');
  }, []);

  // Fetch current user's profile data to get profileImage
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get('/api/users/profile', { headers });
        
        console.log('Current user profile from API:', response.data);
        console.log('API profileImage field:', response.data?.profileImage);
        console.log('API profile image URL result:', getProfileImageUrl(response.data));
        
        // Update user state with complete profile data
        setUser(response.data);
        
        // Update localStorage with complete profile data
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (error) {
        console.error('Failed to fetch current user profile:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.post-menu')) {
        setShowPostMenu({});
      }
      if (!event.target.closest('.comment-menu')) {
        setShowCommentMenu({});
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
      
      // Update local state
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
      
      // Check if response.data exists and has the expected structure
      if (response.data && response.data._id) {
        // Update local state instead of refetching
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
      
      // Update local state instead of refetching
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
      
      // Update local state instead of refetching
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
      fetchPosts(activeTab); // Refresh to remove blocked user's posts
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
      fetchPosts(activeTab); // Refresh to remove blocked user's posts and comments
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
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'worldwide' ? 'active' : ''}`}
            onClick={() => handleTabChange('worldwide')}
          >
            🌍 Worldwide
          </button>
          <button
            className={`tab-btn ${activeTab === 'nearby' ? 'active' : ''}`}
            onClick={() => handleTabChange('nearby')}
          >
            📍 Nearby
          </button>
        </div>
        
        <div className="social-content">
          <div className="feed-container">
            {posts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📱</div>
                <h3>No {activeTab} posts yet</h3>
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
                         <div 
                           className="author-avatar clickable"
                           onClick={() => navigate(`/profile/${post.author._id}`)}
                           title={`View ${getDisplayName(post.author)}'s profile`}
                         >
                            {(() => {
                              const profileUrl = getProfileImageUrl(post.author);
                              console.log('Post author profile image URL:', profileUrl, 'Author object:', post.author);
                              return profileUrl ? (
                                <img 
                                  src={profileUrl} 
                                  alt={getDisplayName(post.author)}
                                  onError={(e) => {
                                    console.log('Post author profile image failed to load:', profileUrl);
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                  onLoad={() => console.log('Post author profile image loaded successfully:', profileUrl)}
                                />
                              ) : null;
                            })()}
                            <span style={{ display: getProfileImageUrl(post.author) ? 'none' : 'flex' }}>
                              {getDisplayFirstChar(post.author)}
                            </span>
                          </div>
                         <div className="author-info">
                           <h4 
                             className="clickable"
                             onClick={() => navigate(`/profile/${post.author._id}`)}
                             title={`View ${getDisplayName(post.author)}'s profile`}
                           >
                             {getDisplayName(post.author)}
                           </h4>
                           <span className="post-time">
                             {formatTimeAgo(post.createdAt)}
                           </span>
                         </div>
                       </div>
                       <div className="post-menu">
                         <button 
                           className="menu-btn"
                           onClick={() => setShowPostMenu(prev => ({ ...prev, [post._id]: !prev[post._id] }))}
                         >
                           ⋮
                         </button>
                                                   {showPostMenu[post._id] && (
                            <div className="menu-dropdown">
                              {String(post.author._id) === String(user?.userId || user?._id || user?.id) ? (
                                <>
                                  <button 
                                    className="menu-item"
                                    onClick={() => {
                                      // TODO: Add edit post functionality
                                      toast.info('Edit post feature coming soon!');
                                      setShowPostMenu(prev => ({ ...prev, [post._id]: false }));
                                    }}
                                  >
                                    ✏️ Edit Post
                                  </button>
                                  <button 
                                    className="menu-item"
                                    onClick={() => {
                                      if (window.confirm('Are you sure you want to delete this post?')) {
                                        // TODO: Add delete post functionality
                                        toast.info('Delete post feature coming soon!');
                                      }
                                      setShowPostMenu(prev => ({ ...prev, [post._id]: false }));
                                    }}
                                  >
                                    🗑️ Delete Post
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    className="menu-item"
                                    onClick={() => handleReportPost(post._id)}
                                  >
                                    🚨 Report Post
                                  </button>
                                  <button 
                                    className="menu-item"
                                    onClick={() => handleBlockUser(post.author._id, getDisplayName(post.author))}
                                  >
                                    🚫 Block User
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                       </div>
                     </div>

                     {/* Post Content */}
                     <div className="post-content">
                       <p>{post.content}</p>
                     </div>

                     {/* Post Actions */}
                     <div className="post-actions">
                       <button 
                                                   className={`action-btn ${post.likes?.includes(user?.userId || user?._id || user?.id) ? 'liked' : ''}`}
                          onClick={() => handleLikePost(post._id)}
                        >
                          {post.likes?.includes(user?.userId || user?._id || user?.id) ? '❤️' : '🤍'} {post.likes?.length || 0}
                       </button>
                       <button 
                         className="action-btn"
                         onClick={() => setShowComments(prev => ({ ...prev, [post._id]: !prev[post._id] }))}
                       >
                         💬 {post.comments?.length || 0}
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
                         📤 Share
                       </button>
                     </div>

                    {/* Comments Section */}
                    {showComments[post._id] && (
                      <div className="comments-section">
                        <h5>Comments</h5>
                        
                                                 {/* Add Comment */}
                         <div className="comment-input-container">
                                                       <div className="comment-avatar">
                              {(() => {
                                const profileUrl = getProfileImageUrl(user);
                                console.log('User profile image URL:', profileUrl, 'User object:', user);
                                return profileUrl ? (
                                  <img 
                                    src={profileUrl} 
                                    alt={getDisplayName(user)}
                                    onError={(e) => {
                                      console.log('Profile image failed to load:', profileUrl);
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                    onLoad={() => console.log('Profile image loaded successfully:', profileUrl)}
                                  />
                                ) : null;
                              })()}
                              <span style={{ display: getProfileImageUrl(user) ? 'none' : 'flex' }}>
                                {getDisplayFirstChar(user)}
                              </span>
                            </div>
                          <div className="comment-input-wrapper">
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentText[post._id] || ''}
                              onChange={(e) => setCommentText(prev => ({ ...prev, [post._id]: e.target.value }))}
                              onKeyPress={(e) => e.key === 'Enter' && handleComment(post._id)}
                              className="comment-input"
                            />
                            <button
                              onClick={() => handleComment(post._id)}
                              className="comment-submit-btn"
                            >
                              Post
                            </button>
                          </div>
                        </div>

                                                 {/* Comments List */}
                         {post.comments && post.comments.length > 0 ? (
                           <div className="comments-list">
                             {post.comments.map((comment, index) => (
                               <div key={index} className="comment-item">
                                 <div className="comment-author">
                                                                       <div 
                                         className="comment-avatar clickable"
                                         onClick={() => navigate(`/profile/${comment.author._id}`)}
                                         title={`View ${getDisplayName(comment.author)}'s profile`}
                                       >
                                      {(() => {
                                        const profileUrl = getProfileImageUrl(comment.author);
                                        console.log('Comment author profile image URL:', profileUrl, 'Comment author object:', comment.author);
                                        return profileUrl ? (
                                          <img 
                                            src={profileUrl} 
                                            alt={getDisplayName(comment.author)}
                                            onError={(e) => {
                                              console.log('Comment author profile image failed to load:', profileUrl);
                                              e.target.style.display = 'none';
                                              e.target.nextSibling.style.display = 'flex';
                                            }}
                                            onLoad={() => console.log('Comment author profile image loaded successfully:', profileUrl)}
                                          />
                                        ) : null;
                                      })()}
                                      <span style={{ display: getProfileImageUrl(comment.author) ? 'none' : 'flex' }}>
                                        {getDisplayFirstChar(comment.author)}
                                      </span>
                                    </div>
                                   <div className="comment-info">
                                     <span 
                                       className="comment-name clickable"
                                       onClick={() => navigate(`/profile/${comment.author._id}`)}
                                       title={`View ${getDisplayName(comment.author)}'s profile`}
                                     >
                                       {getDisplayName(comment.author)}
                                     </span>
                                     <span className="comment-time">
                                       {formatTimeAgo(comment.createdAt)}
                                     </span>
                                   </div>
                                   <div className="comment-menu">
                                     <button 
                                       className="menu-btn"
                                                                               onClick={() => {
                                          const currentUserId = user?.userId || user?._id || user?.id;
                                          console.log('Comment author ID:', comment.author._id, 'User ID:', currentUserId, 'User object:', user);
                                          console.log('Match:', String(comment.author._id) === String(currentUserId));
                                          setShowCommentMenu(prev => ({ ...prev, [comment._id]: !prev[comment._id] }));
                                        }}
                                     >
                                       ⋮
                                     </button>
                                     {showCommentMenu[comment._id] && (
                                       <div className="menu-dropdown">
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
                                               ✏️ Edit Comment
                                             </button>
                                             <button 
                                               className="menu-item"
                                               onClick={() => {
                                                 handleDeleteComment(comment._id, post._id);
                                                 setShowCommentMenu(prev => ({ ...prev, [comment._id]: false }));
                                               }}
                                             >
                                               🗑️ Delete Comment
                                             </button>
                                           </>
                                         ) : (
                                           <>
                                             <button 
                                               className="menu-item"
                                               onClick={() => handleReportComment(comment._id, getDisplayName(comment.author))}
                                             >
                                               🚨 Report Comment
                                             </button>
                                             <button 
                                               className="menu-item"
                                               onClick={() => handleBlockCommentUser(comment.author._id, getDisplayName(comment.author))}
                                             >
                                               🚫 Block User
                                             </button>
                                           </>
                                         )}
                                       </div>
                                     )}
                                   </div>
                                 </div>
                                 {editingComment[comment._id] ? (
                                   <div className="comment-edit-container">
                                     <input
                                       type="text"
                                       value={editCommentText[comment._id] || ''}
                                       onChange={(e) => setEditCommentText(prev => ({ ...prev, [comment._id]: e.target.value }))}
                                       className="comment-edit-input"
                                       onKeyPress={(e) => e.key === 'Enter' && handleEditComment(comment._id, post._id)}
                                     />
                                     <div className="comment-edit-actions">
                                       <button 
                                         className="comment-edit-btn save"
                                         onClick={() => handleEditComment(comment._id, post._id)}
                                       >
                                         Save
                                       </button>
                                       <button 
                                         className="comment-edit-btn cancel"
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
                                   <p className="comment-content">{comment.content}</p>
                                 )}
                               </div>
                             ))}
                           </div>
                         ) : (
                           <p className="no-comments">No comments yet. Be the first to comment!</p>
                         )}
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
                <div className="char-count">
                  {newPost.content.length}/500
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="audience">Audience</label>
                <select
                  id="audience"
                  value={newPost.audience}
                  onChange={(e) => setNewPost(prev => ({ ...prev, audience: e.target.value }))}
                >
                  <option value="worldwide">🌍 Worldwide - Share with all travelers</option>
                  <option value="nearby">📍 Nearby - Share with travelers in your country</option>
                </select>
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