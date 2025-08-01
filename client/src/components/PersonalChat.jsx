import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import toast from 'react-hot-toast';

const PersonalChat = ({ otherUserId, otherUserName, currentUser }) => {
  const {
    joinRoom, leaveRoom, sendMessage, startTyping, stopTyping,
    socket, isConnected, onlineUsers, typingUsers
  } = useSocket();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Create unique room ID for personal chat
  const roomId = [currentUser.userId, otherUserId].sort().join('_');

  useEffect(() => {
    if (otherUserId) {
      joinRoom(roomId);
      return () => leaveRoom(roomId);
    }
  }, [otherUserId, roomId, joinRoom, leaveRoom]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);
      // Show toast for new messages
      if (data.sender.id !== currentUser.userId) {
        toast(`${data.sender.username || data.sender.name || 'Unknown'}: ${data.text}`, {
          duration: 3000,
          position: 'top-right',
        });
      }
    };

    const handleUserTyping = (data) => {
      // Handle typing indicators
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('userTyping', handleUserTyping);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('userTyping', handleUserTyping);
    };
  }, [socket, currentUser.userId]);

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

  const isOtherUserOnline = onlineUsers.some(user => user.userId === otherUserId);

  return (
    <div className="personal-chat-container" style={{
      border: '1px solid #e1e5e9',
      borderRadius: '12px',
      backgroundColor: '#ffffff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      maxWidth: '500px',
      margin: '20px auto'
    }}>
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
          <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '18px' }}>
            {otherUserName || 'Direct Message'}
          </h3>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>
            {isOtherUserOnline ? (
              <span style={{ color: '#28a745' }}>🟢 Online</span>
            ) : (
              <span style={{ color: '#6c757d' }}>⚪ Offline</span>
            )}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: '#6c757d' }}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        height: '350px',
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: '#f8f9fa'
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
              marginBottom: '12px',
              display: 'flex',
              flexDirection: msg.sender?.id === currentUser.userId ? 'row-reverse' : 'row'
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '8px 12px',
                borderRadius: '12px',
                backgroundColor: msg.sender?.id === currentUser.userId ? '#007bff' : '#ffffff',
                color: msg.sender?.id === currentUser.userId ? '#ffffff' : '#2c3e50',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                wordWrap: 'break-word'
              }}>
                <div>{msg.text}</div>
                <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
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
          {otherUserName} typing...
        </div>
      )}

      {/* Input Area */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #e1e5e9',
        backgroundColor: '#ffffff',
        borderRadius: '0 0 12px 12px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={!isConnected}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: isConnected ? '#ffffff' : '#f8f9fa'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || !input.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: isConnected && input.trim() ? '#007bff' : '#6c757d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: isConnected && input.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalChat; 