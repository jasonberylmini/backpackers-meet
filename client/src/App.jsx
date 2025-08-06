import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';

import TripDiscovery from './pages/TripDiscovery';
import TripCreation from './pages/TripCreation';
import TripDetails from './pages/TripDetails';
import UserProfile from './pages/UserProfile';
import ProfileView from './pages/ProfileView';
import Expenses from './pages/Expenses';
import SocialFeed from './pages/SocialFeed';
import Messages from './pages/Messages';
import AccountSettings from './pages/AccountSettings';
import Notifications from './pages/Notifications';

import KYCVerification from './pages/KYCVerification';
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

import UserLayout from './components/UserLayout';

function AppRoutes() {
  const location = useLocation();
  // Hide header on admin pages
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isResetPasswordRoute = location.pathname.startsWith('/reset-password');
          const isUserRoute = location.pathname.startsWith('/social') || 
                     location.pathname.startsWith('/trips') || 
                     location.pathname.startsWith('/profile') || 
                     location.pathname.startsWith('/expenses') || 
                     location.pathname.startsWith('/social') || 
                     location.pathname.startsWith('/messages') || 
                     location.pathname.startsWith('/notifications') || 
                     location.pathname.startsWith('/kyc') ||
                     location.pathname.startsWith('/account-settings');
  
  return (
    <>
      {!(isAdminRoute || isResetPasswordRoute || isUserRoute) && (
        <header className="main-navbar">
          <Link to="/" className="navbar-logo" style={{ textDecoration: 'none' }}>
            <img src={logo} alt="RideTribe Logo" className="logo-img" />
            <span className="logo-text">RideTribe</span>
          </Link>
          <nav className="navbar-links">
            <Link to="/login">Login</Link>
            <Link to="/register">Sign Up</Link>
          </nav>
        </header>
      )}
      
      {/* UserLayout will be applied to individual routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* User Routes */}
        <Route path="/trips/browse" element={
          <ProtectedRoute>
            <UserLayout>
              <TripDiscovery />
            </UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/trips/create" element={
          <ProtectedRoute>
            <UserLayout>
              <TripCreation />
            </UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/trips/:tripId" element={
          <ProtectedRoute>
            <UserLayout>
              <TripDetails />
            </UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <UserLayout>
              <ProfileView />
            </UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile/edit" element={
          <ProtectedRoute>
            <UserLayout>
              <UserProfile />
            </UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile/:userId" element={
          <ProtectedRoute>
            <UserLayout>
              <ProfileView />
            </UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/expenses" element={
          <ProtectedRoute>
            <UserLayout>
              <Expenses />
            </UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/social" element={
          <ProtectedRoute>
            <UserLayout>
              <SocialFeed />
            </UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <UserLayout>
              <Messages />
            </UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <UserLayout>
              <Notifications />
            </UserLayout>
          </ProtectedRoute>
        } />

        <Route path="/kyc" element={
          <ProtectedRoute>
            <UserLayout>
              <KYCVerification />
            </UserLayout>
          </ProtectedRoute>
        } />
        <Route path="/account-settings" element={
          <ProtectedRoute>
            <UserLayout>
              <AccountSettings />
            </UserLayout>
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