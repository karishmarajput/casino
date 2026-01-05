import React, { useState, useEffect } from 'react';
import { baseAxios } from '../utils/axiosConfig';
import './Ranking.css';

function Ranking() {
  const [viewMode, setViewMode] = useState('individual');
  const [users, setUsers] = useState([]);
  const [families, setFamilies] = useState([]);
  const [potBalance, setPotBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (viewMode === 'individual') {
      fetchRanking();
    } else {
      fetchFamilyRanking();
    }
    fetchPot();
    const interval = setInterval(() => {
      if (viewMode === 'individual') {
        fetchRanking();
      } else {
        fetchFamilyRanking();
      }
      fetchPot();
    }, 5000);
    return () => clearInterval(interval);
  }, [viewMode]);

  const fetchRanking = async () => {
    try {
      const response = await baseAxios.get('/api/users/ranking');
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const fetchFamilyRanking = async () => {
    try {
      const response = await baseAxios.get('/api/families/ranking');
      setFamilies(response.data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  const fetchPot = async () => {
    try {
      const response = await baseAxios.get('/api/pot');
      setPotBalance(response.data.balance || 0);
    } catch (error) {
      setPotBalance(0);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const maxBalance = users.length > 0 ? Math.max(...users.map(u => u.balance)) : 1;
  const maxTotal = families.length > 0 ? Math.max(...families.map(f => f.family_total)) : 1;

  return (
    <div className="ranking-container">
      <div className="view-toggle">
        <button
          className={`toggle-btn ${viewMode === 'individual' ? 'active' : ''}`}
          onClick={() => setViewMode('individual')}
          title="Individual Ranking"
        >
          👤
        </button>
        <button
          className={`toggle-btn ${viewMode === 'family' ? 'active' : ''}`}
          onClick={() => setViewMode('family')}
          title="Family Ranking"
        >
          👥
        </button>
      </div>

        <div className="pot-display pot-card-casino">
          <div className="pot-icon">💰</div>
          <div className="pot-amount">₵{parseInt(potBalance || 0)}</div>
        </div>

      {viewMode === 'individual' && (
        <div className="ranking-grid">
          {users.map((user, index) => {
            const sizeRatio = maxBalance > 0 ? user.balance / maxBalance : 0;
            const cardSize = 120 + (sizeRatio * 80);
            const isCaptain = user.is_captain === 1;

            return (
              <div
                key={user.id}
                className={`user-card ${isCaptain ? 'captain-card' : ''}`}
                style={{
                  width: `${cardSize}px`,
                  height: `${cardSize}px`,
                  fontSize: `${16 + sizeRatio * 8}px`,
                }}
              >
                <div className="card-rank">#{index + 1}</div>
                <div className="card-name">{user.name}</div>
                <div className="card-balance">
                  ₵{parseInt(user.balance)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === 'family' && (
        <div className="bar-chart-container">
          {families.map((family, index) => {
            const percentage = maxTotal > 0 ? (family.family_total / maxTotal) * 100 : 0;
            
            return (
              <div key={family.captain_id} className="bar-item">
                <div className="bar-row">
                  <span className="family-name" title={`${family.captain_name}'s Family`}>{family.captain_name}'s Family</span>
                  <div className="bar-wrapper">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${percentage}%`,
                      }}
                    >
                    </div>
                  </div>
                  <span className="bar-value">${parseFloat(family.family_total).toFixed(2)}</span>
                </div>
              </div>
            );
          })}
          {families.length === 0 && (
            <div className="no-families">No families registered yet. Register captains first!</div>
          )}
        </div>
      )}
    </div>
  );
}

export default Ranking;

