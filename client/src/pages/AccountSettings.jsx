import React, { useState } from 'react';
import './AccountSettings.css';

export default function AccountSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAccount = () => {
    // Here you would typically make an API call to delete the account
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <div className="account-settings-container">
      <div className="settings-header">
        <h1>Account Settings</h1>
      </div>

      <div className="settings-content">
        {/* Profile Settings Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Profile Settings</h2>
            <p>Manage your profile information and account settings</p>
          </div>
          <div className="section-actions">
            <button className="btn btn-secondary" onClick={() => window.location.href = '/profile'}>
              Edit Profile
            </button>
            <button className="btn btn-danger" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Notification Preferences Section */}
        <div className="settings-section">
          <div className="section-header">
            <h2>Notification Preferences</h2>
            <p>Manage your email notification settings</p>
          </div>
          <div className="notification-option">
            <div className="option-info">
              <div className="option-title">Receive email notifications</div>
              <div className="option-description">Get updates about messages, friend requests, and more</div>
            </div>
            <div className="toggle-switch">
              <input
                type="checkbox"
                id="emailNotifications"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <label htmlFor="emailNotifications" className="toggle-label"></label>
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
            <div className="empty-state">
              <div className="empty-icon">🚫</div>
              <div className="empty-text">No blocked users</div>
            </div>
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="settings-section danger-section">
          <div className="section-header">
            <h2 className="danger-title">Delete Account</h2>
            <p>Permanently delete your account and all associated data</p>
          </div>
          <div className="section-actions">
            <button className="btn btn-danger delete-btn" onClick={handleDeleteAccount}>
              <span className="btn-icon">🗑️</span>
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Delete Account</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete your account? This action cannot be undone.</p>
              <p>All your data, including trips, messages, and profile information will be permanently removed.</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteAccount}>
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 