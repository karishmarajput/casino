import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

function PlayerRedirect() {
  const clientUser = localStorage.getItem('clientUser');
  
  if (clientUser) {
    // User is logged in, redirect to dashboard
    return <Navigate to="/players/dashboard" replace />;
  }
  
  // User is not logged in, redirect to login
  return <Navigate to="/login" replace />;
}

export default PlayerRedirect;

