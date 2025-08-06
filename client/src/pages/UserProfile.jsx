import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import './UserProfile.css';

export default function UserProfile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageLoading, setImageLoading] = useState({
    profileImage: false,
    coverImage: false
  });
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
    preferences: '',
    profileImage: null,
    coverImage: null
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserProfile();
    
    // Cleanup function to revoke blob URLs
    return () => {
      // Revoke any blob URLs to prevent memory leaks
      if (user?.profileImage && user.profileImage.startsWith('blob:')) {
        URL.revokeObjectURL(user.profileImage);
      }
      if (user?.coverImage && user.coverImage.startsWith('blob:')) {
        URL.revokeObjectURL(user.coverImage);
      }
    };
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

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL or blob URL, return as is
    if (imagePath.startsWith('http') || imagePath.startsWith('blob:')) {
      return imagePath;
    }
    
    // Handle both old format (with uploads\) and new format (just filename)
    const filename = imagePath.includes('uploads') ? imagePath.split(/[/\\]/).pop() : imagePath;
    return `/uploads/${filename}`;
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      if (type === 'profileImage' || type === 'coverImage') {
        // Create a preview URL for immediate display
        const previewUrl = URL.createObjectURL(file);
        
        // Update the user state with the preview
        setUser(prev => ({
          ...prev,
          [type]: previewUrl
        }));
        
        // Store the file for upload
        setFormData(prev => ({
          ...prev,
          [type]: file
        }));
        
        toast.success(`${type === 'profileImage' ? 'Profile image' : 'Cover image'} selected!`);
      }
    }
  };

  const handleProfileSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const updateData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
          if (key === 'languages' && Array.isArray(formData[key])) {
            updateData.append(key, formData[key].join(','));
          } else if (formData[key] instanceof File) {
            updateData.append(key, formData[key]);
          } else {
            updateData.append(key, formData[key]);
          }
        }
      });

      console.log('Sending update data:');
      for (let [key, value] of updateData.entries()) {
        console.log(`${key}:`, value);
      }
      
      const response = await axios.put('/api/users/profile', updateData, { 
        headers: { 
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Response:', response.data);
      toast.success(response.data.message || 'Profile updated successfully!');
      
      // Refresh the user data to get the updated image paths
      await fetchUserProfile();
      
      // Redirect to profile page after successful save
      navigate('/profile');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
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
            onClick={() => navigate('/profile')}
          >
            ← Back to Profile
          </button>
        </div>
      </header>

      <div className="profile-content">
        {/* Profile Content */}
        <div className="tab-content">
          <div className="profile-section">
            <h2>Personal Information</h2>
            
            {/* Profile and Cover Images */}
            <div className="image-upload-section">
              {/* Cover Image */}
              <div className="cover-image-container">
                <div className="cover-image-preview">
                  {user?.coverImage ? (
                    <>
                      {imageLoading.coverImage && (
                        <div className="image-loading-overlay">
                          <div className="loading-spinner"></div>
                        </div>
                      )}
                      <img 
                        src={getImageUrl(user.coverImage)} 
                        alt="Cover" 
                        className="cover-image"
                        onLoadStart={() => setImageLoading(prev => ({ ...prev, coverImage: true }))}
                        onLoad={() => {
                          console.log('Cover image loaded successfully:', user.coverImage);
                          setImageLoading(prev => ({ ...prev, coverImage: false }));
                        }}
                        onError={(e) => {
                          console.error('Cover image failed to load:', user.coverImage);
                          e.target.style.display = 'none';
                          setImageLoading(prev => ({ ...prev, coverImage: false }));
                        }}
                      />
                    </>
                  ) : (
                    <div className="cover-image-placeholder">
                      <span>📷</span>
                    </div>
                  )}
                  <label className="cover-upload-label">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'coverImage')}
                      style={{ display: 'none' }}
                    />
                    <span className="upload-btn">📷 Update Cover</span>
                  </label>
                </div>
              </div>

              {/* Profile Image */}
              <div className="profile-image-container">
                <div className="profile-image-preview">
                  {user?.profileImage ? (
                    <>
                      {imageLoading.profileImage && (
                        <div className="image-loading-overlay">
                          <div className="loading-spinner"></div>
                        </div>
                      )}
                      <img 
                        src={getImageUrl(user.profileImage)} 
                        alt="Profile" 
                        className="profile-image"
                        onLoadStart={() => setImageLoading(prev => ({ ...prev, profileImage: true }))}
                        onLoad={() => {
                          console.log('Profile image loaded successfully:', user.profileImage);
                          setImageLoading(prev => ({ ...prev, profileImage: false }));
                        }}
                        onError={(e) => {
                          console.error('Profile image failed to load:', user.profileImage);
                          e.target.style.display = 'none';
                          setImageLoading(prev => ({ ...prev, profileImage: false }));
                        }}
                      />
                    </>
                  ) : (
                    <div className="profile-image-placeholder">
                      <div className="default-avatar-icon">👤</div>
                      <div className="default-avatar-text">{getInitials(user?.name || 'U')}</div>
                    </div>
                  )}
                  <label className="profile-upload-label">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'profileImage')}
                      style={{ display: 'none' }}
                    />
                    <span className="upload-btn">📷</span>
                  </label>
                </div>
              </div>
            </div>
            
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
                <label>Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Choose a unique username (will be displayed on your profile)"
                  required
                />
                <small className="form-hint">This will be your public display name on the platform</small>
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
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="">Select your country</option>
                  <option value="Afghanistan">Afghanistan</option>
                  <option value="Albania">Albania</option>
                  <option value="Algeria">Algeria</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Australia">Australia</option>
                  <option value="Austria">Austria</option>
                  <option value="Belgium">Belgium</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Canada">Canada</option>
                  <option value="Chile">Chile</option>
                  <option value="China">China</option>
                  <option value="Colombia">Colombia</option>
                  <option value="Croatia">Croatia</option>
                  <option value="Czech Republic">Czech Republic</option>
                  <option value="Denmark">Denmark</option>
                  <option value="Egypt">Egypt</option>
                  <option value="Finland">Finland</option>
                  <option value="France">France</option>
                  <option value="Germany">Germany</option>
                  <option value="Greece">Greece</option>
                  <option value="Hungary">Hungary</option>
                  <option value="India">India</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Ireland">Ireland</option>
                  <option value="Italy">Italy</option>
                  <option value="Japan">Japan</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Mexico">Mexico</option>
                  <option value="Netherlands">Netherlands</option>
                  <option value="New Zealand">New Zealand</option>
                  <option value="Norway">Norway</option>
                  <option value="Pakistan">Pakistan</option>
                  <option value="Peru">Peru</option>
                  <option value="Philippines">Philippines</option>
                  <option value="Poland">Poland</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Romania">Romania</option>
                  <option value="Russia">Russia</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="Singapore">Singapore</option>
                  <option value="South Africa">South Africa</option>
                  <option value="South Korea">South Korea</option>
                  <option value="Spain">Spain</option>
                  <option value="Sweden">Sweden</option>
                  <option value="Switzerland">Switzerland</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Turkey">Turkey</option>
                  <option value="Ukraine">Ukraine</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United States">United States</option>
                  <option value="Vietnam">Vietnam</option>
                </select>
              </div>

              <div className="form-group">
                <label>Instagram</label>
                <input
                  type="text"
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  placeholder="Enter your Instagram handle"
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself..."
                  rows="4"
                  maxLength="500"
                />
                <small className="form-hint">{formData.bio.length}/500 characters</small>
              </div>

              <div className="form-group">
                <label>Languages</label>
                <input
                  type="text"
                  name="languages"
                  value={formData.languages.join(', ')}
                  onChange={(e) => {
                    const languages = e.target.value.split(',').map(lang => lang.trim()).filter(lang => lang);
                    setFormData(prev => ({ ...prev, languages }));
                  }}
                  placeholder="English, Spanish, French..."
                />
                <small className="form-hint">Separate languages with commas</small>
              </div>

              <div className="form-group">
                <label>Travel Preferences</label>
                <input
                  type="text"
                  name="preferences"
                  value={formData.preferences}
                  onChange={handleInputChange}
                  placeholder="Adventure, Culture, Relaxation..."
                />
                <small className="form-hint">Separate interests with commas</small>
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
        </div>
      </div>
    </div>
  );
} 