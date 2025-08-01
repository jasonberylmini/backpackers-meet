/**
 * Simple fallback utility for username display
 * This provides immediate protection against null/undefined username errors
 */

/**
 * Safe username getter with fallback
 * @param {Object} user - User object
 * @returns {string} Safe username string
 */
export const safeUsername = (user) => {
  if (!user) return 'Unknown';
  
  // Try username first
  if (user.username && user.username.trim()) {
    return user.username.trim();
  }
  
  // Fallback to name
  if (user.name && user.name.trim()) {
    return user.name.trim();
  }
  
  return 'Unknown';
};

/**
 * Safe first character getter for avatars
 * @param {Object} user - User object
 * @returns {string} First character or fallback
 */
export const safeFirstChar = (user) => {
  const username = safeUsername(user);
  return username === 'Unknown' ? '👤' : username.charAt(0).toUpperCase();
};

/**
 * Safe initials getter
 * @param {Object} user - User object
 * @returns {string} Initials or fallback
 */
export const safeInitials = (user) => {
  const username = safeUsername(user);
  
  if (username === 'Unknown') {
    return '👤';
  }
  
  const words = username.split(' ').filter(word => word.length > 0);
  
  if (words.length === 0) {
    return '👤';
  }
  
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}; 