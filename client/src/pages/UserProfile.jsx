import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './UserProfile.css';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    bio: '',
    country: '',
    instagram: '',
    languages: [],
    dateOfBirth: '',
    phone: '',
    gender: '',
    preferences: ''
  });
  const [kycData, setKycData] = useState({
    idDocument: null,
    selfie: null
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    inApp: true,
    email: false,
    sms: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get('/api/users/profile', { headers });
      const userData = response.data;
      
      setUser(userData);
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        username: userData.username || '',
        bio: userData.bio || '',
        country: userData.country || '',
        instagram: userData.instagram || '',
        languages: userData.languages || [],
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString().split('T')[0] : '',
        phone: userData.phone || '',
        gender: userData.gender || '',
        preferences: userData.preferences || ''
      });
      setNotificationPrefs(userData.notificationPrefs || { inApp: true, email: false, sms: false });
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setLoading(false);
      toast.error('Failed to load profile');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLanguageChange = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      languages: checked 
        ? [...prev.languages, value]
        : prev.languages.filter(lang => lang !== value)
    }));
  };

  const handleNotificationChange = (type) => {
    setNotificationPrefs(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      setKycData(prev => ({
        ...prev,
        [type]: file
      }));
    }
  };

  const handleProfileSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const updateData = {
        ...formData,
        notificationPrefs
      };

      await axios.put('/api/users/profile', updateData, { headers });
      toast.success('Profile updated successfully!');
      fetchUserProfile(); // Refresh data
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleKYCSubmit = async () => {
    try {
      if (!kycData.idDocument || !kycData.selfie) {
        toast.error('Please upload both ID document and selfie');
        return;
      }

      setSaving(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const formData = new FormData();
      formData.append('idDocument', kycData.idDocument);
      formData.append('selfie', kycData.selfie);

      await axios.post('/api/users/kyc', formData, { 
        headers: { 
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('KYC documents submitted successfully!');
      setKycData({ idDocument: null, selfie: null });
      fetchUserProfile(); // Refresh verification status
    } catch (error) {
      console.error('Failed to submit KYC:', error);
      toast.error(error.response?.data?.message || 'Failed to submit KYC documents');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        await axios.delete('/api/users/profile', { headers });
        toast.success('Account deleted successfully');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
      } catch (error) {
        console.error('Failed to delete account:', error);
        toast.error('Failed to delete account');
      }
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      {/* Header */}
      <header className="profile-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Profile Settings</h1>
            <p>Manage your account and preferences</p>
          </div>
          <button 
            className="back-btn"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </button>
        </div>
      </header>

      <div className="profile-content">
        {/* Navigation Tabs */}
        <nav className="profile-nav">
          <button 
            className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
          <button 
            className={`nav-tab ${activeTab === 'kyc' ? 'active' : ''}`}
            onClick={() => setActiveTab('kyc')}
          >
            📋 Verification
          </button>
          <button 
            className={`nav-tab ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            🔔 Notifications
          </button>
          <button 
            className={`nav-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            🔒 Security
          </button>
        </nav>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="profile-section">
              <h2>Personal Information</h2>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Choose a unique username"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Enter your country"
                  />
                </div>

                <div className="form-group">
                  <label>Instagram</label>
                  <input
                    type="text"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    placeholder="Your Instagram handle"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself..."
                    rows="4"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Languages</label>
                  <div className="checkbox-group">
                    {['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi'].map(lang => (
                      <label key={lang} className="checkbox-label">
                        <input
                          type="checkbox"
                          value={lang}
                          checked={formData.languages.includes(lang)}
                          onChange={handleLanguageChange}
                        />
                        {lang}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Travel Preferences</label>
                  <textarea
                    name="preferences"
                    value={formData.preferences}
                    onChange={handleInputChange}
                    placeholder="Describe your travel style and preferences..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="save-btn"
                  onClick={handleProfileSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* KYC Tab */}
          {activeTab === 'kyc' && (
            <div className="kyc-section">
              <h2>Identity Verification</h2>
              
              <div className="verification-status">
                <div className={`status-card ${user.verificationStatus}`}>
                  <div className="status-icon">
                    {user.verificationStatus === 'verified' && '✅'}
                    {user.verificationStatus === 'pending' && '⏳'}
                    {user.verificationStatus === 'rejected' && '❌'}
                  </div>
                  <div className="status-content">
                    <h3>Status: {user.verificationStatus?.toUpperCase()}</h3>
                    <p>
                      {user.verificationStatus === 'verified' && 'Your account is verified and you can access all features.'}
                      {user.verificationStatus === 'pending' && 'Your verification is under review. This usually takes 24-48 hours.'}
                      {user.verificationStatus === 'rejected' && 'Your verification was rejected. Please try again with clearer documents.'}
                    </p>
                  </div>
                </div>
              </div>

              {user.verificationStatus !== 'verified' && (
                <div className="kyc-form">
                  <h3>Upload Documents</h3>
                  <p>Please upload clear photos of your ID document and a selfie for verification.</p>
                  
                  <div className="upload-section">
                    <div className="upload-group">
                      <label>ID Document (Passport, Driver's License, etc.)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'idDocument')}
                        className="file-input"
                      />
                      {kycData.idDocument && (
                        <p className="file-info">✓ {kycData.idDocument.name}</p>
                      )}
                    </div>

                    <div className="upload-group">
                      <label>Selfie with ID Document</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'selfie')}
                        className="file-input"
                      />
                      {kycData.selfie && (
                        <p className="file-info">✓ {kycData.selfie.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="form-actions">
                    <button 
                      className="submit-btn"
                      onClick={handleKYCSubmit}
                      disabled={saving || !kycData.idDocument || !kycData.selfie}
                    >
                      {saving ? 'Submitting...' : 'Submit for Verification'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="notifications-section">
              <h2>Notification Preferences</h2>
              
              <div className="notification-settings">
                <div className="setting-item">
                  <div className="setting-info">
                    <h3>In-App Notifications</h3>
                    <p>Receive notifications within the app</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.inApp}
                      onChange={() => handleNotificationChange('inApp')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <h3>Email Notifications</h3>
                    <p>Receive notifications via email</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.email}
                      onChange={() => handleNotificationChange('email')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="setting-item">
                  <div className="setting-info">
                    <h3>SMS Notifications</h3>
                    <p>Receive notifications via SMS</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.sms}
                      onChange={() => handleNotificationChange('sms')}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  className="save-btn"
                  onClick={handleProfileSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="security-section">
              <h2>Security Settings</h2>
              
              <div className="security-options">
                <div className="security-item">
                  <div className="security-info">
                    <h3>Change Password</h3>
                    <p>Update your account password</p>
                  </div>
                  <button className="action-btn">Change</button>
                </div>

                <div className="security-item">
                  <div className="security-info">
                    <h3>Two-Factor Authentication</h3>
                    <p>Add an extra layer of security</p>
                  </div>
                  <button className="action-btn">Enable</button>
                </div>

                <div className="security-item danger">
                  <div className="security-info">
                    <h3>Delete Account</h3>
                    <p>Permanently delete your account and all data</p>
                  </div>
                  <button 
                    className="danger-btn"
                    onClick={handleDeleteAccount}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 