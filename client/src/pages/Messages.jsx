import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { getProfileImageUrl, getDisplayName } from '../utils/userDisplay';
import axios from 'axios';
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
        setChats(response.data.chats || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching chats:', err);
        setError('Failed to load chats');
        setLoading(false);
      }
    };

    fetchChats();
  }, [currentUser]);

  // Handle navigation from location state
  useEffect(() => {
    if (location.state?.tripId) {
      console.log('Navigating to trip chat:', location.state.tripId);
      // Handle trip chat navigation
    } else if (location.state?.userId) {
      console.log('Navigating to personal chat:', location.state.userId);
      // Handle personal chat navigation
    }
  }, [location.state]);

  // Helper function to get user ID consistently
  const getCurrentUserId = () => {
    return currentUser?.id || currentUser?._id || currentUser?.userId;
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
    
    // Fetch messages for the selected chat
    const chatMessages = await fetchChatMessages(chat._id);
    setMessages(chatMessages);
  };

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
                          <img src={`http://localhost:5000/uploads/${chat.tripImage}`} alt={chat.name} />
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
                            <img src={`http://localhost:5000/uploads/${chat.tripImage}`} alt={chat.name} />
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
              <div className="chat-header-info">
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
                      <img src={`http://localhost:5000/uploads/${selectedChat.tripImage}`} alt={selectedChat.name} />
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
                    const isOwn = message.sender._id === getCurrentUserId();
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
                          
                          <div className="message-bubble">
                            <div className="message-text">
                              {message.text}
                            </div>
                          </div>
                          
                          <div className="message-footer">
                            <span className="message-time">
                              {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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