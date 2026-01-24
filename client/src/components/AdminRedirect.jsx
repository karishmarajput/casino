import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated } from '../utils/adminAuth';
import AdminLogin from '../pages/AdminLogin';

function AdminRedirect() {
  const isAuthenticated = isAdminAuthenticated();
  
  if (isAuthenticated) {
    // Admin is logged in, redirect to dashboard
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  // Admin is not logged in, show admin login page
  return <AdminLogin />;
}

export default AdminRedirect;

