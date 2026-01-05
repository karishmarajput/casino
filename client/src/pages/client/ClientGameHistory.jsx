import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { baseAxios } from '../../utils/axiosConfig';
import './ClientGameHistory.css';
import logoImage from '../../assets/logo2.png';

function ClientGameHistory() {
  const [games, setGames] = useState([]);
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
    fetchGames(userData.id);
  }, [navigate]);

  const fetchGames = async (userId) => {
    try {
      const response = await baseAxios.get(`/api/client/users/${userId}/games`);
      setGames(response.data);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return <span className="client-status-badge completed">Completed</span>;
    } else if (status === 'active') {
      return <span className="client-status-badge active">Active</span>;
    }
    return <span className="client-status-badge">{status}</span>;
  };

  const handleLogout = () => {
    localStorage.removeItem('clientUser');
    navigate('/players/login');
  };

  if (loading) {
    return (
      <div className="client-game-container">
        <div className="client-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="client-game-container">
      <header className="client-header">
        <div className="client-header-content">
          <img src={logoImage} alt="Casino Logo" className="client-header-logo" />
          <h1>Player Portal</h1>
          <button onClick={handleLogout} className="client-logout-btn">Logout</button>
        </div>
      </header>

      <div className="client-page-header">
        <Link to="/players/dashboard" className="client-back-btn">← Back</Link>
        <h2>Game History</h2>
      </div>

      <main className="client-game-main">
        {games.length === 0 ? (
          <div className="client-empty-state">
            <div className="client-empty-icon">🎮</div>
            <p>No games played yet</p>
          </div>
        ) : (
          <div className="client-game-list">
            {games.map((game) => (
              <div key={game.id} className="client-game-item">
                <div className="client-game-header">
                  <div className="client-game-title">
                    <span className="client-game-name">{game.game_name || game.game_type}</span>
                    {getStatusBadge(game.status)}
                  </div>
                  <div className="client-game-id">Game #{game.id}</div>
                </div>
                
                <div className="client-game-details">
                  <div className="client-game-detail-item">
                    <span className="client-detail-label">Entry Fee:</span>
                    <span className="client-detail-value">${parseFloat(game.entry_fee || 0).toFixed(2)}</span>
                  </div>
                  <div className="client-game-detail-item">
                    <span className="client-detail-label">Pot Amount:</span>
                    <span className="client-detail-value">₵{parseInt(game.pot_amount || 0)}</span>
                  </div>
                  {game.winner && (
                    <div className="client-game-detail-item">
                      <span className="client-detail-label">Winner:</span>
                      <span className="client-detail-value">{game.winner}</span>
                    </div>
                  )}
                </div>

                <div className="client-game-date">
                  {formatDate(game.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ClientGameHistory;

