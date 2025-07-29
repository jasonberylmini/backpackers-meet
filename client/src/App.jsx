import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TripDiscovery from './pages/TripDiscovery';
import UserProfile from './pages/UserProfile';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminKYC from './pages/AdminKYC';
import AdminTrips from './pages/AdminTrips';
import AdminReports from './pages/AdminReports';
import AdminLogs from './pages/AdminLogs';
import ProtectedRoute from './components/ProtectedRoute';
import logo from '../assets/logo.png';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import AdminReviews from './pages/AdminReviews';
import RealTimeDemo from './pages/RealTimeDemo';

function AppRoutes() {
  const location = useLocation();
  // Hide header on admin pages
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isResetPasswordRoute = location.pathname.startsWith('/reset-password');
  return (
    <>
      {!(isAdminRoute || isResetPasswordRoute) && (
        <header className="main-navbar">
          <Link to="/" className="navbar-logo" style={{ textDecoration: 'none' }}>
            <img src={logo} alt="RideTribe Logo" className="logo-img" />
            <span className="logo-text">RideTribe</span>
          </Link>
          <nav className="navbar-links">
            <Link to="/login">Login</Link>
            <Link to="/register">Sign Up</Link>
            <Link to="/realtime-demo" style={{ color: '#007bff', fontWeight: '500' }}>🚀 Real-Time Demo</Link>
          </nav>
        </header>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* User Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/trips/browse" element={
          <ProtectedRoute>
            <TripDiscovery />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }/>
        <Route path="/admin/users" element={
          <ProtectedRoute requiredRole="admin">
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/admin/kyc" element={
          <ProtectedRoute requiredRole="admin">
            <AdminKYC />
          </ProtectedRoute>
        } />
        <Route path="/admin/trips" element={
          <ProtectedRoute requiredRole="admin">
            <AdminTrips />
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute requiredRole="admin">
            <AdminReports />
          </ProtectedRoute>
        } />
        <Route path="/admin/logs" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLogs />
          </ProtectedRoute>
        } />
        <Route path="/admin/reviews" element={
          <ProtectedRoute requiredRole="admin">
            <AdminReviews />
          </ProtectedRoute>
        } />
        
        {/* Demo Route */}
        <Route path="/realtime-demo" element={<RealTimeDemo />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </Router>
  );
} 