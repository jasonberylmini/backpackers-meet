import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import '../pages/AdminDashboard.css';

const ACTION_COLORS = {
  'banned user': '#fde2e1',
  'verified user': '#e1f7e7',
  'unbanned user': '#e1eaff',
};

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'timestamp', direction: 'desc' });
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
    const q = search.toLowerCase();
    return adminName.includes(q) || action.includes(q) || target.includes(q);
  });

  // Sorting
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

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <main className="admin-dashboard-content">
          <div className="admin-dashboard-content-card">
            <div className="admin-users-header-row">
              <div className="admin-logged-in-as">Logged in as Admin: <span>{admin?.name}</span></div>
              <h1 className="admin-section-title">Logs</h1>
            </div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cfd8fc', minWidth: 220 }}
              />
              <span style={{ color: '#888', fontSize: '0.98rem' }}>
                Showing {startIdx}-{endIdx} of {sorted.length} logs
              </span>
            </div>
            <div className="admin-dashboard-table-wrapper">
              {loading ? (
                <table className="admin-dashboard-table">
                  <thead>
                    <tr>
                      <th>Admin</th>
                      <th>Action</th>
                      <th>Target User</th>
                      <th>Reason</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="admin-dashboard-table-skeleton-row">
                        <td colSpan={5}><span className="admin-dashboard-table-skeleton" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : error ? (
                <div className="admin-dashboard-table-error">
                  {error} <button onClick={fetchLogs}>Retry</button>
                </div>
              ) : sorted.length === 0 ? (
                <div style={{ color: '#888', fontSize: '1.1rem', padding: '2rem 0' }}>No logs found.</div>
              ) : (
                <>
                  <table className="admin-dashboard-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort('adminId')} style={{ cursor: 'pointer' }}>Admin</th>
                        <th onClick={() => handleSort('action')} style={{ cursor: 'pointer' }}>Action</th>
                        <th onClick={() => handleSort('targetUserId')} style={{ cursor: 'pointer' }}>Target User</th>
                        <th>Reason</th>
                        <th onClick={() => handleSort('timestamp')} style={{ cursor: 'pointer' }}>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.map(log => (
                        <tr key={log._id} style={ACTION_COLORS[log.action] ? { background: ACTION_COLORS[log.action] } : {}}>
                          <td>
                            {log.adminId?.name ? (
                              <a href="#" style={{ color: '#4e54c8', textDecoration: 'underline', cursor: 'pointer' }}>{log.adminId.name}</a>
                            ) : '-'}
                          </td>
                          <td>{log.action}</td>
                          <td>
                            {log.targetUserId?.email ? (
                              <a href="#" style={{ color: '#4e54c8', textDecoration: 'underline', cursor: 'pointer' }}>{log.targetUserId.email}</a>
                            ) : '-'}
                          </td>
                          <td>{log.reason || '-'}</td>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pageCount > 1 && (
                    <div className="admin-dashboard-table-pagination">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                      <span>Page {page} of {pageCount}</span>
                      <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}>Next</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 