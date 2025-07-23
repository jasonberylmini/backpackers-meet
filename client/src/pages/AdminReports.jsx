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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFlags, setModalFlags] = useState([]);
  const [modalTitle, setModalTitle] = useState('');
  const [allFlags, setAllFlags] = useState([]);
  const [flagsPage, setFlagsPage] = useState(1);
  const [flagsTotal, setFlagsTotal] = useState(0);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const FLAGS_LIMIT = 10;
  const [modalTarget, setModalTarget] = useState({});
  const [notificationCount, setNotificationCount] = useState(0);
  const [resolvedFlags, setResolvedFlags] = useState([]);
  const [dismissedFlags, setDismissedFlags] = useState([]);
  const [modalError, setModalError] = useState(null);

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

  const handleViewDetails = async (flag) => {
    setModalOpen(true);
    setModalFlags([]);
    setModalTitle('');
    setModalTarget(null);
    setNotificationCount(0);
    setModalError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      // Fetch all flag submissions for this target
      const res = await axios.get(`/api/admin/flags/${flag.flagType}/${flag.targetId}`, { headers });
      setModalFlags(res.data);
      setModalTitle(
        flag.flagType === 'user' ? `Flags for ${flag.targetName} (${flag.targetEmail})` :
        flag.flagType === 'trip' ? `Flags for ${flag.targetDestination}` :
        flag.flagType === 'review' ? `Flags for review: ${flag.targetComment?.slice(0, 30)}` :
        'Flag Details'
      );
      setModalTarget(flag);
      // Fetch notification count
      const notifRes = await axios.get(`/api/admin/notification-count/${flag.flagType}/${flag.targetId}`, { headers });
      setNotificationCount(notifRes.data.count);
    } catch (err) {
      setModalError('Failed to load flag details.');
    }
  };

  const fetchAllFlags = async (page = 1) => {
    setFlagsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`/api/admin/all-flags?page=${page}&limit=${FLAGS_LIMIT}` , { headers });
      setAllFlags(res.data.flags);
      setFlagsTotal(res.data.total);
      setFlagsLoading(false);
    } catch {
      setFlagsLoading(false);
    }
  };

  // Fetch resolved/dismissed flags
  const fetchResolvedFlags = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res1 = await axios.get(`/api/admin/all-flags?status=resolved`, { headers });
      setResolvedFlags(res1.data.flags);
      const res2 = await axios.get(`/api/admin/all-flags?status=dismissed`, { headers });
      setDismissedFlags(res2.data.flags);
    } catch {}
  };

  // Moderation actions
  const handleDeleteTarget = async () => {
    alert(`Delete action for: ${modalTarget.display || modalTitle}`);
    // TODO: Call backend endpoint to delete trip/review, then resolve flag
    await axios.patch(`/api/admin/flags/${modalFlags[0]._id}/resolve`);
    setModalOpen(false);
    fetchAllFlags(flagsPage);
    fetchResolvedFlags();
  };
  const handleBanUser = async () => {
    alert(`Ban action for: ${modalTarget.display || modalTitle}`);
    // TODO: Call backend endpoint to ban user, then resolve flag
    await axios.patch(`/api/admin/flags/${modalFlags[0]._id}/resolve`);
    setModalOpen(false);
    fetchAllFlags(flagsPage);
    fetchResolvedFlags();
  };
  const handleDismissFlag = async () => {
    await axios.patch(`/api/admin/flags/${modalFlags[0]._id}/dismiss`);
    setModalOpen(false);
    fetchAllFlags(flagsPage);
    fetchResolvedFlags();
  };
  const notificationColor = notificationCount === 0 ? '#43a047' : notificationCount === 1 ? '#fbc02d' : '#d32f2f';
  const notificationText = notificationCount < 3 ? `Send Notification (${3 - notificationCount} left)` : 'Send Notification';

  useEffect(() => {
    fetchSummary(activeTab);
    if (activeTab === 'flag') {
      fetchAllFlags(flagsPage);
      fetchResolvedFlags();
    }
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

  // Robust modal rendering with error boundary
  const renderModal = () => {
    if (!modalOpen) return null;
    if (modalError) {
      return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '90vw', padding: 28, position: 'relative' }}>
            <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer' }} aria-label="Close">×</button>
            <div style={{ color: 'red', fontWeight: 600 }}>{modalError}</div>
          </div>
        </div>
      );
    }
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.35)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(34,48,91,0.13)', padding: 28, position: 'relative' }}>
          <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer' }} aria-label="Close">×</button>
          <h2 style={{ marginBottom: 12, color: '#4e54c8', fontSize: 22 }}>{modalTitle}</h2>
          {/* Contextual Preview */}
          {modalTarget?.type === 'user' && (
            <div style={{ marginBottom: 10, color: '#222' }}>
              {modalTarget.preferences && <div><b>Preferences:</b> {modalTarget.preferences}</div>}
              {modalTarget.gender && <div><b>Gender:</b> {modalTarget.gender}</div>}
            </div>
          )}
          {modalTarget?.type === 'trip' && (
            <div style={{ marginBottom: 10, color: '#222' }}>
              {modalTarget.targetDestination && <div><b>Destination:</b> {modalTarget.targetDestination}</div>}
              {modalTarget.tripDate && <div><b>Date:</b> {modalTarget.tripDate}</div>}
            </div>
          )}
          {modalTarget?.type === 'review' && (
            <div style={{ marginBottom: 10, color: '#222' }}>
              {modalTarget.targetComment && <div><b>Feedback:</b> {modalTarget.targetComment}</div>}
              {modalTarget.rating && <div><b>Rating:</b> {modalTarget.rating}★</div>}
              {modalTarget.tags && modalTarget.tags.length > 0 && <div><b>Tags:</b> {modalTarget.tags.join(', ')}</div>}
            </div>
          )}
          {modalFlags.length === 0 ? (
            <div style={{ color: '#bbb', textAlign: 'center' }}>No flag submissions found.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {modalFlags.map((flag, i) => (
                <li key={flag._id || i} style={{ marginBottom: 18, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
                  <div style={{ fontWeight: 600, color: '#4e54c8' }}>{flag.reason}</div>
                  <div style={{ color: '#222', margin: '4px 0 6px 0' }}>Reported by: {flag.flaggedBy?.name || 'Unknown'} ({flag.flaggedBy?.email || '-'})</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Date: {new Date(flag.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Moderation actions (implement handlers as needed) */}
            {/* Approve/Dismiss Flag (all types) */}
            <button style={{ fontSize: 14, color: '#43a047', background: 'none', border: '1px solid #43a047', borderRadius: 8, padding: '8px 15px', cursor: 'pointer' }} onClick={handleDismissFlag}>
              ✅ Approve / Dismiss Flag
            </button>
            {/* Delete (all types) */}
            <button style={{ fontSize: 14, color: '#d32f2f', background: 'none', border: '1px solid #d32f2f', borderRadius: 8, padding: '8px 15px', cursor: 'pointer' }} onClick={handleDeleteTarget}>
              🚫 {modalTarget?.type === 'user' ? 'Delete User' : modalTarget?.type === 'trip' ? 'Delete Trip' : modalTarget?.type === 'review' ? 'Delete Review' : 'Delete'}
            </button>
            {/* Edit (review/trip only) */}
            {(modalTarget?.type === 'review' || modalTarget?.type === 'trip') && (
              <button style={{ fontSize: 14, color: '#4e54c8', background: 'none', border: '1px solid #4e54c8', borderRadius: 8, padding: '8px 15px', cursor: 'pointer' }} onClick={handleEditTarget}>
                📝 Edit {modalTarget?.type === 'review' ? 'Review' : 'Trip'} Details
              </button>
            )}
            {/* Warn/Message User (user only) */}
            {modalTarget?.type === 'user' && (
              <button style={{ fontSize: 14, color: '#fbc02d', background: 'none', border: '1px solid #fbc02d', borderRadius: 8, padding: '8px 15px', cursor: 'pointer' }} onClick={handleWarnUser}>
                👤 Warn or Message User
              </button>
            )}
            {/* Suspend/Ban User (user only) */}
            {modalTarget?.type === 'user' && (
              <button style={{ fontSize: 14, color: '#d32f2f', background: 'none', border: '1px solid #d32f2f', borderRadius: 8, padding: '8px 15px', cursor: 'pointer' }} onClick={handleBanUser}>
                🚷 Suspend or Ban User
              </button>
            )}
            {/* View Related Flags (all types) */}
            <button style={{ fontSize: 14, color: '#4e54c8', background: 'none', border: '1px solid #4e54c8', borderRadius: 8, padding: '8px 15px', cursor: 'pointer' }} onClick={handleViewRelatedFlags}>
              📂 View Related Flags
            </button>
            <button style={{ fontSize: 12, color: '#888', background: 'none', border: '1px solid #888', borderRadius: 8, padding: '8px 15px', cursor: 'pointer' }} onClick={() => setModalOpen(false)}>Close</button>
          </div>
        </div>
      </div>
    );
  };

  // Handler stubs for new actions
  const handleEditTarget = () => {
    alert(`Edit action for: ${modalTarget?.display || modalTitle}`);
    // TODO: Implement edit modal or redirect
  };
  const handleWarnUser = () => {
    alert(`Warn/Message action for: ${modalTarget?.display || modalTitle}`);
    // TODO: Implement warn/message modal
  };
  const handleViewRelatedFlags = () => {
    alert(`View related flags for: ${modalTarget?.display || modalTitle}`);
    // TODO: Implement related flags view
  };

  const fetchFlagDetails = (flagType, targetId, modalTitle, modalTarget) => {
    // Compose a flag object compatible with handleViewDetails
    const flag = {
      flagType,
      targetId,
      // For modal title and display, pass through extra info
      ...modalTarget,
    };
    handleViewDetails(flag);
  };

  return (
    <div className="admin-dashboard-root">
      <Sidebar />
      <div className="admin-dashboard-main">
        <Topbar />
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
              <div className="admin-dashboard-content-card">
                <div className="admin-users-header-row">
                  <div className="admin-logged-in-as">Logged in as Admin: <span>{JSON.parse(localStorage.getItem('user'))?.name}</span></div>
                  <h1 className="admin-section-title">Reports</h1>
                </div>
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
                        <div style={{ marginBottom: 12 }}><span style={sectionTitle}>By Type:</span> <span style={labelStyle}>User:</span> {summary.byType?.user ?? '-'}, <span style={labelStyle}>Trip:</span> {summary.byType?.trip ?? '-'}, <span style={labelStyle}>Review:</span> {summary.byType?.review ?? '-'}</div>
                        <div style={sectionTitle}>Flagged Users:</div>
                        <ol style={listStyle}>
                          {Array.isArray(summary.userFlags) && summary.userFlags.length > 0 ? summary.userFlags.map((f, i) => (
                            <li key={f._id}><b>{i + 1}.</b> {f.targetName} <span style={labelStyle}>({f.targetEmail})</span> <b>- {f.count} flags</b> <span style={labelStyle}>Reason: {f.reason}</span> <button style={{ fontSize: 12, color: '#4e54c8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginLeft: 8 }} onClick={() => fetchFlagDetails('user', f._id, `Flags for ${f.targetName}`, { targetName: f.targetName, targetEmail: f.targetEmail, type: 'user', id: f._id })}>View Details</button></li>
                          )) : <li style={labelStyle}>None</li>}
                        </ol>
                        <div style={sectionTitle}>Flagged Trips:</div>
                        <ol style={listStyle}>
                          {Array.isArray(summary.tripFlags) && summary.tripFlags.length > 0 ? summary.tripFlags.map((f, i) => (
                            <li key={f._id}><b>{i + 1}.</b> {f.targetDestination || 'Unknown'} <b>- {f.count} flags</b> <span style={labelStyle}>Reason: {f.reason}</span> <button style={{ fontSize: 12, color: '#4e54c8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginLeft: 8 }} onClick={() => fetchFlagDetails('trip', f._id, `Flags for ${f.targetDestination}`, { targetDestination: f.targetDestination, type: 'trip', id: f._id })}>View Details</button></li>
                          )) : <li style={labelStyle}>None</li>}
                        </ol>
                        <div style={sectionTitle}>Flagged Reviews:</div>
                        <ol style={listStyle}>
                          {Array.isArray(summary.reviewFlags) && summary.reviewFlags.length > 0 ? summary.reviewFlags.map((f, i) => (
                            <li key={f._id}><b>{i + 1}.</b> <span style={{ fontStyle: 'italic' }}>{f.comment ? `"${f.comment}"` : 'No comment'}</span> <b>- {f.count} flags</b> <span style={labelStyle}>Reason: {f.reason}</span> <button style={{ fontSize: 12, color: '#4e54c8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginLeft: 8 }} onClick={() => fetchFlagDetails('review', f._id, `Flags for review: ${f.comment?.slice(0, 30)}`, { targetComment: f.comment, type: 'review', id: f._id })}>View Details</button></li>
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
              </div>
            )}
            {activeTab === 'flag' && (
              <>
                <div style={{ marginTop: 32 }}>
                  <h2 style={{ color: '#4e54c8', fontWeight: 700, fontSize: '1.2rem', marginBottom: 10 }}>All Flag Submissions</h2>
                  {flagsLoading ? (
                    <div style={{ color: '#bbb', padding: 20 }}>Loading flags...</div>
                  ) : (
                    <>
                      <table className="admin-dashboard-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Target</th>
                            <th>Reason</th>
                            <th>Reporter</th>
                            <th>Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allFlags.map(flag => (
                            <tr key={flag._id}>
                              <td>{flag.flagType}</td>
                              <td>{
                                flag.flagType === 'user' ? `${flag.targetName} (${flag.targetEmail})` :
                                flag.flagType === 'trip' ? flag.targetDestination :
                                flag.flagType === 'review' ? flag.targetComment :
                                '-'
                              }</td>
                              <td>{flag.reason}</td>
                              <td>{flag.flaggedBy?.name || 'Unknown'} ({flag.flaggedBy?.email || '-'})</td>
                              <td>{new Date(flag.createdAt).toLocaleString()}</td>
                              <td>
                                <button style={{ fontSize: 12, color: '#4e54c8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleViewDetails(flag)}>View Details</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {flagsTotal > FLAGS_LIMIT && (
                        <div className="admin-dashboard-table-pagination">
                          <button onClick={() => setFlagsPage(p => Math.max(1, p - 1))} disabled={flagsPage === 1}>Prev</button>
                          <span>Page {flagsPage} of {Math.ceil(flagsTotal / FLAGS_LIMIT)}</span>
                          <button onClick={() => setFlagsPage(p => Math.min(Math.ceil(flagsTotal / FLAGS_LIMIT), p + 1))} disabled={flagsPage === Math.ceil(flagsTotal / FLAGS_LIMIT)}>Next</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {/* Resolved Flags Table */}
                <div style={{ marginTop: 32 }}>
                  <h2 style={{ color: '#43a047', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>Resolved Flags</h2>
                  <table className="admin-dashboard-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Target</th>
                        <th>Reason</th>
                        <th>Reporter</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resolvedFlags.length === 0 ? <tr><td colSpan={5} style={{ color: '#bbb', textAlign: 'center' }}>No resolved flags.</td></tr> : resolvedFlags.map(flag => (
                        <tr key={flag._id}>
                          <td>{flag.flagType}</td>
                          <td>{flag.flagType === 'user' ? `${flag.targetName} (${flag.targetEmail})` : flag.flagType === 'trip' ? flag.targetDestination : flag.flagType === 'review' ? flag.targetComment : '-'}</td>
                          <td>{flag.reason}</td>
                          <td>{flag.flaggedBy?.name || 'Unknown'} ({flag.flaggedBy?.email || '-'})</td>
                          <td>{new Date(flag.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Dismissed Flags Table */}
                <div style={{ marginTop: 32 }}>
                  <h2 style={{ color: '#888', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>Dismissed Flags</h2>
                  <table className="admin-dashboard-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Target</th>
                        <th>Reason</th>
                        <th>Reporter</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dismissedFlags.length === 0 ? <tr><td colSpan={5} style={{ color: '#bbb', textAlign: 'center' }}>No dismissed flags.</td></tr> : dismissedFlags.map(flag => (
                        <tr key={flag._id}>
                          <td>{flag.flagType}</td>
                          <td>{flag.flagType === 'user' ? `${flag.targetName} (${flag.targetEmail})` : flag.flagType === 'trip' ? flag.targetDestination : flag.flagType === 'review' ? flag.targetComment : '-'}</td>
                          <td>{flag.reason}</td>
                          <td>{flag.flaggedBy?.name || 'Unknown'} ({flag.flaggedBy?.email || '-'})</td>
                          <td>{new Date(flag.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </main>
        {renderModal()}
      </div>
    </div>
  );
} 