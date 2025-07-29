import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
import '../pages/AdminDashboard.css';

const BACKEND_URL = "http://localhost:5000";

const getImageUrl = (path) => {
  if (!path) return '';
  const cleanPath = path.replace(/\\/g, '/').replace(/\//g, '/').replace(/^\/+|^\/+/, '');
  return `${BACKEND_URL}/${cleanPath}`;
};

export default function AdminKYC() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'verified'
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingKYC: 0,
    verifiedUsers: 0,
    usersWithDocuments: 0,
    usersWithoutDocuments: 0
  });

  const fetchAllUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/users', { headers });
      setUsers(res.data);
      
      // Calculate statistics
      const totalUsers = res.data.length;
      const pendingKYC = res.data.filter(u => u.verificationStatus === 'pending').length;
      const verifiedUsers = res.data.filter(u => u.verificationStatus === 'verified').length;
      const usersWithDocuments = res.data.filter(u => u.idDocument || u.idSelfie).length;
      const usersWithoutDocuments = totalUsers - usersWithDocuments;
      
      setStats({
        totalUsers,
        pendingKYC,
        verifiedUsers,
        usersWithDocuments,
        usersWithoutDocuments
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

  const handleVerify = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/verify/${userId}`, { verificationStatus: 'verified' }, { headers });
      toast.success('User verified!');
      fetchAllUsers();
    } catch (err) {
      toast.error('Failed to verify user.');
    }
  };

  const handleReject = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/verify/${userId}`, { verificationStatus: 'rejected' }, { headers });
      toast.success('User rejected!');
      fetchAllUsers();
    } catch (err) {
      toast.error('Failed to reject user.');
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

  // Filter users based on active tab
  const filteredUsers = users.filter(user => {
    if (activeTab === 'pending') {
      return user.verificationStatus === 'pending';
    } else {
      return user.verificationStatus === 'verified';
    }
  });

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'gender', label: 'Gender', sortable: true },
    { key: 'preferences', label: 'Preferences', sortable: false, render: u => u.preferences || '-' },
    { key: 'createdAt', label: 'Applied', sortable: true, render: u => new Date(u.createdAt).toLocaleDateString() },
    { key: 'documents', label: 'Documents', sortable: false, render: u => (
      <div style={{ display: 'flex', gap: 8 }}>
        {u.idDocument && (
          <button 
            onClick={() => openImageModal(u.idDocument)}
            style={{ 
              padding: '4px 8px', 
              backgroundColor: '#1976d2', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📄 ID
          </button>
        )}
        {u.idSelfie && (
          <button 
            onClick={() => openImageModal(u.idSelfie)}
            style={{ 
              padding: '4px 8px', 
              backgroundColor: '#388e3c', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📸 Selfie
          </button>
        )}
        {!u.idDocument && !u.idSelfie && (
          <span style={{ color: '#666', fontSize: '12px' }}>No documents</span>
        )}
      </div>
    ) },
  ];

  const actions = (user) => (
    <>
      <button onClick={() => openUserModal(user)} style={{ marginRight: 8 }}>View</button>
      {activeTab === 'pending' && (
        <>
          <button onClick={() => handleVerify(user._id)} style={{ marginRight: 8, backgroundColor: '#28a745', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4 }}>Approve</button>
          <button onClick={() => handleReject(user._id)} style={{ backgroundColor: '#d32f2f', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4 }}>Reject</button>
        </>
      )}
    </>
  );

  return (
    <AdminLayout>
      <h1>KYC Management</h1>
      
      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
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
          backgroundColor: '#ffebee', 
          borderRadius: 8, 
          border: '1px solid #ef9a9a',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#d32f2f' }}>{stats.usersWithoutDocuments}</div>
          <div style={{ fontSize: 14, color: '#666' }}>Without Documents</div>
        </div>
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

      {/* User Details Modal */}
      <AdminModal open={modalOpen} onClose={closeUserModal} title={`KYC Review - ${modalUser?.name}`}>
        {modalUser && (
          <div>
            <div><b>Email:</b> {modalUser.email}</div>
            <div><b>Gender:</b> {modalUser.gender || 'Not specified'}</div>
            <div><b>Preferences:</b> {modalUser.preferences || 'Not specified'}</div>
            <div><b>Applied:</b> {new Date(modalUser.createdAt).toLocaleString()}</div>
            <div><b>Status:</b> {modalUser.verificationStatus}</div>
            
            <div style={{ marginTop: 16 }}>
              <h4>Uploaded Documents:</h4>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {modalUser.idDocument && (
                  <div style={{ textAlign: 'center' }}>
                    <h5>ID Document</h5>
                    <img 
                      src={getImageUrl(modalUser.idDocument)} 
                      alt="ID Document" 
                      style={{ 
                        maxWidth: 200, 
                        maxHeight: 150, 
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                      onClick={() => openImageModal(modalUser.idDocument)}
                    />
                  </div>
                )}
                {modalUser.idSelfie && (
                  <div style={{ textAlign: 'center' }}>
                    <h5>Selfie with Document</h5>
                    <img 
                      src={getImageUrl(modalUser.idSelfie)} 
                      alt="Selfie with Document" 
                      style={{ 
                        maxWidth: 200, 
                        maxHeight: 150, 
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        cursor: 'pointer'
                      }}
                      onClick={() => openImageModal(modalUser.idSelfie)}
                    />
                  </div>
                )}
                {!modalUser.idDocument && !modalUser.idSelfie && (
                  <div style={{ color: '#666' }}>No documents uploaded</div>
                )}
              </div>
            </div>
          </div>
        )}
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