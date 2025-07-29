import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
import { useAdminRealtime } from '../hooks/useAdminRealtime';
import '../pages/AdminDashboard.css';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkAction, setBulkAction] = useState('');

  // Real-time functionality
  const { getLiveData, getNotificationCount } = useAdminRealtime('users');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/users', { headers });
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load users.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Real-time user updates
  useEffect(() => {
    const liveData = getLiveData();
    if (liveData.users && liveData.users.length > 0) {
      setUsers(prevUsers => [...liveData.users, ...prevUsers]);
    }
  }, [getLiveData]);

  // Calculate user statistics
  const userStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => !u.isBanned).length,
    bannedUsers: users.filter(u => u.isBanned).length,
    pendingKYC: users.filter(u => u.verificationStatus === 'pending').length,
    verifiedUsers: users.filter(u => u.verificationStatus === 'verified').length,
    adminUsers: users.filter(u => u.role === 'admin').length,
    newUsersToday: users.filter(u => {
      const today = new Date();
      const userDate = new Date(u.createdAt);
      return userDate.toDateString() === today.toDateString();
    }).length,
    newUsersThisWeek: users.filter(u => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const userDate = new Date(u.createdAt);
      return userDate >= weekAgo;
    }).length
  };

  // Filtering
  const filtered = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesStatus = statusFilter
      ? (statusFilter === 'banned' ? u.isBanned : !u.isBanned)
      : true;
    const matchesKYC = kycFilter ? u.verificationStatus === kycFilter : true;
    return matchesSearch && matchesRole && matchesStatus && matchesKYC;
  });

  // Pagination
  const pageCount = Math.ceil(filtered.length / USERS_PER_PAGE);
  const paged = filtered.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  // Ban/Unban
  const handleBanToggle = async (userId, isBanned) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/ban/${userId}`, { isBanned: !isBanned }, { headers });
      toast.success(!isBanned ? 'User banned!' : 'User unbanned!');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user status.');
    }
  };

  // Bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const isBanned = bulkAction === 'ban';
      await axios.post('/api/admin/bulk-ban', {
        userIds: selectedUsers,
        isBanned: isBanned
      }, { headers });
      
      toast.success(`${selectedUsers.length} users ${isBanned ? 'banned' : 'unbanned'}!`);
      setSelectedUsers([]);
      setBulkAction('');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to perform bulk action.');
    }
  };

  // Send notification to user
  const sendNotification = async (userId) => {
    const message = prompt('Enter notification message:');
    if (!message) return;

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`/api/notifications/send/${userId}`, {
        type: 'info',
        title: 'Admin Message',
        message: message
      }, { headers });
      toast.success('Notification sent!');
    } catch (err) {
      toast.error('Failed to send notification.');
    }
  };

  // Modal for user details
  const openUserModal = (user) => {
    setModalUser(user);
    setModalOpen(true);
  };
  
  const closeUserModal = () => {
    setModalOpen(false);
    setModalUser(null);
  };

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
            backgroundColor: user.role === 'admin' ? '#d32f2f' : '#1976d2',
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
            <div style={{ fontSize: 12, color: '#666' }}>{user.role}</div>
          </div>
        </div>
      )
    },
    { 
      key: 'email', 
      label: 'Contact', 
      sortable: true,
      render: (user) => (
        <div>
          <div>{user.email}</div>
          <div style={{ fontSize: 12, color: '#666' }}>{user.phone || 'No phone'}</div>
        </div>
      )
    },
    { 
      key: 'verificationStatus', 
      label: 'Verification', 
      sortable: true,
      render: (user) => (
        <span style={{ 
          padding: '4px 8px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 'bold',
          backgroundColor: user.verificationStatus === 'verified' ? '#e8f5e8' : '#fff3e0',
          color: user.verificationStatus === 'verified' ? '#388e3c' : '#f57c00'
        }}>
          {user.verificationStatus === 'verified' ? '✅ Verified' : '⏳ Pending'}
        </span>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Member Since', 
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
      key: 'isBanned', 
      label: 'Status', 
      sortable: true,
      render: (user) => (
        <span style={{ 
          padding: '4px 8px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 'bold',
          backgroundColor: user.isBanned ? '#ffebee' : '#e8f5e8',
          color: user.isBanned ? '#d32f2f' : '#388e3c'
        }}>
          {user.isBanned ? '🚫 Banned' : '✅ Active'}
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
      <button 
        onClick={() => handleBanToggle(user._id, user.isBanned)} 
        style={{ 
          padding: '6px 12px',
          backgroundColor: user.isBanned ? '#28a745' : '#d32f2f',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12
        }}
      >
        {user.isBanned ? 'Unban' : 'Ban'}
      </button>
      <button 
        onClick={() => sendNotification(user._id)} 
        style={{ 
          padding: '6px 12px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12
        }}
      >
        Message
      </button>
    </div>
  );

  // Enhanced user modal content
  const renderUserModal = (user) => (
    <div style={{ padding: 20 }}>
      {/* Profile Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <h3 style={{ marginBottom: 15, color: '#333' }}>Profile Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><strong>Name:</strong> {user.name}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Phone:</strong> {user.phone || 'Not provided'}</div>
            <div><strong>Location:</strong> {user.location || 'Not provided'}</div>
            <div><strong>Gender:</strong> {user.gender || 'Not specified'}</div>
          </div>
        </div>
        <div>
          <h3 style={{ marginBottom: 15, color: '#333' }}>Account Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><strong>Role:</strong> <span style={{ 
              color: user.role === 'admin' ? '#d32f2f' : '#1976d2',
              fontWeight: 'bold'
            }}>{user.role}</span></div>
            <div><strong>Status:</strong> <span style={{ 
              color: user.isBanned ? '#d32f2f' : '#28a745',
              fontWeight: 'bold'
            }}>{user.isBanned ? 'Banned' : 'Active'}</span></div>
            <div><strong>KYC:</strong> <span style={{ 
              color: user.verificationStatus === 'verified' ? '#28a745' : '#f57c00',
              fontWeight: 'bold'
            }}>{user.verificationStatus}</span></div>
            <div><strong>Joined:</strong> {new Date(user.createdAt).toLocaleString()}</div>
            <div><strong>Last Login:</strong> {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</div>
          </div>
        </div>
      </div>
      
      {/* Activity Section */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 15, color: '#333' }}>Activity Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 15 }}>
          <div style={{ textAlign: 'center', padding: 15, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1976d2' }}>{user.tripsCount || 0}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Trips Created</div>
          </div>
          <div style={{ textAlign: 'center', padding: 15, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#388e3c' }}>{user.reviewsCount || 0}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Reviews Posted</div>
          </div>
          <div style={{ textAlign: 'center', padding: 15, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f57c00' }}>{user.flagsCount || 0}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Content Flagged</div>
          </div>
          <div style={{ textAlign: 'center', padding: 15, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#d32f2f' }}>{user.reportsCount || 0}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Reports Received</div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => handleBanToggle(user._id, user.isBanned)} 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: user.isBanned ? '#28a745' : '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}>
          {user.isBanned ? 'Unban User' : 'Ban User'}
        </button>
        <button onClick={() => sendNotification(user._id)} 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}>
          Send Message
        </button>
        <button onClick={() => closeUserModal()} 
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}>
          Close
        </button>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <h1 style={{ marginBottom: 24, color: '#333' }}>Users Management</h1>
      
      {/* User Statistics Dashboard */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 16, 
        marginBottom: 24 
      }}>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#e3f2fd', 
          borderRadius: 8, 
          border: '1px solid #bbdefb' 
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1976d2' }}>{userStats.totalUsers}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Total Users</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#e8f5e8', 
          borderRadius: 8, 
          border: '1px solid #a5d6a7' 
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#388e3c' }}>{userStats.activeUsers}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Active Users</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#fff3e0', 
          borderRadius: 8, 
          border: '1px solid #ffcc02' 
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f57c00' }}>{userStats.pendingKYC}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Pending KYC</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#ffebee', 
          borderRadius: 8, 
          border: '1px solid #ef9a9a' 
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#d32f2f' }}>{userStats.bannedUsers}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Banned Users</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#f3e5f5', 
          borderRadius: 8, 
          border: '1px solid #ce93d8' 
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#7b1fa2' }}>{userStats.adminUsers}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Admin Users</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#e0f2f1', 
          borderRadius: 8, 
          border: '1px solid #80cbc4' 
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#00695c' }}>{userStats.newUsersToday}</div>
          <div style={{ fontSize: 14, color: '#666' }}>New Today</div>
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
          value={roleFilter} 
          onChange={e => setRoleFilter(e.target.value)} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value)} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Status</option>
          <option value="banned">Banned</option>
          <option value="active">Active</option>
        </select>
        <select 
          value={kycFilter} 
          onChange={e => setKycFilter(e.target.value)} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All KYC Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
        </select>
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
            <option value="ban">Ban Selected</option>
            <option value="unban">Unban Selected</option>
          </select>
          <button 
            onClick={handleBulkAction}
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
        data={paged}
        loading={loading}
        error={error}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        onSort={() => {}}
        sortKey={''}
        sortDirection={'asc'}
        actions={actions}
        emptyMessage="No users found."
      />

      <AdminModal open={modalOpen} onClose={closeUserModal} title={modalUser?.name}>
        {modalUser && renderUserModal(modalUser)}
      </AdminModal>
    </AdminLayout>
  );
} 