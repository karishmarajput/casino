import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAdminAuthenticated } from '../utils/adminAuth';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const isAuthenticated = isAdminAuthenticated();

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear any stale tokens
      localStorage.removeItem('adminToken');
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;

