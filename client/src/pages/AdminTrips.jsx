import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
import { useAdminRealtime } from '../hooks/useAdminRealtime';
import '../pages/AdminDashboard.css';

const getTripStatus = (trip) => {
  // First check if the trip has been manually marked as completed
  if (trip.status === 'completed') {
    return 'Completed';
  }
  
  // If not manually completed, calculate based on dates
  const startDate = new Date(trip.startDate || trip.date);
  const endDate = new Date(trip.endDate || trip.date);
  const now = new Date();
  if (startDate > now) return 'Upcoming';
  if (endDate < now) return 'Completed';
  return 'Active';
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Active':
      return { bg: '#e3f2fd', text: '#1976d2' };
    case 'Upcoming':
      return { bg: '#fff3e0', text: '#f57c00' };
    case 'Completed':
      return { bg: '#e8f5e8', text: '#388e3c' };
    default:
      return { bg: '#f5f5f5', text: '#666' };
  }
};

const getTripTypeColor = (tripType) => {
  switch (tripType?.toLowerCase()) {
    case 'carpool':
      return { bg: '#e8f5e8', text: '#388e3c' };
    case 'road trip':
      return { bg: '#e3f2fd', text: '#1976d2' };
    case 'rental':
      return { bg: '#fff3e0', text: '#f57c00' };
    case 'group':
      return { bg: '#f3e5f5', text: '#7b1fa2' };
    case 'solo':
      return { bg: '#ffebee', text: '#d32f2f' };
    default:
      return { bg: '#f5f5f5', text: '#666' };
  }
};

const calculateTripDuration = (trip) => {
  if (trip.startDate && trip.endDate) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }
  return 'Single day';
};

