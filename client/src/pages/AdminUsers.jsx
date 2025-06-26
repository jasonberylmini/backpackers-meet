import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import '../pages/AdminDashboard.css';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 10;

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

  // Filtering
  const filtered = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesStatus = statusFilter ? (statusFilter === 'banned' ? u.banned : !u.banned) : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const pageCount = Math.ceil(filtered.length / USERS_PER_PAGE);
  const paged = filtered.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  // Ban/Unban
  const handleBanToggle = async (userId, banned) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`/api/admin/users/${userId}/ban`, { banned: !banned }, { headers });
      fetchUsers();
    } catch (err) {
      alert('Failed to update user status.');
    }
  };

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <Topbar title="Manage Users" />
        <main className="admin-dashboard-content">
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by name or email"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #cfd8fc', minWidth: 200 }}
            />
            <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cfd8fc' }}>
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cfd8fc' }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
            </select>
          </div>
          <div className="admin-dashboard-table-wrapper">
            {loading ? (
              <table className="admin-dashboard-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
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
                {error} <button onClick={fetchUsers}>Retry</button>
              </div>
            ) : (
              <>
                <table className="admin-dashboard-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(u => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{u.banned ? 'Banned' : 'Active'}</td>
                        <td>
                          <button
                            style={{
                              background: u.banned ? '#4e54c8' : '#d32f2f',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '0.5rem',
                              padding: '0.3rem 1rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'background 0.18s',
                            }}
                            onClick={() => handleBanToggle(u._id, u.banned)}
                          >
                            {u.banned ? 'Unban' : 'Ban'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination controls */}
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
        </main>
      </div>
    </div>
  );
} 