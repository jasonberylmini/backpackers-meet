import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
import '../pages/AdminDashboard.css';

const ACTION_COLORS = {
  'banned user': '#fde2e1',
  'verified user': '#e1f7e7',
  'unbanned user': '#e1eaff',
  'approved review': '#e8f5e8',
  'rejected review': '#fff3e0',
  'deleted review': '#fde2e1',
  'deleted trip': '#fde2e1',
  'deleted user': '#fde2e1',
};

const ACTION_ICONS = {
  'banned user': '🚫',
  'verified user': '✅',
  'unbanned user': '🔄',
  'approved review': '👍',
  'rejected review': '👎',
  'deleted review': '🗑️',
  'deleted trip': '🗑️',
  'deleted user': '🗑️',
};

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLog, setModalLog] = useState(null);
  const LOGS_PER_PAGE = 10;
  const admin = JSON.parse(localStorage.getItem('user'));

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/logs', { headers });
      setLogs(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load logs.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Search and filter
  const filtered = logs.filter(log => {
    const adminName = log.adminId?.name?.toLowerCase() || '';
    const action = log.action?.toLowerCase() || '';
    const target = log.targetUserId?.email?.toLowerCase() || '';
    const reason = log.reason?.toLowerCase() || '';
    const q = search.toLowerCase();
    const actionMatch = !actionFilter || log.action === actionFilter;
    const searchMatch = adminName.includes(q) || action.includes(q) || target.includes(q) || reason.includes(q);
    return actionMatch && searchMatch;
  });

  // Sorting
  const [sort, setSort] = useState({ key: 'timestamp', direction: 'desc' });
  const sorted = [...filtered].sort((a, b) => {
    let aValue = a[sort.key];
    let bValue = b[sort.key];
    if (sort.key === 'timestamp') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    } else {
      aValue = aValue?.toString().toLowerCase() || '';
      bValue = bValue?.toString().toLowerCase() || '';
    }
    if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const pageCount = Math.ceil(sorted.length / LOGS_PER_PAGE);
  const paged = sorted.slice((page - 1) * LOGS_PER_PAGE, page * LOGS_PER_PAGE);
  const startIdx = (page - 1) * LOGS_PER_PAGE + 1;
  const endIdx = Math.min(page * LOGS_PER_PAGE, sorted.length);

  // Sort handler
  const handleSort = key => {
    setSort(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc',
    }));
    setPage(1);
  };

  const openLogModal = (log) => {
    setModalLog(log);
    setModalOpen(true);
  };

  const closeLogModal = () => {
    setModalOpen(false);
    setModalLog(null);
  };

  // Statistics
  const totalLogs = logs.length;
  const todayLogs = logs.filter(log => {
    const today = new Date().toDateString();
    return new Date(log.timestamp).toDateString() === today;
  }).length;
  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const actionCounts = uniqueActions.reduce((acc, action) => {
    acc[action] = logs.filter(log => log.action === action).length;
    return acc;
  }, {});

  const columns = [
    { key: 'adminId', label: 'Admin', sortable: true, render: log => 
      log.adminId?.name ? (
        <span style={{ color: '#4e54c8', cursor: 'pointer' }} onClick={() => openLogModal(log)}>
          {log.adminId.name}
        </span>
      ) : '-'
    },
    { key: 'action', label: 'Action', sortable: true, render: log => (
      <span>
        {ACTION_ICONS[log.action] || '📝'} {log.action}
      </span>
    )},
    { key: 'targetUserId', label: 'Target User', sortable: true, render: log => 
      log.targetUserId?.email ? (
        <span style={{ color: '#4e54c8', cursor: 'pointer' }} onClick={() => openLogModal(log)}>
          {log.targetUserId.email}
        </span>
      ) : '-'
    },
    { key: 'reason', label: 'Reason', sortable: false, render: log => log.reason || '-' },
    { key: 'timestamp', label: 'Time', sortable: true, render: log => new Date(log.timestamp).toLocaleString() },
  ];

  const actions = (log) => (
    <button 
      onClick={() => openLogModal(log)} 
      style={{ 
        backgroundColor: '#2196f3', 
        color: 'white', 
        border: 'none', 
        padding: '4px 8px', 
        borderRadius: 4 
      }}
    >
      View Details
    </button>
  );

  return (
    <AdminLayout>
      <h1>Admin Activity Logs</h1>
      
      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, backgroundColor: '#e3f2fd', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1976d2' }}>{totalLogs}</div>
          <div style={{ color: '#666' }}>Total Logs</div>
        </div>
        <div style={{ padding: 16, backgroundColor: '#fff3e0', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f57c00' }}>{todayLogs}</div>
          <div style={{ color: '#666' }}>Today's Actions</div>
        </div>
        <div style={{ padding: 16, backgroundColor: '#e8f5e8', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#388e3c' }}>{uniqueActions.length}</div>
          <div style={{ color: '#666' }}>Action Types</div>
        </div>
        <div style={{ padding: 16, backgroundColor: '#f3e5f5', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#7b1fa2' }}>{admin?.name || 'Admin'}</div>
          <div style={{ color: '#666' }}>Current Admin</div>
        </div>
      </div>

      {/* Action Type Breakdown */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12, color: '#4e54c8' }}>Action Breakdown</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(actionCounts).map(([action, count]) => (
            <div 
              key={action}
              style={{ 
                padding: '8px 12px', 
                backgroundColor: ACTION_COLORS[action] || '#f8f9fa', 
                borderRadius: 6, 
                fontSize: 14,
                cursor: 'pointer',
                border: actionFilter === action ? '2px solid #4e54c8' : '1px solid #e1e5e9'
              }}
              onClick={() => setActionFilter(actionFilter === action ? '' : action)}
            >
              {ACTION_ICONS[action] || '📝'} {action}: {count}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Search logs..." 
          value={search} 
          onChange={e => { setSearch(e.target.value); setPage(1); }} 
          style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e5e9', minWidth: 220 }}
        />
        <select 
          value={actionFilter} 
          onChange={e => { setActionFilter(e.target.value); setPage(1); }} 
          style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e5e9' }}
        >
          <option value="">All Actions</option>
          {uniqueActions.map(action => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
        <span style={{ color: '#888', fontSize: '0.98rem' }}>
          Showing {startIdx}-{endIdx} of {sorted.length} logs
        </span>
      </div>

      <AdminTable
        columns={columns}
        data={paged}
        loading={loading}
        error={error}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        onSort={handleSort}
        sortKey={sort.key}
        sortDirection={sort.direction}
        actions={actions}
        emptyMessage="No logs found."
        rowStyle={(log) => ACTION_COLORS[log.action] ? { background: ACTION_COLORS[log.action] } : {}}
      />

      {/* Log Details Modal */}
      <AdminModal open={modalOpen} onClose={closeLogModal} title={`Log Details - ${modalLog?.action}`}>
        {modalLog && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Action Information</h3>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 24, marginRight: 8 }}>{ACTION_ICONS[modalLog.action] || '📝'}</span>
                <span style={{ fontWeight: 'bold', fontSize: 16 }}>{modalLog.action}</span>
              </div>
              <div><b>Timestamp:</b> {new Date(modalLog.timestamp).toLocaleString()}</div>
              <div><b>Reason:</b> {modalLog.reason || 'No reason provided'}</div>
              {modalLog.outcome && <div><b>Outcome:</b> {modalLog.outcome}</div>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Admin Details</h3>
              <div><b>Name:</b> {modalLog.adminId?.name || 'Unknown'}</div>
              <div><b>Email:</b> {modalLog.adminId?.email || 'Not available'}</div>
              <div><b>ID:</b> {modalLog.adminId?._id || 'Not available'}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Target Details</h3>
              <div><b>Email:</b> {modalLog.targetUserId?.email || 'Not applicable'}</div>
              <div><b>Name:</b> {modalLog.targetUserId?.name || 'Not available'}</div>
              <div><b>ID:</b> {modalLog.targetUserId?._id || 'Not available'}</div>
            </div>

            {modalLog.targetTripId && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Trip Details</h3>
                <div><b>Destination:</b> {modalLog.targetTripId?.destination || 'Unknown'}</div>
                <div><b>Creator:</b> {modalLog.targetTripId?.creator?.name || 'Unknown'}</div>
                <div><b>ID:</b> {modalLog.targetTripId?._id || 'Not available'}</div>
              </div>
            )}

            {modalLog.targetReviewId && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Review Details</h3>
                <div><b>Feedback:</b> {modalLog.targetReviewId?.feedback || 'No feedback'}</div>
                <div><b>Rating:</b> {modalLog.targetReviewId?.rating || 'No rating'}★</div>
                <div><b>ID:</b> {modalLog.targetReviewId?._id || 'Not available'}</div>
              </div>
            )}

            {modalLog.targetFlagId && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Flag Details</h3>
                <div><b>Type:</b> {modalLog.targetFlagId?.flagType || 'Unknown'}</div>
                <div><b>Reason:</b> {modalLog.targetFlagId?.reason || 'No reason'}</div>
                <div><b>ID:</b> {modalLog.targetFlagId?._id || 'Not available'}</div>
              </div>
            )}

            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 6 }}>
              <div style={{ fontSize: 14, color: '#666' }}>
                <b>Log ID:</b> {modalLog._id}
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </AdminLayout>
  );
} 