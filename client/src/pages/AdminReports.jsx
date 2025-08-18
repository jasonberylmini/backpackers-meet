import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
import { useAdminRealtime } from '../hooks/useAdminRealtime';
import '../pages/AdminDashboard.css';

// Helper functions
const getFlagStatus = (flag) => {
  if (flag.resolved) return 'resolved';
  if (flag.dismissed) return 'dismissed';
  if (flag.escalated) return 'escalated';
  return 'pending';
};

const getStatusColor = (status) => {
  switch (status) {
    case 'resolved': return '#28a745';
    case 'dismissed': return '#6c757d';
    case 'escalated': return '#ffc107';
    case 'pending': return '#007bff';
    default: return '#6c757d';
  }
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'high': return '#dc3545';
    case 'medium': return '#ffc107';
    case 'low': return '#28a745';
    default: return '#6c757d';
  }
};

const formatDate = (date) => {
  const reviewDate = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now - reviewDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Today';
  if (diffDays === 2) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays - 1} days ago`;
  return reviewDate.toLocaleDateString();
};

const filterByDateRange = (item, filter) => {
  if (!filter) return true;
  
  const itemDate = new Date(item.createdAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  switch (filter) {
    case 'today':
      return itemDate >= today;
    case 'week':
      return itemDate >= weekAgo;
    case 'month':
      return itemDate >= monthAgo;
    default:
      return true;
  }
};

const filterByStatus = (item, filter) => {
  if (!filter) return true;
  const status = getFlagStatus(item);
  return status === filter;
};

const filterBySeverity = (item, filter) => {
  if (!filter) return true;
  return item.severity === filter;
};

const REPORT_TABS = [
  { key: 'flag', label: 'Flag Reports', icon: '🚩' },
  { key: 'trip', label: 'Trip Reports', icon: '🧳' },
  { key: 'user', label: 'User Reports', icon: '👤' },
];

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('flag');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiOnly, setAiOnly] = useState(true);
  
  // Data states
  const [flagStats, setFlagStats] = useState({});
  const [tripStats, setTripStats] = useState({});
  const [userStats, setUserStats] = useState({});
  const [flags, setFlags] = useState([]);
  const [trips, setTrips] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [modalType, setModalType] = useState('');
  
  // Bulk operations
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  
  // Real-time updates
  const { isConnected, liveFlags } = useAdminRealtime();

  // Fetch flag statistics and data
  const fetchFlagData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch flag statistics
      const statsRes = await axios.get('/api/admin/flag-stats', { headers });
      setFlagStats(statsRes.data);
      
      // Fetch flags with filters
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;
      
      const flagsRes = await axios.get('/api/admin/flags', { headers, params });
      let data = flagsRes.data.flags || [];
      // Show only items AI couldn't auto-resolve when aiOnly is on
      if (aiOnly) {
        data = data.filter(f => f.severity === 'high' || f.escalated || f.reason?.toLowerCase().includes('manual'));
      }
      setFlags(data);
    } catch (err) {
      console.error('Failed to fetch flag data:', err);
    }
  };

  // Fetch trip statistics and data
  const fetchTripData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch trip statistics
      const statsRes = await axios.get('/api/admin/trip-stats', { headers });
      setTripStats(statsRes.data);
      
      // Fetch reported trips
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      
      const tripsRes = await axios.get('/api/admin/reported-trips', { headers, params });
      setTrips(tripsRes.data.trips);
    } catch (err) {
      console.error('Failed to fetch trip data:', err);
    }
  };

  // Fetch user statistics and data
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch user statistics
      const statsRes = await axios.get('/api/admin/user-stats', { headers });
      setUserStats(statsRes.data);
      
      // Fetch reported users
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      
      const usersRes = await axios.get('/api/admin/reported-users', { headers, params });
      setUsers(usersRes.data.users);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    if (activeTab === 'flag') {
      fetchFlagData();
    } else if (activeTab === 'trip') {
      fetchTripData();
    } else if (activeTab === 'user') {
      fetchUserData();
    }
    
    setLoading(false);
  }, [activeTab, page, statusFilter, severityFilter, typeFilter, search, aiOnly]);

  // Real-time updates
  useEffect(() => {
    if (liveFlags.length > 0 && activeTab === 'flag') {
      setFlags(prev => {
        const newFlags = [...prev];
        liveFlags.forEach(newFlag => {
          const existingIndex = newFlags.findIndex(f => f._id === newFlag._id);
          if (existingIndex >= 0) {
            newFlags[existingIndex] = newFlag;
          } else {
            newFlags.unshift(newFlag);
          }
        });
        return newFlags.slice(0, limit);
      });
      fetchFlagData();
    }
  }, [liveFlags]);

  // Filter data based on current tab
  const getFilteredData = () => {
    let data = [];
    if (activeTab === 'flag') data = flags;
    else if (activeTab === 'trip') data = trips;
    else if (activeTab === 'user') data = users;
    
    return data.filter(item => {
      const matchesSearch = !search || 
        item.reason?.toLowerCase().includes(search.toLowerCase()) ||
        item.targetName?.toLowerCase().includes(search.toLowerCase()) ||
        item.targetEmail?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = filterByStatus(item, statusFilter);
      const matchesSeverity = filterBySeverity(item, severityFilter);
      const matchesDate = filterByDateRange(item, dateFilter);
      
      return matchesSearch && matchesStatus && matchesSeverity && matchesDate;
    });
  };

  // Bulk operations
  const handleBulkAction = async () => {
    if (!bulkAction || selectedItems.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      let endpoint = '';
      let data = { itemIds: selectedItems, action: bulkAction };
      
      if (activeTab === 'flag') {
        endpoint = '/api/admin/bulk-flags';
        data = { flagIds: selectedItems, action: bulkAction };
      } else if (activeTab === 'trip') {
        endpoint = '/api/admin/bulk-trips';
        data = { tripIds: selectedItems, action: bulkAction };
      } else if (activeTab === 'user') {
        endpoint = '/api/admin/bulk-users';
        data = { userIds: selectedItems, action: bulkAction };
      }
      
      await axios.post(endpoint, data, { headers });
      
      toast.success(`${selectedItems.length} ${activeTab}s ${bulkAction}ed!`);
      setSelectedItems([]);
      setBulkAction('');
      
      // Refresh data
      if (activeTab === 'flag') fetchFlagData();
      else if (activeTab === 'trip') fetchTripData();
      else if (activeTab === 'user') fetchUserData();
    } catch (err) {
      toast.error('Failed to perform bulk action.');
    }
  };

  // Individual actions
  const handleResolve = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (activeTab === 'flag') {
        await axios.patch(`/api/admin/flags/${itemId}/resolve`, {}, { headers });
        toast.success('Flag resolved successfully!');
        fetchFlagData();
      } else {
        toast.error('Resolve action not available for this item type.');
      }
    } catch (err) {
      toast.error('Failed to resolve item.');
    }
  };

  const handleDismiss = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (activeTab === 'flag') {
        await axios.patch(`/api/admin/flags/${itemId}/dismiss`, {}, { headers });
        toast.success('Flag dismissed successfully!');
        fetchFlagData();
      } else {
        toast.error('Dismiss action not available for this item type.');
      }
    } catch (err) {
      toast.error('Failed to dismiss item.');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (activeTab === 'trip') {
        await axios.delete(`/api/admin/trips/${itemId}`, { headers });
        toast.success('Trip deleted successfully!');
        fetchTripData();
      } else if (activeTab === 'user') {
        // For users, we might want to ban instead of delete
        toast.error('Delete action not available for users. Use ban instead.');
      } else if (activeTab === 'flag') {
        await axios.post('/api/admin/bulk-flags', { flagIds: [itemId], action: 'delete' }, { headers });
        toast.success('Flag deleted.');
        fetchFlagData();
      }
    } catch (err) {
      toast.error('Failed to delete item.');
    }
  };

  const handleBan = async (itemId) => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`/api/admin/users/${itemId}/ban`, {}, { headers });
      toast.success('User banned successfully!');
      fetchUserData();
    } catch (err) {
      toast.error('Failed to ban user.');
    }
  };

  const handleUnban = async (itemId) => {
    if (!window.confirm('Are you sure you want to unban this user?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`/api/admin/users/${itemId}/unban`, {}, { headers });
      toast.success('User unbanned successfully!');
      fetchUserData();
    } catch (err) {
      toast.error('Failed to unban user.');
    }
  };

  const handleWarn = async (itemId) => {
    if (!window.confirm('Are you sure you want to warn this user?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`/api/admin/users/${itemId}/warn`, {}, { headers });
      toast.success('User warned successfully!');
      fetchUserData();
    } catch (err) {
      toast.error('Failed to warn user.');
    }
  };

  const handleSuspend = async (itemId) => {
    if (!window.confirm('Are you sure you want to suspend this trip?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`/api/admin/trips/${itemId}/suspend`, {}, { headers });
      toast.success('Trip suspended successfully!');
      fetchTripData();
    } catch (err) {
      toast.error('Failed to suspend trip.');
    }
  };

  // Modal functions
  const openModal = (data, type) => {
    setModalData(data);
    setModalType(type);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalData(null);
    setModalType('');
  };

  // Enhanced columns for flags
  const flagColumns = [
    { 
      key: 'type', 
      label: 'Type', 
      sortable: true, 
      render: f => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: (
              f.flagType === 'user' ? '#007bff' :
              f.flagType === 'trip' ? '#28a745' :
              f.flagType === 'review' ? '#ffc107' :
              f.flagType === 'post' ? '#6f42c1' :
              f.flagType === 'comment' ? '#17a2b8' :
              f.flagType === 'message' ? '#fd7e14' : '#6c757d'
            ),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold'
          }}>
            {f.flagType === 'user' ? 'U' : f.flagType === 'trip' ? 'T' : f.flagType === 'review' ? 'R' : f.flagType === 'post' ? 'P' : f.flagType === 'comment' ? 'C' : 'M'}
          </div>
          <span style={{ textTransform: 'capitalize' }}>{f.flagType}</span>
        </div>
      )
    },
    { 
      key: 'target', 
      label: 'Target', 
      sortable: true, 
      render: f => {
        let targetName = 'Unknown';
        let targetMeta = f.flagType;
        
        if (f.targetId) {
          if (f.flagType === 'user') {
            targetName = f.targetId.name || 'Unknown User';
            targetMeta = f.targetId.email || 'No email';
          } else if (f.flagType === 'trip') {
            targetName = f.targetId.destination || 'Unknown Trip';
            targetMeta = f.targetId.creator?.name || 'Unknown Creator';
          } else if (f.flagType === 'review') {
            targetName = f.targetId.feedback?.substring(0, 30) || 'Unknown Review';
            targetMeta = f.targetId.rating ? `${f.targetId.rating}★` : 'No rating';
          } else if (f.flagType === 'post') {
            targetName = f.targetId.content?.substring(0, 40) || 'Deleted Post';
            targetMeta = f.targetId.author?.name || 'Unknown Author';
          } else if (f.flagType === 'comment') {
            targetName = f.targetId.content?.substring(0, 40) || 'Deleted Comment';
            targetMeta = f.targetId.author?.name || 'Unknown Author';
          } else if (f.flagType === 'message') {
            targetName = f.targetId.text?.substring(0, 40) || 'Deleted Message';
            targetMeta = f.targetId.sender?.name || 'Unknown Sender';
          }
        }
        
        return (
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>
              {targetName}
            </div>
            <div style={{ fontSize: 12, color: '#6c757d' }}>
              {targetMeta}
            </div>
          </div>
        );
      }
    },
    { 
      key: 'ai',
      label: 'AI Analysis',
      sortable: false,
      render: f => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 260 }}>
          {(f.reason || '').split(':').pop().split(',').map((tag, idx) => (
            <span key={idx} style={{
              background: '#eef2ff',
              color: '#3f51b5',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 11
            }}>
              {tag.trim()}
            </span>
          ))}
        </div>
      )
    },
    { 
      key: 'reason', 
      label: 'Reason', 
      sortable: true, 
      render: f => (
        <div style={{ maxWidth: 200 }}>
          <div style={{ fontSize: 14, color: '#495057' }}>
            {f.reason}
          </div>
          {f.details && (
            <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
              {f.details.substring(0, 50)}...
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'severity', 
      label: 'Severity', 
      sortable: true, 
      render: f => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: getSeverityColor(f.severity)
          }} />
          <span style={{ 
            color: getSeverityColor(f.severity),
            fontWeight: 'bold',
            fontSize: 12,
            textTransform: 'uppercase'
          }}>
            {f.severity || 'medium'}
          </span>
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true, 
      render: f => {
        const status = getFlagStatus(f);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: getStatusColor(status)
            }} />
            <span style={{ 
              color: getStatusColor(status),
              fontWeight: 'bold',
              fontSize: 12,
              textTransform: 'uppercase'
            }}>
              {status}
            </span>
          </div>
        );
      }
    },
    { 
      key: 'reporter', 
      label: 'Reporter', 
      sortable: true, 
      render: f => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>
            {f.flaggedBy?.name || 'Anonymous'}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {f.flaggedBy?.email || 'No email'}
          </div>
        </div>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Date', 
      sortable: true, 
      render: f => (
        <div>
          <div style={{ fontSize: 14, fontWeight: 'bold' }}>
            {formatDate(f.createdAt)}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {new Date(f.createdAt).toLocaleDateString()}
          </div>
        </div>
      )
    },
  ];

  // Enhanced actions for flags
  const flagActions = (flag) => (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <button 
        onClick={() => openModal(flag, 'flag')}
        style={{ 
          padding: '4px 8px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        View
      </button>
      {getFlagStatus(flag) === 'pending' && (
        <>
          <button 
            onClick={() => handleResolve(flag._id)}
            style={{ 
              padding: '4px 8px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Resolve
          </button>
          <button 
            onClick={() => handleDismiss(flag._id)}
            style={{ 
              padding: '4px 8px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Dismiss
          </button>
        </>
      )}
    </div>
  );

  // Trip columns
  const tripColumns = [
    { 
      key: 'destination', 
      label: 'Destination', 
      sortable: true, 
      render: t => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>
            {t.destination}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {t.tripType}
          </div>
        </div>
      )
    },
    { 
      key: 'creator', 
      label: 'Creator', 
      sortable: true, 
      render: t => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>
            {t.creator?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {t.creator?.email || '-'}
          </div>
        </div>
      )
    },
    { 
      key: 'dates', 
      label: 'Dates', 
      sortable: true, 
      render: t => (
        <div>
          <div style={{ fontSize: 14 }}>
            {t.startDate} - {t.endDate}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {t.status}
          </div>
        </div>
      )
    },
    { 
      key: 'budget', 
      label: 'Budget', 
      sortable: true, 
      render: t => (
        <div style={{ fontWeight: 'bold', color: '#28a745' }}>
          ₹{t.budget}
        </div>
      )
    },
    { 
      key: 'description', 
      label: 'Description', 
      sortable: true, 
      render: t => (
        <div style={{ maxWidth: 200 }}>
          <div style={{ fontSize: 14, color: '#495057' }}>
            {t.description?.substring(0, 50)}...
          </div>
        </div>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Created', 
      sortable: true, 
      render: t => (
        <div>
          <div style={{ fontSize: 14, fontWeight: 'bold' }}>
            {formatDate(t.createdAt)}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {new Date(t.createdAt).toLocaleDateString()}
          </div>
        </div>
      )
    },
  ];

  // Trip actions
  const tripActions = (trip) => (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <button 
        onClick={() => openModal(trip, 'trip')}
        style={{ 
          padding: '4px 8px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        View
      </button>
      {trip.status === 'active' && (
        <button 
          onClick={() => handleSuspend(trip._id)}
          style={{ 
            padding: '4px 8px',
            backgroundColor: '#ffc107',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          Suspend
        </button>
      )}
      <button 
        onClick={() => handleDelete(trip._id)}
        style={{ 
          padding: '4px 8px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        Delete
      </button>
    </div>
  );

  // User columns
  const userColumns = [
    { 
      key: 'name', 
      label: 'User', 
      sortable: true, 
      render: u => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>
            {u.name}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {u.email}
          </div>
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      sortable: true, 
      render: u => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: u.status === 'active' ? '#28a745' : '#dc3545'
          }} />
          <span style={{ 
            color: u.status === 'active' ? '#28a745' : '#dc3545',
            fontWeight: 'bold',
            fontSize: 12,
            textTransform: 'uppercase'
          }}>
            {u.status || 'active'}
          </span>
        </div>
      )
    },
    { 
      key: 'verificationStatus', 
      label: 'Verification', 
      sortable: true, 
      render: u => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: u.verificationStatus === 'verified' ? '#28a745' : '#ffc107'
          }} />
          <span style={{ 
            color: u.verificationStatus === 'verified' ? '#28a745' : '#ffc107',
            fontWeight: 'bold',
            fontSize: 12,
            textTransform: 'uppercase'
          }}>
            {u.verificationStatus || 'pending'}
          </span>
        </div>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Joined', 
      sortable: true, 
      render: u => (
        <div>
          <div style={{ fontSize: 14, fontWeight: 'bold' }}>
            {formatDate(u.createdAt)}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {new Date(u.createdAt).toLocaleDateString()}
          </div>
        </div>
      )
    },
  ];

  // User actions
  const userActions = (user) => (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      <button 
        onClick={() => openModal(user, 'user')}
        style={{ 
          padding: '4px 8px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        View
      </button>
      {user.status === 'active' && (
        <button 
          onClick={() => handleBan(user._id)}
          style={{ 
            padding: '4px 8px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          Ban
        </button>
      )}
      {user.status === 'banned' && (
        <button 
          onClick={() => handleUnban(user._id)}
          style={{ 
            padding: '4px 8px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          Unban
        </button>
      )}
      <button 
        onClick={() => handleWarn(user._id)}
        style={{ 
          padding: '4px 8px',
          backgroundColor: '#ffc107',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        Warn
      </button>
    </div>
  );

  // Enhanced modal content
  const renderEnhancedModal = (data, type) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Left Column - Details */}
      <div>
        <h3 style={{ marginBottom: 16, color: '#495057' }}>Report Details</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 'bold', color: '#495057' }}>Type:</label>
          <div style={{ marginTop: 4 }}>
            <span style={{
              backgroundColor: type === 'user' ? '#007bff' : type === 'trip' ? '#28a745' : '#ffc107',
              color: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {type} Report
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 'bold', color: '#495057' }}>Reason:</label>
          <div style={{ 
            marginTop: 4, 
            padding: 12, 
            backgroundColor: '#f8f9fa', 
            borderRadius: 6,
            lineHeight: 1.5,
            color: '#495057'
          }}>
            {data.reason}
          </div>
        </div>

        {data.details && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 'bold', color: '#495057' }}>Details:</label>
            <div style={{ 
              marginTop: 4, 
              padding: 12, 
              backgroundColor: '#f8f9fa', 
              borderRadius: 6,
              lineHeight: 1.5,
              color: '#495057'
            }}>
              {data.details}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 'bold', color: '#495057' }}>Severity:</label>
          <div style={{ marginTop: 4 }}>
            <span style={{
              backgroundColor: getSeverityColor(data.severity),
              color: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {data.severity || 'medium'}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 'bold', color: '#495057' }}>Status:</label>
          <div style={{ marginTop: 4 }}>
            <span style={{
              backgroundColor: getStatusColor(getFlagStatus(data)),
              color: 'white',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {getFlagStatus(data)}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 'bold', color: '#495057' }}>Reported:</label>
          <div style={{ marginTop: 4, color: '#6c757d' }}>
            {new Date(data.createdAt).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Right Column - Target & Actions */}
      <div>
        <h3 style={{ marginBottom: 16, color: '#495057' }}>Target Information</h3>
        
        {/* Target Info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ 
            padding: 12, 
            backgroundColor: '#f8f9fa', 
            borderRadius: 6 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: type === 'user' ? '#007bff' : type === 'trip' ? '#28a745' : '#ffc107',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold'
              }}>
                {type === 'user' ? 'U' : type === 'trip' ? 'T' : 'R'}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                  {(() => {
                    if (data.targetId) {
                      if (type === 'user') {
                        return data.targetId.name || 'Unknown User';
                      } else if (type === 'trip') {
                        return data.targetId.destination || 'Unknown Trip';
                      } else if (type === 'review') {
                        return data.targetId.feedback?.substring(0, 30) || 'Unknown Review';
                      }
                    }
                    return 'Unknown';
                  })()}
                </div>
                <div style={{ color: '#6c757d', fontSize: 14 }}>
                  {(() => {
                    if (data.targetId) {
                      if (type === 'user') {
                        return data.targetId.email || 'No email';
                      } else if (type === 'trip') {
                        return data.targetId.creator?.name || 'Unknown Creator';
                      } else if (type === 'review') {
                        return data.targetId.rating ? `${data.targetId.rating}★` : 'No rating';
                      }
                    }
                    return type || 'Unknown';
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reporter Info */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ marginBottom: 8, color: '#495057' }}>Reporter</h4>
          <div style={{ 
            padding: 12, 
            backgroundColor: '#f8f9fa', 
            borderRadius: 6 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: '#6c757d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold'
              }}>
                {data.flaggedBy?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                  {data.flaggedBy?.name || 'Anonymous'}
                </div>
                <div style={{ color: '#6c757d', fontSize: 14 }}>
                  {data.flaggedBy?.email || 'No email provided'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: 24 }}>
          <h4 style={{ marginBottom: 12, color: '#495057' }}>Actions</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {getFlagStatus(data) === 'pending' && (
              <>
                <button 
                  onClick={() => handleResolve(data._id)}
                  style={{ 
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  ✅ Resolve Report
                </button>
                <button 
                  onClick={() => handleDismiss(data._id)}
                  style={{ 
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  ❌ Dismiss Report
                </button>
              </>
            )}
            <button 
              onClick={() => handleDelete(data._id)}
              style={{ 
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              🗑️ Delete Content
            </button>
            {type === 'user' && (
              <button 
                onClick={() => handleBan(data.targetId || data._id)}
                style={{ 
                  padding: '8px 16px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 14
                }}
              >
                🚷 Ban User
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const filteredData = getFilteredData();
  const pageCount = Math.ceil(filteredData.length / limit);

  return (
    <AdminLayout>
      <h1>System Reports</h1>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
        {REPORT_TABS.map(tab => (
          <button
            key={tab.key}
            style={{
              padding: '12px 24px',
              marginRight: '8px',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === tab.key ? '#4e54c8' : '#f8f9fa',
              color: activeTab === tab.key ? 'white' : '#666',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={() => setActiveTab(tab.key)}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Statistics Dashboard */}
      {activeTab === 'flag' && flagStats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16, 
          marginBottom: 24 
        }}>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#dc3545', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {flagStats.totalFlags || 0}
            </div>
            <div style={{ fontSize: 14 }}>Total Flags</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#007bff', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {flagStats.pendingFlags || 0}
            </div>
            <div style={{ fontSize: 14 }}>Pending Review</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#28a745', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {flagStats.resolvedFlags || 0}
            </div>
            <div style={{ fontSize: 14 }}>Resolved</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#ffc107', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {flagStats.avgResolutionTime || '0'}h
            </div>
            <div style={{ fontSize: 14 }}>Avg Resolution</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#6f42c1', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {flagStats.flagsToday || 0}
            </div>
            <div style={{ fontSize: 14 }}>Today</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#fd7e14', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {flagStats.highPriorityFlags || 0}
            </div>
            <div style={{ fontSize: 14 }}>High Priority</div>
          </div>
        </div>
      )}

      {/* Trip Reports Statistics Dashboard */}
      {activeTab === 'trip' && tripStats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16, 
          marginBottom: 24 
        }}>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#28a745', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {tripStats.totalTrips || 0}
            </div>
            <div style={{ fontSize: 14 }}>Total Trips</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#007bff', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {tripStats.activeTrips || 0}
            </div>
            <div style={{ fontSize: 14 }}>Active Trips</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#6f42c1', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {tripStats.completedTrips || 0}
            </div>
            <div style={{ fontSize: 14 }}>Completed</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#dc3545', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {tripStats.reportedTrips || 0}
            </div>
            <div style={{ fontSize: 14 }}>Reported</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#ffc107', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              ₹{Math.round(tripStats.avgBudget || 0)}
            </div>
            <div style={{ fontSize: 14 }}>Avg Budget</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#fd7e14', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {tripStats.tripsToday || 0}
            </div>
            <div style={{ fontSize: 14 }}>Today</div>
          </div>
        </div>
      )}

      {/* User Reports Statistics Dashboard */}
      {activeTab === 'user' && userStats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 16, 
          marginBottom: 24 
        }}>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#28a745', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {userStats.totalUsers || 0}
            </div>
            <div style={{ fontSize: 14 }}>Total Users</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#007bff', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {userStats.activeUsers || 0}
            </div>
            <div style={{ fontSize: 14 }}>Active Users</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#dc3545', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {userStats.bannedUsers || 0}
            </div>
            <div style={{ fontSize: 14 }}>Banned Users</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#ffc107', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {userStats.reportedUsers || 0}
            </div>
            <div style={{ fontSize: 14 }}>Reported</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#6f42c1', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {userStats.newUsersToday || 0}
            </div>
            <div style={{ fontSize: 14 }}>New Today</div>
          </div>
          <div style={{ 
            padding: 20, 
            backgroundColor: '#fd7e14', 
            color: 'white', 
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              {userStats.newUsersThisWeek || 0}
            </div>
            <div style={{ fontSize: 14 }}>New This Week</div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 24, 
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {activeTab === 'flag' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={aiOnly} onChange={(e) => setAiOnly(e.target.checked)} />
            Show only AI-escalated items
          </label>
        )}
        <input 
          type="text" 
          placeholder={`Search ${activeTab} reports...`}
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
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
          <option value="escalated">Escalated</option>
        </select>
        {activeTab === 'flag' && (
          <select 
            value={severityFilter} 
            onChange={e => { setSeverityFilter(e.target.value); setPage(1); }} 
            style={{ 
              padding: 10, 
              borderRadius: 6, 
              border: '1px solid #e1e5e9',
              fontSize: 14
            }}
          >
            <option value="">All Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        )}
        {activeTab === 'flag' && (
          <select 
            value={typeFilter} 
            onChange={e => { setTypeFilter(e.target.value); setPage(1); }} 
            style={{ 
              padding: 10, 
              borderRadius: 6, 
              border: '1px solid #e1e5e9',
              fontSize: 14
            }}
          >
            <option value="">All Types</option>
            <option value="user">User</option>
            <option value="trip">Trip</option>
            <option value="review">Review</option>
            <option value="post">Post</option>
            <option value="comment">Comment</option>
            <option value="message">Message</option>
          </select>
        )}
        <select 
          value={dateFilter} 
          onChange={e => { setDateFilter(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
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
            {selectedItems.length} item(s) selected
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
            {activeTab === 'flag' && (
              <>
                <option value="resolve">Resolve Selected</option>
                <option value="dismiss">Dismiss Selected</option>
                <option value="delete">Delete Selected</option>
              </>
            )}
            {activeTab === 'trip' && (
              <>
                <option value="approve">Approve Selected</option>
                <option value="suspend">Suspend Selected</option>
                <option value="delete">Delete Selected</option>
              </>
            )}
            {activeTab === 'user' && (
              <>
                <option value="ban">Ban Selected</option>
                <option value="unban">Unban Selected</option>
                <option value="warn">Warn Selected</option>
                <option value="delete">Delete Selected</option>
              </>
            )}
          </select>
          <button 
            onClick={handleBulkAction}
            disabled={!bulkAction}
            style={{ 
              padding: '8px 16px',
              backgroundColor: bulkAction ? '#007bff' : '#ccc',
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
            onClick={() => setSelectedItems([])}
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

      {/* Connection Status */}
      <div style={{ 
        marginBottom: 16, 
        padding: 8, 
        backgroundColor: isConnected ? '#d4edda' : '#f8d7da', 
        color: isConnected ? '#155724' : '#721c24',
        borderRadius: 4,
        fontSize: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: isConnected ? '#28a745' : '#dc3545'
        }} />
        {isConnected ? 'Live updates active' : 'Offline mode'}
      </div>

      {/* Main Content */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      ) : error ? (
        <div style={{ color: '#d32f2f', padding: '1rem', textAlign: 'center' }}>
          {error} <button onClick={() => fetchFlagData()}>Retry</button>
        </div>
      ) : (
        <>
          {/* Flag Reports Table */}
          {activeTab === 'flag' && (
            <AdminTable
              columns={flagColumns}
              data={filteredData}
              loading={false}
              error={null}
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
              onSort={() => {}}
              sortKey={''}
              sortDirection={'asc'}
              actions={flagActions}
              emptyMessage="No flag reports found."
              selectable={true}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
            />
          )}

          {/* Trip Reports Table */}
          {activeTab === 'trip' && (
            <AdminTable
              columns={tripColumns}
              data={filteredData}
              loading={false}
              error={null}
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
              onSort={() => {}}
              sortKey={''}
              sortDirection={'asc'}
              actions={tripActions}
              emptyMessage="No trip reports found."
              selectable={true}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
            />
          )}

          {/* User Reports Table */}
          {activeTab === 'user' && (
            <AdminTable
              columns={userColumns}
              data={filteredData}
              loading={false}
              error={null}
              page={page}
              pageCount={pageCount}
              onPageChange={setPage}
              onSort={() => {}}
              sortKey={''}
              sortDirection={'asc'}
              actions={userActions}
              emptyMessage="No user reports found."
              selectable={true}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
            />
          )}
        </>
      )}

      {/* Enhanced Modal */}
      <AdminModal open={modalOpen} onClose={closeModal} title={`${modalType} Report Details`}>
        {modalData && renderEnhancedModal(modalData, modalType)}
      </AdminModal>
    </AdminLayout>
  );
} 