const calculateDaysUntilStart = (trip) => {
  const startDate = new Date(trip.startDate || trip.date);
  const now = new Date();
  const diffTime = startDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const formatTripDates = (trip) => {
  if (trip.startDate && trip.endDate) {
    return `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`;
  }
  return trip.date ? new Date(trip.date).toLocaleDateString() : '-';
};

const filterByDateRange = (trip, filter) => {
  const tripDate = new Date(trip.startDate || trip.date);
  const now = new Date();
  
  switch (filter) {
    case 'today':
      return tripDate.toDateString() === now.toDateString();
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return tripDate >= weekAgo;
    case 'month':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return tripDate >= monthAgo;
    case 'upcoming':
      return tripDate > now;
    case 'past':
      return tripDate < now;
    default:
      return true;
  }
};

const filterByBudget = (trip, filter) => {
  const budget = parseInt(trip.budget) || 0;
  
  switch (filter) {
    case 'low':
      return budget <= 1000;
    case 'medium':
      return budget > 1000 && budget <= 5000;
    case 'high':
      return budget > 5000;
    default:
      return true;
  }
};

const filterByMemberCount = (trip, filter) => {
  const memberCount = trip.members?.length || 0;
  
  switch (filter) {
    case 'solo':
      return memberCount <= 1;
    case 'small':
      return memberCount > 1 && memberCount <= 3;
    case 'large':
      return memberCount > 3;
    default:
      return true;
  }
};

const getPopularDestinations = (trips) => {
  const destinations = {};
  trips.forEach(trip => {
    const dest = trip.destination;
    if (dest) {
      destinations[dest] = (destinations[dest] || 0) + 1;
    }
  });
  return Object.entries(destinations)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
};

const getTripTypeDistribution = (trips) => {
  const types = {};
  trips.forEach(trip => {
    const type = trip.tripType || 'Unknown';
    types[type] = (types[type] || 0) + 1;
  });
  return types;
};

export default function AdminTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tripType, setTripType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState('');
  const [budgetFilter, setBudgetFilter] = useState('');
  const [memberCountFilter, setMemberCountFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTrip, setModalTrip] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const [selectedTrips, setSelectedTrips] = useState([]);
  const [bulkAction, setBulkAction] = useState('');

  // Real-time functionality
  const { getLiveData, getNotificationCount } = useAdminRealtime('trips');

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const params = { page, limit };
      if (search) params.search = search;
      if (tripType) params.tripType = tripType;
      const res = await axios.get('/api/admin/trips', { headers, params });
      setTrips(res.data.trips || res.data);
      setTotal(res.data.total || res.data.length);
      setLoading(false);
    } catch (err) {
      setError('Failed to load trips.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [page, search, tripType]);

  // Real-time trip updates
  useEffect(() => {
    const liveData = getLiveData();
    if (liveData.trips && liveData.trips.length > 0) {
      setTrips(prevTrips => [...liveData.trips, ...prevTrips]);
      toast.success(`New trip created: ${liveData.trips[0].destination}`);
    }
  }, [getLiveData]);

  const handleDelete = async (tripId) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/admin/trips/${tripId}`, { headers });
      toast.success('Trip deleted successfully.');
      fetchTrips();
    } catch (err) {
      toast.error('Failed to delete trip.');
    }
  };

  // Bulk trip operations
  const handleBulkTripAction = async () => {
    if (!bulkAction || selectedTrips.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post('/api/admin/bulk-trips', {
        tripIds: selectedTrips,
        action: bulkAction
      }, { headers });
      
      toast.success(`${selectedTrips.length} trips ${bulkAction}ed!`);
      setSelectedTrips([]);
      setBulkAction('');
      fetchTrips();
    } catch (err) {
      toast.error('Failed to perform bulk action.');
    }
  };

  // Send trip notification
  const sendTripNotification = async (tripId) => {
    const message = prompt('Enter trip notification message:');
    if (!message) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`/api/notifications/send/${tripId}`, {
        type: 'info',
        title: 'Trip Update',
        message: message
      }, { headers });
      toast.success('Trip notification sent!');
    } catch (err) {
      toast.error('Failed to send notification.');
    }
  };

  const openTripModal = (trip) => {
    setModalTrip(trip);
    setModalOpen(true);
  };

  const closeTripModal = () => {
    setModalOpen(false);
    setModalTrip(null);
    setModalImage(null);
  };

  const openImageModal = (imagePath) => {
    setModalImage(imagePath);
  };

  // Enhanced filtering
  const filteredTrips = trips.filter(trip => {
    const matchesSearch = trip.destination?.toLowerCase().includes(search.toLowerCase()) ||
                         trip.creator?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = tripType ? trip.tripType === tripType : true;
    const matchesStatus = statusFilter ? getTripStatus(trip) === statusFilter : true;
    const matchesDateRange = dateRangeFilter ? filterByDateRange(trip, dateRangeFilter) : true;
    const matchesBudget = budgetFilter ? filterByBudget(trip, budgetFilter) : true;
    const matchesMemberCount = memberCountFilter ? filterByMemberCount(trip, memberCountFilter) : true;
    
    return matchesSearch && matchesType && matchesStatus && matchesDateRange && matchesBudget && matchesMemberCount;
  });

  // Enhanced statistics
  const enhancedTripStats = {
    totalTrips: trips.length,
    activeTrips: trips.filter(t => getTripStatus(t) === 'Active').length,
    completedTrips: trips.filter(t => getTripStatus(t) === 'Completed').length,
    upcomingTrips: trips.filter(t => getTripStatus(t) === 'Upcoming').length,
    avgMembers: trips.length > 0 ? (trips.reduce((sum, t) => sum + (t.members?.length || 0), 0) / trips.length).toFixed(1) : 0,
    totalBudget: trips.reduce((sum, t) => sum + (parseInt(t.budget) || 0), 0),
    avgBudget: trips.length > 0 ? (trips.reduce((sum, t) => sum + (parseInt(t.budget) || 0), 0) / trips.length).toFixed(0) : 0,
    newTripsToday: trips.filter(t => {
      const today = new Date();
      const tripDate = new Date(t.createdAt);
      return tripDate.toDateString() === today.toDateString();
    }).length,
    popularDestinations: getPopularDestinations(trips),
    tripTypeDistribution: getTripTypeDistribution(trips)
  };

  // Enhanced table columns
  const columns = [
    { 
      key: 'select', 
      label: '', 
      sortable: false,
      render: (trip) => (
        <input
          type="checkbox"
          checked={selectedTrips.includes(trip._id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedTrips([...selectedTrips, trip._id]);
            } else {
              setSelectedTrips(selectedTrips.filter(id => id !== trip._id));
            }
          }}
        />
      )
    },
    { 
      key: 'destination', 
      label: 'Destination', 
      sortable: true,
      render: (trip) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: '50%', 
            backgroundColor: '#1976d2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold'
          }}>
            {trip.destination?.charAt(0).toUpperCase() || 'T'}
          </div>
          <div>
            <div style={{ fontWeight: 'bold' }}>{trip.destination || 'Unknown'}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{trip.creator?.name}</div>
          </div>
        </div>
      )
    },
    { 
      key: 'date', 
      label: 'Trip Dates', 
      sortable: true,
      render: (trip) => (
        <div>
          <div>{formatTripDates(trip)}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {calculateDaysUntilStart(trip)} days away
          </div>
        </div>
      )
    },
    { 
      key: 'budget', 
      label: 'Budget', 
      sortable: true,
      render: (trip) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{trip.budget ? `₹${trip.budget}` : '-'}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {trip.members?.length || 0} members
          </div>
        </div>
      )
    },
    { 
      key: 'tripType', 
      label: 'Type', 
      sortable: true,
      render: (trip) => (
        <span style={{ 
          padding: '4px 8px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 'bold',
          backgroundColor: getTripTypeColor(trip.tripType).bg,
          color: getTripTypeColor(trip.tripType).text
        }}>
          {trip.tripType || 'Not specified'}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true,
      render: (trip) => (
        <span style={{ 
          padding: '4px 8px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 'bold',
          backgroundColor: getStatusColor(getTripStatus(trip)).bg,
          color: getStatusColor(getTripStatus(trip)).text
        }}>
          {getTripStatus(trip)}
        </span>
      )
    }
  ];

  // Enhanced table actions
  const actions = (trip) => (
    <div style={{ display: 'flex', gap: 8 }}>
      <button 
        onClick={() => openTripModal(trip)} 
        style={{ 
          padding: '6px 12px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e1e5e9',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12
        }}
      >
        View
      </button>
      <button 
        onClick={() => handleDelete(trip._id)} 
        style={{ 
          padding: '6px 12px',
          backgroundColor: '#d32f2f',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12
        }}
      >
        Delete
      </button>
    </div>
  );

  // Enhanced trip modal content
  const renderEnhancedTripModal = (trip) => (
    <div style={{ padding: 20 }}>
      {/* Trip Overview Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <h3 style={{ marginBottom: 15, color: '#333' }}>Trip Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><strong>Destination:</strong> {trip.destination}</div>
            <div><strong>Description:</strong> {trip.description || 'No description'}</div>
            <div><strong>Type:</strong> 
              <span style={{ 
                padding: '4px 8px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 'bold',
                backgroundColor: getTripTypeColor(trip.tripType).bg,
                color: getTripTypeColor(trip.tripType).text
              }}>
                {trip.tripType || 'Not specified'}
              </span>
            </div>
            <div><strong>Budget:</strong> {trip.budget ? `₹${trip.budget}` : 'Not specified'}</div>
            <div><strong>Status:</strong> 
              <span style={{ 
                padding: '4px 8px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 'bold',
                backgroundColor: getStatusColor(getTripStatus(trip)).bg,
                color: getStatusColor(getTripStatus(trip)).text
              }}>
                {getTripStatus(trip)}
              </span>
            </div>
          </div>
        </div>
        <div>
          <h3 style={{ marginBottom: 15, color: '#333' }}>Trip Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><strong>Created:</strong> {new Date(trip.createdAt).toLocaleString()}</div>
            <div><strong>Duration:</strong> {calculateTripDuration(trip)}</div>
            <div><strong>Days Until Start:</strong> {calculateDaysUntilStart(trip)}</div>
            <div><strong>Member Capacity:</strong> {trip.maxMembers || 'Unlimited'}</div>
            <div><strong>Current Members:</strong> {trip.members?.length || 0}</div>
          </div>
        </div>
      </div>
      
      {/* Trip Timeline Section */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 15, color: '#333' }}>Trip Timeline</h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 20, 
          padding: 16, 
          backgroundColor: '#f8f9fa', 
          borderRadius: 8 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2' }}>
              {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'TBD'}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>Start Date</div>
          </div>
          <div style={{ flex: 1, height: 2, backgroundColor: '#e1e5e9' }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#388e3c' }}>
              {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : 'TBD'}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>End Date</div>
          </div>
        </div>
      </div>
      
      {/* Members Section */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 15, color: '#333' }}>Trip Members ({trip.members?.length || 0})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {trip.members && trip.members.length > 0 ? (
            trip.members.map((member, index) => (
              <div key={member._id || index} style={{ 
                padding: 12, 
                backgroundColor: '#f8f9fa', 
                borderRadius: 8,
                border: '1px solid #e1e5e9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: '50%', 
                    backgroundColor: '#1976d2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    {member.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{member.name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>{member.email}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
              No members yet
            </div>
          )}
        </div>
      </div>
      
      {/* Trip Images Section */}
      {trip.images && trip.images.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 15, color: '#333' }}>Trip Images ({trip.images.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            {trip.images.map((image, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img 
                  src={image} 
                  alt={`Trip image ${index + 1}`} 
                  style={{ 
                    width: '100%', 
                    height: 120, 
                    objectFit: 'cover', 
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                  onClick={() => openImageModal(image)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button 
          onClick={() => handleDelete(trip._id)}
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 'bold'
          }}
        >
          🗑️ Delete Trip
        </button>
        <button 
          onClick={() => sendTripNotification(trip._id)}
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          📧 Send Message
        </button>
        <button 
          onClick={() => closeTripModal()}
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          Close
        </button>
      </div>
    </div>
  );

  const pageCount = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <h1 style={{ marginBottom: 24, color: '#333' }}>Trip Management</h1>
      
      {/* Enhanced Statistics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#e3f2fd', 
          borderRadius: 8, 
          border: '1px solid #bbdefb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1976d2' }}>{enhancedTripStats.totalTrips}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Total Trips</div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#e3f2fd', 
          borderRadius: 8, 
          border: '1px solid #bbdefb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1976d2' }}>{enhancedTripStats.activeTrips}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Active Trips</div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#e8f5e8', 
          borderRadius: 8, 
          border: '1px solid #a5d6a7',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#388e3c' }}>{enhancedTripStats.completedTrips}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Completed</div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#fff3e0', 
          borderRadius: 8, 
          border: '1px solid #ffcc02',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f57c00' }}>{enhancedTripStats.upcomingTrips}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Upcoming</div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#f3e5f5', 
          borderRadius: 8, 
          border: '1px solid #ce93d8',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#7b1fa2' }}>{enhancedTripStats.avgMembers}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Avg Members</div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#e0f2f1', 
          borderRadius: 8, 
          border: '1px solid #80cbc4',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#00695c' }}>₹{enhancedTripStats.avgBudget}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Avg Budget</div>
        </div>
      </div>

      {/* Trip Analytics */}
      <div style={{ 
        padding: 20, 
        backgroundColor: '#fff', 
        borderRadius: 8, 
        border: '1px solid #e1e5e9',
        marginBottom: 24
      }}>
        <h3 style={{ marginBottom: 16, color: '#333' }}>Trip Analytics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#e8f5e8', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#388e3c' }}>₹{enhancedTripStats.totalBudget}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Total Budget</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fff3e0', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#f57c00' }}>₹{enhancedTripStats.avgBudget}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Avg Budget</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#e3f2fd', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2' }}>{enhancedTripStats.newTripsToday}</div>
            <div style={{ fontSize: 12, color: '#666' }}>New Today</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#f3e5f5', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#7b1fa2' }}>{enhancedTripStats.upcomingTrips}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Upcoming</div>
          </div>
        </div>
        
        {/* Popular Destinations */}
        <div style={{ marginTop: 20 }}>
          <h4 style={{ marginBottom: 12, color: '#333' }}>Popular Destinations</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {enhancedTripStats.popularDestinations.slice(0, 5).map((dest, index) => (
              <span key={index} style={{ 
                padding: '6px 12px',
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                borderRadius: 16,
                fontSize: 12,
                fontWeight: 'bold'
              }}>
                {dest.name} ({dest.count})
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 24, 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input 
          type="text" 
          placeholder="Search destinations..." 
          value={search} 
          onChange={e => { setSearch(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9', 
            minWidth: 250,
            fontSize: 14
          }}
        />
        <select 
          value={tripType} 
          onChange={e => { setTripType(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Types</option>
          <option value="carpool">Carpool</option>
          <option value="road trip">Road Trip</option>
          <option value="rental">Rental</option>
          <option value="group">Group</option>
          <option value="solo">Solo</option>
          <option value="business">Business</option>
        </select>
        <select 
          value={statusFilter} 
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Completed">Completed</option>
        </select>
        <select 
          value={dateRangeFilter} 
          onChange={e => { setDateRangeFilter(e.target.value); setPage(1); }}
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Dates</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </select>
        <select 
          value={budgetFilter} 
          onChange={e => { setBudgetFilter(e.target.value); setPage(1); }}
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Budgets</option>
          <option value="low">Low (≤₹1000)</option>
          <option value="medium">Medium (₹1000-5000)</option>
          <option value="high">High (&gt;₹5000)</option>
        </select>
        <select 
          value={memberCountFilter} 
          onChange={e => { setMemberCountFilter(e.target.value); setPage(1); }}
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Sizes</option>
          <option value="solo">Solo (1 member)</option>
          <option value="small">Small (2-3 members)</option>
          <option value="large">Large (&gt;3 members)</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedTrips.length > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          marginBottom: 16, 
          padding: 16, 
          backgroundColor: '#f8f9fa', 
          borderRadius: 8,
          alignItems: 'center'
        }}>
          <span style={{ fontWeight: 'bold' }}>
            {selectedTrips.length} trip(s) selected
          </span>
          <select 
            value={bulkAction} 
            onChange={e => setBulkAction(e.target.value)}
            style={{ 
              padding: 8, 
              borderRadius: 4, 
              border: '1px solid #e1e5e9',
              fontSize: 14
            }}
          >
            <option value="">Select Action</option>
            <option value="delete">Delete Selected</option>
          </select>
          <button 
            onClick={handleBulkTripAction}
            disabled={!bulkAction}
            style={{ 
              padding: '8px 16px',
              backgroundColor: bulkAction ? '#d32f2f' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: bulkAction ? 'pointer' : 'not-allowed',
              fontSize: 14
            }}
          >
            Apply
          </button>
          <button 
            onClick={() => setSelectedTrips([])}
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      <AdminTable
        columns={columns}
        data={filteredTrips}
        loading={loading}
        error={error}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        onSort={() => {}}
        sortKey={''}
        sortDirection={'asc'}
        actions={actions}
        emptyMessage="No trips found."
      />

      {/* Enhanced Trip Details Modal */}
      <AdminModal open={modalOpen} onClose={closeTripModal} title={`Trip Details - ${modalTrip?.destination}`}>
        {modalTrip && renderEnhancedTripModal(modalTrip)}
      </AdminModal>

      {/* Image Modal */}
      <AdminModal open={!!modalImage} onClose={() => setModalImage(null)} title="Trip Image">
        {modalImage && (
          <div style={{ textAlign: 'center' }}>
            <img 
              src={modalImage} 
              alt="Trip" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '70vh',
                border: '1px solid #ddd',
                borderRadius: 4
              }}
            />
          </div>
        )}
      </AdminModal>
    </AdminLayout>
  );
} 