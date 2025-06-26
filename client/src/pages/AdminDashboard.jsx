import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardCard from '../components/DashboardCard';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import '../pages/AdminDashboard.css';

function sortData(data, key, direction) {
  if (!key) return data;
  // Support nested keys (e.g., 'adminId.name')
  function getValue(obj, path) {
    return path.split('.').reduce((o, p) => (o ? o[p] : ''), obj);
  }
  return [...data].sort((a, b) => {
    let aValue = getValue(a, key);
    let bValue = getValue(b, key);
    // Special handling for date
    if (key === 'createdAt' || key === 'timestamp') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, pendingKYC: 0, trips: 0, reports: 0, logs: 0 });
  const [allUsers, setAllUsers] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [admin, setAdmin] = useState(null);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sorting and pagination state
  const [userSort, setUserSort] = useState({ key: 'createdAt', direction: 'desc' });
  const [userPage, setUserPage] = useState(1);
  const [logSort, setLogSort] = useState({ key: 'timestamp', direction: 'desc' });
  const [logPage, setLogPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const LOGS_PER_PAGE = 10;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    setAdmin(user);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [usersRes, tripsRes, reportsRes, logsRes] = await Promise.all([
        axios.get('/api/admin/users', { headers }),
        axios.get('/api/admin/trips', { headers }),
        axios.get('/api/admin/reports', { headers }),
        axios.get('/api/admin/logs', { headers })
      ]);
      setStats({
        users: usersRes.data.length,
        pendingKYC: usersRes.data.filter(u => u.verificationStatus === 'pending').length,
        trips: tripsRes.data.length,
        reports: reportsRes.data.length,
        logs: logsRes.data.length
      });
      setAllUsers(usersRes.data);
      setAllLogs(logsRes.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sorting and pagination logic for users
  const sortedUsers = sortData(allUsers, userSort.key, userSort.direction);
  const pagedUsers = sortedUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);
  const userPageCount = Math.ceil(sortedUsers.length / USERS_PER_PAGE);

  // Sorting and pagination logic for logs
  const sortedLogs = sortData(allLogs, logSort.key, logSort.direction);
  const pagedLogs = sortedLogs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE);
  const logPageCount = Math.ceil(sortedLogs.length / LOGS_PER_PAGE);

  // Sort handler
  function handleUserSort(key) {
    setUserSort(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
    }));
    setUserPage(1);
  }
  function handleLogSort(key) {
    setLogSort(prev => ({
      key,
      direction: prev.key === key ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc'
    }));
    setLogPage(1);
  }

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <Topbar title="Admin Dashboard" admin={admin} />
        <main className="admin-dashboard-content">
          <div className="admin-dashboard-cards">
            <DashboardCard title="Total Users" value={stats.users} icon="👤" loading={loading} error={error} />
            <DashboardCard title="Pending KYC" value={stats.pendingKYC} icon="🕒" loading={loading} error={error} />
            <DashboardCard title="Total Trips" value={stats.trips} icon="🧳" loading={loading} error={error} />
            <DashboardCard title="Reports" value={stats.reports} icon="📄" loading={loading} error={error} />
            <DashboardCard title="Admin Logs" value={stats.logs} icon="📝" loading={loading} error={error} />
          </div>
          <div className="admin-dashboard-tables">
            <section className="admin-dashboard-table-section">
              <h3 className="admin-dashboard-table-title">Recent User Signups</h3>
              <div className="admin-dashboard-table-wrapper">
                {loading ? (
                  <table className="admin-dashboard-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
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
                    {error} <button onClick={fetchData}>Retry</button>
                  </div>
                ) : (
                  <>
                    <table className="admin-dashboard-table">
                      <thead>
                        <tr>
                          <th onClick={() => handleUserSort('name')} tabIndex={0} className={userSort.key === 'name' ? `sorted-${userSort.direction}` : ''}>Name</th>
                          <th onClick={() => handleUserSort('email')} tabIndex={0} className={userSort.key === 'email' ? `sorted-${userSort.direction}` : ''}>Email</th>
                          <th onClick={() => handleUserSort('role')} tabIndex={0} className={userSort.key === 'role' ? `sorted-${userSort.direction}` : ''}>Role</th>
                          <th onClick={() => handleUserSort('verificationStatus')} tabIndex={0} className={userSort.key === 'verificationStatus' ? `sorted-${userSort.direction}` : ''}>Status</th>
                          <th onClick={() => handleUserSort('createdAt')} tabIndex={0} className={userSort.key === 'createdAt' ? `sorted-${userSort.direction}` : ''}>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedUsers.map(u => (
                          <tr key={u._id} tabIndex={0}>
                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                            <td>{u.verificationStatus}</td>
                            <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Pagination controls */}
                    {userPageCount > 1 && (
                      <div className="admin-dashboard-table-pagination">
                        <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}>Prev</button>
                        <span>Page {userPage} of {userPageCount}</span>
                        <button onClick={() => setUserPage(p => Math.min(userPageCount, p + 1))} disabled={userPage === userPageCount}>Next</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
            <section className="admin-dashboard-table-section">
              <h3 className="admin-dashboard-table-title">Recent Admin Logs</h3>
              <div className="admin-dashboard-table-wrapper">
                {loading ? (
                  <table className="admin-dashboard-table">
                    <thead>
                      <tr>
                        <th>Admin</th>
                        <th>Action</th>
                        <th>User</th>
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
                    {error} <button onClick={fetchData}>Retry</button>
                  </div>
                ) : (
                  <>
                    <table className="admin-dashboard-table">
                      <thead>
                        <tr>
                          <th onClick={() => handleLogSort('adminId.name')} tabIndex={0} className={logSort.key === 'adminId.name' ? `sorted-${logSort.direction}` : ''}>Admin</th>
                          <th onClick={() => handleLogSort('action')} tabIndex={0} className={logSort.key === 'action' ? `sorted-${logSort.direction}` : ''}>Action</th>
                          <th onClick={() => handleLogSort('targetUserId.email')} tabIndex={0} className={logSort.key === 'targetUserId.email' ? `sorted-${logSort.direction}` : ''}>User</th>
                          <th onClick={() => handleLogSort('reason')} tabIndex={0} className={logSort.key === 'reason' ? `sorted-${logSort.direction}` : ''}>Reason</th>
                          <th onClick={() => handleLogSort('timestamp')} tabIndex={0} className={logSort.key === 'timestamp' ? `sorted-${logSort.direction}` : ''}>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedLogs.map(log => (
                          <tr key={log._id} tabIndex={0}>
                            <td>{log.adminId?.name}</td>
                            <td>{log.action}</td>
                            <td>{log.targetUserId?.email}</td>
                            <td>{log.reason}</td>
                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {/* Pagination controls */}
                    {logPageCount > 1 && (
                      <div className="admin-dashboard-table-pagination">
                        <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1}>Prev</button>
                        <span>Page {logPage} of {logPageCount}</span>
                        <button onClick={() => setLogPage(p => Math.min(logPageCount, p + 1))} disabled={logPage === logPageCount}>Next</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
} 