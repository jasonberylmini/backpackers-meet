import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './KYCVerification.css';

export default function KYCVerification() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState('upload');
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
      
      if (response.data.verificationStatus === 'verified') {
        setCurrentStep('success');
      } else if (response.data.verificationStatus === 'pending') {
        setCurrentStep('pending');
      } else if (response.data.verificationStatus === 'rejected') {
        setCurrentStep('rejected');
      } else {
        setCurrentStep('upload');
      }
      
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
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPEG, JPG, or PNG)');
        return;
      }

      // Additional validation for file content
      if (file.size < 1000) { // Less than 1KB might be too small for a real image
        toast.error('File seems too small. Please ensure you\'re uploading a real image file.');
        return;
      }

      setFormData(prev => ({
        ...prev,
        [type]: file
      }));

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => ({
          ...prev,
          [type]: e.target.result
        }));
      };
      reader.readAsDataURL(file);
      
      // Show success message
      const fileType = type === 'idDocument' ? 'ID document' : 'selfie';
      toast.success(`${fileType} uploaded successfully!`);
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
      data.append('idSelfie', formData.selfie);
      
      await axios.put('/api/users/profile', data, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setCurrentStep('pending');
      toast.success('KYC documents submitted successfully!');
      await fetchUserData();
    } catch (error) {
      console.error('Failed to submit KYC:', error);
      
      if (error.response?.status === 413) {
        toast.error('Files are too large. Please ensure each file is less than 5MB.');
      } else if (error.response?.status === 400) {
        toast.error('Invalid file format. Please upload JPEG, JPG, or PNG files only.');
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit KYC documents. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReupload = () => {
    setCurrentStep('upload');
    setFormData({ idDocument: null, selfie: null });
    setPreviews({ idDocument: null, selfie: null });
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
            <h1>Identity Verification</h1>
            <p>Complete your KYC to unlock all platform features</p>
          </div>
          <button 
            className="back-btn"
            onClick={() => navigate('/profile')}
          >
            ← Back to Profile
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="kyc-content">
        {currentStep === 'upload' && (
          <div className="upload-section">
            <div className="section-header">
              <h2>Upload Your Documents</h2>
              <p>Please provide clear, high-quality images of your identity documents</p>
            </div>

            <form onSubmit={handleSubmit} className="upload-form">
              {/* ID Document Upload */}
              <div className="upload-card">
                <div className="upload-header">
                  <div className="upload-icon">📄</div>
                  <div className="upload-info">
                    <h3>Identity Document</h3>
                    <p>Passport, Driver's License, Aadhar Card, etc.</p>
                  </div>
                </div>
                
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
                        <div className="upload-icon-large">📄</div>
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
              <div className="upload-card">
                <div className="upload-header">
                  <div className="upload-icon">📸</div>
                  <div className="upload-info">
                    <h3>Selfie with ID</h3>
                    <p>Take a clear selfie while holding your ID document</p>
                  </div>
                </div>
                
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
                        <div className="upload-icon-large">📸</div>
                        <div className="upload-text">
                          <span className="upload-title">Click to upload selfie</span>
                          <span className="upload-subtitle">JPEG, JPG, or PNG (max 5MB)</span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
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
        )}

        {currentStep === 'pending' && (
          <div className="pending-section">
            <div className="pending-card">
              <div className="pending-icon">⏳</div>
              <h2>Documents Submitted Successfully!</h2>
              <p>Thank you for submitting your verification documents. Our team is now reviewing them.</p>
              <div className="timeline">
                <div className="timeline-item">
                  <h4>Review Process</h4>
                  <p>Our verification team will review your documents within 24-48 hours</p>
                </div>
                <div className="timeline-item">
                  <h4>Notification</h4>
                  <p>You'll receive a notification once the review is complete</p>
                </div>
              </div>
              <button 
                className="primary-btn"
                onClick={() => navigate('/profile')}
              >
                Back to Profile
              </button>
            </div>
          </div>
        )}

        {currentStep === 'success' && (
          <div className="success-section">
            <div className="success-card">
              <div className="success-icon">✅</div>
              <h2>Verification Complete!</h2>
              <p>Your account has been successfully verified.</p>
              <div className="benefits">
                <h3>Unlocked Features:</h3>
                <ul>
                  <li>Create and join trips</li>
                  <li>Access all chat features</li>
                  <li>Use expense tracking</li>
                  <li>Build trust with travelers</li>
                </ul>
              </div>
              <button 
                className="primary-btn"
                onClick={() => navigate('/social')}
              >
                Explore Trips
              </button>
            </div>
          </div>
        )}

        {currentStep === 'rejected' && (
          <div className="rejected-section">
            <div className="rejected-card">
              <div className="rejected-icon">❌</div>
              <h2>Verification Rejected</h2>
              <p>Your verification documents were not approved. Please review the requirements and try again.</p>
              <div className="rejection-reasons">
                <h3>Common Reasons for Rejection:</h3>
                <ul>
                  <li>Documents are blurry or unclear</li>
                  <li>Information is not fully visible</li>
                  <li>Documents are expired</li>
                  <li>Selfie doesn't clearly show your face</li>
                </ul>
              </div>
              <button 
                className="primary-btn"
                onClick={handleReupload}
              >
                Upload New Documents
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
