import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

export const useAdminRealtime = (pageType = null) => {
  const {
    isConnected,
    adminNotifications,
    liveFlags,
    liveKYCRequests,
    liveReviews,
    liveTrips,
    liveLogs,
    joinAdminRoom,
    leaveAdminRoom,
    clearAdminNotifications,
    clearLiveData,
  } = useSocket();

  useEffect(() => {
    // Join admin room when component mounts
    if (isConnected) {
      joinAdminRoom();
    }

    // Leave admin room when component unmounts
    return () => {
      if (isConnected) {
        leaveAdminRoom();
      }
    };
  }, [isConnected, joinAdminRoom, leaveAdminRoom]);

  // Get relevant live data based on page type
  const getLiveData = () => {
    switch (pageType) {
      case 'flags':
        return liveFlags;
      case 'kyc':
        return liveKYCRequests;
      case 'reviews':
        return liveReviews;
      case 'trips':
        return liveTrips;
      case 'logs':
        return liveLogs;
      default:
        return {
          flags: liveFlags,
          kyc: liveKYCRequests,
          reviews: liveReviews,
          trips: liveTrips,
          logs: liveLogs,
        };
    }
  };

  // Get notification count for specific page
  const getNotificationCount = () => {
    switch (pageType) {
      case 'flags':
        return liveFlags.length;
      case 'kyc':
        return liveKYCRequests.length;
      case 'reviews':
        return liveReviews.filter(r => r.flagged).length;
      case 'trips':
        return liveTrips.length;
      case 'logs':
        return liveLogs.length;
      default:
        return adminNotifications.length;
    }
  };

  // Clear notifications for specific page
  const clearPageNotifications = () => {
    if (pageType) {
      clearLiveData(pageType);
    } else {
      clearAdminNotifications();
    }
  };

  // Get summary statistics
  const getSummaryStats = () => {
    return {
      totalFlags: liveFlags.length,
      totalKYCRequests: liveKYCRequests.length,
      totalFlaggedReviews: liveReviews.filter(r => r.flagged).length,
      totalNewTrips: liveTrips.length,
      totalNewLogs: liveLogs.length,
      totalNotifications: adminNotifications.length,
    };
  };

  return {
    isConnected,
    adminNotifications,
    liveFlags,
    liveKYCRequests,
    liveReviews,
    liveTrips,
    liveLogs,
    getLiveData,
    getNotificationCount,
    clearPageNotifications,
    getSummaryStats,
    joinAdminRoom,
    leaveAdminRoom,
    clearAdminNotifications,
    clearLiveData,
  };
}; 