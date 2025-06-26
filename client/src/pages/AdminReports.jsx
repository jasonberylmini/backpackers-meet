import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import '../pages/AdminDashboard.css';

const typeStyles = {
  flag: { background: '#ffe0e0', color: '#d32f2f', icon: '📄' },
  trip: { background: '#e0f7fa', color: '#00796b', icon: '🧳' },
  user: { background: '#e0e7ff', color: '#4e54c8', icon: '👤' },
  other: { background: '#f3f6fd', color: '#222', icon: '📄' },
};

const REPORT_TABS = [
  { key: 'flag', label: 'Flag Reports' },
  { key: 'trip', label: 'Trip Report' },
  { key: 'user', label: 'User Report' },
];

export default function AdminReports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('flag');

  const fetchSummary = async (type) => {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`/api/admin/reports?type=${type}`, { headers });
      setSummary(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load report.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(activeTab);
    // eslint-disable-next-line
  }, [activeTab]);

  // Enhanced styles
  const tabStyle = (active) => ({
    padding: '0.8rem 2.5rem',
    fontWeight: 700,
    fontSize: '1.08rem',
    color: active ? '#fff' : '#4e54c8',
    background: active ? '#4e54c8' : '#e0e7ff',
    border: 'none',
    borderRadius: '1.5rem 1.5rem 0 0',
    marginRight: 12,
    cursor: 'pointer',
    outline: 'none',
    boxShadow: active ? '0 4px 16px rgba(80,80,160,0.10)' : '0 2px 8px rgba(80,80,160,0.04)',
    transition: 'background 0.18s, color 0.18s, box-shadow 0.18s',
    borderBottom: active ? '4px solid #fff' : '4px solid #e0e7ff',
  });
  const tabHoverStyle = {
    background: '#d1d9ff',
    color: '#222',
  };
  const cardStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    background: '#fff',
    borderRadius: 18,
    boxShadow: '0 4px 24px rgba(80,80,160,0.10)',
    margin: '1.5rem 0',
    padding: '2.2rem 2.5rem',
    border: '1.5px solid #e0e7ff',
    minHeight: 180,
    gap: 32,
  };
  const iconColStyle = {
    minWidth: 120,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    fontSize: '2.5rem',
    color: '#4e54c8',
    fontWeight: 700,
    marginTop: 8,
  };
  const summaryColStyle = {
    flex: 1,
    fontFamily: 'Segoe UI, Arial, sans-serif',
    fontSize: '1.08rem',
    color: '#222',
    lineHeight: 1.7,
  };
  const sectionTitle = { fontWeight: 700, margin: '1.2em 0 0.4em 0', color: '#4e54c8', fontSize: '1.13rem', letterSpacing: 0.2 };
  const listStyle = { margin: '0.2em 0 1em 0', paddingLeft: 28, fontSize: '1.04rem' };
  const numberStyle = { color: '#4e54c8', fontWeight: 700, marginRight: 6 };
  const labelStyle = { color: '#888', fontWeight: 400 };

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <Topbar title="System Reports" />
        <main className="admin-dashboard-content">
          <h2 style={{ marginBottom: '1.5rem', color: '#4e54c8', fontWeight: 800, fontSize: '2.1rem', letterSpacing: 0.5 }}>System Reports</h2>
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
            {REPORT_TABS.map(tab => (
              <button
                key={tab.key}
                style={tabStyle(activeTab === tab.key)}
                onMouseOver={e => !activeTab && Object.assign(e.target.style, tabHoverStyle)}
                onMouseOut={e => !activeTab && Object.assign(e.target.style, tabStyle(false))}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="admin-dashboard-table-wrapper" style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
            ) : error ? (
              <div className="admin-dashboard-table-error">
                {error} <button onClick={() => fetchSummary(activeTab)}>Retry</button>
              </div>
            ) : !summary ? (
              <div style={{ color: '#888', fontSize: '1.1rem', padding: '2rem 0' }}>No data found.</div>
            ) : (
              <div style={cardStyle}>
                {/* Icon/Type Column */}
                <div style={iconColStyle}>
                  <span style={{ fontSize: '2.7rem', marginBottom: 8 }}>{typeStyles[summary.reportType]?.icon}</span>
                  <span style={{ color: typeStyles[summary.reportType]?.color, fontWeight: 700, fontSize: '1.13rem', textAlign: 'center' }}>
                    {REPORT_TABS.find(t => t.key === summary.reportType)?.label}
                  </span>
                </div>
                {/* Summary Column */}
                <div style={summaryColStyle}>
                  {summary.reportType === 'flag' && (
                    <>
                      <div style={sectionTitle}>Total Flags: <span style={{ color: '#222', fontWeight: 600 }}>{summary.totalFlags ?? '-'}</span></div>
                      <div style={{ marginBottom: 12 }}><span style={sectionTitle}>By Type:</span> <span style={labelStyle}>User:</span> {summary.byType?.user ?? '-'}, <span style={labelStyle}>Review:</span> {summary.byType?.review ?? '-'}</div>
                      <div style={sectionTitle}>Top 3 Flagged Users:</div>
                      <ol style={listStyle}>
                        {Array.isArray(summary.topFlaggedUsers) && summary.topFlaggedUsers.length > 0 ? summary.topFlaggedUsers.map((u) => (
                          <li key={u._id}>{u.name} <span style={labelStyle}>({u.email})</span> <b>- {u.count} flags</b></li>
                        )) : <li style={labelStyle}>None</li>}
                      </ol>
                      <div style={sectionTitle}>Top 3 Flagged Reviews:</div>
                      <ol style={listStyle}>
                        {Array.isArray(summary.topFlaggedReviews) && summary.topFlaggedReviews.length > 0 ? summary.topFlaggedReviews.map((r) => (
                          <li key={r._id}><span style={{ fontStyle: 'italic' }}>{r.comment ? `"${r.comment}"` : 'No comment'}</span> (Rating: {r.rating}) <b>- {r.count} flags</b>{r.reviewer && (<span style={labelStyle}> by {r.reviewer.name} ({r.reviewer.email})</span>)}</li>
                        )) : <li style={labelStyle}>None</li>}
                      </ol>
                    </>
                  )}
                  {summary.reportType === 'trip' && (
                    <>
                      <div style={sectionTitle}>Total Trips: <span style={{ color: '#222', fontWeight: 600 }}>{summary.totalTrips ?? '-'}</span></div>
                      <div style={{ marginBottom: 12 }}><span style={sectionTitle}>By Type:</span> {summary.byType ? Object.entries(summary.byType).map(([type, count]) => <span key={type}><span style={labelStyle}>{type}:</span> {count} &nbsp;</span>) : '-'}</div>
                      <div style={sectionTitle}>Top 3 Destinations:</div>
                      <ol style={listStyle}>
                        {Array.isArray(summary.topDestinations) && summary.topDestinations.length > 0 ? summary.topDestinations.map((d) => (
                          <li key={d.destination}>{d.destination} <b>- {d.count} trips</b></li>
                        )) : <li style={labelStyle}>None</li>}
                      </ol>
                    </>
                  )}
                  {summary.reportType === 'user' && (
                    <>
                      <div style={sectionTitle}>Total Users: <span style={{ color: '#222', fontWeight: 600 }}>{summary.totalUsers ?? '-'}</span></div>
                      <div style={sectionTitle}>New Users (Last 30 Days): <span style={{ color: '#222', fontWeight: 600 }}>{summary.newUsersLast30Days ?? '-'}</span></div>
                      <div style={sectionTitle}>Recent Signups:</div>
                      <ol style={listStyle}>
                        {Array.isArray(summary.recentSignups) && summary.recentSignups.length > 0 ? summary.recentSignups.map((u) => (
                          <li key={u._id}>{u.name} <span style={labelStyle}>({u.email})</span></li>
                        )) : <li style={labelStyle}>None</li>}
                      </ol>
                      <div style={sectionTitle}>Most Active Users:</div>
                      <ol style={listStyle}>
                        {Array.isArray(summary.mostActive) && summary.mostActive.length > 0 ? summary.mostActive.map((u) => (
                          <li key={u._id}>{u.name} <span style={labelStyle}>({u.email})</span> <b>- {u.tripCount} trips</b></li>
                        )) : <li style={labelStyle}>None</li>}
                      </ol>
                      <div style={sectionTitle}>Top 3 Creators:</div>
                      <ol style={listStyle}>
                        {Array.isArray(summary.topCreators) && summary.topCreators.length > 0 ? summary.topCreators.map((u) => (
                          <li key={u._id}>{u.name} <span style={labelStyle}>({u.email})</span> <b>- {u.count} trips</b></li>
                        )) : <li style={labelStyle}>None</li>}
                      </ol>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
} 