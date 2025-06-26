import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import '../pages/AdminDashboard.css';

const typeStyles = {
  bug: { background: '#ffe0e0', color: '#d32f2f', icon: '🐞' },
  feedback: { background: '#e0f7fa', color: '#00796b', icon: '💬' },
  abuse: { background: '#fff3cd', color: '#b8860b', icon: '🚨' },
  system: { background: '#e0e7ff', color: '#4e54c8', icon: '🖥️' },
  other: { background: '#f3f6fd', color: '#222', icon: '📄' },
};

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/reports', { headers });
      setReports(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load reports.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <Topbar title="System Reports" />
        <main className="admin-dashboard-content">
          <h2 style={{ marginBottom: '1.5rem', color: '#4e54c8', fontWeight: 700 }}>System Reports</h2>
          <div className="admin-dashboard-table-wrapper">
            {loading ? (
              <table className="admin-dashboard-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Summary</th>
                    <th>Created At</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="admin-dashboard-table-skeleton-row">
                      <td colSpan={4}><span className="admin-dashboard-table-skeleton" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : error ? (
              <div className="admin-dashboard-table-error">
                {error} <button onClick={fetchReports}>Retry</button>
              </div>
            ) : reports.length === 0 ? (
              <div style={{ color: '#888', fontSize: '1.1rem', padding: '2rem 0' }}>No reports found.</div>
            ) : (
              <table className="admin-dashboard-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Summary</th>
                    <th>Created At</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => {
                    const style = typeStyles[report.reportType] || typeStyles.other;
                    return (
                      <tr key={report._id} style={{ background: style.background, color: style.color }}>
                        <td style={{ fontWeight: 700 }}>
                          <span style={{ marginRight: 6 }}>{style.icon}</span>
                          {report.reportType || 'other'}
                        </td>
                        <td>{report.summary || '-'}</td>
                        <td>{report.createdAt ? new Date(report.createdAt).toLocaleString() : '-'}</td>
                        <td>{report.userId?.name || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 