import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import AdminLayout from '../components/AdminLayout';
import AdminTable from '../components/AdminTable';
import AdminModal from '../components/AdminModal';
import '../pages/AdminDashboard.css';

export default function AdminTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tripType, setTripType] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTrip, setModalTrip] = useState(null);

  const fetchTrips = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const params = { page, limit };
      if (search) params.search = search;
      if (tripType) params.tripType = tripType;
      const res = await axios.get('/api/admin/trips', { headers, params });
      setTrips(res.data.trips || res.data);
      setTotal(res.data.total || res.data.length);
      setLoading(false);
    } catch (err) {
      setError('Failed to load trips.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, [page, search, tripType]);

  const handleDelete = async (tripId) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) return;
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`/api/admin/trips/${tripId}`, { headers });
      toast.success('Trip deleted successfully.');
      fetchTrips();
    } catch (err) {
      toast.error('Failed to delete trip.');
    }
  };

  const openTripModal = (trip) => {
    setModalTrip(trip);
    setModalOpen(true);
  };

  const closeTripModal = () => {
    setModalOpen(false);
    setModalTrip(null);
  };

  // Statistics
  const totalTrips = trips.length;
  const activeTrips = trips.filter(t => new Date(t.startDate || t.date) > new Date()).length;
  const completedTrips = trips.filter(t => new Date(t.endDate || t.date) < new Date()).length;
  const avgMembers = trips.length > 0 ? (trips.reduce((sum, t) => sum + (t.members?.length || 0), 0) / trips.length).toFixed(1) : 0;

  const columns = [
    { key: 'destination', label: 'Destination', sortable: true, render: t => t.destination || 'Unknown' },
    { key: 'date', label: 'Date', sortable: true, render: t => {
      if (t.startDate && t.endDate) {
        return `${new Date(t.startDate).toLocaleDateString()} - ${new Date(t.endDate).toLocaleDateString()}`;
      }
      return t.date ? new Date(t.date).toLocaleDateString() : '-';
    }},
    { key: 'budget', label: 'Budget', sortable: true, render: t => t.budget ? `₹${t.budget}` : '-' },
    { key: 'tripType', label: 'Type', sortable: true, render: t => t.tripType || '-' },
    { key: 'creator', label: 'Creator', sortable: true, render: t => t.creator?.name || '-' },
    { key: 'members', label: 'Members', sortable: true, render: t => t.members ? t.members.length : 0 },
    { key: 'status', label: 'Status', sortable: true, render: t => {
      const startDate = new Date(t.startDate || t.date);
      const endDate = new Date(t.endDate || t.date);
      const now = new Date();
      if (startDate > now) return '🟡 Upcoming';
      if (endDate < now) return '🟢 Completed';
      return '🔵 Active';
    }},
  ];

  const actions = (trip) => (
    <>
      <button 
        onClick={() => openTripModal(trip)} 
        style={{ 
          marginRight: 8, 
          backgroundColor: '#2196f3', 
          color: 'white', 
          border: 'none', 
          padding: '4px 8px', 
          borderRadius: 4 
        }}
      >
        View
      </button>
      <button 
        onClick={() => handleDelete(trip._id)} 
        style={{ 
          backgroundColor: '#d32f2f', 
          color: 'white', 
          border: 'none', 
          padding: '4px 8px', 
          borderRadius: 4 
        }}
      >
        Delete
      </button>
    </>
  );

  const pageCount = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <h1>Trip Management</h1>
      
      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, backgroundColor: '#e3f2fd', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1976d2' }}>{totalTrips}</div>
          <div style={{ color: '#666' }}>Total Trips</div>
        </div>
        <div style={{ padding: 16, backgroundColor: '#fff3e0', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#f57c00' }}>{activeTrips}</div>
          <div style={{ color: '#666' }}>Active Trips</div>
        </div>
        <div style={{ padding: 16, backgroundColor: '#e8f5e8', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#388e3c' }}>{completedTrips}</div>
          <div style={{ color: '#666' }}>Completed</div>
        </div>
        <div style={{ padding: 16, backgroundColor: '#f3e5f5', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#7b1fa2' }}>{avgMembers}</div>
          <div style={{ color: '#666' }}>Avg Members</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Search destinations..." 
          value={search} 
          onChange={e => { setSearch(e.target.value); setPage(1); }} 
          style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e5e9', minWidth: 200 }}
        />
        <select 
          value={tripType} 
          onChange={e => { setTripType(e.target.value); setPage(1); }} 
          style={{ padding: 8, borderRadius: 6, border: '1px solid #e1e5e9' }}
        >
          <option value="">All Types</option>
          <option value="carpool">Carpool</option>
          <option value="group">Group</option>
          <option value="solo">Solo</option>
          <option value="business">Business</option>
        </select>
      </div>

      <AdminTable
        columns={columns}
        data={trips}
        loading={loading}
        error={error}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        onSort={() => {}}
        sortKey={''}
        sortDirection={'asc'}
        actions={actions}
        emptyMessage="No trips found."
      />

      {/* Trip Details Modal */}
      <AdminModal open={modalOpen} onClose={closeTripModal} title={`Trip Details - ${modalTrip?.destination}`}>
        {modalTrip && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Trip Information</h3>
              <div><b>Destination:</b> {modalTrip.destination}</div>
              <div><b>Description:</b> {modalTrip.description || 'No description provided'}</div>
              <div><b>Type:</b> {modalTrip.tripType || 'Not specified'}</div>
              <div><b>Budget:</b> {modalTrip.budget ? `₹${modalTrip.budget}` : 'Not specified'}</div>
              {modalTrip.startDate && modalTrip.endDate && (
                <div><b>Duration:</b> {new Date(modalTrip.startDate).toLocaleDateString()} - {new Date(modalTrip.endDate).toLocaleDateString()}</div>
              )}
              {modalTrip.date && (
                <div><b>Date:</b> {new Date(modalTrip.date).toLocaleDateString()}</div>
              )}
              <div><b>Status:</b> {
                (() => {
                  const startDate = new Date(modalTrip.startDate || modalTrip.date);
                  const endDate = new Date(modalTrip.endDate || modalTrip.date);
                  const now = new Date();
                  if (startDate > now) return '🟡 Upcoming';
                  if (endDate < now) return '🟢 Completed';
                  return '🔵 Active';
                })()
              }</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Creator</h3>
              <div><b>Name:</b> {modalTrip.creator?.name || 'Unknown'}</div>
              <div><b>Email:</b> {modalTrip.creator?.email || 'Not available'}</div>
              <div><b>Phone:</b> {modalTrip.creator?.phone || 'Not available'}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Members ({modalTrip.members?.length || 0})</h3>
              {modalTrip.members && modalTrip.members.length > 0 ? (
                <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #e1e5e9', borderRadius: 4, padding: 8 }}>
                  {modalTrip.members.map((member, index) => (
                    <div key={member._id || index} style={{ marginBottom: 4, padding: 4, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
                      {member.name || member.email || 'Unknown Member'}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#666', fontStyle: 'italic' }}>No members yet</div>
              )}
            </div>

            {modalTrip.images && modalTrip.images.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 8, color: '#4e54c8' }}>Images ({modalTrip.images.length})</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {modalTrip.images.map((image, index) => (
                    <img 
                      key={index} 
                      src={image} 
                      alt={`Trip image ${index + 1}`} 
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <button 
                onClick={() => handleDelete(modalTrip._id)} 
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#d32f2f', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4 
                }}
              >
                Delete Trip
              </button>
              <button 
                onClick={() => {
                  // TODO: Implement edit functionality
                  toast.info('Edit functionality coming soon.');
                }} 
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#2196f3', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 4 
                }}
              >
                Edit Trip
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </AdminLayout>
  );
} 