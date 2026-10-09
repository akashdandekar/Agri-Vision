import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Home from './pages/Home';

// Farmer Pages
import FarmerLogin from './pages/farmer/FarmerLogin';
import FarmerRegister from './pages/farmer/FarmerRegister';
import FarmerDashboard from './pages/farmer/FarmerDashboard';
import FarmerProduce from './pages/farmer/FarmerProduce';
import FarmerBooking from './pages/farmer/FarmerBooking';
import FarmerQueue from './pages/farmer/FarmerQueue';
import FarmerProcurement from './pages/farmer/FarmerProcurement';
import FarmerNotifications from './pages/farmer/FarmerNotifications';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCentres from './pages/admin/AdminCentres';
import AdminBookings from './pages/admin/AdminBookings';
import AdminQueue from './pages/admin/AdminQueue';
import AdminQuality from './pages/admin/AdminQuality';
import AdminProcurement from './pages/admin/AdminProcurement';
import AdminPayments from './pages/admin/AdminPayments';
import AdminAnalytics from './pages/admin/AdminAnalytics';

function AppLayout({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Show sidebar only on authenticated dashboard routes
  const isAuthRoute = isAuthenticated && (
    location.pathname.startsWith('/farmer/') || location.pathname.startsWith('/admin/')
  ) && !location.pathname.includes('/login') && !location.pathname.includes('/register');

  return (
    <div className="app-container">
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        {isAuthRoute && <Sidebar />}
        <main style={{ flex: 1, minWidth: 0, paddingBottom: '3rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                {/* Public Gateway */}
                <Route path="/" element={<Home />} />

                {/* Farmer Routes */}
                <Route path="/farmer/login" element={<FarmerLogin />} />
                <Route path="/farmer/register" element={<FarmerRegister />} />
                <Route
                  path="/farmer/dashboard"
                  element={
                    <ProtectedRoute requiredRole="FARMER">
                      <FarmerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/farmer/produce"
                  element={
                    <ProtectedRoute requiredRole="FARMER">
                      <FarmerProduce />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/farmer/booking"
                  element={
                    <ProtectedRoute requiredRole="FARMER">
                      <FarmerBooking />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/farmer/queue"
                  element={
                    <ProtectedRoute requiredRole="FARMER">
                      <FarmerQueue />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/farmer/procurement"
                  element={
                    <ProtectedRoute requiredRole="FARMER">
                      <FarmerProcurement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/farmer/notifications"
                  element={
                    <ProtectedRoute requiredRole="FARMER">
                      <FarmerNotifications />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/centres"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AdminCentres />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/bookings"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AdminBookings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/queue"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AdminQueue />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/quality"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AdminQuality />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/procurement"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AdminProcurement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/payments"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AdminPayments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics"
                  element={
                    <ProtectedRoute requiredRole="ADMIN">
                      <AdminAnalytics />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
