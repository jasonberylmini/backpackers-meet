import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
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
      const res = await axios.get('/api/admin/resolved-flags', { headers });
      setResolvedFlags(res.data);
    } catch (err) {
      console.error('Failed to fetch resolved flags:', err);
    }
  };

  const fetchDismissedFlags = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/dismissed-flags', { headers });
      setDismissedFlags(res.data);
    } catch (err) {
      console.error('Failed to fetch dismissed flags:', err);
    }
  };

  useEffect(() => {
    fetchSummary(activeTab);
    if (activeTab === 'flag') {
      fetchAllFlags(flagsPage);
      fetchResolvedFlags();
      fetchDismissedFlags();
    }
  }, [activeTab, flagsPage]);

  // Actions
  const handleDeleteTarget = async () => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/admin/${modalTarget.flagType}/${modalTarget.targetId}`, { headers });
      toast.success('Content deleted successfully.');
      setModalOpen(false);
      fetchSummary(activeTab);
    } catch (err) {
      toast.error('Failed to delete content.');
    }
  };

  const handleBanUser = async () => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`/api/admin/users/${modalTarget.targetId}/status`, { status: 'banned' }, { headers });
      toast.success('User banned successfully.');
      setModalOpen(false);
      fetchSummary(activeTab);
    } catch (err) {
      toast.error('Failed to ban user.');
    }
  };

  const handleDismissFlag = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(`/api/admin/flags/${modalTarget._id}/dismiss`, {}, { headers });
      toast.success('Flag dismissed successfully.');
      setModalOpen(false);
      fetchSummary(activeTab);
      fetchAllFlags(flagsPage);
    } catch (err) {
      toast.error('Failed to dismiss flag.');
    }
  };

  const tabStyle = (active) => ({
    padding: '0.75rem 1.5rem',
    marginRight: '0.5rem',
    border: 'none',
    borderRadius: '0.5rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: active ? '#4e54c8' : '#f8f9fa',
    color: active ? 'white' : '#666',
    fontSize: '0.95rem',
  });

  const cardStyle = {
    display: 'flex',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    marginBottom: 24,
  };

  const iconColStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    minWidth: 120,
    background: '#f8f9fa',
  };

  const summaryColStyle = {
    flex: 1,
    padding: '2rem',
  };

  const sectionTitle = {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: '#4e54c8',
    marginBottom: 8,
    marginTop: 16,
  };

  const labelStyle = {
    color: '#666',
    fontSize: '0.9rem',
  };

  const listStyle = {
    margin: '8px 0',
    paddingLeft: '1.5rem',
    fontSize: '0.95rem',
    lineHeight: 1.6,
  };

  const handleEditTarget = () => {
    // TODO: Implement edit functionality
    toast.info('Edit functionality coming soon.');
  };

  const handleWarnUser = () => {
    // TODO: Implement warning system
    toast.info('Warning system coming soon.');
  };

  const handleViewRelatedFlags = () => {
    // TODO: Implement related flags view
    toast.info('Related flags view coming soon.');
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

  // Table columns for all flags
  const flagColumns = [
    { key: 'flagType', label: 'Type', sortable: true, render: f => f.flagType },
    { key: 'target', label: 'Target', sortable: true, render: f => 
      f.flagType === 'user' ? `${f.targetName} (${f.targetEmail})` :
      f.flagType === 'trip' ? f.targetDestination :
      f.flagType === 'review' ? f.targetComment :
      '-'
    },
    { key: 'reason', label: 'Reason', sortable: true, render: f => f.reason },
    { key: 'flaggedBy', label: 'Reporter', sortable: true, render: f => `${f.flaggedBy?.name || 'Unknown'} (${f.flaggedBy?.email || '-'})` },
    { key: 'createdAt', label: 'Date', sortable: true, render: f => new Date(f.createdAt).toLocaleString() },
  ];

  const flagActions = (flag) => (
    <button 
      onClick={() => handleViewDetails(flag)} 
      style={{ 
        fontSize: 12, 
        color: '#4e54c8', 
        background: 'none', 
        border: 'none', 
        cursor: 'pointer', 
        textDecoration: 'underline' 
      }}
    >
      View Details
    </button>
  );

  const pageCount = Math.ceil(flagsTotal / FLAGS_LIMIT);

  return (
    <AdminLayout>
      <h1>System Reports</h1>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
        {REPORT_TABS.map(tab => (
          <button
            key={tab.key}
            style={tabStyle(activeTab === tab.key)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      ) : error ? (
        <div style={{ color: '#d32f2f', padding: '1rem', textAlign: 'center' }}>
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
      )}

      {/* All Flags Table */}
      {activeTab === 'flag' && (
        <>
          <div style={{ marginTop: 32 }}>
            <h2 style={{ color: '#4e54c8', fontWeight: 700, fontSize: '1.2rem', marginBottom: 10 }}>All Flag Submissions</h2>
            <AdminTable
              columns={flagColumns}
              data={allFlags}
              loading={flagsLoading}
              error={null}
              page={flagsPage}
              pageCount={pageCount}
              onPageChange={setFlagsPage}
              onSort={() => {}}
              sortKey={''}
              sortDirection={'asc'}
              actions={flagActions}
              emptyMessage="No flags found."
            />
          </div>

          {/* Resolved Flags Table */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ color: '#43a047', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>Resolved Flags</h2>
            <AdminTable
              columns={flagColumns}
              data={resolvedFlags}
              loading={false}
              error={null}
              page={1}
              pageCount={1}
              onPageChange={() => {}}
              onSort={() => {}}
              sortKey={''}
              sortDirection={'asc'}
              actions={null}
              emptyMessage="No resolved flags."
            />
          </div>

          {/* Dismissed Flags Table */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ color: '#888', fontWeight: 700, fontSize: '1.1rem', marginBottom: 10 }}>Dismissed Flags</h2>
            <AdminTable
              columns={flagColumns}
              data={dismissedFlags}
              loading={false}
              error={null}
              page={1}
              pageCount={1}
              onPageChange={() => {}}
              onSort={() => {}}
              sortKey={''}
              sortDirection={'asc'}
              actions={null}
              emptyMessage="No dismissed flags."
            />
          </div>
        </>
      )}

      {/* Flag Details Modal */}
      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>
        {modalError ? (
          <div style={{ color: '#d32f2f', textAlign: 'center' }}>{modalError}</div>
        ) : modalTarget && (
          <div>
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

            {/* Flag Details */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Flag Details</h3>
              <div><b>Type:</b> {modalTarget.flagType}</div>
              <div><b>Reason:</b> {modalTarget.reason}</div>
              <div><b>Reporter:</b> {modalTarget.flaggedBy?.name || 'Unknown'} ({modalTarget.flaggedBy?.email || '-'})</div>
              <div><b>Date:</b> {new Date(modalTarget.createdAt).toLocaleString()}</div>
              {notificationCount > 0 && <div><b>Notifications Sent:</b> {notificationCount}</div>}
            </div>

            {/* All Flags for This Target */}
            {modalFlags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>All Flags for This Target ({modalFlags.length})</h3>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e1e5e9', borderRadius: 4, padding: 8 }}>
                  {modalFlags.map((flag, index) => (
                    <div key={flag._id} style={{ marginBottom: 8, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
                      <div><b>{index + 1}.</b> {flag.reason}</div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        By {flag.flaggedBy?.name || 'Unknown'} on {new Date(flag.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Moderation Actions */}
            <div style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Moderation Actions</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button 
                  onClick={handleDismissFlag}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#28a745', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 4 
                  }}
                >
                  ✅ Approve / Dismiss Flag
                </button>
                <button 
                  onClick={handleDeleteTarget}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#d32f2f', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 4 
                  }}
                >
                  🚫 Delete Content
                </button>
                {modalTarget.flagType === 'user' && (
                  <button 
                    onClick={handleBanUser}
                    style={{ 
                      padding: '8px 16px', 
                      backgroundColor: '#ff9800', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 4 
                    }}
                  >
                    🚷 Ban User
                  </button>
                )}
                <button 
                  onClick={handleEditTarget}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#2196f3', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 4 
                  }}
                >
                  📝 Edit Content
                </button>
                <button 
                  onClick={handleWarnUser}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#ffc107', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 4 
                  }}
                >
                  👤 Warn User
                </button>
                <button 
                  onClick={handleViewRelatedFlags}
                  style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#9c27b0', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 4 
                  }}
                >
                  📂 View Related Flags
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </AdminLayout>
  );
} 