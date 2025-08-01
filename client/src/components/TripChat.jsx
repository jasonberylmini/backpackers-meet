import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';
import './TripChat.css';

const TripChat = ({ tripId, tripName, user, tripDetails }) => {
  const {
    joinRoom, leaveRoom, sendMessage, startTyping, stopTyping,
    socket, isConnected, currentRoom, onlineUsers, typingUsers
  } = useSocket();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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

    // Set timeout to stop typing indicator
    if (e.target.value) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        stopTyping();
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="trip-chat-container" style={{
      maxWidth: '900px',
      margin: '20px auto',
      minHeight: '500px',
    }}>
      {/* Main Chat Area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e1e5e9',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ 
              margin: 0, 
              color: '#2c3e50', 
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '4px'
            }}>
              {tripName || 'Trip Chat'}
            </h3>
            <div style={{ 
              fontSize: '14px', 
              color: '#6B7280',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{
                background: '#FEE2E2',
                color: '#DC2626',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '500'
              }}>
                🚨 Trip
              </span>
              {tripDetails?.memberCount && (
                <span>{tripDetails.memberCount} members</span>
              )}
              {tripDetails?.location && (
                <span>• {tripDetails.location}</span>
              )}
            </div>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            fontSize: '14px',
            color: '#6B7280'
          }}>
            <span style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '12px',
              backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
              color: isConnected ? '#155724' : '#721c24'
            }}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
            <button style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: '#6B7280'
            }}>
              ⋮
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="messages-area" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          backgroundColor: '#f8f9fa',
          overflow: 'hidden',
        }}>
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '20px',
          }}>
            {messages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#6c757d',
                marginTop: '50px'
              }}>
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  flexDirection: msg.sender?.id === user?.userId ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    maxWidth: '70%',
                    padding: '16px 20px',
                    borderRadius: '18px',
                    backgroundColor: msg.sender?.id === user?.userId ? '#dbeafe' : '#f8f9fa',
                    color: msg.sender?.id === user?.userId ? '#1e3a8a' : '#1e293b',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    wordWrap: 'break-word',
                    marginBottom: '20px',
                    marginTop: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.sender?.id === user?.userId ? 'flex-end' : 'flex-start',
                    position: 'relative',
                    border: `1px solid ${msg.sender?.id === user?.userId ? '#bfdbfe' : '#e5e7eb'}`,
                  }}>
                    <div style={{
                      fontSize: '13px',
                      marginBottom: '8px',
                      opacity: 0.9,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: msg.sender?.id === user?.userId ? '#1e40af' : '#4b5563',
                    }}>
                      {msg.sender?.username || msg.sender?.name || 'Unknown'}
                      {msg.sender?.role === 'organizer' && (
                        <span style={{
                          background: '#dcfce7',
                          color: '#166534',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          border: '1px solid #bbf7d0',
                        }}>👑 Organizer</span>
                      )}
                    </div>
                    <div style={{
                      marginBottom: '6px',
                      lineHeight: 1.5,
                      fontSize: '15px',
                      wordBreak: 'break-word',
                    }}>{msg.text}</div>
                    <div style={{
                      fontSize: '11px',
                      marginTop: '6px',
                      color: '#9ca3af',
                      alignSelf: 'flex-end',
                      fontWeight: 500,
                    }}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div style={{
              padding: '8px 16px',
              fontSize: '12px',
              color: '#6c757d',
              fontStyle: 'italic',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #e1e5e9'
            }}>
              {typingUsers.map(u => u.username || u.name || 'Unknown').join(', ')} typing...
            </div>
          )}
        </div>

        {/* Input Area - Moved outside messages area */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#ffffff',
          borderTop: '1px solid #e1e5e9',
          padding: '16px 20px',
          borderRadius: '0 0 12px 12px',
          position: 'relative',
          zIndex: 2,
          flexShrink: 0,
        }}>
          <form onSubmit={e => { e.preventDefault(); handleSend(); }} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            margin: 0,
          }}>
            <span style={{
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              transition: 'all 0.2s',
              background: 'transparent',
              border: 'none',
              color: '#6b7280',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              margin: 0,
            }} title="Emoji">😊</span>
            <span style={{
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '50%',
              transition: 'all 0.2s',
              background: 'transparent',
              border: 'none',
              color: '#6b7280',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              margin: 0,
            }} title="Attach file">📎</span>
            <input
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #e1e5e9',
                borderRadius: '24px',
                fontSize: '15px',
                outline: 'none',
                backgroundColor: '#ffffff',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                minHeight: '44px',
                margin: 0,
                fontFamily: 'inherit',
              }}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={!isConnected}
            />
            <button
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                transition: 'all 0.2s',
                flexShrink: 0,
                margin: 0,
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
            width: '300px',
            background: '#f9fafb',
            borderLeft: '1px solid #e1e5e9',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
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
            }}
            aria-label="Collapse trip info"
          >
            <span style={{ fontSize: 18 }}>→</span>
          </button>
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