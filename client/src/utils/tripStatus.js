/**
 * Calculate if a trip is completed based on status and dates
 * This function provides consistent logic across all components
 * 
 * @param {Object} trip - The trip object with status, startDate, and endDate
 * @returns {boolean} - True if trip is completed, false otherwise
 */
export function isTripCompleted(trip) {
  if (!trip) return false;
  
  // If manually marked as completed, return true
  if (trip.status === 'completed') {
    return true;
  }
  
  // Calculate based on dates
  const now = new Date();
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  
  if (now < startDate) return false; // Upcoming
  if (now >= startDate && now <= endDate) return false; // Active
  return true; // Completed (past end date)
}

/**
 * Get the current status of a trip (upcoming, active, completed)
 * 
 * @param {Object} trip - The trip object with status, startDate, and endDate
 * @returns {string} - The trip status
 */
export function getTripStatus(trip) {
  if (!trip) return 'unknown';
  
  // First check if the trip has been manually marked as completed
  if (trip.status === 'completed') {
    return 'completed';
  }
  
  // If not manually completed, calculate based on dates
  const now = new Date();
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  
  if (now < startDate) return 'upcoming';
  if (now >= startDate && now <= endDate) return 'active';
  return 'completed';
}
