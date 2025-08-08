import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './AccountSettings.css';

export default function AccountSettings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    inApp: true,
    email: false,
    sms: false
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1: initial, 2: final confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockedUsersLoading, setBlockedUsersLoading] = useState(false);
  const [unblockingUsers, setUnblockingUsers] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
    fetchBlockedUsers();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get('/api/users/profile', { headers });
      const userData = response.data;
      
      setUser(userData);
      setNotificationPrefs(userData.notificationPrefs || { inApp: true, email: false, sms: false });
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setLoading(false);
      toast.error('Failed to load account settings');
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      setBlockedUsersLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get('/api/users/blocked/list', { headers });
      setBlockedUsers(response.data.blockedUsers || []);
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
      if (error.response?.status === 401) {
        // User is not authenticated, redirect to login
        localStorage.clear();
        navigate('/login');
        toast.error('Please log in to continue');
      } else {
        toast.error('Failed to load blocked users');
      }
    } finally {
      setBlockedUsersLoading(false);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      setUnblockingUsers(prev => new Set(prev).add(userId));
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`/api/users/${userId}/unblock`, {}, { headers });
      
      toast.success('User unblocked successfully');
      fetchBlockedUsers(); // Refresh the blocked users list
    } catch (error) {
      console.error('Failed to unblock user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setUnblockingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    toast.success('Signed out successfully');
  };

  const handleNotificationChange = async (type) => {
    try {
      const newPrefs = {
        ...notificationPrefs,
        [type]: !notificationPrefs[type]
      };
      
      setNotificationPrefs(newPrefs);
      
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put('/api/users/profile', {
        notificationPrefs: JSON.stringify(newPrefs)
      }, { headers });
      
      toast.success('Notification preferences updated');
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      toast.error('Failed to update notification preferences');
      // Revert the change on error
      setNotificationPrefs(notificationPrefs);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteStep(1);
    setDeleteConfirmation('');
    setShowDeleteConfirm(true);
  };

  const handleFinalDelete = () => {
    setDeleteStep(2);
  };

  const confirmDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.delete('/api/users/profile', { headers });
      
      toast.success('Account deleted successfully');
      
      // Clear all local storage and redirect
      localStorage.clear();
      sessionStorage.clear();
      
      // Force redirect to home page with a small delay to ensure toast shows
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
      setDeleteStep(1);
      setDeleteConfirmation('');
    }
  };

  const handleEditProfile = () => {
    navigate('/profile/edit');
  };

  const closeDeleteModal = () => {
    setShowDeleteConfirm(false);
    setDeleteStep(1);
    setDeleteConfirmation('');
  };

  // Inline styles for toggle switches
  const toggleSwitchStyle = {
    position: 'relative',
    flexShrink: 0
  };

  const toggleInputStyle = {
    opacity: 0,
    width: 0,
    height: 0,
    position: 'absolute',
    left: '-9999px',
    margin: 0,
    padding: 0,
    border: 'none',
    outline: 'none'
  };

  const toggleLabelStyle = {
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '26px',
    background: notificationPrefs.inApp ? '#10b981' : '#d1d5db',
    borderRadius: '13px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: 'none',
    outline: 'none'
  };

  const toggleDotStyle = {
    content: '""',
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    top: '3px',
    left: notificationPrefs.inApp ? '27px' : '3px',
    background: '#ffffff',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    zIndex: 1
  };

  const emailToggleLabelStyle = {
    ...toggleLabelStyle,
    background: notificationPrefs.email ? '#10b981' : '#d1d5db'
  };

  const emailToggleDotStyle = {
    ...toggleDotStyle,
    left: notificationPrefs.email ? '27px' : '3px'
  };

  const smsToggleLabelStyle = {
    ...toggleLabelStyle,
    background: notificationPrefs.sms ? '#10b981' : '#d1d5db'
  };

  const smsToggleDotStyle = {
    ...toggleDotStyle,
    left: notificationPrefs.sms ? '27px' : '3px'
  };

  // Inline styles for buttons
  const signOutButtonStyle = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    color: '#ffffff'
  };

  const deleteButtonStyle = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: '1px solid #ef4444',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    color: '#ffffff'
  };

  if (loading) {
    return (
      <div className="account-settings-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-settings-container">
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Manage your account preferences and settings</p>
      </div>

      <div className="settings-content">
        {/* Profile Settings Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Profile Settings</h2>
            <p>Manage your profile information and account settings</p>
          </div>
          <div className="section-content">
            <div className="profile-info">
              <div className="profile-details">
                <h3>{user?.name || 'User'}</h3>
                <p>{user?.email}</p>
                <p className="member-since">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}</p>
              </div>
            </div>
            <div className="section-actions">
              <button className="btn btn-primary" onClick={handleEditProfile}>
                Edit Profile
              </button>
              <button style={signOutButtonStyle} onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Notification Preferences Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Notification Preferences</h2>
            <p>Manage your notification settings</p>
          </div>
          <div className="notification-options">
            <div className="notification-option">
              <div className="option-info">
                <div className="option-title">In-App Notifications</div>
                <div className="option-description">Receive notifications within the app</div>
              </div>
              <div style={toggleSwitchStyle}>
                <input
                  type="checkbox"
                  id="inAppNotifications"
                  checked={notificationPrefs.inApp}
                  onChange={() => handleNotificationChange('inApp')}
                  style={toggleInputStyle}
                />
                <label htmlFor="inAppNotifications" style={toggleLabelStyle}>
                  <div style={toggleDotStyle}></div>
                </label>
              </div>
            </div>
            
            <div className="notification-option">
              <div className="option-info">
                <div className="option-title">Email Notifications</div>
                <div className="option-description">Receive notifications via email</div>
              </div>
              <div style={toggleSwitchStyle}>
                <input
                  type="checkbox"
                  id="emailNotifications"
                  checked={notificationPrefs.email}
                  onChange={() => handleNotificationChange('email')}
                  style={toggleInputStyle}
                />
                <label htmlFor="emailNotifications" style={emailToggleLabelStyle}>
                  <div style={emailToggleDotStyle}></div>
                </label>
              </div>
            </div>
            
            <div className="notification-option">
              <div className="option-info">
                <div className="option-title">SMS Notifications</div>
                <div className="option-description">Receive notifications via SMS</div>
              </div>
              <div style={toggleSwitchStyle}>
                <input
                  type="checkbox"
                  id="smsNotifications"
                  checked={notificationPrefs.sms}
                  onChange={() => handleNotificationChange('sms')}
                  style={toggleInputStyle}
                />
                <label htmlFor="smsNotifications" style={smsToggleLabelStyle}>
                  <div style={smsToggleDotStyle}></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Blocked Users Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Blocked Users</h2>
            <p>Manage your blocked users list</p>
          </div>
          <div className="blocked-users-content">
            {blockedUsersLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading blocked users...</p>
              </div>
            ) : blockedUsers.length > 0 ? (
              <div className="blocked-users-list">
                {blockedUsers.map(user => (
                  <div key={user._id} className="blocked-user-item">
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.profileImage ? (
                          <img src={`/uploads/${user.profileImage}`} alt={user.name} onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }} />
                        ) : null}
                        <div className="avatar-placeholder small" style={{ display: user.profileImage ? 'none' : 'flex' }}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="user-details">
                        <h4>{user.name}</h4>
                        <p>@{user.username || 'user'}</p>
                      </div>
                    </div>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => handleUnblockUser(user._id)}
                      disabled={unblockingUsers.has(user._id)}
                    >
                      {unblockingUsers.has(user._id) ? 'Unblocking...' : 'Unblock'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🚫</div>
                <div className="empty-text">No blocked users</div>
                <p className="empty-description">Users you block will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="settings-section danger-section">
          <div className="section-header">
            <h2 className="danger-title">Delete Account</h2>
            <p>Permanently delete your account and all associated data</p>
          </div>
          <div className="section-content">
            <div className="danger-warning">
              <div className="warning-icon">⚠️</div>
              <div className="warning-text">
                <h4>This action cannot be undone</h4>
                <p>Deleting your account will permanently remove all your data including trips, messages, and profile information.</p>
              </div>
            </div>
            <div className="section-actions">
              <button 
                style={deleteButtonStyle}
                onClick={handleDeleteAccount}
                disabled={saving}
              >
                <span className="btn-icon">🗑️</span>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {deleteStep === 1 ? (
              <>
                <div className="modal-header">
                  <h3>Delete Account</h3>
                </div>
                <div className="modal-body">
                  <div className="delete-warning">
                    <div className="warning-icon-large">⚠️</div>
                    <h4>Are you sure you want to delete your account?</h4>
                    <p>This action will permanently delete your account and all associated data including:</p>
                    <ul className="delete-consequences">
                      <li>All your trips and travel history</li>
                      <li>Messages and conversations</li>
                      <li>Profile information and settings</li>
                      <li>Reviews and ratings</li>
                      <li>All uploaded photos and documents</li>
                    </ul>
                    <p className="final-warning">This action cannot be undone once confirmed.</p>
                  </div>
                </div>
                <div className="modal-actions">
                  <button 
                    className="btn btn-secondary" 
                    onClick={closeDeleteModal}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={handleFinalDelete}
                  >
                    Yes, Delete My Account
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-header">
                  <h3>Final Confirmation</h3>
                </div>
                <div className="modal-body">
                  <div className="final-delete-warning">
                    <div className="warning-icon-large">🚨</div>
                    <h4>This is your final warning!</h4>
                    <p>You are about to permanently delete your account. This action cannot be undone.</p>
                    <div className="final-confirmation">
                      <p>To confirm deletion, please type <strong>"DELETE"</strong> in the field below:</p>
                      <input 
                        type="text" 
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder="Type DELETE to confirm"
                        className="delete-confirmation-input"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setDeleteStep(1)}
                  >
                    Go Back
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={confirmDeleteAccount}
                    disabled={saving || deleteConfirmation !== 'DELETE'}
                  >
                    {saving ? 'Deleting...' : 'Permanently Delete Account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 