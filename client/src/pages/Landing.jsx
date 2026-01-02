import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminAxios, { baseAxios } from '../utils/axiosConfig';
import { isAdminAuthenticated } from '../utils/adminAuth';
import mainPageImage from '../assets/main7.png';
import './Landing.css';

function Landing() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPot: 0,
    activeGames: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const isAdmin = isAdminAuthenticated();
      const [usersRes, potRes, gamesRes] = await Promise.all([
        isAdmin ? adminAxios.get('/api/users') : baseAxios.get('/api/users/ranking').then(r => ({ data: r.data })),
        baseAxios.get('/api/pot'),
        isAdmin ? adminAxios.get('/api/games') : Promise.resolve({ data: [] })
      ]);

      const activeGames = gamesRes.data ? gamesRes.data.filter(g => g.status === 'active').length : 0;

      setStats({
        totalUsers: usersRes.data ? usersRes.data.length : 0,
        totalPot: potRes.data.balance || 0,
        activeGames: activeGames
      });
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: '🎰',
      title: 'Games',
      description: 'Play Roulette, Poker, Roll the Ball, Deal No Deal, and 7 Up & 7 Down',
      link: '/games',
      color: '#d4af37'
    },
    {
      icon: '👥',
      title: 'User Management',
      description: 'Register captains and family members, manage user balances',
      link: '/register',
      color: '#4ade80'
    },
    {
      icon: '💰',
      title: 'Transactions',
      description: 'Transfer money between users, to and from the pot',
      link: '/transaction',
      color: '#3b82f6'
    },
    {
      icon: '🏆',
      title: 'Rankings',
      description: 'View individual and family rankings based on balances',
      link: '/ranking',
      color: '#a855f7'
    }
  ];

  return (
    <div className="landing-container">
      <div className="landing-hero">
        {!loading && (
          <div className="floating-stats">
            <div className="floating-stat-box">
              <div className="floating-stat-icon">💰</div>
              <div className="floating-stat-value">${parseInt(stats.totalPot)}</div>
              <div className="floating-stat-label">Total Pot</div>
            </div>
            <div className="floating-stat-box">
              <div className="floating-stat-icon">👥</div>
              <div className="floating-stat-value">{stats.totalUsers}</div>
              <div className="floating-stat-label">Players</div>
            </div>
          </div>
        )}
        <img src={mainPageImage} alt="Casino Main Page" className="hero-image" />
      </div>

      <div className="features-section">
        <h2 className="features-title">Explore Our Features</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <Link
              key={index}
              to={feature.link}
              className="feature-card"
              style={{ '--card-color': feature.color }}
            >
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-arrow">→</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Landing;

