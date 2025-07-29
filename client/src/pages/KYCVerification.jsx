import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './KYCVerification.css';

export default function KYCVerification() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    idDocument: null,
    selfie: null
  });
  const [previews, setPreviews] = useState({
    idDocument: null,
    selfie: null
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get('/api/users/profile', { headers });
      setUser(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setLoading(false);
      toast.error('Failed to load user data');
    }
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPEG, JPG, or PNG)');
        return;
      }

      setFormData(prev => ({
        ...prev,
        [type]: file
      }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => ({
          ...prev,
          [type]: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (type) => {
    setFormData(prev => ({
      ...prev,
      [type]: null
    }));
    setPreviews(prev => ({
      ...prev,
      [type]: null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.idDocument || !formData.selfie) {
      toast.error('Please upload both ID document and selfie');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const data = new FormData();
      data.append('idDocument', formData.idDocument);
      data.append('selfie', formData.selfie);
      
      await axios.post('/api/users/kyc', data, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('KYC documents submitted successfully! We will review them within 24-48 hours.');
      navigate('/profile');
    } catch (error) {
      console.error('Failed to submit KYC:', error);
      toast.error(error.response?.data?.message || 'Failed to submit KYC documents');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return { bg: '#d1fae5', text: '#065f46', icon: '✅' };
      case 'pending':
        return { bg: '#fef3c7', text: '#92400e', icon: '⏳' };
      case 'rejected':
        return { bg: '#fee2e2', text: '#dc2626', icon: '❌' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', icon: '📋' };
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'verified':
        return 'Your account has been verified successfully!';
      case 'pending':
        return 'Your documents are under review. This usually takes 24-48 hours.';
      case 'rejected':
        return 'Your verification was rejected. Please check the requirements and try again.';
      default:
        return 'Please complete your KYC verification to unlock all features.';
    }
  };

  if (loading) {
    return (
      <div className="kyc-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading verification status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kyc-container">
      {/* Header */}
      <header className="kyc-header">
        <div className="header-content">
          <div className="header-text">
            <h1>KYC Verification</h1>
            <p>Verify your identity to unlock all platform features</p>
          </div>
          <button 
            className="back-btn"
            onClick={() => navigate('/profile')}
          >
            ← Back to Profile
          </button>
        </div>
      </header>

      {/* Status Section */}
      <section className="kyc-status">
        <div className="status-card">
          <div className="status-header">
            <div 
              className="status-badge"
              style={{ 
                backgroundColor: getStatusColor(user.verificationStatus).bg,
                color: getStatusColor(user.verificationStatus).text
              }}
            >
              <span className="status-icon">
                {getStatusColor(user.verificationStatus).icon}
              </span>
              <span className="status-text">
                {user.verificationStatus === 'verified' ? 'Verified' : 
                 user.verificationStatus === 'pending' ? 'Under Review' :
                 user.verificationStatus === 'rejected' ? 'Rejected' : 'Not Verified'}
              </span>
            </div>
          </div>
          <p className="status-message">
            {getStatusMessage(user.verificationStatus)}
          </p>
        </div>
      </section>

      {/* Verification Form */}
      {user.verificationStatus !== 'verified' && (
        <section className="kyc-form-section">
          <div className="form-container">
            <h2>Upload Documents</h2>
            <p className="form-description">
              Please upload clear, high-quality images of your documents. 
              All information will be kept secure and confidential.
            </p>

            <form onSubmit={handleSubmit} className="kyc-form">
              {/* ID Document Upload */}
              <div className="upload-section">
                <h3>📄 Identity Document</h3>
                <p>Upload a valid government-issued ID (Passport, Driver's License, Aadhar Card, etc.)</p>
                
                <div className="upload-area">
                  {previews.idDocument ? (
                    <div className="preview-container">
                      <img src={previews.idDocument} alt="ID Document Preview" />
                      <button 
                        type="button"
                        className="remove-btn"
                        onClick={() => removeFile('idDocument')}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <input
                        type="file"
                        id="idDocument"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'idDocument')}
                        className="file-input"
                      />
                      <label htmlFor="idDocument" className="upload-label">
                        <div className="upload-icon">📄</div>
                        <div className="upload-text">
                          <span className="upload-title">Click to upload ID document</span>
                          <span className="upload-subtitle">JPEG, JPG, or PNG (max 5MB)</span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Selfie Upload */}
              <div className="upload-section">
                <h3>📸 Selfie with ID</h3>
                <p>Take a clear selfie while holding your ID document next to your face</p>
                
                <div className="upload-area">
                  {previews.selfie ? (
                    <div className="preview-container">
                      <img src={previews.selfie} alt="Selfie Preview" />
                      <button 
                        type="button"
                        className="remove-btn"
                        onClick={() => removeFile('selfie')}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <input
                        type="file"
                        id="selfie"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'selfie')}
                        className="file-input"
                      />
                      <label htmlFor="selfie" className="upload-label">
                        <div className="upload-icon">📸</div>
                        <div className="upload-text">
                          <span className="upload-title">Click to upload selfie</span>
                          <span className="upload-subtitle">JPEG, JPG, or PNG (max 5MB)</span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Requirements */}
              <div className="requirements-section">
                <h3>📋 Requirements</h3>
                <ul className="requirements-list">
                  <li>Documents must be clearly visible and not blurry</li>
                  <li>All text and numbers must be readable</li>
                  <li>Documents must be current and not expired</li>
                  <li>Selfie must show your full face clearly</li>
                  <li>ID document must be visible in the selfie</li>
                  <li>File size must be less than 5MB per image</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn"
                  onClick={() => navigate('/profile')}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="submit-btn"
                  disabled={submitting || !formData.idDocument || !formData.selfie}
                >
                  {submitting ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Success Message for Verified Users */}
      {user.verificationStatus === 'verified' && (
        <section className="kyc-success">
          <div className="success-card">
            <div className="success-icon">✅</div>
            <h2>Verification Complete!</h2>
            <p>Your account has been successfully verified. You now have access to all platform features.</p>
            <div className="success-benefits">
              <h3>What you can do now:</h3>
              <ul>
                <li>✅ Create and join trips</li>
                <li>✅ Access all chat features</li>
                <li>✅ Use expense tracking</li>
                <li>✅ Build trust with other travelers</li>
              </ul>
            </div>
            <button 
              className="primary-btn"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </button>
          </div>
        </section>
      )}
    </div>
  );
} 