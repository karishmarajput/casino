import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Ranking from './pages/Ranking';
import Transaction from './pages/Transaction';
import UserRegistration from './pages/UserRegistration';
import FamilyView from './pages/FamilyView';
import Games from './pages/Games';
import FlushDatabase from './pages/FlushDatabase';
import ClientLogin from './pages/client/ClientLogin';
import ClientDashboard from './pages/client/ClientDashboard';
import ClientTransactionHistory from './pages/client/ClientTransactionHistory';
import ClientGameHistory from './pages/client/ClientGameHistory';
import ClientRankings from './pages/client/ClientRankings';
import AdminLogin from './pages/AdminLogin';
import ProtectedRoute from './components/ProtectedRoute';
import PlayerRedirect from './components/PlayerRedirect';
import AdminRedirect from './components/AdminRedirect';
import { isAdminAuthenticated, removeAdminToken } from './utils/adminAuth';
import logoImage from './assets/logo2.png';
import './App.css';

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isAdmin = isAdminAuthenticated();

  const isActive = (path) => {
    return location.pathname === path || 
           (path === '/admin' && (location.pathname === '/admin' || location.pathname === '/register' || location.pathname === '/transaction' || location.pathname === '/flush-database'));
  };

  const handleAdminLogout = () => {
    removeAdminToken();
    window.location.href = '/admin/login';
  };

  const handleLogoClick = (e) => {
    if (isAdmin) {
      e.preventDefault();
      navigate('/admin/dashboard');
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link 
          to={isAdmin ? "/admin/dashboard" : "/"} 
          className="nav-logo"
          onClick={handleLogoClick}
        >
          <img src={logoImage} alt="Casino Logo" className="logo-icon" />
          <span className="logo-text">Casino</span>
        </Link>
        <div className="nav-links">
          {isAdmin && (
            <>
              <Link 
                to="/ranking" 
                className={location.pathname === '/ranking' ? 'nav-link active' : 'nav-link'}
              >
                Ranking
              </Link>
              <Link 
                to="/family-view" 
                className={location.pathname === '/family-view' ? 'nav-link active' : 'nav-link'}
              >
                Family View
              </Link>
              <Link 
                to="/games" 
                className={location.pathname === '/games' ? 'nav-link active' : 'nav-link'}
              >
                Games
              </Link>
              <div 
                className={`nav-dropdown ${isActive('/admin') ? 'active' : ''}`}
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <button className="nav-link dropdown-toggle">
                  Admin
                  <span className="dropdown-arrow">▼</span>
                </button>
                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <Link 
                      to="/register" 
                      className={location.pathname === '/register' ? 'dropdown-item active' : 'dropdown-item'}
                      onClick={() => setDropdownOpen(false)}
                    >
                      Registration
                    </Link>
                    <Link 
                      to="/transaction" 
                      className={location.pathname === '/transaction' ? 'dropdown-item active' : 'dropdown-item'}
                      onClick={() => setDropdownOpen(false)}
                    >
                      Transaction
                    </Link>
                    <Link 
                      to="/flush-database" 
                      className={location.pathname === '/flush-database' ? 'dropdown-item active' : 'dropdown-item'}
                      onClick={() => setDropdownOpen(false)}
                      style={{ color: '#ff6b6b' }}
                    >
                      ⚠️ Flush Database
                    </Link>
                  </div>
                )}
              </div>
              <button 
                onClick={handleAdminLogout}
                className="admin-logout-btn"
                title="Logout"
              >
                Logout
              </button>
            </>
          )}
          {!isAdmin && (
            <Link 
              to="/admin/login" 
              className="nav-link"
            >
              Admin Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  const location = useLocation();
  const isPlayerRoute = location.pathname.startsWith('/players');
  const isAdminLoginRoute = location.pathname === '/admin/login';

  return (
    <div className="app">
      {!isPlayerRoute && !isAdminLoginRoute && <Navigation />}
      <main className={isPlayerRoute || isAdminLoginRoute ? "client-main-content" : "main-content"}>
        <Routes>
          {/* Root route - redirects to player */}
          <Route path="/" element={<PlayerRedirect />} />
          
          {/* Player routes */}
          <Route path="/players/login" element={<ClientLogin />} />
          <Route path="/players/dashboard" element={<ClientDashboard />} />
          <Route path="/players/rankings" element={<ClientRankings />} />
          <Route path="/players/transactions" element={<ClientTransactionHistory />} />
          <Route path="/players/games" element={<ClientGameHistory />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<AdminRedirect />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute>
                <Landing />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected admin routes */}
          <Route 
            path="/ranking" 
            element={
              <ProtectedRoute>
                <Ranking />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/family-view" 
            element={
              <ProtectedRoute>
                <FamilyView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/transaction" 
            element={
              <ProtectedRoute>
                <Transaction />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <ProtectedRoute>
                <UserRegistration />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/games" 
            element={
              <ProtectedRoute>
                <Games />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/flush-database" 
            element={
              <ProtectedRoute>
                <FlushDatabase />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
      {!isPlayerRoute && !isAdminLoginRoute && (
        <footer className="app-footer">
          <p>Developed by Karishma Rajput</p>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

