import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { baseAxios } from '../../utils/axiosConfig';
import './ClientDashboard.css';
import logoImage from '../../assets/logo2.png';
import reloadIcon from '../../assets/reload-icon.png';

function ClientDashboard() {
  const [user, setUser] = useState(null);
  const [rank, setRank] = useState(null);
  const [gamesWon, setGamesWon] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [winPercentage, setWinPercentage] = useState(0);
  const [totalFamilyBalance, setTotalFamilyBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const clientUser = localStorage.getItem('clientUser');
    if (!clientUser) {
      navigate('/login');
      return;
    }

    const userData = JSON.parse(clientUser);
    const loadData = () => {
      fetchUserData(userData.id);
      fetchRanking(userData.id);
      fetchGames(userData.id);
      fetchTotalFamilyBalance();
    };
    loadData();
    const intervalId = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [navigate]);

  const fetchUserData = async (userId) => {
    try {
      const response = await baseAxios.get(`/api/client/users/${userId}`);
      setUser(response.data);
      localStorage.setItem('clientUser', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRanking = async (userId) => {
    try {
      const response = await baseAxios.get('/api/users/ranking');
      const rankings = response.data;
      const userRank = rankings.findIndex(u => u.id === userId) + 1;
      setRank(userRank || null);
    } catch (error) {
      console.error('Error fetching ranking:', error);
    }
  };

  const fetchGames = async (userId) => {
    try {
      const [gamesResponse, transactionsResponse] = await Promise.all([
        baseAxios.get(`/api/client/users/${userId}/games`),
        baseAxios.get(`/api/client/users/${userId}/transactions`)
      ]);
      
      const games = gamesResponse.data;
      const transactions = transactionsResponse.data;
      setTotalGames(games.length);
      
      const userData = JSON.parse(localStorage.getItem('clientUser'));
      const userIdStr = userId.toString();
      
      const wonGameIds = new Set(
        transactions
          .filter(t => {
            const isFromPot = t.from_pot === 1 || t.from_pot === true || t.from_pot === '1';
            return isFromPot && t.game_id;
          })
          .map(t => t.game_id || t.game_table_id)
          .filter(id => id != null)
      );
      
      let won = wonGameIds.size;
      
      games.forEach(game => {
        if (!wonGameIds.has(game.id)) {
          if (game.winner && game.winner.toString() === userIdStr) {
            won++;
            wonGameIds.add(game.id);
          }
          else if (game.winner && typeof game.winner === 'string' && !/^\d+$/.test(game.winner)) {
            const winnerName = game.winner.toLowerCase().trim().replace(/\s+/g, ' ');
            const userName = userData.name.toLowerCase().trim().replace(/\s+/g, ' ');
            if (winnerName === userName) {
              won++;
              wonGameIds.add(game.id);
            }
          }
        }
      });
      
      setGamesWon(won);
      
      if (games.length > 0) {
        const percentage = (won / games.length) * 100;
        setWinPercentage(percentage);
      } else {
        setWinPercentage(0);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const fetchTotalFamilyBalance = async () => {
    try {
      const clientUser = localStorage.getItem('clientUser');
      if (!clientUser) return;
      
      const userData = JSON.parse(clientUser);
      const response = await baseAxios.get(`/api/client/users/${userData.id}/family-balance`);
      const familyTotal = response.data.familyTotal || 0;
      setTotalFamilyBalance(familyTotal);
    } catch (error) {
      console.error('Error fetching total family balance:', error);
    }
  };


  const handleLogout = () => {
    localStorage.removeItem('clientUser');
    navigate('/players/login');
  };

  const handleReload = () => {
    const clientUser = localStorage.getItem('clientUser');
    if (clientUser) {
      const userData = JSON.parse(clientUser);
      fetchUserData(userData.id);
      fetchRanking(userData.id);
      fetchGames(userData.id);
      fetchTotalFamilyBalance();
    }
  };

  if (loading) {
    return (
      <div className="client-dashboard-container">
        <div className="client-loading">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="client-dashboard-container">
      <header className="client-header">
        <div className="client-header-content">
          <img src={logoImage} alt="Casino Logo" className="client-header-logo" />
          <h1>Player Portal</h1>
          <div className="client-header-actions">
            <button onClick={handleReload} className="client-reload-btn" title="Refresh Data">
              <img src={reloadIcon} alt="Reload" className="client-reload-icon" />
            </button>
            <button onClick={handleLogout} className="client-logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <main className="client-main">
        <div className="client-welcome-section">
          <h2>Welcome, {user.name}!</h2>
        </div>

        <div className="client-stats-grid">
          <div className="client-stat-card">
            <div className="client-stat-icon">💰</div>
            <div className="client-stat-content">
              <div className="client-stat-label">Balance</div>
              <div className="client-stat-value">₵{parseInt(user.balance)}</div>
            </div>
          </div>

          <div className="client-stat-card">
            <div className="client-stat-icon">🏆</div>
            <div className="client-stat-content">
              <div className="client-stat-label">Rank</div>
              <div className="client-stat-value">
                {rank ? `#${rank}` : 'N/A'}
              </div>
            </div>
          </div>

          <div className="client-stat-card">
            <div className="client-stat-icon">🎯</div>
            <div className="client-stat-content">
              <div className="client-stat-label">Games Won</div>
              <div className="client-stat-value">
                {gamesWon} / {totalGames}
              </div>
              <div className="client-stat-subtext">
                {winPercentage.toFixed(1)}% Win Rate
              </div>
            </div>
          </div>

          <div className="client-stat-card">
            <div className="client-stat-icon">👨‍👩‍👧‍👦</div>
            <div className="client-stat-content">
              <div className="client-stat-label">Total Family Balance</div>
              <div className="client-stat-value">₵{parseInt(totalFamilyBalance)}</div>
            </div>
          </div>
        </div>

        <div className="client-cards-grid">
          <Link to="/players/rankings" className="client-content-card clickable">
            <div className="client-card-content">
              <div className="client-card-icon">🏆</div>
              <h3 className="client-card-title">Player Rankings</h3>
            </div>
          </Link>

          <Link to="/players/transactions" className="client-content-card clickable">
            <div className="client-card-content">
              <div className="client-card-icon">📊</div>
              <h3 className="client-card-title">Transaction History</h3>
            </div>
          </Link>

          <Link to="/players/games" className="client-content-card clickable">
            <div className="client-card-content">
              <div className="client-card-icon">🎮</div>
              <h3 className="client-card-title">Game History</h3>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default ClientDashboard;

