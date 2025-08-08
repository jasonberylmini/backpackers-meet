import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { getProfileImageUrl, getDisplayName, getTripImageUrl } from '../utils/userDisplay';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Messages.css';

export default function Messages() {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  
  // State management
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'personal', 'group'
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showMessageActions, setShowMessageActions] = useState(null);

  // Initialize user data
  useEffect(() => {
    try {
    const userData = localStorage.getItem('user');
    if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        console.log('User loaded:', user);
      } else {
        console.log('No user data found');
        setError('No user data found');
      }
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Error loading user data');
    }
  }, []);

  // Clear message count when Messages page loads
  useEffect(() => {
    // Dispatch a custom event to clear message count
    window.dispatchEvent(new CustomEvent('clearMessageCount'));
  }, []);

  // Load chats when user is available
  useEffect(() => {
    if (!currentUser) return;

    const fetchChats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
        
        if (!token) {
          setError('No authentication token found');
          return;
        }

        console.log('Fetching chats...');
        
        const response = await axios.get('/api/chat/user-chats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Chats response:', response.data);
        const chatsData = response.data.chats || [];
        console.log('Processed chats:', chatsData);
        setChats(chatsData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching chats:', err);
        setError('Failed to load chats');
        setLoading(false);
      }
    };

    fetchChats();
  }, [currentUser]);

  // Handle real-time message updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (data) => {
      const { chatId, message } = data;
      
      // Update messages if this is the current chat
      if (selectedChat && selectedChat._id === chatId) {
        setMessages(prev => [message, ...prev]);
        
        // Mark message as read if it's not from current user
        if (message.sender._id !== currentUser._id) {
          markMessageAsRead(message._id);
        }
      }
      
      // Update chat list with new last message
      setChats(prev => prev.map(chat => 
        chat._id === chatId 
          ? { 
              ...chat, 
              lastMessage: { 
                text: message.text, 
                timestamp: message.sentAt,
                sender: message.sender
              } 
            }
          : chat
      ));
    };

    socket.on('newMessage', handleNewMessage);
    
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, [socket, isConnected, selectedChat, currentUser]);

  // Mark message as read
  const markMessageAsRead = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/chat/${selectedChat._id}/messages/read`, {
        messageIds: [messageId]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  // Handle navigation from location state and query parameters
  useEffect(() => {
    if (!chats.length) {
      // Even if no chats exist, try to handle personal chat creation
      const urlParams = new URLSearchParams(location.search);
      const userIdFromQuery = urlParams.get('user');
      
      if (userIdFromQuery && currentUser && !isProcessingChat) {
        setIsProcessingChat(true);
        
        const createPersonalChat = async () => {
          try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/chat/personal', {
              otherUserId: userIdFromQuery
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.data.chat) {
              // Add the chat to the current chats list and select it
              const newChat = response.data.chat;
              setChats(prevChats => {
                // Check if chat already exists by ID
                const existsById = prevChats.find(chat => chat._id === newChat._id);
                if (existsById) {
                  return prevChats;
                }
                
                // Check if personal chat with same user already exists
                const existsByUser = prevChats.find(chat => {
                  if (chat.type !== 'personal') return false;
                  const otherParticipant = chat.participants?.find(p => p._id !== getCurrentUserId());
                  return otherParticipant && otherParticipant._id === userIdFromQuery;
                });
                
                if (existsByUser) {
                  return prevChats;
                }
                
                return [...prevChats, newChat];
              });
              handleChatSelect(newChat);
            } else {
              toast.error('Failed to create conversation');
            }
          } catch (error) {
            console.error('Error creating personal chat:', error);
            toast.error(error.response?.data?.message || 'Failed to start conversation');
          } finally {
            setIsProcessingChat(false);
          }
        };
        createPersonalChat();
      }
      return;
    }

    const urlParams = new URLSearchParams(location.search);
    const tripIdFromQuery = urlParams.get('trip');
    const userIdFromQuery = urlParams.get('user');
    
    // Handle trip chat navigation
          if (location.state?.tripId || tripIdFromQuery) {
        const tripId = location.state?.tripId || tripIdFromQuery;
        
        // Find and select the trip chat - try multiple matching strategies
        const tripChat = chats.find(chat => {
          // Check if it's a group chat
          if (chat.type !== 'group') return false;
          
          // Try exact matches first
          if (chat.tripId === tripId || chat._id === tripId) {
            return true;
          }
          
          // Try partial name matches
          if (chat.name && chat.name.toLowerCase().includes(tripId.toLowerCase())) {
            return true;
          }
          
          // Try matching by trip name if available
          if (chat.tripName && chat.tripName.toLowerCase().includes(tripId.toLowerCase())) {
            return true;
          }
          
          return false;
        });
        
        if (tripChat) {
          handleChatSelect(tripChat);
        } else {
          // Try to fetch trip chat from backend
          if (currentUser) {
            const fetchTripChat = async () => {
              try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`/api/chat/trip/${tripId}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                if (response.data.chat) {
                  // Add the chat to the current chats list and select it (avoid duplicates)
                  const newChat = response.data.chat;
                  setChats(prevChats => {
                    // Check if chat already exists
                    const exists = prevChats.find(chat => chat._id === newChat._id);
                    if (exists) {
                      return prevChats;
                    }
                    return [...prevChats, newChat];
                  });
                  handleChatSelect(newChat);
                }
              } catch (error) {
                console.error('Error fetching trip chat:', error);
              }
            };
            fetchTripChat();
          }
        }
      }
    
    // Handle personal chat navigation
    if (location.state?.userId || userIdFromQuery) {
      const targetUserId = location.state?.userId || userIdFromQuery;
      
      // Find and select the personal chat
      const personalChat = chats.find(chat => {
        // Check if it's a personal chat
        if (chat.type !== 'personal') return false;
        
        // Check if the other participant is the target user
        const otherParticipant = chat.participants?.find(p => p._id !== getCurrentUserId());
        return otherParticipant && otherParticipant._id === targetUserId;
      });
      
      if (personalChat) {
        handleChatSelect(personalChat);
      } else {
        // Personal chat not found - try to create one
        if (currentUser && !isProcessingChat) {
          setIsProcessingChat(true);
          
          const createPersonalChat = async () => {
            try {
              const token = localStorage.getItem('token');
              const response = await axios.post('/api/chat/personal', {
                otherUserId: targetUserId
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (response.data.chat) {
                // Add the chat to the current chats list and select it
                const newChat = response.data.chat;
                setChats(prevChats => {
                  // Check if chat already exists by ID
                  const existsById = prevChats.find(chat => chat._id === newChat._id);
                  if (existsById) {
                    return prevChats;
                  }
                  
                  // Check if personal chat with same user already exists
                  const existsByUser = prevChats.find(chat => {
                    if (chat.type !== 'personal') return false;
                    const otherParticipant = chat.participants?.find(p => p._id !== getCurrentUserId());
                    return otherParticipant && otherParticipant._id === targetUserId;
                  });
                  
                  if (existsByUser) {
                    return prevChats;
                  }
                  
                  return [...prevChats, newChat];
                });
                handleChatSelect(newChat);
              } else {
                toast.error('Failed to create conversation');
              }
            } catch (error) {
              console.error('Error creating personal chat:', error);
              toast.error(error.response?.data?.message || 'Failed to start conversation');
            } finally {
              setIsProcessingChat(false);
            }
          };
          createPersonalChat();
        }
      }
    }
  }, [location.state, location.search, chats]);

  // Helper function to get user ID consistently
  const getCurrentUserId = () => {
    const userId = currentUser?.id || currentUser?._id || currentUser?.userId;
    return userId;
  };

  // Fetch chat messages
  const fetchChatMessages = async (chatId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
    return [];
    }
  };

  // Send message
  const sendMessage = async (text) => {
    if (!text.trim() || !selectedChat) return;

    try {
      setSendingMessage(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`/api/chat/${selectedChat._id}/messages`, {
        text: text.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const newMessage = response.data.message;
      setMessages(prev => [newMessage, ...prev]);
      setNewMessage('');
      
      // Update chat list with new last message
      setChats(prev => prev.map(chat => 
        chat._id === selectedChat._id 
          ? { ...chat, lastMessage: { text: newMessage.text, timestamp: newMessage.sentAt } }
          : chat
      ));

    } catch (error) {
      console.error('Error sending message:', error);
      if (error.response?.status === 403) {
        toast.error(error.response.data.message);
      }
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    await sendMessage(newMessage);
  };

  // Handle chat selection
  const handleChatSelect = async (chat) => {
    setSelectedChat(chat);
    setMessages([]);
    setShowBlockMenu(false);
    
    // Fetch messages for the selected chat
    const chatMessages = await fetchChatMessages(chat._id);
    setMessages(chatMessages);
    
    // Mark all messages in this chat as read
    if (chatMessages.length > 0) {
      const unreadMessages = chatMessages.filter(msg => 
        msg.sender._id !== currentUser._id && msg.status !== 'read'
      );
      
      if (unreadMessages.length > 0) {
        try {
          const token = localStorage.getItem('token');
          const messageIds = unreadMessages.map(msg => msg._id);
          await axios.patch(`/api/chat/${chat._id}/messages/read`, {
            messageIds: messageIds
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.error('Failed to mark messages as read:', error);
        }
      }
    }
    
    // Fetch blocked users for the chat
    await fetchBlockedUsers(chat._id);
  };

  // Handle chat header click navigation
  const handleChatHeaderClick = () => {
    if (!selectedChat) return;

    if (selectedChat.type === 'personal') {
      // Navigate to user profile
      const otherParticipant = selectedChat.participants?.find(p => p._id !== getCurrentUserId());
      if (otherParticipant) {
        navigate(`/profile/${otherParticipant._id}`);
      }
    } else if (selectedChat.type === 'group' && selectedChat.tripId) {
      // Navigate to trip details
      navigate(`/trip/${selectedChat.tripId}`);
    }
  };

  // Fetch blocked users for current chat
  const fetchBlockedUsers = async (chatId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/chat/${chatId}/blocked-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlockedUsers(response.data.blockedUsers || []);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    }
  };

  // Block user from chat
  const handleBlockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/chat/${selectedChat._id}/block`, {
        userId: userId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('User blocked successfully');
      await fetchBlockedUsers(selectedChat._id);
      setShowBlockMenu(false);
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error(error.response?.data?.message || 'Failed to block user');
    }
  };

  // Unblock user from chat
  const handleUnblockUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/chat/${selectedChat._id}/unblock`, {
        userId: userId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('User unblocked successfully');
      await fetchBlockedUsers(selectedChat._id);
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error(error.response?.data?.message || 'Failed to unblock user');
    }
  };

  // Check if current user is blocked
  const isCurrentUserBlocked = () => {
    return blockedUsers.some(user => user._id === getCurrentUserId());
  };

  // Check if user can block others (creator for group chats, any participant for personal)
  const canBlockUsers = () => {
    if (!selectedChat) return false;
    
    console.log('🔍 canBlockUsers check:', {
      selectedChat: selectedChat,
      type: selectedChat.type,
      currentUserId: getCurrentUserId()
    });
    
    // For now, allow blocking in personal chats for testing
    if (selectedChat.type === 'personal') {
      console.log('✅ Personal chat - allowing blocking');
      return true;
    }
    
    if (selectedChat.type === 'group' && selectedChat.tripId) {
      // For group chats, only trip creator can block
      const canBlock = selectedChat.tripCreator?.toString() === getCurrentUserId();
      console.log('🔍 Group chat - can block:', canBlock);
      return canBlock;
    }
    
    return false;
  };

  // Message editing and deletion functions
  const handleEditMessage = async (messageId, newText) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`/api/chat/messages/${messageId}`, {
        text: newText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update the message in the messages list
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, text: newText, isEdited: true }
          : msg
      ));

      // Update chat list with new last message if this was the last message
      if (selectedChat && selectedChat.lastMessage && selectedChat.lastMessage.sender === getCurrentUserId()) {
        setChats(prev => prev.map(chat => 
          chat._id === selectedChat._id 
            ? { ...chat, lastMessage: { ...chat.lastMessage, text: newText } }
            : chat
        ));
      }

      setEditingMessage(null);
      setEditText('');
      toast.success('Message updated successfully');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error(error.response?.data?.message || 'Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/chat/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove the message from the messages list
      setMessages(prev => prev.filter(msg => msg._id !== messageId));

      // Update chat list if this was the last message
      if (selectedChat && selectedChat.lastMessage && selectedChat.lastMessage.sender === getCurrentUserId()) {
        const remainingMessages = messages.filter(msg => msg._id !== messageId);
        const newLastMessage = remainingMessages.length > 0 ? remainingMessages[0] : null;
        
        setChats(prev => prev.map(chat => 
          chat._id === selectedChat._id 
            ? { 
                ...chat, 
                lastMessage: newLastMessage 
                  ? { text: newLastMessage.text, timestamp: newLastMessage.sentAt }
                  : null 
              }
            : chat
        ));
      }

      setShowMessageActions(null);
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  };

  const startEditing = (message) => {
    setEditingMessage(message._id);
    setEditText(message.text);
    setShowMessageActions(null);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setEditText('');
  };

  // Close block menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showBlockMenu && !event.target.closest('.block-menu-container')) {
        setShowBlockMenu(false);
      }
      if (showMessageActions && !event.target.closest('.message-actions')) {
        setShowMessageActions(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBlockMenu, showMessageActions]);

  // Filter chats based on search and active tab
  const filteredChats = chats.filter(chat => {
    // Filter by tab
    if (activeTab === 'personal' && chat.type !== 'personal') return false;
    if (activeTab === 'group' && chat.type !== 'group') return false;
    
    // Filter by search
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    
    if (chat.type === 'personal') {
      const otherParticipant = chat.participants?.find(p => p._id !== getCurrentUserId());
      return otherParticipant?.username?.toLowerCase().includes(searchLower) ||
             otherParticipant?.name?.toLowerCase().includes(searchLower);
    } else {
      return chat.name?.toLowerCase().includes(searchLower);
    }
  });

  // Separate chats by type
  const personalChats = filteredChats.filter(chat => chat.type === 'personal');
  const groupChats = filteredChats.filter(chat => chat.type === 'group');

  // Loading state
  if (loading) {
    return (
      <div className="messages-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="messages-container">
        <div className="loading-state">
          <div className="empty-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: '16px', 
              padding: '8px 16px', 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer' 
            }}
          >
            Refresh Page
            </button>
            </div>
          </div>
    );
  }

  // Main render
  return (
    <div className="messages-container">
      {/* Chat List Sidebar */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h2>Messages</h2>
          <div className="connection-status">
            <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Chat Type Tabs */}
        <div className="chat-tabs">
          <button 
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All ({filteredChats.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            Personal ({personalChats.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'group' ? 'active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            Groups ({groupChats.length})
          </button>
        </div>

        <div className="chat-list">
          {filteredChats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>No conversations found</h3>
              <p>{searchQuery ? 'Try adjusting your search' : 'Start chatting with other travelers!'}</p>
                </div>
              ) : (
            <>
              {/* Personal Chats Section */}
              {activeTab === 'all' && personalChats.length > 0 && (
                <div className="chat-section">
                  <h4 className="section-title">Personal Chats</h4>
                  {personalChats.map(chat => (
                    <div
                      key={chat._id}
                      className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
                      onClick={() => handleChatSelect(chat)}
                    >
                      <div className="chat-avatar">
                             {(() => {
                          const otherParticipant = chat.participants?.find(p => p._id !== getCurrentUserId());
                          const profileImage = getProfileImageUrl(otherParticipant);
                          return profileImage ? (
                            <img src={profileImage} alt={getDisplayName(otherParticipant)} />
                          ) : (
                            <div className="avatar-fallback">
                              {getDisplayName(otherParticipant).charAt(0).toUpperCase()}
                            </div>
                          );
                             })()}
                      </div>
                      <div className="chat-info">
                        <div className="chat-header">
                          <h4 className="chat-name">
                            {getDisplayName(chat.participants?.find(p => p._id !== getCurrentUserId()))}
                          </h4>
                          <span className="chat-time">
                            {chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className="chat-preview">
                          <p>{chat.lastMessage?.text || 'No messages yet'}</p>
                        </div>
                             </div>
                           </div>
                  ))}
                </div>
              )}

              {/* Group Chats Section */}
              {activeTab === 'all' && groupChats.length > 0 && (
                <div className="chat-section">
                  <h4 className="section-title">Group Chats</h4>
                  {groupChats.map(chat => (
                    <div
                      key={chat._id}
                      className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
                      onClick={() => handleChatSelect(chat)}
                    >
                      <div className="chat-avatar">
                        {chat.tripImage ? (
                          <img src={getTripImageUrl(chat.tripImage)} alt={chat.name} />
                        ) : (
                          <div className="group-avatar">🧳</div>
                        )}
                      </div>
                      <div className="chat-info">
                        <div className="chat-header">
                          <h4 className="chat-name">{chat.name}</h4>
                          <span className="chat-time">
                            {chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <div className="chat-preview">
                          <p>{chat.lastMessage?.text || 'No messages yet'}</p>
                             </div>
                           </div>
                    </div>
                  ))}
                         </div>
                       )}
                      
              {/* Single Tab View */}
              {(activeTab === 'personal' || activeTab === 'group') && (
                <div className="chat-section">
                  {(activeTab === 'personal' ? personalChats : groupChats).map(chat => (
                    <div
                      key={chat._id}
                      className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''}`}
                      onClick={() => handleChatSelect(chat)}
                    >
                      <div className="chat-avatar">
                        {chat.type === 'personal' ? (
                          (() => {
                            const otherParticipant = chat.participants?.find(p => p._id !== getCurrentUserId());
                            const profileImage = getProfileImageUrl(otherParticipant);
                            return profileImage ? (
                              <img src={profileImage} alt={getDisplayName(otherParticipant)} />
                            ) : (
                              <div className="avatar-fallback">
                                {getDisplayName(otherParticipant).charAt(0).toUpperCase()}
                              </div>
                            );
                          })()
                        ) : (
                          chat.tripImage ? (
                            <img src={getTripImageUrl(chat.tripImage)} alt={chat.name} />
                          ) : (
                            <div className="group-avatar">🧳</div>
                          )
                                    )}
                                  </div>
                      <div className="chat-info">
                        <div className="chat-header">
                          <h4 className="chat-name">
                            {chat.type === 'personal' 
                              ? getDisplayName(chat.participants?.find(p => p._id !== getCurrentUserId()))
                              : chat.name
                            }
                          </h4>
                          <span className="chat-time">
                            {chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                              </div>
                        <div className="chat-preview">
                          <p>{chat.lastMessage?.text || 'No messages yet'}</p>
                        </div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {selectedChat ? (
          <div className="chat-area">
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-info" onClick={handleChatHeaderClick} style={{ cursor: 'pointer' }}>
                <div className="chat-avatar">
                  {selectedChat.type === 'personal' ? (
                    (() => {
                      const otherParticipant = selectedChat.participants?.find(p => p._id !== getCurrentUserId());
                      const profileImage = getProfileImageUrl(otherParticipant);
                      return profileImage ? (
                        <img src={profileImage} alt={getDisplayName(otherParticipant)} />
                      ) : (
                        <div className="avatar-fallback">
                          {getDisplayName(otherParticipant).charAt(0).toUpperCase()}
                        </div>
                      );
                    })()
                  ) : (
                    selectedChat.tripImage ? (
                      <img src={getTripImageUrl(selectedChat.tripImage)} alt={selectedChat.name} />
                    ) : (
                      <div className="group-avatar">🧳</div>
                    )
                  )}
                </div>
                <div className="chat-details">
                  <h3 className="chat-title">
                    {selectedChat.type === 'personal' 
                      ? getDisplayName(selectedChat.participants?.find(p => p._id !== getCurrentUserId()))
                      : selectedChat.name
                    }
                  </h3>
                  <p className="chat-status">
                    {selectedChat.type === 'personal' ? 'Personal Chat' : `${selectedChat.participants?.length || 0} members`}
                  </p>
                </div>
              </div>
              <div className="chat-header-actions">
                <span className="click-hint">Click to view {selectedChat.type === 'personal' ? 'profile' : 'trip details'}</span>
                
                {/* Block/Unblock Menu */}
                {canBlockUsers() && (
                  <div className="block-menu-container">
                    <button 
                      className="block-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowBlockMenu(!showBlockMenu);
                      }}
                      title="Block/Unblock users"
                    >
                      ⚙️
                    </button>
                    
                    {showBlockMenu && (
                      <div className="block-menu" onClick={(e) => e.stopPropagation()}>
                        <h4>Manage Users</h4>
                        {selectedChat.participants?.map(participant => {
                          const isBlocked = blockedUsers.some(user => user._id === participant._id);
                          const isCurrentUser = participant._id === getCurrentUserId();
                          
                          if (isCurrentUser) return null; // Don't show current user in block menu
                          
                          return (
                            <div key={participant._id} className="block-menu-item">
                              <div className="participant-info">
                                <div className="participant-avatar">
                                  {(() => {
                                    const profileImage = getProfileImageUrl(participant);
                                    return profileImage ? (
                                      <img src={profileImage} alt={getDisplayName(participant)} />
                                    ) : (
                                      <div className="avatar-fallback">
                                        {getDisplayName(participant).charAt(0).toUpperCase()}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <span className="participant-name">{getDisplayName(participant)}</span>
                                {isBlocked && <span className="blocked-badge">🚫 Blocked</span>}
                              </div>
                              <button
                                className={`block-action-btn ${isBlocked ? 'unblock' : 'block'}`}
                                onClick={() => isBlocked ? handleUnblockUser(participant._id) : handleBlockUser(participant._id)}
                              >
                                {isBlocked ? 'Unblock' : 'Block'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area">
              {messages.length === 0 ? (
                <div className="empty-messages">
                  <div className="empty-icon">💬</div>
                  <h3>No messages yet</h3>
                  <p>Start the conversation!</p>
                </div>
              ) : (
                <div className="messages-list">
                  {messages.map((message) => {
                    const currentUserId = getCurrentUserId();
                    const messageSenderId = message.sender?._id || message.sender?.id || message.sender?.userId;
                    const isOwn = messageSenderId === currentUserId;
                    
                    // Skip messages without proper sender data
                    if (!message.sender) {
                      console.warn('Message without sender:', message);
                      return null;
                    }
                    
                    return (
                      <div key={message._id} className={`message-wrapper ${isOwn ? 'own' : 'other'}`}>
                        {!isOwn && (
                          <div className="message-avatar">
                            {(() => {
                              const profileImage = getProfileImageUrl(message.sender);
                              return profileImage ? (
                                <img src={profileImage} alt={getDisplayName(message.sender)} />
                              ) : (
                                <div className="avatar-fallback">
                                  {getDisplayName(message.sender).charAt(0).toUpperCase()}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        
                        <div className="message-content">
                          {!isOwn && (
                            <div className="message-sender">
                              {getDisplayName(message.sender)}
                            </div>
                          )}
                          
                          {editingMessage === message._id ? (
                            <div className="edit-form">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="edit-input"
                                autoFocus
                              />
                              <div className="edit-actions">
                                <button
                                  className="save-btn"
                                  onClick={() => handleEditMessage(message._id, editText)}
                                  disabled={!editText.trim()}
                                >
                                  Save
                                </button>
                                <button className="cancel-btn" onClick={cancelEditing}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="message-bubble" style={{ 
                              position: 'relative',
                              paddingRight: '40px',
                              minHeight: '40px'
                            }}>
                              <div className="message-text">
                                {message.text}
                                {message.isEdited && <span className="edited-indicator"> (edited)</span>}
                              </div>
                              
                              {/* Message Actions for own messages */}
                              {isOwn && (
                                                                <div className="message-actions" style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  zIndex: '10'
                                }}>
                                  <button
                                    className="action-btn"
                                    onClick={() => setShowMessageActions(showMessageActions === message._id ? null : message._id)}
                                    title="More options"
                                    style={{ 
                                      background: 'transparent', 
                                      border: 'none', 
                                      borderRadius: '4px', 
                                      padding: '4px 6px', 
                                      fontSize: '14px', 
                                      cursor: 'pointer', 
                                      color: '#000000',
                                      opacity: '1',
                                      fontWeight: 'bold',
                                      minWidth: '24px',
                                      textAlign: 'center',
                                      lineHeight: '1'
                                    }}
                                                                      >
                                      {showMessageActions === message._id ? '▼' : '⋮'}
                                    </button>
                                  
                                  {showMessageActions === message._id && (
                                    <div className="message-actions-menu" style={{
                                      position: 'absolute',
                                      top: '100%',
                                      right: '0',
                                      background: '#ffffff',
                                      border: '2px solid #3b82f6',
                                      borderRadius: '8px',
                                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.25)',
                                      padding: '6px 0',
                                      minWidth: '130px',
                                      zIndex: '9999',
                                      marginTop: '6px'
                                    }}>
                                      <button
                                        className="action-menu-item"
                                        onClick={() => startEditing(message)}
                                        style={{
                                          display: 'block',
                                          width: '100%',
                                          padding: '10px 16px',
                                          border: 'none',
                                          background: 'none',
                                          textAlign: 'left',
                                          fontSize: '14px',
                                          color: '#374151',
                                          cursor: 'pointer',
                                          fontWeight: '500'
                                        }}
                                      >
                                        ✏️ Edit
                                      </button>
                                      <button
                                        className="action-menu-item danger"
                                        onClick={() => handleDeleteMessage(message._id)}
                                        style={{
                                          display: 'block',
                                          width: '100%',
                                          padding: '10px 16px',
                                          border: 'none',
                                          background: 'none',
                                          textAlign: 'left',
                                          fontSize: '14px',
                                          color: '#ef4444',
                                          cursor: 'pointer',
                                          fontWeight: '500'
                                        }}
                                      >
                                        🗑️ Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="message-footer">
                            <span className="message-time">
                              {new Date(message.sentAt || message.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="message-input">
              {isCurrentUserBlocked() ? (
                <div className="blocked-message">
                  <span>🚫 You are blocked from sending messages in this chat</span>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="input-form">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="message-input-field"
                    disabled={sendingMessage}
                  />
                  <button 
                    type="submit" 
                    className="input-btn send-btn" 
                    disabled={sendingMessage || !newMessage.trim()}
                    title="Send message"
                  >
                    {sendingMessage ? '⏳' : '✈️'}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="no-chat-selected">
            <div className="no-chat-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose a chat from the sidebar to start messaging</p>
            </div>
          )}
        </div>
    </div>
  );
} 