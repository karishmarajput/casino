import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated } from '../utils/adminAuth';

function AdminRedirect() {
  const isAuthenticated = isAdminAuthenticated();
  
  if (isAuthenticated) {
    // Admin is logged in, redirect to dashboard
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  // Admin is not logged in, redirect to login
  return <Navigate to="/login" replace />;
}

export default AdminRedirect;

