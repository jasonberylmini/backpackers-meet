import User from '../models/User.js';

/**
 * Generates a unique username from a user's name
 * @param {string} name - The user's full name
 * @returns {Promise<string>} - A unique username
 */
export const generateUniqueUsername = async (name) => {
  if (!name || typeof name !== 'string') {
    throw new Error('Name is required and must be a string');
  }

  // Clean the name: remove special characters, convert to lowercase, replace spaces with dots
  let baseUsername = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, '.') // Replace spaces with dots
    .replace(/\.+/g, '.') // Replace multiple dots with single dot
    .replace(/^\.|\.$/g, ''); // Remove leading/trailing dots

  // If the cleaned name is empty, use a default
  if (!baseUsername) {
    baseUsername = 'user';
  }

  // Check if the base username exists
  let username = baseUsername;
  let counter = 1;

  // Keep trying until we find a unique username
  while (true) {
    const existingUser = await User.findOne({ username });
    
    if (!existingUser) {
      // Username is unique, return it
      return username;
    }

    // Username exists, append a random number
    const randomNum = Math.floor(Math.random() * 1000) + 1;
    username = `${baseUsername}${randomNum}`;
    
    // Prevent infinite loops (though this should never happen in practice)
    if (counter > 100) {
      throw new Error('Unable to generate unique username after 100 attempts');
    }
    counter++;
  }
};

/**
 * Validates if a username is available
 * @param {string} username - The username to check
 * @returns {Promise<boolean>} - True if available, false if taken
 */
export const isUsernameAvailable = async (username) => {
  if (!username || typeof username !== 'string') {
    return false;
  }

  const existingUser = await User.findOne({ username });
  return !existingUser;
}; 