import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { baseAxios } from '../../utils/axiosConfig';
import './ClientLogin.css';
import logoImage from '../../assets/logo2.png';

function ClientLogin() {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch all players for the dropdown
    const fetchPlayers = async () => {
      try {
        const response = await baseAxios.get('/api/client/users');
        setPlayers(response.data || []);
      } catch (err) {
        setError('Failed to load players. Please refresh the page.');
        console.error('Error fetching players:', err);
      } finally {
        setLoadingPlayers(false);
      }
    };

    fetchPlayers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!selectedUserId) {
      setError('Please select a player');
      return;
    }

    setLoading(true);

    try {
      const response = await baseAxios.post('/api/client/login-by-id', {
        userId: parseInt(selectedUserId)
      });

      localStorage.setItem('clientUser', JSON.stringify(response.data));
      navigate('/players/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="client-login-container">
      <div className="client-login-card">
        <div className="client-login-header">
          <img src={logoImage} alt="Casino Logo" className="client-logo" />
          <h1>Player Portal</h1>
          <p>Login to view your account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="client-login-form">
          {error && <div className="client-error-message">{error}</div>}
          
          <div className="client-form-group">
            <label htmlFor="player-select">Select Player</label>
            {loadingPlayers ? (
              <div className="client-loading-players">Loading players...</div>
            ) : (
              <select
                id="player-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="client-player-select"
                required
              >
                <option value="">-- Select a player --</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button 
            type="submit" 
            className="client-login-btn"
            disabled={loading || !selectedUserId || loadingPlayers}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ClientLogin;

