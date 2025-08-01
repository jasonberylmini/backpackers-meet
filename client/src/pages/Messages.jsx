import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Messages.css';

export default function Messages() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showPinnedInfo, setShowPinnedInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showMessageOptions, setShowMessageOptions] = useState(null);

  // Real chat data
  const [personalChats, setPersonalChats] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [showChatActions, setShowChatActions] = useState(false);
  const [showUserActions, setShowUserActions] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  // Fetch user's chats
  const fetchUserChats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/chat/user-chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const personal = data.chats.filter(chat => chat.type === 'personal');
        const group = data.chats.filter(chat => chat.type === 'group');
        
        setPersonalChats(personal);
        setGroupChats(group);
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get or create trip chat
  const getOrCreateTripChat = async (tripId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/chat/trip/${tripId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.chat;
      }
    } catch (error) {
      console.error('Error getting trip chat:', error);
    }
    return null;
  };

  // Fetch chat messages
  const fetchChatMessages = async (chatId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/chat/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.messages;
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
    return [];
  };

  // Send message
  const sendMessage = async (chatId, text) => {
    try {
      setSendingMessage(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        const data = await response.json();
        // Add the new message to the chat
        setChatMessages(prev => [...prev, data.messageData]);
        return data.messageData;
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
    return null;
  };

  // Edit message
  const editMessage = async (messageId, newText) => {
    try {
      console.log('Editing message:', messageId, 'with text:', newText);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: newText })
      });

      console.log('Edit response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Edit response data:', data);
        // Update the message in the chat
        setChatMessages(prev => prev.map(msg => 
          msg._id === messageId ? { ...msg, text: newText, isEdited: true } : msg
        ));
        setEditingMessage(null);
        setEditText('');
        return data.message;
      } else {
        const errorData = await response.text();
        console.error('Edit failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
    return null;
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    try {
      console.log('Deleting message:', messageId);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Delete response status:', response.status);
      
      if (response.ok) {
        console.log('Message deleted successfully');
        // Remove the message from the chat
        setChatMessages(prev => prev.filter(msg => msg._id !== messageId));
        setShowMessageOptions(null);
        return true;
      } else {
        const errorData = await response.text();
        console.error('Delete failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
    return false;
  };

  // Handle URL parameters for direct chat navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const targetUserId = urlParams.get('user');
    const targetTripId = urlParams.get('trip');
    
    console.log('URL parameters:', { targetUserId, targetTripId });
    
    if (targetTripId) {
      console.log('Navigating to trip chat:', targetTripId);
      handleTripChatNavigation(targetTripId);
    } else if (targetUserId) {
      console.log('Navigating to personal chat with user:', targetUserId);
      handlePersonalChatNavigation(targetUserId);
    } else {
      // Load user's chats when no specific chat is requested
      console.log('No specific chat requested, loading user chats');
      fetchUserChats();
    }
  }, [location.search]);

  const handleTripChatNavigation = async (tripId) => {
    try {
      setLoading(true);
      
      // Get or create trip chat
      const chat = await getOrCreateTripChat(tripId);
      if (chat) {
        // Fetch trip details for the chat
        const token = localStorage.getItem('token');
        const tripResponse = await fetch(`http://localhost:5000/api/trips/${tripId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        let tripData = null;
        if (tripResponse.ok) {
          tripData = await tripResponse.json();
        }

        // Create chat object with trip details
        const chatWithTripDetails = {
          ...chat,
          groupName: tripData?.destination || `Trip ${tripId}`,
          groupAvatar: '🧳',
          memberCount: tripData?.members?.length || 1,
          tripDetails: {
            destination: tripData?.destination || 'Trip Destination',
            dates: tripData?.startDate && tripData?.endDate ? 
              `${new Date(tripData.startDate).toLocaleDateString()} - ${new Date(tripData.endDate).toLocaleDateString()}` : 
              'Trip Dates',
            organizer: tripData?.creator?.username || 'Trip Organizer',
            budget: tripData?.budget ? `$${tripData.budget}` : 'Budget TBD',
            tripType: tripData?.tripType || 'Trip Type TBD',
            description: tripData?.description || 'No description available'
          }
        };

        setSelectedChat(chatWithTripDetails);
        setActiveTab('group');

        // Fetch messages for this chat
        const messages = await fetchChatMessages(chat._id);
        setChatMessages(messages);
      }
    } catch (error) {
      console.error('Error navigating to trip chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalChatNavigation = async (userId) => {
    try {
      setLoading(true);
      console.log('Creating personal chat with user:', userId);
      
      // Create or get personal chat
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/chat/personal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ otherUserId: userId })
      });

      console.log('Chat creation response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Chat created successfully:', data);
        setSelectedChat(data.chat);
        setActiveTab('personal');

        // Fetch messages for this chat
        const messages = await fetchChatMessages(data.chat._id);
        setChatMessages(messages);
      } else {
        const errorData = await response.json();
        console.error('Failed to create chat:', errorData);
        toast.error(errorData.message || 'Failed to create chat');
      }
    } catch (error) {
      console.error('Error navigating to personal chat:', error);
      toast.error('Failed to create chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom when chat messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      const chatMessagesElement = document.querySelector('.chat-messages');
      if (chatMessagesElement) {
        chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
      }
    }
  }, [chatMessages]);

  const handleChatSelect = async (chat) => {
    setSelectedChat(chat);
    setActiveTab(chat.type);
    
    // Fetch messages for this chat
    const messages = await fetchChatMessages(chat._id);
    setChatMessages(messages);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || sendingMessage) return;

    const message = await sendMessage(selectedChat._id, newMessage);
    if (message) {
    setNewMessage('');
    }
  };

  const handleBackToMessages = () => {
    setSelectedChat(null);
    setChatMessages([]);
    setNewMessage('');
    // Refresh the chat list
    fetchUserChats();
  };

  // Navigate to user profile
  const handleProfileClick = (userId) => {
    console.log('Profile click - User ID:', userId);
    console.log('Current user data:', user);
    console.log('Current user ID:', user?.id);
    console.log('Navigating to profile:', `/profile/${userId}`);
    
    // Ensure we're navigating to the correct user's profile
    if (userId) {
      navigate(`/profile/${userId}`);
    } else {
      console.error('No user ID provided for profile navigation');
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Chat and User Action Functions
  const handleDeleteChat = async (chatId) => {
    if (!window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Chat deleted successfully');
        setSelectedChat(null);
        setChatMessages([]);
        fetchUserChats(); // Refresh chat list
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleReportUser = async (userId, reason) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/flags', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetType: 'user',
          targetId: userId,
          reason: reason,
          description: `User reported from chat: ${reason}`
        })
      });

      if (response.ok) {
        toast.success('User reported successfully');
        setShowUserActions(false);
        setSelectedUser(null);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to report user');
      }
    } catch (error) {
      console.error('Error reporting user:', error);
      toast.error('Failed to report user');
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users/block', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          blockedUserId: userId
        })
      });

      if (response.ok) {
        toast.success('User blocked successfully');
        setShowUserActions(false);
        setSelectedUser(null);
        // Refresh chat list to remove blocked user's chats
        fetchUserChats();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    }
  };

  const openUserActions = (user) => {
    setSelectedUser(user);
    setShowUserActions(true);
  };

  const openChatActions = () => {
    setShowChatActions(true);
  };

  // Group messages by sender for consecutive messages
  const groupMessagesBySender = (messages) => {
    const grouped = [];
    let currentGroup = null;

    console.log('Grouping messages - Current user:', user);
    console.log('Messages to group:', messages);

    messages.forEach((message, index) => {
      const isFirstMessage = index === 0;
      const isSameSender = currentGroup && currentGroup.sender._id === message.sender._id;
      const timeDiff = currentGroup ? new Date(message.sentAt) - new Date(currentGroup.messages[currentGroup.messages.length - 1].sentAt) : 0;
      const shouldGroup = isSameSender && timeDiff < 300000; // 5 minutes

      // Debug sender ID comparison
      const senderId = message.sender._id;
      const currentUserId = user?.id; // Use 'id' field from user object
      const isOwn = senderId === currentUserId;
      
      console.log(`Message ${index}:`, {
        senderName: message.sender.username || message.sender.name || 'Unknown',
        senderId: senderId,
        currentUserId: currentUserId,
        isOwn: isOwn,
        senderIdType: typeof senderId,
        currentUserIdType: typeof currentUserId
      });

      if (shouldGroup) {
        currentGroup.messages.push(message);
      } else {
        if (currentGroup) {
          grouped.push(currentGroup);
        }
        currentGroup = {
          sender: message.sender,
          messages: [message],
          isOwn: isOwn
        };
      }
    });

    if (currentGroup) {
      grouped.push(currentGroup);
    }

    return grouped;
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  if (selectedChat) {
    const groupedMessages = groupMessagesBySender(chatMessages);
    const isGroupChat = selectedChat.type === 'group';
    const tripDetails = isGroupChat ? selectedChat.tripDetails : null;

    return (
      <div className="modern-chat-container">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <button className="back-btn" onClick={handleBackToMessages}>
              ← Back
            </button>
            <div className="chat-info">
              <div className="chat-title">
                {isGroupChat ? selectedChat.groupName : selectedChat.name}
              </div>
              {isGroupChat && (
                <div className="chat-subtitle">
                  {selectedChat.memberCount} members
                </div>
              )}
            </div>
          </div>
          <div className="chat-header-right">
            <button 
              className="chat-actions-btn"
              onClick={openChatActions}
              title="Chat actions"
            >
              ⋮
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="chat-main">
          {/* Messages Column */}
          <div className="messages-column">
            <div className="chat-messages">
              {groupedMessages.length === 0 ? (
                <div className="empty-chat">
                  <div className="empty-chat-icon">💬</div>
                  <h3>No messages yet</h3>
                  <p>Start the conversation by sending a message!</p>
                </div>
              ) : (
                groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex} className={`message-group ${group.isOwn ? 'own' : 'other'}`}>
                  {group.messages.map((message, messageIndex) => (
                    <div key={message._id} className="message-wrapper">
                                             {/* Show avatar and name for first message in group */}
                       {messageIndex === 0 && (
                         <div className="message-sender-info">
                           <div 
                             className="sender-avatar clickable"
                             onClick={() => {
                               console.log('Avatar clicked for sender:', message.sender);
                               console.log('Current user:', user);
                               console.log('Sender ID:', message.sender._id);
                               console.log('Current user ID:', user?.id);
                               console.log('Are they the same?', message.sender._id === user?.id);
                               handleProfileClick(message.sender._id);
                             }}
                             title={`View ${message.sender.username}'s profile`}
                           >
                             {(() => {
                               console.log('Profile image debug for', message.sender.username, ':', {
                                 profileImage: message.sender.profileImage,
                                 hasProfileImage: !!message.sender.profileImage,
                                 profileImageType: typeof message.sender.profileImage,
                                 profileImageLength: message.sender.profileImage ? message.sender.profileImage.length : 0
                               });
                               
                               // Show profile image if it exists and is not empty
                               const shouldShowImage = message.sender.profileImage && 
                                                      message.sender.profileImage.trim() !== '' && 
                                                      message.sender.profileImage !== 'default-avatar.png';
                               
                               console.log('Should show image for', message.sender.username, ':', shouldShowImage);
                               
                               return shouldShowImage ? (
                                 <img 
                                   src={message.sender.profileImage} 
                                   alt={message.sender.username || message.sender.name || 'Unknown'}
                                   style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                   onError={(e) => {
                                     console.log('Image failed to load:', message.sender.profileImage);
                                     e.target.style.display = 'none';
                                     e.target.nextSibling.style.display = 'flex';
                                   }}
                                   onLoad={() => {
                                     console.log('Image loaded successfully:', message.sender.profileImage);
                                   }}
                                 />
                               ) : null;
                             })()}
                             <div className="avatar-fallback" style={{ 
                               display: (message.sender.profileImage && 
                                         message.sender.profileImage.trim() !== '' && 
                                         message.sender.profileImage !== 'default-avatar.png') ? 'none' : 'flex' 
                             }}>
                               {(message.sender.username || message.sender.name || 'U').charAt(0).toUpperCase()}
                             </div>
                           </div>
                           <div className="sender-details">
                             <div 
                               className="sender-name clickable"
                               onClick={() => {
                                 console.log('Name clicked for sender:', message.sender);
                                 console.log('Current user:', user);
                                 console.log('Sender ID:', message.sender._id);
                                 console.log('Current user ID:', user?.id);
                                 console.log('Are they the same?', message.sender._id === user?.id);
                                 handleProfileClick(message.sender._id);
                               }}
                               title={`View ${message.sender.username}'s profile`}
                             >
                               {message.sender.username || message.sender.name || 'Unknown'}
                               {isGroupChat && message.sender._id === selectedChat.tripDetails?.organizer && (
                                 <span className="role-badge creator">👑 Creator</span>
                               )}
                               {!group.isOwn && (
                                 <button 
                                   className="user-action-btn"
                                   onClick={() => openUserActions(message.sender)}
                                   title="User actions"
                                 >
                                   ⋮
                                 </button>
                               )}
                             </div>
                           </div>
                         </div>
                       )}
                      
                        <div className={`message-bubble ${group.isOwn ? 'own' : 'other'}`}>
                          {editingMessage === message._id ? (
                            <div className="message-edit-form">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="edit-input"
                                autoFocus
                              />
                              <div className="edit-actions">
                                <button 
                                  onClick={() => {
                                    console.log('Save button clicked for message:', message._id);
                                    console.log('Edit text:', editText);
                                    editMessage(message._id, editText);
                                  }}
                                  className="edit-save-btn"
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingMessage(null);
                                    setEditText('');
                                  }}
                                  className="edit-cancel-btn"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="message-content">
                                {message.text}
                                {message.isEdited && <span className="edited-indicator"> (edited)</span>}
                              </div>
                              <div className="message-footer">
                                <div className="message-time">{formatTime(message.sentAt)}</div>
                                {group.isOwn && (
                                  <div className="message-options">
                                    <button 
                                      className="message-option-btn"
                                      onClick={() => setShowMessageOptions(showMessageOptions === message._id ? null : message._id)}
                                    >
                                      ⋮
                                    </button>
                                    {showMessageOptions === message._id && (
                                      <div className="message-options-menu">
                                        <button 
                                          onClick={() => {
                                            setEditingMessage(message._id);
                                            setEditText(message.text);
                                            setShowMessageOptions(null);
                                          }}
                                          className="option-btn edit-btn"
                                        >
                                          ✏️ Edit
                                        </button>
                                        <button 
                                          onClick={() => deleteMessage(message._id)}
                                          className="option-btn delete-btn"
                                        >
                                          🗑️ Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                    </div>
                  ))}
                </div>
                ))
              )}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="typing-indicator">
                  <div className="typing-avatar">👤</div>
                  <div className="typing-bubble">
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="message-input-area">
              <form onSubmit={handleSendMessage} className="message-input-form">
                <button type="button" className="input-btn emoji-btn" title="Add Emoji">
                  😊
                </button>
                <button type="button" className="input-btn attachment-btn" title="Attach File">
                  📎
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="chat-input"
                  disabled={sendingMessage}
                />
                <button 
                  type="submit" 
                  className="input-btn send-btn" 
                  title="Send Message"
                  disabled={sendingMessage || !newMessage.trim()}
                >
                  {sendingMessage ? '⏳' : '✈️'}
                </button>
              </form>
            </div>
          </div>

          {/* Trip Details Sidebar */}
          {isGroupChat && (
            <div className="trip-sidebar">
              <div className="sidebar-header">
                <h3>Trip Details</h3>
                <button 
                  className="pin-btn"
                  onClick={() => setShowPinnedInfo(!showPinnedInfo)}
                >
                  📌
                </button>
              </div>
              
              <div className="trip-info">
                <div className="info-item">
                  <span className="info-label">📍 Destination</span>
                  <span className="info-value">{tripDetails?.destination}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">📅 Dates</span>
                  <span className="info-value">{tripDetails?.dates}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">👤 Organizer</span>
                  <span className="info-value">{tripDetails?.organizer}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">💰 Budget</span>
                  <span className="info-value">{tripDetails?.budget}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">🚗 Trip Type</span>
                  <span className="info-value">{tripDetails?.tripType}</span>
                </div>
                {tripDetails?.description && tripDetails.description !== 'No description available' && (
                <div className="info-item">
                    <span className="info-label">📝 Description</span>
                    <span className="info-value">{tripDetails?.description}</span>
                </div>
                )}
              </div>

              {showPinnedInfo && (
                <div className="pinned-messages">
                  <h4>📌 Pinned Messages</h4>
                  <div className="pinned-item">
                    <div className="pinned-content">
                      No pinned messages yet
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <section className="dashboard-section">
        <div className="section-header">
          <h2>💬 Messages</h2>
          <p>Stay connected with fellow travelers</p>
        </div>

        {/* Messages Tabs */}
        <div className="messages-tabs">
          <button
            className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            Personal
            <span className="tab-badge">
              {personalChats.filter(m => m.unread > 0).length}
            </span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'group' ? 'active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            Group Chats
            <span className="tab-badge">
              {groupChats.filter(m => m.unread > 0).length}
            </span>
          </button>
        </div>

        {/* Messages List */}
        <div className="messages-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading chats...</p>
            </div>
          ) : (
          <div className="messages-list">
              {(activeTab === 'personal' ? personalChats : groupChats).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <h3>No {activeTab === 'personal' ? 'personal' : 'group'} chats yet</h3>
                  <p>
                    {activeTab === 'personal' 
                      ? 'Start a conversation with other travelers!' 
                      : 'Join a trip to see group chats here!'}
                  </p>
                </div>
              ) : (
                (activeTab === 'personal' ? personalChats : groupChats).map(chat => (
                  <div
                    key={chat._id}
                    className={`message-item ${chat.unread > 0 ? 'unread' : ''}`}
                    onClick={() => handleChatSelect(chat)}
              >
                <div className="message-avatar">
                      {activeTab === 'personal' 
                        ? (chat.participants?.find(p => p._id !== user?.id)?.profileImage || '👤')
                        : '🧳'
                      }
                </div>
                <div className="chat-list-content">
                  <div className="chat-title">
                        {activeTab === 'personal' 
                          ? chat.name || `Chat with ${chat.participants?.find(p => p._id !== user?.id)?.name || 'User'}`
                          : chat.name || 'Trip Chat'
                        }
                  </div>
                  <div className="chat-members">
                    {activeTab === 'personal'
                      ? null
                          : <span className="member-count">Trip members</span>
                    }
                  </div>
                      <div className="chat-preview">
                        {chat.lastMessage?.text || 'No messages yet'}
                      </div>
                </div>
                    <span className="chat-list-timestamp">
                      {chat.lastMessage?.timestamp ? formatTimeAgo(chat.lastMessage.timestamp) : 'New'}
                    </span>
                    {chat.unread > 0 && (
                  <div className="unread-indicator">
                        <span className="unread-count">{chat.unread}</span>
                      </div>
                    )}
                  </div>
                ))
                )}
              </div>
          )}
        </div>
      </section>

      {/* Chat Actions Modal */}
      {showChatActions && (
        <div className="modal-overlay" onClick={() => setShowChatActions(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chat Actions</h3>
              <button className="modal-close" onClick={() => setShowChatActions(false)}>×</button>
            </div>
            <div className="modal-body">
              <button 
                className="action-btn delete-btn"
                onClick={() => {
                  handleDeleteChat(selectedChat._id);
                  setShowChatActions(false);
                }}
              >
                🗑️ Delete Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Actions Modal */}
      {showUserActions && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserActions(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Actions - {selectedUser.username || selectedUser.name}</h3>
              <button className="modal-close" onClick={() => setShowUserActions(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="action-section">
                <h4>Report User</h4>
                <div className="report-reasons">
                  <button 
                    className="action-btn report-btn"
                    onClick={() => handleReportUser(selectedUser._id, 'Inappropriate content')}
                  >
                    🚫 Inappropriate content
                  </button>
                  <button 
                    className="action-btn report-btn"
                    onClick={() => handleReportUser(selectedUser._id, 'Harassment')}
                  >
                    🚫 Harassment
                  </button>
                  <button 
                    className="action-btn report-btn"
                    onClick={() => handleReportUser(selectedUser._id, 'Spam')}
                  >
                    🚫 Spam
                  </button>
                  <button 
                    className="action-btn report-btn"
                    onClick={() => handleReportUser(selectedUser._id, 'Other')}
                  >
                    🚫 Other
                  </button>
                </div>
              </div>
              <div className="action-section">
                <h4>Block User</h4>
                <button 
                  className="action-btn block-btn"
                  onClick={() => {
                    handleBlockUser(selectedUser._id);
                    setShowUserActions(false);
                  }}
                >
                  🚫 Block User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 