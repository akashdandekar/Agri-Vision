import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontWeight: 600, color: 'var(--slate-500)' }}>Loading session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={requiredRole === 'ADMIN' ? '/admin/login' : '/farmer/login'} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Strictly prevent farmer from entering admin routes and vice-versa
    if (user?.role === 'FARMER') {
      return <Navigate to="/farmer/dashboard" replace />;
    } else if (user?.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
