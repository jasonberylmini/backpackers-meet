import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
import { useAdminRealtime } from '../hooks/useAdminRealtime';
import '../pages/AdminDashboard.css';

// Helper functions
const getActionIcon = (action) => {
  const icons = {
    'banned user': '🚫',
    'unbanned user': '🔄',
    'verified user': '✅',
    'rejected user': '❌',
    'approved review': '👍',
    'rejected review': '👎',
    'deleted review': '🗑️',
    'deleted trip': '🗑️',
    'deleted user': '🗑️',
    'bulk verified KYC': '📋',
    'bulk banned users': '🚫',
    'resolved flag': '✅',
    'dismissed flag': '❌',
    'escalated flag': '⚠️',
    'suspended trip': '⏸️',
    'approved trip': '✅',
    'warned user': '⚠️',
    'default': '📝'
  };
  return icons[action] || icons.default;
};

const getActionColor = (action) => {
  const colors = {
    'banned user': '#dc3545',
    'unbanned user': '#28a745',
    'verified user': '#28a745',
    'rejected user': '#dc3545',
    'approved review': '#28a745',
    'rejected review': '#ffc107',
    'deleted review': '#dc3545',
    'deleted trip': '#dc3545',
    'deleted user': '#dc3545',
    'bulk verified KYC': '#17a2b8',
    'bulk banned users': '#dc3545',
    'resolved flag': '#28a745',
    'dismissed flag': '#6c757d',
    'escalated flag': '#ffc107',
    'suspended trip': '#ffc107',
    'approved trip': '#28a745',
    'warned user': '#ffc107',
    'default': '#6c757d'
  };
  return colors[action] || colors.default;
};

const getActionCategory = (action) => {
  if (action.includes('user') || action.includes('ban') || action.includes('warn')) return 'User Management';
  if (action.includes('trip')) return 'Trip Management';
  if (action.includes('review') || action.includes('approve') || action.includes('reject')) return 'Content Moderation';
  if (action.includes('kyc') || action.includes('verify')) return 'KYC Management';
  if (action.includes('flag') || action.includes('resolve') || action.includes('dismiss')) return 'Flag Management';
  return 'Other';
};

