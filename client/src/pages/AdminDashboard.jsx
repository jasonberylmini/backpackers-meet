import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardCard from '../components/DashboardCard';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import '../pages/AdminDashboard.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, pendingKYC: 0, trips: 0, reports: 0, logs: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    setAdmin(user);
    const headers = { Authorization: `Bearer ${token}` };
    async function fetchData() {
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
      setRecentUsers(usersRes.data.slice(-5).reverse());
      setRecentLogs(logsRes.data.slice(0, 5));
    }
    fetchData();
  }, []);

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <Topbar title="Admin Dashboard" admin={admin} />
        <main className="admin-dashboard-content">
          <div className="admin-dashboard-cards">
            <DashboardCard title="Total Users" value={stats.users} icon="👤" />
            <DashboardCard title="Pending KYC" value={stats.pendingKYC} icon="🕒" />
            <DashboardCard title="Total Trips" value={stats.trips} icon="🧳" />
            <DashboardCard title="Reports" value={stats.reports} icon="📄" />
            <DashboardCard title="Admin Logs" value={stats.logs} icon="📝" />
          </div>
          <div className="admin-dashboard-tables">
            <section className="admin-dashboard-table-section">
              <h3 className="admin-dashboard-table-title">Recent User Signups</h3>
              <div className="admin-dashboard-table-wrapper">
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
                    {recentUsers.map(u => (
                      <tr key={u._id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{u.verificationStatus}</td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="admin-dashboard-table-section">
              <h3 className="admin-dashboard-table-title">Recent Admin Logs</h3>
              <div className="admin-dashboard-table-wrapper">
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
                    {recentLogs.map(log => (
                      <tr key={log._id}>
                        <td>{log.adminId?.name}</td>
                        <td>{log.action}</td>
                        <td>{log.targetUserId?.email}</td>
                        <td>{log.reason}</td>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
} 