import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { baseAxios } from '../../utils/axiosConfig';
import './ClientRankings.css';
import logoImage from '../../assets/logo2.png';

function ClientRankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const clientUser = localStorage.getItem('clientUser');
    if (!clientUser) {
      navigate('/login');
      return;
    }

    const userData = JSON.parse(clientUser);
    setUser(userData);
    fetchRankings();
  }, [navigate]);

  const fetchRankings = async () => {
    try {
      const response = await baseAxios.get('/api/users/ranking');
      setRankings(response.data);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('clientUser');
    navigate('/players/login');
  };

  if (loading) {
    return (
      <div className="client-ranking-container">
        <div className="client-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="client-ranking-container">
      <header className="client-header">
        <div className="client-header-content">
          <img src={logoImage} alt="Casino Logo" className="client-header-logo" />
          <h1>Player Portal</h1>
          <button onClick={handleLogout} className="client-logout-btn">Logout</button>
        </div>
      </header>

      <div className="client-page-header">
        <Link to="/players/dashboard" className="client-back-btn">← Back</Link>
        <h2>Player Rankings</h2>
      </div>

      <main className="client-ranking-main">
        {rankings.length === 0 ? (
          <div className="client-empty-state">
            <div className="client-empty-icon">🏆</div>
            <p>No rankings available</p>
          </div>
        ) : (
          <div className="client-ranking-list">
            {rankings.map((player, index) => {
              const isCurrentUser = user && player.id === user.id;
              return (
                <div 
                  key={player.id} 
                  className={`client-ranking-item ${isCurrentUser ? 'current-user' : ''}`}
                >
                  <div className="client-ranking-rank">#{index + 1}</div>
                  <div className="client-ranking-info">
                    <div className="client-ranking-name">
                      {player.name}
                      {isCurrentUser && <span className="client-you-badge">You</span>}
                    </div>
                    <div className="client-ranking-balance">₵{parseInt(player.balance)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default ClientRankings;