const formatDate = (date) => {
  const logDate = new Date(date);
  const now = new Date();
  const diffTime = Math.abs(now - logDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Today';
  if (diffDays === 2) return 'Yesterday';
  if (diffDays <= 7) return `${diffDays - 1} days ago`;
  return logDate.toLocaleDateString();
};

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLog, setModalLog] = useState(null);
  
  // Real-time updates
  const { isConnected } = useAdminRealtime();

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const params = { page, limit };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      if (adminFilter) params.adminId = adminFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      
      const res = await axios.get('/api/admin/logs', { headers, params });
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setLoading(false);
    } catch (err) {
      setError('Failed to load logs.');
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const params = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      
      const res = await axios.get('/api/admin/logs/analytics', { headers, params });
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchAnalytics();
  }, [page, search, actionFilter, adminFilter, dateFrom, dateTo]);

  // Get unique actions and admins for filters
  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueAdmins = [...new Set(logs.map(log => log.adminId?.name).filter(Boolean))];
  const uniqueCategories = [...new Set(logs.map(log => getActionCategory(log.action)))];

  const openLogModal = (log) => {
    setModalLog(log);
    setModalOpen(true);
  };

  const closeLogModal = () => {
    setModalOpen(false);
    setModalLog(null);
  };

  const exportLogs = () => {
    const csvContent = [
      ['Admin', 'Action', 'Target User', 'Reason', 'Timestamp'],
      ...logs.map(log => [
        log.adminId?.name || '',
        log.action || '',
        log.targetUserId?.email || '',
        log.reason || '',
        new Date(log.createdAt).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Logs exported successfully!');
  };

  const columns = [
    { 
      key: 'adminId', 
      label: 'Admin', 
      sortable: true, 
      render: log => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14, color: '#4e54c8' }}>
            {log.adminId?.name || 'Unknown'}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {log.adminId?.email || 'No email'}
          </div>
        </div>
      )
    },
    { 
      key: 'action', 
      label: 'Action', 
      sortable: true, 
      render: log => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: getActionColor(log.action),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 14
          }}>
            {getActionIcon(log.action)}
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 14 }}>
              {log.action}
            </div>
            <div style={{ fontSize: 12, color: '#6c757d' }}>
              {getActionCategory(log.action)}
            </div>
          </div>
        </div>
      )
    },
    { 
      key: 'targetUserId', 
      label: 'Target User', 
      sortable: true, 
      render: log => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14 }}>
            {log.targetUserId?.email || 'N/A'}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {log.targetUserId?.name || 'No name'}
          </div>
        </div>
      )
    },
    { 
      key: 'reason', 
      label: 'Reason', 
      sortable: false, 
      render: log => (
        <div style={{ maxWidth: 200 }}>
          <div style={{ fontSize: 14, color: '#495057' }}>
            {log.reason || 'No reason provided'}
          </div>
        </div>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Time', 
      sortable: true, 
      render: log => (
        <div>
          <div style={{ fontSize: 14, fontWeight: 'bold' }}>
            {formatDate(log.createdAt)}
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            {new Date(log.createdAt).toLocaleString()}
          </div>
        </div>
      )
    },
  ];

  const actions = (log) => (
    <button 
      onClick={() => openLogModal(log)} 
      style={{ 
        backgroundColor: '#007bff', 
        color: 'white', 
        border: 'none', 
        padding: '6px 12px', 
        borderRadius: 4,
        fontSize: 12,
        cursor: 'pointer'
      }}
    >
      View Details
    </button>
  );

  const pageCount = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <h1>Admin Activity Logs</h1>
      
      {/* Enhanced Statistics Dashboard */}
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
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1976d2' }}>
            {analytics.totalLogs || 0}
          </div>
          <div style={{ color: '#666', fontSize: 14 }}>Total Logs</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#fff3e0', 
          borderRadius: 8, 
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#f57c00' }}>
            {analytics.todayActions || 0}
          </div>
          <div style={{ color: '#666', fontSize: 14 }}>Today's Actions</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#e8f5e8', 
          borderRadius: 8, 
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#388e3c' }}>
            {analytics.actionTypes || 0}
          </div>
          <div style={{ color: '#666', fontSize: 14 }}>Action Types</div>
        </div>
        <div style={{ 
          padding: 20, 
          backgroundColor: '#f3e5f5', 
          borderRadius: 8, 
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: '#7b1fa2' }}>
            {analytics.currentAdmin || 'No Activity'}
          </div>
          <div style={{ color: '#666', fontSize: 14 }}>Current Admin</div>
        </div>
      </div>

      {/* Action Breakdown */}
      {analytics.actionBreakdown && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12, color: '#4e54c8', fontSize: 18 }}>Action Breakdown</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {analytics.actionBreakdown.map((item, index) => (
              <div 
                key={index}
                style={{ 
                  padding: '10px 16px', 
                  backgroundColor: getActionColor(item._id),
                  color: 'white',
                  borderRadius: 6, 
                  fontSize: 14,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  border: actionFilter === item._id ? '2px solid #4e54c8' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setActionFilter(actionFilter === item._id ? '' : item._id)}
              >
                {getActionIcon(item._id)} {item._id}: {item.count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Filters */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 24, 
        flexWrap: 'wrap', 
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 8
      }}>
        <input 
          type="text" 
          placeholder="Search logs..." 
          value={search} 
          onChange={e => { setSearch(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9', 
            minWidth: 200,
            fontSize: 14
          }}
        />
        <select 
          value={actionFilter} 
          onChange={e => { setActionFilter(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Actions</option>
          {uniqueActions.map(action => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
        <select 
          value={adminFilter} 
          onChange={e => { setAdminFilter(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Admins</option>
          {uniqueAdmins.map(admin => (
            <option key={admin} value={admin}>{admin}</option>
          ))}
        </select>
        <select 
          value={categoryFilter} 
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        >
          <option value="">All Categories</option>
          {uniqueCategories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <input 
          type="date" 
          value={dateFrom} 
          onChange={e => { setDateFrom(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        />
        <input 
          type="date" 
          value={dateTo} 
          onChange={e => { setDateTo(e.target.value); setPage(1); }} 
          style={{ 
            padding: 10, 
            borderRadius: 6, 
            border: '1px solid #e1e5e9',
            fontSize: 14
          }}
        />
        <button 
          onClick={exportLogs}
          style={{ 
            padding: '10px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          📊 Export CSV
        </button>
      </div>

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

      {/* Pagination Info */}
      <div style={{ 
        marginBottom: 16, 
        color: '#666', 
        fontSize: 14,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>
          Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} logs
        </span>
        <span>
          Page {page} of {pageCount}
        </span>
      </div>

      <AdminTable
        columns={columns}
        data={logs}
        loading={loading}
        error={error}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        onSort={() => {}}
        sortKey={''}
        sortDirection={'asc'}
        actions={actions}
        emptyMessage="No logs found."
      />

      {/* Enhanced Log Details Modal */}
      <AdminModal open={modalOpen} onClose={closeLogModal} title={`Log Details - ${modalLog?.action}`}>
        {modalLog && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Left Column - Action Details */}
            <div>
              <h3 style={{ marginBottom: 16, color: '#495057' }}>Action Information</h3>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: getActionColor(modalLog.action),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 20
                  }}>
                    {getActionIcon(modalLog.action)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 18 }}>
                      {modalLog.action}
                    </div>
                    <div style={{ color: '#6c757d', fontSize: 14 }}>
                      {getActionCategory(modalLog.action)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 'bold', color: '#495057' }}>Timestamp:</label>
                <div style={{ 
                  marginTop: 4, 
                  padding: 12, 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: 6,
                  fontSize: 14
                }}>
                  {new Date(modalLog.createdAt).toLocaleString()}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 'bold', color: '#495057' }}>Reason:</label>
                <div style={{ 
                  marginTop: 4, 
                  padding: 12, 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: 6,
                  fontSize: 14,
                  lineHeight: 1.5
                }}>
                  {modalLog.reason || 'No reason provided'}
                </div>
              </div>

              {modalLog.outcome && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 'bold', color: '#495057' }}>Outcome:</label>
                  <div style={{ 
                    marginTop: 4, 
                    padding: 12, 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: 6,
                    fontSize: 14
                  }}>
                    {modalLog.outcome}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - User Details */}
            <div>
              <h3 style={{ marginBottom: 16, color: '#495057' }}>Admin Details</h3>
              
              <div style={{ 
                marginBottom: 20,
                padding: 16, 
                backgroundColor: '#f8f9fa', 
                borderRadius: 6 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: '#4e54c8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {modalLog.adminId?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                      {modalLog.adminId?.name || 'Unknown'}
                    </div>
                    <div style={{ color: '#6c757d', fontSize: 14 }}>
                      {modalLog.adminId?.email || 'No email'}
                    </div>
                  </div>
                </div>
              </div>

              <h3 style={{ marginBottom: 16, color: '#495057' }}>Target Details</h3>
              
              <div style={{ 
                marginBottom: 20,
                padding: 16, 
                backgroundColor: '#f8f9fa', 
                borderRadius: 6 
              }}>
                {modalLog.action.includes('bulk') ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: '#17a2b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 16
                      }}>
                        📋
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 16, color: '#17a2b8' }}>
                          Bulk Operation
                        </div>
                        <div style={{ color: '#6c757d', fontSize: 14 }}>
                          Multiple users affected
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, padding: 8, backgroundColor: '#e9ecef', borderRadius: 4 }}>
                      <div style={{ fontSize: 12, color: '#6c757d' }}>
                        <strong>Action Type:</strong> {modalLog.action}
                      </div>
                      <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                        <strong>Scope:</strong> {modalLog.action.includes('KYC') ? 'KYC Verification' : 
                                               modalLog.action.includes('ban') ? 'User Management' : 
                                               modalLog.action.includes('review') ? 'Content Moderation' : 'General'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: '#28a745',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {modalLog.targetUserId?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: 16 }}>
                        {modalLog.targetUserId?.email || 'N/A'}
                      </div>
                      <div style={{ color: '#6c757d', fontSize: 14 }}>
                        {modalLog.targetUserId?.name || 'No name'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ 
                marginTop: 16, 
                padding: 12, 
                backgroundColor: '#e9ecef', 
                borderRadius: 6 
              }}>
                <div style={{ fontSize: 12, color: '#6c757d' }}>
                  <b>Log ID:</b> {modalLog._id}
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </AdminLayout>
  );
} 