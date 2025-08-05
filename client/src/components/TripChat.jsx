import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
import ExpenseSummary from './ExpenseSummary';
import ExpenseChatIntegration from './ExpenseChatIntegration';
import './TripChat.css';

const TripChat = ({ tripId, tripName, user, tripDetails }) => {
  const {
    joinRoom, leaveRoom, sendMessage, startTyping, stopTyping,
    socket, isConnected, currentRoom, onlineUsers, typingUsers
  } = useSocket();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'expenses'
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  // Add state for sidebar collapse
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (tripId) {
      joinRoom(`trip_${tripId}`);
      return () => leaveRoom(`trip_${tripId}`);
    }
  }, [tripId, joinRoom, leaveRoom]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);
      // Show toast for new messages from others
      if (data.sender.id !== user?.userId) {
        toast(`${data.sender.name}: ${data.text}`, {
          duration: 3000,
          position: 'top-right',
        });
      }
    };

    const handleUserJoined = (data) => {
      toast(`${data.name} joined the chat`, {
        duration: 2000,
        position: 'top-right',
      });
    };

    const handleUserLeft = (data) => {
      toast(`${data.name} left the chat`, {
        duration: 2000,
        position: 'top-right',
      });
    };

    const handleUserTyping = (data) => {
      // Handle typing indicators
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    socket.on('userTyping', handleUserTyping);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
      socket.off('userTyping', handleUserTyping);
    };
  }, [socket, user?.userId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && isConnected) {
      sendMessage({ text: input.trim() });
      setInput('');
      stopTyping();
      setIsTyping(false);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    
    // Handle typing indicators
    if (e.target.value && !isTyping) {
      setIsTyping(true);
      startTyping();
    } else if (!e.target.value && isTyping) {
      setIsTyping(false);
      stopTyping();
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping();
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExpenseAdded = (expense) => {
    // Refresh expense summary when new expense is added
    // This will trigger a re-render of the ExpenseSummary component
  };

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      backgroundColor: '#ffffff',
      border: '1px solid #e1e5e9',
      borderRadius: '12px',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Main Chat Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e1e5e9',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              background: '#fee2e2',
              color: '#dc2626',
              borderRadius: '999px',
              padding: '4px 12px',
              fontWeight: 600,
              fontSize: 13,
            }}>Trip Chat</span>
            <span style={{ fontWeight: 700, fontSize: 18 }}>{tripName || 'Trip Chat'}</span>
            {isConnected && (
              <span style={{ color: '#28a745', fontSize: 14 }}>🟢 Live</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: '#fff',
              border: '1px solid #e1e5e9',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {sidebarOpen ? 'Hide Info' : 'Show Info'}
          </button>
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: message.sender.id === user?.userId ? 'flex-end' : 'flex-start',
                marginBottom: '8px',
              }}
            >
              <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '18px',
                backgroundColor: message.sender.id === user?.userId ? '#007bff' : '#f1f3f4',
                color: message.sender.id === user?.userId ? '#ffffff' : '#000000',
                wordWrap: 'break-word',
              }}>
                <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>
                  {message.sender.name}
                </div>
                <div>{message.text}</div>
                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          borderTop: '1px solid #e1e5e9',
          padding: '16px 24px',
          backgroundColor: '#ffffff',
        }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ flex: 1 }}>
              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                style={{
                  width: '100%',
                  minHeight: '40px',
                  maxHeight: '120px',
                  padding: '10px 12px',
                  border: '1px solid #e1e5e9',
                  borderRadius: '20px',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                }}
                rows={1}
              />
            </div>
            <button
              style={{
                background: isConnected && input.trim() ? '#007bff' : '#6c757d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: isConnected && input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                padding: 0,
                fontFamily: 'inherit',
              }}
              type="submit"
              disabled={!isConnected || !input.trim()}
              aria-label="Send"
            >
              ➤
            </button>
          </form>
        </div>

        {/* Online Users */}
        {onlineUsers.length > 0 && (
          <div style={{
            padding: '8px 16px',
            fontSize: '12px',
            color: '#6c757d',
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #e1e5e9'
          }}>
            Online: {onlineUsers.map(u => u.username || u.name || 'Unknown').join(', ')}
          </div>
        )}
      </div>

      {/* Trip Info Sidebar */}
      {sidebarOpen && (
        <aside
          className="trip-info-sidebar"
          style={{
            width: '350px',
            background: '#f9fafb',
            borderLeft: '1px solid #e1e5e9',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            transition: 'transform 0.3s',
          }}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: '#fff',
              border: '1px solid #e1e5e9',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              zIndex: 10,
            }}
            aria-label="Collapse trip info"
          >
            <span style={{ fontSize: 18 }}>→</span>
          </button>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e1e5e9',
            backgroundColor: '#ffffff',
          }}>
            <button
              onClick={() => setActiveTab('chat')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                background: activeTab === 'chat' ? '#007bff' : 'transparent',
                color: activeTab === 'chat' ? '#ffffff' : '#6b7280',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              💬 Chat Info
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                background: activeTab === 'expenses' ? '#007bff' : 'transparent',
                color: activeTab === 'expenses' ? '#ffffff' : '#6b7280',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              💰 Expenses
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {activeTab === 'chat' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '999px',
                    padding: '4px 12px',
                    fontWeight: 600,
                    fontSize: 13,
                  }}>Trip</span>
                  <span style={{ fontWeight: 700, fontSize: 18 }}>{tripDetails?.destination || 'Trip'}</span>
                </div>
                <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>{tripDetails?.dates}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#f3e8ff', color: '#a21caf', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📅</span>
                    <span><b>Dates:</b> <span style={{ color: '#6b7280', fontWeight: 400 }}>{tripDetails?.dates}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📍</span>
                    <span><b>Location:</b> <span style={{ color: '#6b7280', fontWeight: 400 }}>{tripDetails?.location}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#f3e8ff', color: '#a21caf', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👥</span>
                    <span><b>Members:</b> <span style={{ color: '#6b7280', fontWeight: 400 }}>{tripDetails?.memberCount}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#dbeafe', color: '#1e3a8a', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👑</span>
                    <span><b>Organizer:</b> <span style={{ color: '#6b7280', fontWeight: 400 }}>{tripDetails?.organizer}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#fef9c3', color: '#ca8a04', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏨</span>
                    <span><b>Hotel:</b> <span style={{ color: '#6b7280', fontWeight: 400 }}>{tripDetails?.hotel}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#f3e8ff', color: '#a21caf', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎯</span>
                    <span><b>Meeting Point:</b> <span style={{ color: '#6b7280', fontWeight: 400 }}>{tripDetails?.meetingPoint}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚨</span>
                    <span><b>Emergency:</b> <span style={{ color: '#dc2626', background: '#fee2e2', borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>{tripDetails?.emergencyContact}</span></span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <ExpenseSummary tripId={tripId} currentUser={user} />
                <ExpenseChatIntegration 
                  tripId={tripId} 
                  currentUser={user} 
                  onExpenseAdded={handleExpenseAdded}
                />
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Sidebar open button for mobile/desktop */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'absolute',
            top: 24,
            right: 0,
            background: '#f9fafb',
            border: '1px solid #e1e5e9',
            borderRadius: '999px 0 0 999px',
            width: 36,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            zIndex: 2,
          }}
          aria-label="Expand trip info"
        >
          <span style={{ fontSize: 18 }}>←</span>
        </button>
      )}
    </div>
  );
};

export default TripChat; 