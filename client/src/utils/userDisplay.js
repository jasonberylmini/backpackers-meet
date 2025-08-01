/**
 * Utility functions for handling user display names with fallback mechanisms
 * This handles cases where the username field might be missing from the database
 */

/**
 * Get a display name for a user with proper fallback
 * Priority: username -> name -> 'Unknown User'
 * @param {Object} user - User object
 * @returns {string} Display name
 */
export const getDisplayName = (user) => {
  if (!user) return 'Unknown User';
  
  // First try username
  if (user.username && user.username.trim()) {
    return user.username.trim();
  }
  
  // Fallback to name
  if (user.name && user.name.trim()) {
    return user.name.trim();
  }
  
  // Final fallback
  return 'Unknown User';
};

/**
 * Get initials for a user with proper fallback
 * @param {Object} user - User object
 * @returns {string} Initials (1-2 characters)
 */
export const getDisplayInitials = (user) => {
  const displayName = getDisplayName(user);
  
  if (displayName === 'Unknown User') {
    return '👤';
  }
  
  const words = displayName.split(' ').filter(word => word.length > 0);
  
  if (words.length === 0) {
    return '👤';
  }
  
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  // Return first letter of first and last word
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

/**
 * Get a safe username for display (handles null/undefined)
 * @param {Object} user - User object
 * @returns {string} Safe username string
 */
export const getSafeUsername = (user) => {
  if (!user) return 'Unknown';
  
  if (user.username && user.username.trim()) {
    return user.username.trim();
  }
  
  if (user.name && user.name.trim()) {
    return user.name.trim();
  }
  
  return 'Unknown';
};

/**
 * Get first character of display name for avatars
 * @param {Object} user - User object
 * @returns {string} First character or emoji fallback
 */
export const getDisplayFirstChar = (user) => {
  const displayName = getDisplayName(user);
  
  if (displayName === 'Unknown User') {
    return '👤';
  }
  
  return displayName.charAt(0).toUpperCase();
};

/**
 * Get profile image URL or null if not available
 * @param {Object} user - User object
 * @returns {string|null} Profile image URL or null
 */
export const getProfileImageUrl = (user) => {
  if (!user) return null;
  
  if (user.profileImage && user.profileImage.trim()) {
    // If it's already a full URL, return as is
    if (user.profileImage.startsWith('http://') || user.profileImage.startsWith('https://')) {
      return user.profileImage;
    }
    
    // If it's a relative path, construct the full URL
    // Assuming the backend serves static files from /uploads/
    return `/uploads/${user.profileImage}`;
  }
  
  return null;
};

/**
 * Check if a user has a valid username
 * @param {Object} user - User object
 * @returns {boolean} True if user has a valid username
 */
export const hasValidUsername = (user) => {
  return !!(user && user.username && user.username.trim());
};

/**
 * Get display name for lists (like typing indicators, online users)
 * @param {Array} users - Array of user objects
 * @returns {string} Comma-separated display names
 */
export const getDisplayNamesList = (users) => {
  if (!Array.isArray(users) || users.length === 0) {
    return '';
  }
  
  return users.map(user => getDisplayName(user)).join(', ');
}; 