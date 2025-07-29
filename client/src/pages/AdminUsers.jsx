import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUser, setModalUser] = useState(null);

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
    const matchesStatus = statusFilter
      ? (statusFilter === 'banned' ? u.isBanned : !u.isBanned)
      : true;
    return matchesSearch && matchesRole && matchesStatus;
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

  // Modal for user details
  const openUserModal = (user) => {
    setModalUser(user);
    setModalOpen(true);
  };
  const closeUserModal = () => {
    setModalOpen(false);
    setModalUser(null);
  };

  // Table columns
  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'role', label: 'Role', sortable: true },
    { key: 'verificationStatus', label: 'KYC', sortable: true },
    { key: 'createdAt', label: 'Joined', sortable: true, render: u => new Date(u.createdAt).toLocaleDateString() },
    { key: 'isBanned', label: 'Status', sortable: true, render: u => u.isBanned ? 'Banned' : 'Active' },
  ];

  // Table actions
  const actions = (user) => (
    <>
      <button onClick={() => openUserModal(user)} style={{ marginRight: 8 }}>View</button>
      <button onClick={() => handleBanToggle(user._id, user.isBanned)} style={{ color: user.isBanned ? '#28a745' : '#d32f2f' }}>
        {user.isBanned ? 'Unban' : 'Ban'}
      </button>
    </>
  );

  return (
    <AdminLayout>
      <h1>Users</h1>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e5e9', minWidth: 200 }}
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e5e9' }}>
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e5e9' }}>
          <option value="">All Status</option>
          <option value="banned">Banned</option>
          <option value="active">Active</option>
        </select>
      </div>
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
        {modalUser && (
          <div>
            <div><b>Email:</b> {modalUser.email}</div>
            <div><b>Role:</b> {modalUser.role}</div>
            <div><b>KYC Status:</b> {modalUser.verificationStatus}</div>
            <div><b>Status:</b> {modalUser.isBanned ? 'Banned' : 'Active'}</div>
            <div><b>Joined:</b> {new Date(modalUser.createdAt).toLocaleString()}</div>
            {/* Add more user details and actions here */}
          </div>
        )}
      </AdminModal>
    </AdminLayout>
  );
} 