import React, { useState, useEffect } from 'react';
import './Messages.css';

export default function Messages() {
  const [activeTab, setActiveTab] = useState('personal');
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showPinnedInfo, setShowPinnedInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sample data for personal messages
  const [personalMessages] = useState([
    {
      _id: '1',
      sender: { name: 'John Doe', _id: 'john1', avatar: '👨‍💼', role: 'Traveler' },
      content: 'Hey! Are you still planning to join the Paris trip?',
      timestamp: new Date(Date.now() - 3600000),
      unread: 2
    },
    {
      _id: '2',
      sender: { name: 'Sarah Wilson', _id: 'sarah1', avatar: '👩‍🎨', role: 'Traveler' },
      content: 'Can\'t wait for the adventure!',
      timestamp: new Date(Date.now() - 1800000),
      unread: 1
    }
  ]);

  // Sample data for group messages
  const [groupMessages] = useState([
    {
      _id: 'g1',
      groupName: 'Paris Adventure 2024',
      groupAvatar: '🗼',
      lastMessage: 'Meeting point confirmed for tomorrow!',
      timestamp: new Date(Date.now() - 900000),
      unread: 3,
      memberCount: 8,
      tripDetails: {
        destination: 'Paris, France',
        dates: 'March 15-22, 2024',
        organizer: 'Alex Chen',
        hotel: 'Hotel Le Marais',
        meetingPoint: 'Eiffel Tower',
        emergencyContact: '+33 1 23 45 67 89'
      }
    },
    {
      _id: 'g2',
      groupName: 'Tokyo Spring 2024',
      groupAvatar: '🗾',
      lastMessage: 'Don\'t forget to bring your JR Pass!',
      timestamp: new Date(Date.now() - 7200000),
      unread: 0,
      memberCount: 5,
      tripDetails: {
        destination: 'Tokyo, Japan',
        dates: 'April 10-17, 2024',
        organizer: 'Maria Garcia',
        hotel: 'Shibuya Grand Hotel',
        meetingPoint: 'Shibuya Crossing',
        emergencyContact: '+81 3 1234 5678'
      }
    }
  ]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Auto-scroll to bottom when chat messages change
  useEffect(() => {
    if (chatMessages.length > 0) {
      const chatMessagesElement = document.querySelector('.chat-messages');
      if (chatMessagesElement) {
        chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
      }
    }
  }, [chatMessages]);

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    
    // Load chat messages based on chat type
    if (activeTab === 'personal') {
      setChatMessages([
        {
          _id: '1',
          sender: { name: chat.sender.name, _id: chat.sender._id, avatar: chat.sender.avatar, role: chat.sender.role },
          content: chat.content,
          timestamp: chat.timestamp,
          isOwn: false
        },
        {
          _id: '2',
          sender: { name: user?.name || 'You', _id: 'currentUser', avatar: '👤', role: 'Traveler' },
          content: 'Yes, I\'m definitely joining! Can\'t wait for the adventure.',
          timestamp: new Date(Date.now() - 1800000),
          isOwn: true
        },
        {
          _id: '3',
          sender: { name: chat.sender.name, _id: chat.sender._id, avatar: chat.sender.avatar, role: chat.sender.role },
          content: 'Great! We\'ll meet at the Eiffel Tower at 10 AM.',
          timestamp: new Date(Date.now() - 900000),
          isOwn: false
        }
      ]);
    } else {
      // Group chat messages
      setChatMessages([
        {
          _id: '1',
          sender: { name: 'Alex Chen', _id: 'alex', avatar: '👨‍💼', role: 'Organizer' },
          content: 'Welcome everyone to the Paris Adventure 2024! 🗼',
          timestamp: new Date(Date.now() - 3600000),
          isOwn: false
        },
        {
          _id: '2',
          sender: { name: 'Sarah Wilson', _id: 'sarah', avatar: '👩‍🎨', role: 'Traveler' },
          content: 'Excited to meet everyone! ✨',
          timestamp: new Date(Date.now() - 3000000),
          isOwn: false
        },
        {
          _id: '3',
          sender: { name: user?.name || 'You', _id: 'currentUser', avatar: '👤', role: 'Traveler' },
          content: 'This is going to be amazing! 🎉',
          timestamp: new Date(Date.now() - 2400000),
          isOwn: true
        },
        {
          _id: '4',
          sender: { name: 'Alex Chen', _id: 'alex', avatar: '👨‍💼', role: 'Organizer' },
          content: 'Meeting point confirmed: Eiffel Tower at 10 AM tomorrow! 📍',
          timestamp: new Date(Date.now() - 1800000),
          isOwn: false
        },
        {
          _id: '5',
          sender: { name: 'Mike Johnson', _id: 'mike', avatar: '👨‍💻', role: 'Traveler' },
          content: 'Perfect! I\'ll be there with my camera 📸',
          timestamp: new Date(Date.now() - 1200000),
          isOwn: false
        }
      ]);
    }
    
    // Auto-focus the input field and scroll to bottom
    setTimeout(() => {
      const chatInput = document.querySelector('.chat-input');
      const chatMessages = document.querySelector('.chat-messages');
      
      if (chatInput) {
        chatInput.focus();
      }
      
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 100);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      _id: Date.now().toString(),
      sender: { name: user?.name || 'You', _id: 'currentUser', avatar: '👤', role: 'Traveler' },
      content: newMessage,
      timestamp: new Date(),
      isOwn: true
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Auto-scroll to bottom after sending message
    setTimeout(() => {
      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 100);
  };

  const handleBackToMessages = () => {
    setSelectedChat(null);
    setChatMessages([]);
    setNewMessage('');
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by sender for consecutive messages
  const groupMessagesBySender = (messages) => {
    const grouped = [];
    let currentGroup = null;

    messages.forEach((message, index) => {
      const isFirstMessage = index === 0;
      const isSameSender = currentGroup && currentGroup.sender._id === message.sender._id;
      const timeDiff = currentGroup ? message.timestamp - currentGroup.messages[currentGroup.messages.length - 1].timestamp : 0;
      const shouldGroup = isSameSender && timeDiff < 300000; // 5 minutes

      if (shouldGroup) {
        currentGroup.messages.push(message);
      } else {
        if (currentGroup) {
          grouped.push(currentGroup);
        }
        currentGroup = {
          sender: message.sender,
          messages: [message],
          isOwn: message.isOwn
        };
      }
    });

    if (currentGroup) {
      grouped.push(currentGroup);
    }

    return grouped;
  };

  if (selectedChat) {
    const groupedMessages = groupMessagesBySender(chatMessages);
    const isGroupChat = activeTab === 'group';
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
                {isGroupChat ? selectedChat.groupName : selectedChat.sender.name}
                {isGroupChat && <span className="trip-badge">🗼 Trip</span>}
              </div>
              {isGroupChat && (
                <div className="chat-subtitle">
                  {selectedChat.memberCount} members • {tripDetails?.destination}
                </div>
              )}
            </div>
          </div>
          <div className="chat-header-right">
            <button className="header-btn" title="Search">
              🔍
            </button>
            <button className="header-btn" title="Pin Message">
              📌
            </button>
            <button className="header-btn" title="More Options">
              ⋮
            </button>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="chat-main">
          {/* Messages Column */}
          <div className="messages-column">
            <div className="chat-messages">
              {groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex} className={`message-group ${group.isOwn ? 'own' : 'other'}`}>
                  {group.messages.map((message, messageIndex) => (
                    <div key={message._id} className="message-wrapper">
                      {/* Show avatar and name for first message in group */}
                      {messageIndex === 0 && (
                        <div className="message-sender-info">
                          <div className="sender-avatar">{message.sender.avatar}</div>
                          <div className="sender-details">
                            <div className="sender-name">
                              {message.sender.name}
                              {message.sender.role === 'Organizer' && (
                                <span className="role-badge organizer">Organizer</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className={`message-bubble ${group.isOwn ? 'own' : 'other'} ${message.sender.role === 'Organizer' ? 'organizer' : 'traveler'}`}>
                        <div className="message-content">{message.content}</div>
                        <div className="message-time">{formatTime(message.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              
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
                />
                <button type="submit" className="input-btn send-btn" title="Send Message">
                  ✈️
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
                  <span className="info-label">🏨 Hotel</span>
                  <span className="info-value">{tripDetails?.hotel}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">🎯 Meeting Point</span>
                  <span className="info-value">{tripDetails?.meetingPoint}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">🚨 Emergency</span>
                  <span className="info-value">{tripDetails?.emergencyContact}</span>
                </div>
              </div>

              {showPinnedInfo && (
                <div className="pinned-messages">
                  <h4>📌 Pinned Messages</h4>
                  <div className="pinned-item">
                    <div className="pinned-content">
                      Meeting point confirmed: Eiffel Tower at 10 AM tomorrow!
                    </div>
                    <div className="pinned-time">2h ago</div>
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
              {personalMessages.filter(m => m.unread > 0).length}
            </span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'group' ? 'active' : ''}`}
            onClick={() => setActiveTab('group')}
          >
            Group Chats
            <span className="tab-badge">
              {groupMessages.filter(m => m.unread > 0).length}
            </span>
          </button>
        </div>

        {/* Messages List */}
        <div className="messages-content">
          <div className="messages-list">
            {(activeTab === 'personal' ? personalMessages : groupMessages).map(message => (
              <div
                key={message._id}
                className={`message-item ${message.unread > 0 ? 'unread' : ''}`}
                onClick={() => handleChatSelect(message)}
              >
                <div className="message-avatar">
                  {activeTab === 'personal' ? message.sender.avatar : message.groupAvatar}
                </div>
                <div className="chat-list-content">
                  <div className="chat-title">
                    {activeTab === 'personal' ? message.sender.name : message.groupName}
                  </div>
                  <div className="chat-members">
                    {activeTab === 'personal'
                      ? null
                      : <span className="member-count">{message.memberCount} members</span>
                    }
                  </div>
                  <div className="chat-preview">{message.content}</div>
                </div>
                <span className="chat-list-timestamp">{formatTimeAgo(message.timestamp)}</span>
                {message.unread > 0 && (
                  <div className="unread-indicator">
                    <span className="unread-count">{message.unread}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
} 