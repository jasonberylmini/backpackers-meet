import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
import { useAdminRealtime } from '../hooks/useAdminRealtime';
import '../pages/AdminDashboard.css';

const BACKEND_URL = "http://localhost:5000";

const getImageUrl = (path) => {
  if (!path) return '';
  const cleanPath = path.replace(/\\/g, '/').replace(/\//g, '/').replace(/^\/+|^\/+/, '');
  return `${BACKEND_URL}/${cleanPath}`;
};

const getStatusColor = (status) => {
  switch (status) {
    case 'verified':
      return { bg: '#e8f5e8', text: '#388e3c' };
    case 'pending':
      return { bg: '#fff3e0', text: '#f57c00' };
    case 'rejected':
      return { bg: '#ffebee', text: '#d32f2f' };
    default:
      return { bg: '#f5f5f5', text: '#666' };
  }
};

const calculateProcessingTime = (createdAt) => {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = Math.abs(now - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
};

const filterByDate = (createdAt, filter) => {
  const userDate = new Date(createdAt);
  const now = new Date();
  
  switch (filter) {
    case 'today':
      return userDate.toDateString() === now.toDateString();
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return userDate >= weekAgo;
    case 'month':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return userDate >= monthAgo;
    default:
      return true;
  }
};

const filterByDocumentStatus = (user, filter) => {
  switch (filter) {
    case 'complete':
      return user.idDocument && user.idSelfie;
    case 'incomplete':
      return !user.idDocument || !user.idSelfie;
    case 'no-documents':
      return !user.idDocument && !user.idSelfie;
    default:
      return true;
  }
};

export default function AdminKYC() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'verified'
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  
  // Enhanced filtering
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [documentFilter, setDocumentFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  // Real-time functionality
  const { getLiveData, getNotificationCount } = useAdminRealtime('kyc');

  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingKYC: 0,
    verifiedUsers: 0,
    rejectedUsers: 0,
    usersWithDocuments: 0,
    usersWithoutDocuments: 0,
    kycCompletionRate: 0,
    avgProcessingTime: '0 days',
    newKYCRequestsToday: 0
  });

  const fetchAllUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/users', { headers });
      setUsers(res.data);
      
      // Calculate enhanced statistics
      const totalUsers = res.data.length;
      const pendingKYC = res.data.filter(u => u.verificationStatus === 'pending').length;
      const verifiedUsers = res.data.filter(u => u.verificationStatus === 'verified').length;
      const rejectedUsers = res.data.filter(u => u.verificationStatus === 'rejected').length;
      const usersWithDocuments = res.data.filter(u => u.idDocument || u.idSelfie).length;
      const usersWithoutDocuments = totalUsers - usersWithDocuments;
      const kycCompletionRate = totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;
      
      // Calculate average processing time
      const verifiedUsersWithDates = res.data.filter(u => u.verificationStatus === 'verified');
      const totalProcessingDays = verifiedUsersWithDates.reduce((sum, user) => {
        return sum + Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24));
      }, 0);
      const avgProcessingTime = verifiedUsersWithDates.length > 0 
        ? `${Math.round(totalProcessingDays / verifiedUsersWithDates.length)} days`
        : '0 days';
      
      // New KYC requests today
      const newKYCRequestsToday = res.data.filter(u => {
        const today = new Date();
        const userDate = new Date(u.createdAt);
        return userDate.toDateString() === today.toDateString() && u.verificationStatus === 'pending';
      }).length;
      
      setStats({
        totalUsers,
        pendingKYC,
        verifiedUsers,
        rejectedUsers,
        usersWithDocuments,
        usersWithoutDocuments,
        kycCompletionRate,
        avgProcessingTime,
        newKYCRequestsToday
      });
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load users.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Real-time KYC updates
  useEffect(() => {
    const liveData = getLiveData();
    if (liveData.kyc && liveData.kyc.length > 0) {
      setUsers(prevUsers => [...liveData.kyc, ...prevUsers]);
      toast.success(`New KYC request from ${liveData.kyc[0].user?.name}`);
    }
  }, [getLiveData]);

  const handleVerify = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/verify/${userId}`, { verificationStatus: 'verified' }, { headers });
      toast.success('User verified!');
      fetchAllUsers();
    } catch (err) {
      toast.error(`Failed to verify user: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleReject = async (userId) => {
    const rejectionReason = prompt('Enter rejection reason (optional):');
    if (rejectionReason === null) return; // User cancelled
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/verify/${userId}`, { 
        verificationStatus: 'rejected',
        rejectionReason: rejectionReason || 'Documents do not meet verification requirements'
      }, { headers });
      toast.success('User rejected!');
      fetchAllUsers();
    } catch (err) {
      toast.error(`Failed to reject user: ${err.response?.data?.message || err.message}`);
    }
  };

  // Bulk KYC operations
  const handleBulkKYC = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const verificationStatus = bulkAction === 'approve' ? 'verified' : 'rejected';
      await axios.post('/api/admin/bulk-kyc', {
        userIds: selectedUsers,
        verificationStatus: verificationStatus
      }, { headers });
      
      toast.success(`${selectedUsers.length} users ${verificationStatus}!`);
      setSelectedUsers([]);
      setBulkAction('');
      fetchAllUsers();
    } catch (err) {
      toast.error('Failed to perform bulk action.');
    }
  };

  // Send KYC notification
  const sendKYCNotification = async (userId) => {
    const message = prompt('Enter KYC notification message:');
    if (!message) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`/api/notifications/send/${userId}`, {
        type: 'info',
        title: 'KYC Update',
        message: message
      }, { headers });
      toast.success('KYC notification sent!');
    } catch (err) {
      toast.error('Failed to send notification.');
    }
  };

  const openUserModal = (user) => {
    setModalUser(user);
    setModalOpen(true);
  };

  const closeUserModal = () => {
    setModalOpen(false);
    setModalUser(null);
    setModalImage(null);
  };

  const openImageModal = (imagePath) => {
    setModalImage(getImageUrl(imagePath));
  };

  // Enhanced filtering
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
                         user.email.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === 'pending' ? user.verificationStatus === 'pending' : user.verificationStatus === 'verified';
    const matchesDate = dateFilter ? filterByDate(user.createdAt, dateFilter) : true;
    const matchesDocument = documentFilter ? filterByDocumentStatus(user, documentFilter) : true;
    const matchesGender = genderFilter ? user.gender === genderFilter : true;
    
    return matchesSearch && matchesTab && matchesDate && matchesDocument && matchesGender;
  });

  // Enhanced table columns
  const columns = [
    { 
      key: 'select', 
      label: '', 
      sortable: false,
      render: (user) => (
        <input
          type="checkbox"
          checked={selectedUsers.includes(user._id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUsers([...selectedUsers, user._id]);
            } else {
              setSelectedUsers(selectedUsers.filter(id => id !== user._id));
            }
          }}
        />
      )
    },
    { 
      key: 'name', 
      label: 'Name', 
      sortable: true,
      render: (user) => (
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
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 'bold' }}>{user.name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{user.email}</div>
          </div>
        </div>
      )
    },
    { 
      key: 'documents', 
      label: 'Document Status', 
      sortable: false,
      render: (user) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {user.idDocument ? (
              <span style={{ 
                padding: '2px 6px',
                backgroundColor: '#e8f5e8',
                color: '#388e3c',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 'bold'
              }}>
                ✅ ID
              </span>
            ) : (
              <span style={{ 
                padding: '2px 6px',
                backgroundColor: '#ffebee',
                color: '#d32f2f',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 'bold'
              }}>
                ❌ ID
              </span>
            )}
            {user.idSelfie ? (
              <span style={{ 
                padding: '2px 6px',
                backgroundColor: '#e8f5e8',
                color: '#388e3c',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 'bold'
              }}>
                ✅ Selfie
              </span>
            ) : (
              <span style={{ 
                padding: '2px 6px',
                backgroundColor: '#ffebee',
                color: '#d32f2f',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 'bold'
              }}>
                ❌ Selfie
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#666' }}>
            {user.idDocument && user.idSelfie ? 'Complete' : 'Incomplete'}
          </div>
        </div>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Applied', 
      sortable: true,
      render: (user) => (
        <div>
          <div>{new Date(user.createdAt).toLocaleDateString()}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))} days ago
          </div>
        </div>
      )
    },
    { 
      key: 'verificationStatus', 
      label: 'Status', 
      sortable: true,
      render: (user) => (
        <span style={{ 
          padding: '4px 8px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 'bold',
          backgroundColor: getStatusColor(user.verificationStatus).bg,
          color: getStatusColor(user.verificationStatus).text
        }}>
          {user.verificationStatus === 'pending' ? '⏳ Pending' : 
           user.verificationStatus === 'verified' ? '✅ Verified' : '❌ Rejected'}
        </span>
      )
    }
  ];

  // Enhanced table actions
  const actions = (user) => (
    <div style={{ display: 'flex', gap: 8 }}>
      <button 
        onClick={() => openUserModal(user)} 
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
      {activeTab === 'pending' && (
        <>
          <button 
            onClick={() => handleVerify(user._id)} 
            style={{ 
              padding: '6px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Approve
          </button>
          <button 
            onClick={() => handleReject(user._id)} 
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
            Reject
          </button>
        </>
      )}
    </div>
  );

  // Enhanced KYC modal content
  const renderEnhancedKYCModal = (user) => (
    <div style={{ padding: 20 }}>
      {/* User Profile Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <h3 style={{ marginBottom: 15, color: '#333' }}>User Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><strong>Name:</strong> {user.name}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Phone:</strong> {user.phone || 'Not provided'}</div>
            <div><strong>Gender:</strong> {user.gender || 'Not specified'}</div>
            <div><strong>Location:</strong> {user.location || 'Not provided'}</div>
          </div>
        </div>
        <div>
          <h3 style={{ marginBottom: 15, color: '#333' }}>KYC Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><strong>Status:</strong> 
              <span style={{ 
                padding: '4px 8px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 'bold',
                backgroundColor: getStatusColor(user.verificationStatus).bg,
                color: getStatusColor(user.verificationStatus).text
              }}>
                {user.verificationStatus}
              </span>
            </div>
            <div><strong>Applied:</strong> {new Date(user.createdAt).toLocaleString()}</div>
            <div><strong>Processing Time:</strong> {calculateProcessingTime(user.createdAt)}</div>
            <div><strong>Last Updated:</strong> {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'Never'}</div>
          </div>
        </div>
      </div>
      
      {/* Document Review Section */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 15, color: '#333' }}>Document Review</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {user.idDocument ? (
            <div style={{ 
              padding: 16, 
              backgroundColor: '#f8f9fa', 
              borderRadius: 8,
              border: '2px solid #28a745'
            }}>
              <h4 style={{ marginBottom: 10, color: '#28a745' }}>✅ ID Document</h4>
              <img 
                src={getImageUrl(user.idDocument)} 
                alt="ID Document" 
                style={{ 
                  width: '100%', 
                  maxHeight: 200, 
                  objectFit: 'cover',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
                onClick={() => openImageModal(user.idDocument)}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                Click to enlarge
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: 16, 
              backgroundColor: '#ffebee', 
              borderRadius: 8,
              border: '2px solid #d32f2f'
            }}>
              <h4 style={{ marginBottom: 10, color: '#d32f2f' }}>❌ ID Document Missing</h4>
              <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>
                No ID document uploaded
              </div>
            </div>
          )}
          
          {user.idSelfie ? (
            <div style={{ 
              padding: 16, 
              backgroundColor: '#f8f9fa', 
              borderRadius: 8,
              border: '2px solid #28a745'
            }}>
              <h4 style={{ marginBottom: 10, color: '#28a745' }}>✅ Selfie with Document</h4>
              <img 
                src={getImageUrl(user.idSelfie)} 
                alt="Selfie with Document" 
                style={{ 
                  width: '100%', 
                  maxHeight: 200, 
                  objectFit: 'cover',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
                onClick={() => openImageModal(user.idSelfie)}
              />
              <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
                Click to enlarge
              </div>
            </div>
          ) : (
            <div style={{ 
              padding: 16, 
              backgroundColor: '#ffebee', 
              borderRadius: 8,
              border: '2px solid #d32f2f'
            }}>
              <h4 style={{ marginBottom: 10, color: '#d32f2f' }}>❌ Selfie Missing</h4>
              <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>
                No selfie uploaded
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* KYC Decision Section */}
      <div style={{ 
        padding: 16, 
        backgroundColor: '#f8f9fa', 
        borderRadius: 8,
        border: '1px solid #e1e5e9'
      }}>
        <h3 style={{ marginBottom: 15, color: '#333' }}>KYC Decision</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            onClick={() => handleVerify(user._id)}
            disabled={user.verificationStatus === 'verified'}
            style={{ 
              padding: '12px 24px',
              backgroundColor: user.verificationStatus === 'verified' ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: user.verificationStatus === 'verified' ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
            ✅ Approve KYC
          </button>
          <button 
            onClick={() => handleReject(user._id)}
            disabled={user.verificationStatus === 'rejected'}
            style={{ 
              padding: '12px 24px',
              backgroundColor: user.verificationStatus === 'rejected' ? '#ccc' : '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: user.verificationStatus === 'rejected' ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
            ❌ Reject KYC
          </button>
          <button 
            onClick={() => sendKYCNotification(user._id)}
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
            onClick={() => closeUserModal()}
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
    </div>
  );

  return (
    <AdminLayout>
      <h1 style={{ marginBottom: 24, color: '#333' }}>KYC Management</h1>
      
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
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1976d2' }}>{stats.totalUsers}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Total Users</div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#fff3e0', 
          borderRadius: 8, 
          border: '1px solid #ffcc02',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f57c00' }}>{stats.pendingKYC}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Pending KYC</div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#e8f5e8', 
          borderRadius: 8, 
          border: '1px solid #a5d6a7',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#388e3c' }}>{stats.verifiedUsers}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Verified Users</div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#ffebee', 
          borderRadius: 8, 
          border: '1px solid #ef9a9a',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#d32f2f' }}>{stats.rejectedUsers}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Rejected Users</div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#f3e5f5', 
          borderRadius: 8, 
          border: '1px solid #ce93d8',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#7b1fa2' }}>{stats.usersWithDocuments}</div>
          <div style={{ fontSize: 14, color: '#666' }}>With Documents</div>
        </div>
        <div style={{ 
          padding: 16, 
          backgroundColor: '#e0f2f1', 
          borderRadius: 8, 
          border: '1px solid #80cbc4',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#00695c' }}>{stats.kycCompletionRate}%</div>
          <div style={{ fontSize: 14, color: '#666' }}>Completion Rate</div>
        </div>
      </div>

      {/* KYC Analytics */}
      <div style={{ 
        padding: 20, 
        backgroundColor: '#fff', 
        borderRadius: 8, 
        border: '1px solid #e1e5e9',
        marginBottom: 24
      }}>
        <h3 style={{ marginBottom: 16, color: '#333' }}>KYC Analytics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#e8f5e8', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#388e3c' }}>{stats.kycCompletionRate}%</div>
            <div style={{ fontSize: 12, color: '#666' }}>Completion Rate</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#fff3e0', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#f57c00' }}>{stats.avgProcessingTime}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Avg Processing Time</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#e3f2fd', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2' }}>{stats.newKYCRequestsToday}</div>
            <div style={{ fontSize: 12, color: '#666' }}>New Requests Today</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#ffebee', borderRadius: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#d32f2f' }}>{stats.rejectedUsers}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Rejected Users</div>
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
          placeholder="Search by name or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9', 
            minWidth: 250,
            fontSize: 14
          }}
        />
        <select 
          value={dateFilter} 
          onChange={e => setDateFilter(e.target.value)}
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
        </select>
        <select 
          value={documentFilter} 
          onChange={e => setDocumentFilter(e.target.value)}
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Documents</option>
          <option value="complete">Complete</option>
          <option value="incomplete">Incomplete</option>
          <option value="no-documents">No Documents</option>
        </select>
        <select 
          value={genderFilter} 
          onChange={e => setGenderFilter(e.target.value)}
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button 
          onClick={() => setActiveTab('pending')}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: activeTab === 'pending' ? '#1976d2' : '#f5f5f5', 
            color: activeTab === 'pending' ? 'white' : '#333', 
            border: 'none', 
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: activeTab === 'pending' ? 'bold' : 'normal'
          }}
        >
          Pending KYC ({stats.pendingKYC})
        </button>
        <button 
          onClick={() => setActiveTab('verified')}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: activeTab === 'verified' ? '#1976d2' : '#f5f5f5', 
            color: activeTab === 'verified' ? 'white' : '#333', 
            border: 'none', 
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: activeTab === 'verified' ? 'bold' : 'normal'
          }}
        >
          Verified Users ({stats.verifiedUsers})
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
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
            {selectedUsers.length} user(s) selected
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
            <option value="approve">Approve Selected</option>
            <option value="reject">Reject Selected</option>
          </select>
          <button 
            onClick={handleBulkKYC}
            disabled={!bulkAction}
            style={{ 
              padding: '8px 16px',
              backgroundColor: bulkAction ? '#28a745' : '#ccc',
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
            onClick={() => setSelectedUsers([])}
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
        data={filteredUsers}
        loading={loading}
        error={error}
        page={1}
        pageCount={1}
        onPageChange={() => {}}
        onSort={() => {}}
        sortKey={''}
        sortDirection={'asc'}
        actions={actions}
        emptyMessage={`No ${activeTab} users found.`}
      />

      {/* Enhanced User Details Modal */}
      <AdminModal open={modalOpen} onClose={closeUserModal} title={`KYC Review - ${modalUser?.name}`}>
        {modalUser && renderEnhancedKYCModal(modalUser)}
      </AdminModal>

      {/* Image Modal */}
      <AdminModal open={!!modalImage} onClose={() => setModalImage(null)} title="Document Image">
        {modalImage && (
          <div style={{ textAlign: 'center' }}>
            <img 
              src={modalImage} 
              alt="Document" 
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